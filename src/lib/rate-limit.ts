import { NextRequest } from "next/server";

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterMs?: number;
};

export function createRateLimiter(config: RateLimitConfig) {
  const hits = new Map<string, number[]>();

  // Periodic cleanup to prevent unbounded memory growth
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    for (const [key, timestamps] of hits) {
      const valid = timestamps.filter((t) => t > windowStart);
      if (valid.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, valid);
      }
    }
  }, 60_000);

  // Allow garbage collection if the module is unloaded
  if (typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
  }

  return function check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);

    if (timestamps.length >= config.maxRequests) {
      const oldestInWindow = timestamps[0];
      return {
        allowed: false,
        retryAfterMs: oldestInWindow + config.windowMs - now,
      };
    }

    timestamps.push(now);
    hits.set(key, timestamps);
    return { allowed: true };
  };
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the first IP (original client) from the chain
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
