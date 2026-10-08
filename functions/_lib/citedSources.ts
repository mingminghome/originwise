/**
 * AI-cited made-in pages (item h). The model may name up to
 * MAX_CITED_SOURCES pages behind its made-in answer. Model-cited URLs can be
 * invented, so none counts until it is checked:
 *   1. same URL (normalised) as a page the web search already returned →
 *      counts, no fetch;
 *   2. otherwise one fetch with the configured provider (Firecrawl scrape on
 *      Firecrawl runs, a plain page fetch otherwise), short timeout: the page
 *      must load, name the exact model (brand + model, variant-safe) and name
 *      the country in a made-in line (or carry the quoted made-in words).
 * Links that match a search result are checked first; at most
 * MAX_CITED_SOURCES are checked, so the worst case is MAX_CITED_SOURCES
 * extra fetches per check. A verified page becomes an exact-model web claim
 * (WebCooClaim.cited); a failed one is listed as 「AI 引用，未能驗證」 and never
 * counts.
 */
import { canonicalCountry } from './countryLabel';
import type { CitedSource, WebCooClaim } from './schema';
import {
  compact,
  exactModelPage,
  fetchSourcePage,
  fetchWithTimeout,
  regexCooClaims,
  stripHtml,
} from './search/extract';
import { isSearchResultUrl } from './sourceLine';
import type { FetchedPage, SearchEnv, SearchProviderId } from './search/types';

/** Cited pages asked for and checked per check (Ming: 2). */
export const MAX_CITED_SOURCES = 2;
/** Per-fetch timeout for a cited page. */
export const CITED_FETCH_MS = 4000;
export const FIRECRAWL_SCRAPE_ENDPOINT = 'https://api.firecrawl.dev/v1/scrape';

const TRACKING_PARAM = /^(utm_\w+|ref|ref_|fbclid|gclid|yclid|mc_\w+|spm|_ga)$/i;

/**
 * Comparable form of a URL: scheme and "www." ignored, host lower-cased,
 * #fragment and tracking parameters dropped, other parameters sorted,
 * trailing slash dropped.
 */
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const params = [...u.searchParams.entries()]
      .filter(([k]) => !TRACKING_PARAM.test(k))
      .sort(([a], [b]) => a.localeCompare(b));
    const q = params.length ? `?${new URLSearchParams(params).toString()}` : '';
    const path = decodeURI(u.pathname).replace(/\/+$/, '');
    return `${host}${path}${q}`;
  } catch {
    return raw.trim().toLowerCase();
  }
}

function sameCountry(a: string, b: string): boolean {
  const ca = canonicalCountry(a);
  const cb = canonicalCountry(b);
  return ca ? ca === cb : compact(a) === compact(b);
}

/** The page loads, names the exact model, and names `country` as its made-in. */
export function citedPageConfirms(
  page: FetchedPage,
  entity: string,
  country: string,
  quote?: string
): boolean {
  const text = page.text || '';
  if (!text.trim() || !exactModelPage(text, entity)) return false;
  const lines = regexCooClaims([page]);
  // A made-in line for another country on the page: not support.
  if (lines.some((c) => !sameCountry(c.country, country))) return false;
  if (lines.some((c) => sameCountry(c.country, country))) return true;
  // No made-in line the regex reads: the model's own quote must be on the page
  // and name the country.
  const q = (quote || '').trim();
  return q.length >= 3 && compact(text).includes(compact(q)) && sameCountry(q, country);
}

/** http(s) on a public host name (no IP literals, localhost or .local / .internal). */
export function isPublicHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    if (!h.includes('.') || h.startsWith('[') || /^[\d.]+$/.test(h)) return false;
    return !/(^|\.)(localhost|local|internal|lan|home|arpa)$/.test(h);
  } catch {
    return false;
  }
}

type FetchCited = (url: string) => Promise<FetchedPage | null>;

