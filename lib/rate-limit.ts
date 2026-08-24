import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

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

// ── Upstash credentials ─────────────────────────────────────────────

/**
 * Where the Upstash REST URL is looked for, in order.
 *
 * Vercel's Upstash integration writes its variables under the name of the
 * store, so connecting it produced `UPSTASH_REDIS_KV_REST_API_URL` — while this
 * file read `UPSTASH_REDIS_REST_URL`, which nothing had ever set. The two names
 * never met, `useRedis` was false, and every limiter quietly fell back to the
 * in-memory store: a counter held per serverless instance, reset by every cold
 * start. The limits were still reported and still enforced, just against a
 * fraction of the traffic each, which is the kind of failure that looks exactly
 * like success from the outside.
 *
 * The flat names are kept as a fallback so that setting them by hand — which is
 * what `.env.example` still documents, and what a local `redis-server` shim
 * would use — keeps working.
 */
export const UPSTASH_URL_VARS = [
  "UPSTASH_REDIS_KV_REST_API_URL",
  "UPSTASH_REDIS_REST_URL",
] as const;

/**
 * Where the Upstash REST token is looked for, in order.
 *
 * `UPSTASH_REDIS_KV_REST_API_READ_ONLY_TOKEN` is deliberately absent from this
 * list and must never be added to it. The limiter's whole operation is `INCR`
 * — it counts by writing — so a read-only token would authenticate, be
 * accepted, and then fail on every single call. Because the failure lands in
 * the `catch` below, which falls back to memory rather than refusing traffic,
 * the result would be indistinguishable from having no Redis at all: exactly
 * the bug this list exists to fix, wearing a working connection as a disguise.
 */
