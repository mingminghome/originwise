/**
 * Best-effort result cache via Cache API (no KV required on Free tier).
 *
 * Cache API is per-colo: a skip-cache write on one edge may not be visible on
 * another. Servable-gate + version bumps keep tip UI from sticking on weak
 * stale hits (未確認 / web-fail) when a fresh pass would stamp Final COO.
 */

import { normalizeQuery } from './normalizeQuery';
import type { CheckDimension, CheckResult } from './schema';
import type { GeoScope } from './schema';

export type CacheLookupKey = {
  text: string;
  locale: string;
  geoScope: GeoScope;
  dimensions: CheckDimension[];
};

function sortedDims(dims: CheckDimension[]): string {
  return [...dims].sort().join(',');
}

/**
 * Bump when the check prompts, web research, or the result shape change.
 * v8: one composed query (sections), not separate product/company/alternatives calls
 * v9: 依型號比對 (madeInBasis 'model', madeInSupport), AI-cited sources
 *     (citedUnverified / citedFetches), searchExcluded, exactModel /
 *     evidenceOnly on searchCoo
 * v10: design / brand wording is never made-in (product.designInfo,
 *     附加資訊), 爭議 line on disagreeing pages
 * v11: AI-cited / search made-in evidence must be a product page (no
 *     homepage, listing or search page) and sit under this model; the prompt
 *     asks for the product page and the exact grounding redirect link
 * v12: AI made-in is kept as a source vote (Germany 1/5), including when it
 *     matches brand home; barcode-apology notes are not stored as the answer
 * v14: the query's writing selects the market unit (kana = Japan-sold).
 *     Another market's factory is not this unit's made-in.
 * v15: a continent (Europe / 歐洲) is not a part country or a made-in.
 * v16: a made-in line on a multi-size page about this product is a source
 *     vote (voteOnly). It does not confirm.
 * v17: the overall summary and score are a separate model JSON step.
 * v18: that JSON is the shown result (summary, score, made-in, company).
 *     The share image is one card of that JSON. Older entries drew a post per layer.
 * v19: made-in and company are cards ({headline, lines}) the page prints.
 * v20: the score step also receives part countries, and a design country
 *     is not the made-in.
 * v21: search quotes the product, requires an origin term, and excludes
 *     design and price-list pages. A second query runs when the first pages
 *     do not confirm a made-in, even with no barcode. The score step receives
 *     China relations. A caveat that asks for package inspection is dropped.
 * v22: the source count matches the listed pages. A search with no made-in
 *     continues to the next provider. The follow-up query drops the brand word.
 * v23: search words come from the query language, not a market list. A made-in
 *     line is kept when its quote is on the page. A search URL is a search
 *     path, not a shop-host list.
 * v24: a tier region comes from the country table. A city or province list
 *     is not a second gazetteer.
 * v25: the card is the tidy step plus the score step. Country lists are gone.
 * v28: a factory or OEM search is kept beside the made-in pages, and the
 *     graph draws the model answer, design, and those plants.
 * v29: a factory row needs a real plant. The brand plus a country is not a plant.
 * v30: origin search and the research prompt no longer list shop phrases.
 *     The card reads country fields. It does not scan notes for China,
 *     design, or a denied factory.
 * v31: two agreeing exact-model pages, or the model plus one such page,
 *     confirm the made-in. A continent is not a country. Country names are
 *     in the reader's language. A review page is not a made-in vote.
 * v32: a CLDR region or grouping is not a made-in vote or a confirmation.
 *     The made-in confidence chip uses only that confirmation's own confidence.
 * v33: region names are matched from generated Intl labels, including a
 *     region named inside a longer label. A page country counts only when
 *     its quote names that country.
 */
export const CACHE_KEY_VERSION = 'check:v33';

export async function cacheKeyHash(parts: CacheLookupKey): Promise<string> {
  const material = [
    CACHE_KEY_VERSION,
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
  const madeUnknown = !made;
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

/**
 * The JSON stored in the result cache. The cache is keyed by product query,
 * so the stored copy must not carry anything tied to the person who ran the
 * first check: the job ID is dropped (a cache hit gets the new job's ID in
 * check.ts), along with any request-level fields.
 */
export function cacheEntryBody(result: CheckResult, cachedAt: string): string {
  const { jobId: _jobId, cached: _cached, cachedAt: _prev, ...meta } =
    (result.meta ?? {}) as CheckResult['meta'] & Record<string, unknown>;
  delete (meta as Record<string, unknown>).ipHash;
  const stored = { ...result, meta } as Record<string, unknown>;
  delete stored.jobId;
  delete stored.ipHash;
  return JSON.stringify({ result: stored, cachedAt });
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
    const body = cacheEntryBody(result, new Date().toISOString());
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
