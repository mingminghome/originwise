/**
 * 'firecrawl' provider: Firecrawl /v1/search with scrapeOptions markdown →
 * gemini-3.5-flash-lite extraction (no grounding).
 *
 * Env: FIRECRAWL_API_KEY. Docs: https://docs.firecrawl.dev/api-reference/v1-endpoint/search
 * storeInCache:false so scraped pages are not kept in Firecrawl's index.
 */

import {
  MAX_RESULT_PAGES,
  buildMadeInQuery,
  buildSearchQuery,
  extractBriefFromPages,
  fetchWithTimeout,
  findJans,
  mapSearchHttpError,
  mergePages,
  needsMadeInFollowup,
  textBlocks,
} from './extract';
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
    const t0 = Date.now();
    const key = env.FIRECRAWL_API_KEY?.trim() || '';
    const jans = findJans(entity, ocrText);
    const first = await firecrawlPages(key, buildSearchQuery(entity, jans), FIRECRAWL_MS);
    if ('error' in first) {
      return { ok: false, brief: '', sources: [], error: first.error, ms: Date.now() - t0, requests: 1 };
    }
    if (!first.pages.length) {
      return { ok: false, brief: '', sources: [], error: 'empty_response', ms: Date.now() - t0, requests: 1 };
    }
    let pages = first.pages;
    let requests = 1;
    // One bounded follow-up: model name + wider made-in wording (產地 / 製造地 /
    // country of origin), only when the first pages back no made-in yet.
    if (needsMadeInFollowup(entity, ocrText, pages)) {
      requests += 1;
      const extra = await firecrawlPages(key, buildMadeInQuery(entity), FIRECRAWL_FOLLOWUP_MS);
      if (!('error' in extra)) pages = mergePages(pages, extra.pages);
    }
    return extractBriefFromPages({
      providerId: 'firecrawl',
      entity,
      ocrText,
      pages,
      env,
      requests,
      t0,
    });
  },
};
