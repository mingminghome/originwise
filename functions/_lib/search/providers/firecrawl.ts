/**
 * 'firecrawl' provider: Firecrawl /v1/search with scrapeOptions markdown →
 * gemini-3.5-flash-lite extraction (no grounding).
 *
 * Env: FIRECRAWL_API_KEY. Docs: https://docs.firecrawl.dev/api-reference/v1-endpoint/search
 * storeInCache:false so scraped pages are not kept in Firecrawl's index.
 */

import { searchMarket } from '../../queryMarket';
import { MAX_RESULT_PAGES, fetchWithTimeout, mapSearchHttpError, stripHtml } from '../extract';
import { runMadeInSearch } from '../madeInSearch';
import type { FetchedPage, SearchProvider } from '../types';

export const FIRECRAWL_ENDPOINT = 'https://api.firecrawl.dev/v1/search';
/** Three scraped Japan pages do not finish inside 18s. */
const FIRECRAWL_MS = 40000;
/** The follow-up made-in query gets a shorter budget than the first search. */
const FIRECRAWL_FOLLOWUP_MS = 25000;

type FirecrawlItem = {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string | null;
  html?: string | null;
  rawHtml?: string | null;
  metadata?: { title?: string | string[]; sourceURL?: string };
};

/** One Firecrawl /v1/search call → fetched pages (or the shared error code). */
async function firecrawlPages(
  key: string,
  query: string,
  ms: number,
  location?: string
): Promise<{ pages: FetchedPage[] } | { error: string }> {
  const res = await fetchWithTimeout(
    FIRECRAWL_ENDPOINT,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: Math.min(MAX_RESULT_PAGES, 3),
        ...(location ? { location } : {}),
        timeout: ms - 5000,
        scrapeOptions: {
          // Full HTML, then we drop header, nav, and footer. Main-content
          // markdown leaves out a folded product tab.
          formats: ['rawHtml'],
          onlyMainContent: false,
          storeInCache: false,
        },
      }),
    },
    ms
  );
  if (!res) return { error: 'upstream_unavailable' };
  if (!res.ok) {
    let body = '';
    try {
      body = await res.text();
    } catch {
      /* ignore */
    }
    return { error: mapSearchHttpError(res.status, body) };
  }
  let data: { success?: boolean; data?: FirecrawlItem[] };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return { error: 'upstream_error' };
  }
  const seen = new Set<string>();
  const pages: FetchedPage[] = [];
  for (const it of data.data ?? []) {
    const url = String(it?.url || it?.metadata?.sourceURL || '');
    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    const metaTitle = Array.isArray(it.metadata?.title)
      ? it.metadata?.title[0]
      : it.metadata?.title;
    const title = String(it.title || metaTitle || '').trim();
    const raw = String(it.rawHtml || it.html || '');
    const body = raw ? stripHtml(raw) : String(it.markdown || '');
    const text = [title, it.description || '', body]
      .filter(Boolean)
      .join('\n')
      .slice(0, 200_000);
    pages.push({ url, title, text });
    if (pages.length >= MAX_RESULT_PAGES) break;
  }
  return { pages };
}

export const firecrawlSearchProvider: SearchProvider = {
  id: 'firecrawl',
  isConfigured(env) {
    return Boolean(env.FIRECRAWL_API_KEY?.trim());
  },
  async search({ entity, ocrText, locale, env }) {
    const key = env.FIRECRAWL_API_KEY?.trim() || '';
    return runMadeInSearch({
      providerId: 'firecrawl',
      entity,
      ocrText,
      locale,
      env,
      fetchPages: (query, phase) =>
        firecrawlPages(
          key,
          query,
          phase === 'first' ? FIRECRAWL_MS : FIRECRAWL_FOLLOWUP_MS,
          searchMarket(entity)?.location
        ),
    });
  },
};
