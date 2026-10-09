/**
 * Small fixed-window rate limiter kept in process memory.
 *
 * Good enough to blunt password guessing and scraping of a single server. On serverless hosting every instance has
 * its own counters, so treat it as a speed bump and ALSO enable platform-level protection (Vercel Firewall,
 * Cloudflare, ...) for real abuse. Supabase Auth additionally rate-limits sign-ins on its side.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  return b.count <= limit ? { ok: true, retryAfter: 0 } : { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
}

/** Best-effort client IP behind a proxy/CDN. */
export function clientIp(headers: Headers): string {
  return (
    // Platform-set headers first: Vercel sets these itself, so a client can't forge them.
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
