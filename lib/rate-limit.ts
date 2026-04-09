import { NextRequest } from "next/server";

// ============================================
// RATE LIMITER - Redis/Upstash with in-memory fallback
// ============================================
// Production: uses Upstash Redis for distributed rate limiting
// Development: falls back to in-memory store if UPSTASH_REDIS_REST_URL is not set

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

// ── Redis Store (Production) ────────────────────────────────────────
// Uses Upstash Redis REST API directly to avoid extra dependencies.
// Each key is prefixed with "rl:" and has a TTL matching the interval.

async function redisIncrement(
  key: string,
  intervalMs: number
): Promise<{ count: number; ttl: number }> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Upstash Redis not configured");
  }

  const ttlSeconds = Math.ceil(intervalMs / 1000);
  const redisKey = `rl:${key}`;

  // MULTI: INCR + conditional EXPIRE (pipeline)
  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["TTL", redisKey],
    ]),
  });

  if (!response.ok) {
    throw new Error(`Redis request failed: ${response.status}`);
  }

  const results = (await response.json()) as Array<{ result: number }>;
  const count = results[0].result;
  const ttl = results[1].result;

  // If TTL is -1 (no expiry set), this is a new key — set expiry
  if (ttl === -1) {
    await fetch(`${url}/EXPIRE/${redisKey}/${ttlSeconds}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  return { count, ttl: ttl > 0 ? ttl : ttlSeconds };
}

// ── In-Memory Store (Development fallback) ──────────────────────────

interface MemoryEntry {
  count: number;
  resetTime: number;
}

const memoryStore: Record<string, MemoryEntry> = {};

// Clean up expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const key of Object.keys(memoryStore)) {
      if (memoryStore[key].resetTime < now) {
        delete memoryStore[key];
      }
    }
  }, 5 * 60 * 1000);
}

function memoryIncrement(
  key: string,
  intervalMs: number,
  limit: number
): RateLimitResult {
  const now = Date.now();

  if (!memoryStore[key] || memoryStore[key].resetTime < now) {
    memoryStore[key] = { count: 1, resetTime: now + intervalMs };
    return { success: true, remaining: limit - 1, resetTime: memoryStore[key].resetTime };
  }

  if (memoryStore[key].count >= limit) {
    return { success: false, remaining: 0, resetTime: memoryStore[key].resetTime };
  }

  memoryStore[key].count += 1;
  return {
    success: true,
    remaining: limit - memoryStore[key].count,
    resetTime: memoryStore[key].resetTime,
  };
}

// ── Rate Limiter Factory ────────────────────────────────────────────

const useRedis = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

export function rateLimit(config: RateLimitConfig) {
  return {
    check: async (identifier: string): Promise<RateLimitResult> => {
      const key = identifier;

      // Use Redis in production, memory in development
      if (useRedis) {
        try {
          const { count, ttl } = await redisIncrement(key, config.interval);
          const success = count <= config.uniqueTokenPerInterval;
          return {
            success,
            remaining: Math.max(0, config.uniqueTokenPerInterval - count),
            resetTime: Date.now() + ttl * 1000,
          };
        } catch (error) {
          // If Redis fails, fall back to memory to avoid blocking requests
          console.error("Redis rate limit error, falling back to memory:", error);
          return memoryIncrement(key, config.interval, config.uniqueTokenPerInterval);
        }
      }

      return memoryIncrement(key, config.interval, config.uniqueTokenPerInterval);
    },
  };
}

// ── Helper: get IP from request ─────────────────────────────────────

export function getIP(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0] : request.ip || "unknown";
}

// ── Helper: get user identifier ─────────────────────────────────────

export function getIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  const ip = getIP(request);
  const userAgent = request.headers.get("user-agent") || "unknown";
  return `${ip}:${userAgent}`;
}

// ── Predefined rate limiters ────────────────────────────────────────

export const rateLimiters = {
  // Authentication endpoints - strict
  auth: rateLimit({
    interval: 15 * 60 * 1000, // 15 minutes
    uniqueTokenPerInterval: 5, // 5 attempts per 15 min
  }),

  // AI endpoints - very strict (costs money per request)
  ai: rateLimit({
    interval: 60 * 60 * 1000, // 1 hour
    uniqueTokenPerInterval: 30, // 30 AI requests per hour
  }),

  // API endpoints - moderate
  api: rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 60, // 60 requests per minute
  }),

  // Posting/Creating content - moderate
  create: rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 10, // 10 posts per minute
  }),

  // Messages - lenient (for chat)
  message: rateLimit({
    interval: 10 * 1000, // 10 seconds
    uniqueTokenPerInterval: 20, // 20 messages per 10 seconds
  }),

  // General actions - lenient
  general: rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 100, // 100 requests per minute
  }),
};
