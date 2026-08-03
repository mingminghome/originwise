/**
 * Best-effort result cache via Cache API (no KV required on Free tier).
 */

import { normalizeQuery } from './normalizeQuery';
import type { CheckDimension, CheckResult } from './schema';
import type { GeoScope } from './regions';

export type CacheLookupKey = {
  text: string;
  locale: string;
  geoScope: GeoScope;
  dimensions: CheckDimension[];
};

function sortedDims(dims: CheckDimension[]): string {
  return [...dims].sort().join(',');
}

export async function cacheKeyHash(parts: CacheLookupKey): Promise<string> {
  const material = [
    // Bump when product/company prompts or synthesize alt rules change (invalidate stale wrong answers)
    'check:v4',
    normalizeQuery(parts.text),
    parts.locale,
    parts.geoScope,
    sortedDims(parts.dimensions),
  ].join('|');
  const data = new TextEncoder().encode(material);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < 16; i++) {
    hex += bytes[i]!.toString(16).padStart(2, '0');
  }
  return hex;
}

function cacheRequest(hash: string): Request {
  return new Request(`https://originwise-result-cache.internal/${hash}`);
}

export async function getCachedResult(
  parts: CacheLookupKey
): Promise<{ result: CheckResult; cachedAt: string } | null> {
  if (!parts.text.trim()) return null; // don't cache image-only by raw text
  try {
    const hash = await cacheKeyHash(parts);
    const hit = await caches.default.match(cacheRequest(hash));
    if (!hit) return null;
    const data = (await hit.json()) as {
      result?: CheckResult;
      cachedAt?: string;
    };
    if (!data?.result) return null;
    return {
      result: data.result,
      cachedAt: data.cachedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function putCachedResult(
  parts: CacheLookupKey,
  result: CheckResult,
  ttlSec: number
): Promise<void> {
  if (!parts.text.trim()) return;
  try {
    const hash = await cacheKeyHash(parts);
    const ttl = Math.max(60, Math.min(ttlSec, 604800));
    const body = JSON.stringify({
      result,
      cachedAt: new Date().toISOString(),
    });
    await caches.default.put(
      cacheRequest(hash),
      new Response(body, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${ttl}`,
        },
      })
    );
  } catch {
    /* best-effort */
  }
}
