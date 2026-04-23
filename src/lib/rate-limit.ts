/**
 * Simple in-memory rate limiter for Next.js API routes.
 * Uses IP-based sliding window. Not distributed — suitable for single-instance deploys.
 * For multi-instance: replace with Redis-backed limiter.
 */

type LimitEntry = { count: number; resetAt: number };

const store = new Map<string, LimitEntry>();

function getKey(ip: string, identifier: string): string {
  return `${ip}:${identifier}`;
}

function cleanExpired() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}

// Run cleanup every 60 seconds
setInterval(cleanExpired, 60_000).unref?.();

export interface RateLimitOptions {
  identifier: string;
  windowMs?: number;
  maxRequests?: number;
}

export function rateLimit(
  ip: string,
  { identifier, windowMs = 60_000, maxRequests = 30 }: RateLimitOptions
): { success: boolean; limit: number; remaining: number; resetAt: number } {
  const key = getKey(ip, identifier);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, limit: maxRequests, remaining: maxRequests - 1, resetAt };
  }

  if (entry.count >= maxRequests) {
    return { success: false, limit: maxRequests, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { success: true, limit: maxRequests, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

/** Backward-compatible overload for existing code: checkRateLimit(key, maxRequests, windowMs) */
export function checkRateLimit(
  key: string,
  maxRequests?: number,
  windowMs?: number
): { allowed: boolean; remaining: number } {
  const result = rateLimit(key, { identifier: "legacy", windowMs: windowMs ?? 60_000, maxRequests: maxRequests ?? 30 });
  return { allowed: result.success, remaining: result.remaining };
}

/** Extract client IP from request headers. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