/** Firecrawl /v1/scrape for one URL (1 credit), or null when it fails. */
async function firecrawlScrape(key: string, url: string): Promise<FetchedPage | null> {
  const res = await fetchWithTimeout(
    FIRECRAWL_SCRAPE_ENDPOINT,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        storeInCache: false,
        timeout: CITED_FETCH_MS - 500,
      }),
    },
    CITED_FETCH_MS
  );
  if (!res || !res.ok) return null;
  try {
    const data = (await res.json()) as {
      success?: boolean;
      data?: { markdown?: string; metadata?: { title?: string; statusCode?: number; sourceURL?: string; url?: string } };
    };
    const md = data.data?.markdown || '';
    const status = data.data?.metadata?.statusCode ?? 200;
    if (!data.success || status >= 400 || !md.trim()) return null;
    const title = stripHtml(data.data?.metadata?.title || '');
    return { url, title, text: [title, md].filter(Boolean).join('\n') };
  } catch {
    return null;
  }
}

/** Plain page fetch (Brave / Gemini runs), short timeout; null when it does not load. */
async function plainFetch(url: string): Promise<FetchedPage | null> {
  const page = await fetchSourcePage(url);
  // fetchSourcePage keeps the (empty) title on failure; no body → did not load.
  return page.text.trim() ? page : null;
}

/** The fetcher for this run's search provider. */
export function citedFetcher(provider: SearchProviderId | undefined, env: SearchEnv): FetchCited {
  const key = env.FIRECRAWL_API_KEY?.trim();
  if (provider === 'firecrawl' && key) return (url) => firecrawlScrape(key, url);
  return plainFetch;
}

export type CitedCheck = {
  /** Exact-model web claims for the AI's country (count under the 依型號比對 rule). */
  verified: WebCooClaim[];
  /** Shown as 「AI 引用，未能驗證」; never counted. */
  unverified: CitedSource[];
  /** Extra fetches spent (≤ MAX_CITED_SOURCES). */
  fetches: number;
};

/**
 * Check the model's cited made-in pages. `country` is the model's own
 * made-in answer; `searchUrls` every page URL the web search returned;
 * `searchCoo` the gated claims from those pages.
 */
export async function verifyCitedSources(opts: {
  entity: string;
  country: string | undefined;
  cited: CitedSource[] | undefined;
  searchUrls: string[];
  searchCoo: WebCooClaim[];
  fetchPage: FetchCited;
}): Promise<CitedCheck> {
  const out: CitedCheck = { verified: [], unverified: [], fetches: 0 };
  const cited = opts.cited ?? [];
  if (!cited.length) return out;
  const country = (opts.country || '').trim();
  // No made-in answer to back: the links back nothing; list them, unchecked.
  if (!canonicalCountry(country)) {
    out.unverified = cited.slice(0, MAX_CITED_SOURCES);
    return out;
  }
  const searchByKey = new Map(opts.searchUrls.map((u) => [normalizeUrl(u), u]));
  const claimByKey = new Map(
    opts.searchCoo.filter((c) => c.url).map((c) => [normalizeUrl(c.url!), c])
  );
  // Links that match a search result first; then the rest, in the model's order.
  const ordered = [...cited]
    .map((c, i) => ({ c, i, hit: searchByKey.get(normalizeUrl(c.url)) }))
    .sort((a, b) => Number(Boolean(b.hit)) - Number(Boolean(a.hit)) || a.i - b.i)
    .slice(0, MAX_CITED_SOURCES);
  for (const { c, hit } of ordered) {
    if (hit) {
      const claim = claimByKey.get(normalizeUrl(hit));
      if (claim && !sameCountry(claim.country, country)) {
        // The search read another made-in on that page.
        out.unverified.push(c);
      } else if (!claim) {
        out.verified.push({
          country,
          basis: 'name',
          status: 'likely',
          url: hit,
          exactModel: true,
          cited: 'search',
        });
      }
      // Same country already claimed from that page: it already counts.
      continue;
    }
    if (!isPublicHttpUrl(c.url) || isSearchResultUrl(c.url)) {
      out.unverified.push(c);
      continue;
    }
    out.fetches += 1;
    const page = await opts.fetchPage(c.url).catch(() => null);
    if (page && citedPageConfirms(page, opts.entity, country, c.quote)) {
      out.verified.push({
        country,
        basis: 'name',
        status: 'likely',
        url: c.url,
        exactModel: true,
        cited: 'fetched',
      });
    } else {
      out.unverified.push(c);
    }
  }
  return out;
}
