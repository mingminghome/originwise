/**
 * Best-effort per-key rate limit using the Cache API (no KV required).
 * Counts are approximate across Cloudflare colos — good enough for free-tier abuse.
 */

export type RateLimitResult =
  | { ok: true; remaining: number; limit: number }
  | { ok: false; remaining: 0; limit: number; retryAfterSec: number };

export async function checkRateLimit(opts: {
  /** Stable id, e.g. client IP */
  key: string;
  /** Max requests per window */
  limit: number;
  /** Window length in seconds */
  windowSec: number;
  /** Namespace prefix so different endpoints don't share counters */
  namespace?: string;
}): Promise<RateLimitResult> {
  const { key, limit, windowSec } = opts;
  const ns = opts.namespace ?? 'rl';
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const cacheKey = new Request(
    `https://originwise-rate-limit.internal/${ns}/${encodeURIComponent(key)}/${bucket}`
  );

  const cache = caches.default;
  let count = 0;
  const hit = await cache.match(cacheKey);
  if (hit) {
    const n = parseInt(await hit.text(), 10);
    count = Number.isFinite(n) ? n : 0;
  }

  if (count >= limit) {
    const elapsedInBucket = Math.floor(
      (Date.now() % (windowSec * 1000)) / 1000
    );
    const retryAfterSec = Math.max(1, windowSec - elapsedInBucket);
    return { ok: false, remaining: 0, limit, retryAfterSec };
  }

  count += 1;
  await cache.put(
    cacheKey,
    new Response(String(count), {
      headers: {
        'Cache-Control': `public, max-age=${windowSec}`,
        'Content-Type': 'text/plain',
      },
    })
  );

  return { ok: true, remaining: Math.max(0, limit - count), limit };
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('True-Client-IP') ||
    request.headers
      .get('X-Forwarded-For')
      ?.split(',')[0]
      ?.trim() ||
    'unknown'
  );
}
