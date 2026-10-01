/**
 * Best-effort result cache via Cache API (no KV required on Free tier).
 *
 * Cache API is per-colo: a skip-cache write on one edge may not be visible on
 * another. Servable-gate + version bumps keep tip UI from sticking on weak
 * stale hits (未確認 / web-fail) when a fresh pass would stamp Final COO.
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

const UNKNOWN_MADE_IN = /^(unknown|n\/?a|未知|不明|不詳)$/i;

function sortedDims(dims: CheckDimension[]): string {
  return [...dims].sort().join(',');
}

export async function cacheKeyHash(parts: CacheLookupKey): Promise<string> {
  const material = [
    // Bump when product/company prompts, web research, synthesize, or COO rules change
    // v6: invalidate pre–COO-priority / weak web-fail caches that showed 未確認 as 快取
    'check:v6',
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

/**
 * Whether a cached CheckResult is safe to show as a cache hit.
 * Rejects unconfirmed Final COO when web Search failed on that run — those
 * stick as 快取 / 未確認 while skip-cache already has a real madeIn.
 */
export function isServableCachedResult(result: CheckResult): boolean {
  const made = result.product?.madeIn?.trim() ?? '';
  const madeUnknown = !made || UNKNOWN_MADE_IN.test(made);
  if (!madeUnknown) return true;
  const web = result.meta?.agents?.find((a) => a.id === 'web');
  if (web && web.ok === false) return false;
  return true;
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
    if (!isServableCachedResult(data.result)) return null;
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
