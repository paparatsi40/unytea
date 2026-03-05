import { NextRequest } from "next/server";

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export function rateLimit(config: RateLimitConfig) {
  return {
    check: (identifier: string): { success: boolean; remaining: number; resetTime: number } => {
      const now = Date.now();
      const key = identifier;

      if (!store[key] || store[key].resetTime < now) {
        // Reset or initialize
        store[key] = {
          count: 1,
          resetTime: now + config.interval,
        };
        return {
          success: true,
          remaining: config.uniqueTokenPerInterval - 1,
          resetTime: store[key].resetTime,
        };
      }

      // Check if limit exceeded
      if (store[key].count >= config.uniqueTokenPerInterval) {
        return {
          success: false,
          remaining: 0,
          resetTime: store[key].resetTime,
        };
      }

      // Increment count
      store[key].count += 1;

      return {
        success: true,
        remaining: config.uniqueTokenPerInterval - store[key].count,
        resetTime: store[key].resetTime,
      };
    },
  };
}

// Helper to get IP from request
export function getIP(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0] : request.ip || "unknown";
}

// Helper to get user identifier (IP + User-Agent for anonymous, userId for authenticated)
export function getIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  const ip = getIP(request);
  const userAgent = request.headers.get("user-agent") || "unknown";
  return `${ip}:${userAgent}`;
}

// Predefined rate limiters
export const rateLimiters = {
  // Authentication endpoints - strict
  auth: rateLimit({
    interval: 15 * 60 * 1000, // 15 minutes
    uniqueTokenPerInterval: 5, // 5 attempts per 15 min
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