export const UPSTASH_TOKEN_VARS = [
  "UPSTASH_REDIS_KV_REST_API_TOKEN",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

export interface UpstashCredentials {
  url: string;
  token: string;
}

type Env = Record<string, string | undefined>;

/**
 * A variable that exists but holds an empty or whitespace-only string counts as
 * absent — hosting dashboards make it easy to save a blank value, and a blank
 * token fails the request exactly like a missing one. Same rule
 * `lib/auth-providers.ts` applies to the OAuth credentials.
 */
function firstPresent(env: Env, names: readonly string[]): string | null {
  for (const name of names) {
    const value = env[name];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

/**
 * The read-write REST credentials, or `null` when either half is missing.
 *
 * Exported so the wiring can be asserted directly instead of through the
 * module-level constant it feeds, which is fixed at import time.
 */
export function resolveUpstashCredentials(env: Env = process.env): UpstashCredentials | null {
  const url = firstPresent(env, UPSTASH_URL_VARS);
  const token = firstPresent(env, UPSTASH_TOKEN_VARS);
  return url && token ? { url, token } : null;
}

// ── Redis Store (Production) ────────────────────────────────────────
// Uses Upstash Redis REST API directly to avoid extra dependencies.
// Each key is prefixed with "rl:" and has a TTL matching the interval.

async function redisIncrement(
  key: string,
  intervalMs: number
): Promise<{ count: number; ttl: number }> {
  const credentials = resolveUpstashCredentials();

  if (!credentials) {
    throw new Error("Upstash Redis not configured");
  }

  const { url, token } = credentials;

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
  setInterval(
    () => {
      const now = Date.now();
      for (const key of Object.keys(memoryStore)) {
        if (memoryStore[key].resetTime < now) {
          delete memoryStore[key];
        }
      }
    },
    5 * 60 * 1000
  );
}

function memoryIncrement(key: string, intervalMs: number, limit: number): RateLimitResult {
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

/**
 * Which store this process is counting in, decided once at import.
 *
 * Announced on load, because the failure it replaces was silent: the limiter
 * had been running on per-instance memory in production for as long as anyone
 * could tell, and nothing said so. One line in the boot log makes "is the rate
 * limiter actually shared?" a question you can answer by looking.
 *
 * The line carries the kind of store and nothing else. The URL identifies the
 * database and the token opens it; neither belongs in a log that ships to a
 * platform dashboard.
 */
export const RATE_LIMIT_STORE: "redis" | "memory" = resolveUpstashCredentials()
  ? "redis"
  : "memory";

const useRedis = RATE_LIMIT_STORE === "redis";

console.info(
  useRedis
    ? "[rate-limit] store=redis"
    : "[rate-limit] store=memory reason=no-upstash-env (counters are per-instance)"
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

// ── Helper: telling the caller when to come back ────────────────────

/**
 * Seconds until the window resets, rounded up, never below one.
 *
 * A 429 that does not say when to retry leaves the page guessing — ours said
 * "try again in a few minutes" whether the wait was 20 seconds or 14 minutes.
 * Zero is never returned: `Retry-After: 0` reads as "retry immediately", which
 * is exactly what the refusal is asking the caller not to do.
 */
export function retryAfterSeconds(resetTime: number, now: number = Date.now()): number {
  return Math.max(1, Math.ceil((resetTime - now) / 1000));
}

/**
 * The one shape a refusal takes, so five call sites cannot drift apart.
 *
 * The seconds go in the header for machines and in the body for the page — the
 * client reads JSON already and would otherwise have to reach for headers it
 * has no other reason to touch. `code` is what the UI translates; the English
 * sentence is for logs and non-UI consumers.
 */
export function rateLimitedResponse(result: RateLimitResult): NextResponse {
  const seconds = retryAfterSeconds(result.resetTime);
  return NextResponse.json(
    {
      error: "Too many attempts. Please try again later.",
      code: "RATE_LIMITED",
      retryAfterSeconds: seconds,
    },
    { status: 429, headers: { "Retry-After": String(seconds) } }
  );
}

// ── Helper: keys that must not carry their subject ──────────────────

/**
 * A bucket key derived from a value that should not be readable in the store.
 *
 * The password-reset limiter counts per recipient, so its key is built from
 * somebody's email address — and Redis keys are listed by any dashboard, any
 * `SCAN`, any support engineer with the console open. Hashing keeps the bucket
 * exact and the address out of it. Truncated to 128 bits, which is far past
 * collision territory for a keyspace this size and keeps the keys readable.
 *
 * The caller normalizes before calling: `A@B.com` and `a@b.com` are one
 * mailbox, and a bucket that treats them as two is bypassed by pressing shift.
 */
export function hashedKey(prefix: string, value: string): string {
  const digest = createHash("sha256").update(value).digest("hex").slice(0, 32);
  return `${prefix}:${digest}`;
}

// ── Helper: get IP from request ─────────────────────────────────────

export function getIP(request: NextRequest): string {
  // Next 16 removed NextRequest.ip — derive from x-forwarded-for (Vercel and
  // most reverse proxies set this) with fallback to x-real-ip.
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();
  return "unknown";
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
  // Authentication endpoints - strict.
  //
  // Do not retune this one to fix a signup or password-reset problem. It is
  // shared: `deleteAccount` (app/actions/settings.ts) counts here too, under a
  // per-user key, and would move with it. The two auth routes have their own
  // ceilings below for exactly that reason.
  auth: rateLimit({
    interval: 15 * 60 * 1000, // 15 minutes
    uniqueTokenPerInterval: 5, // 5 attempts per 15 min
  }),

  /**
   * Signup attempts that got past validation — per IP.
   *
   * 20 an hour instead of the 5-per-15-minutes this used to borrow from `auth`.
   * The hourly average is identical; what changes is that the twenty are
   * allowed to arrive together. That is the whole point: five per quarter hour
   * cannot onboard a room, and a workshop, a classroom or anything behind
   * CGNAT is one IP. The sixth person in the room was being told to come back
   * later.
   */
  signupAttempt: rateLimit({
    interval: 60 * 60 * 1000, // 1 hour
    uniqueTokenPerInterval: 20, // 20 valid attempts per hour
  }),

  /**
   * Password-reset requests that got past validation — per IP.
   *
   * Deliberately left where it was, at the same numbers `auth` carries. Nobody
   * resets a password in a group, so there is no shared-IP pressure here to
   * relieve; it has its own entry only so that tuning it later cannot reach
   * `deleteAccount` by accident.
   */
  passwordReset: rateLimit({
    interval: 15 * 60 * 1000, // 15 minutes
    uniqueTokenPerInterval: 5, // 5 valid attempts per 15 min
  }),

  /**
   * Password-reset requests aimed at one address, from anywhere at all.
   *
   * The per-IP bucket protects us from a flood. It does nothing for the person
   * being flooded: an attacker who rotates IPs can put a reset mail in one
   * victim's inbox as often as they like, and every one of those mails is
   * genuinely from us and passes every check the victim's provider makes. This
   * is the bucket that protects the recipient, and it is the only one that can.
   *
   * Three an hour is enough for somebody who deleted the first mail by mistake
   * and is short of a mailbox anyone would call bombed.
   */
  passwordResetRecipient: rateLimit({
    interval: 60 * 60 * 1000, // 1 hour
    uniqueTokenPerInterval: 3, // 3 mails per hour per address
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

  // CSP violation reports - per-IP cap. Browser extensions (ad blockers, password
  // managers, Grammarly, etc.) can fire dozens of violations per page load — we
  // want the data but not a single misbehaving extension flooding the table.
  cspReport: rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 10, // 10 reports/min per IP
  }),
};
