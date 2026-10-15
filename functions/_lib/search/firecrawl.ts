/**
 * 'firecrawl' provider: Firecrawl /v1/search with scrapeOptions markdown →
 * gemini-3.5-flash-lite extraction (no grounding).
 *
 * Env: FIRECRAWL_API_KEY. Docs: https://docs.firecrawl.dev/api-reference/v1-endpoint/search
 * storeInCache:false so scraped pages are not kept in Firecrawl's index.
 */

import {
  MAX_RESULT_PAGES,
  fetchWithTimeout,
  mapSearchHttpError,
  textBlocks,
} from './extract';
import { runMadeInSearch } from './madeInSearch';
import type { FetchedPage, SearchProvider } from './types';

export const FIRECRAWL_ENDPOINT = 'https://api.firecrawl.dev/v1/search';
const FIRECRAWL_MS = 30000;
/** The follow-up made-in query gets a shorter budget than the first search. */
const FIRECRAWL_FOLLOWUP_MS = 20000;

type FirecrawlItem = {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string | null;
  metadata?: { title?: string | string[]; sourceURL?: string };
};

/** One Firecrawl /v1/search call → fetched pages (or the shared error code). */
async function firecrawlPages(
  key: string,
  query: string,
  ms: number
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
        limit: MAX_RESULT_PAGES,
        timeout: ms - 5000,
        scrapeOptions: {
          formats: ['markdown'],
          onlyMainContent: true,
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
    const text = [title, it.description || '', it.markdown || '']
      .filter(Boolean)
      .join('\n')
      .slice(0, 200_000);
    // Markdown keeps rows / lines / headings → text blocks for variant tying.
    pages.push({ url, title, text, blocks: textBlocks(text) });
    if (pages.length >= MAX_RESULT_PAGES) break;
  }
  return { pages };
}

export const firecrawlSearchProvider: SearchProvider = {
  id: 'firecrawl',
  isConfigured(env) {
    return Boolean(env.FIRECRAWL_API_KEY?.trim());
  },
  async search({ entity, ocrText, env }) {
    const key = env.FIRECRAWL_API_KEY?.trim() || '';
    return runMadeInSearch({
      providerId: 'firecrawl',
      entity,
      ocrText,
      env,
      fetchPages: (query, phase) =>
        firecrawlPages(key, query, phase === 'first' ? FIRECRAWL_MS : FIRECRAWL_FOLLOWUP_MS),
    });
  },
};
