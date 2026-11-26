import type { NextRequest } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60_000
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    return { allowed: true, remaining: maxAttempts, retryAfterSeconds: 0 };
  }
  const remaining = Math.max(0, maxAttempts - existing.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return {
    allowed: existing.count < maxAttempts,
    remaining,
    retryAfterSeconds,
  };
}

export function recordRateLimitHit(key: string, windowMs = 15 * 60_000): void {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    existing.count += 1;
    store.set(key, existing);
  }
  // Opportunistic cleanup so memory stays bounded
  if (store.size > 2000) {
    for (const [k, v] of store.entries()) {
      if (v.resetAt <= now) store.delete(k);
    }
  }
}

export function clearRateLimit(key: string): void {
  store.delete(key);
}
