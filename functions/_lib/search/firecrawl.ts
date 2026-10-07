/**
 * 'firecrawl' provider: Firecrawl /v1/search with scrapeOptions markdown →
 * gemini-3.5-flash-lite extraction (no grounding).
 *
 * Env: FIRECRAWL_API_KEY. Docs: https://docs.firecrawl.dev/api-reference/v1-endpoint/search
 * storeInCache:false so scraped pages are not kept in Firecrawl's index.
 */

import {
  MAX_RESULT_PAGES,
  buildSearchQuery,
  extractBriefFromPages,
  fetchWithTimeout,
  findJans,
  mapSearchHttpError,
  textBlocks,
} from './extract';
import type { FetchedPage, SearchProvider } from './types';

export const FIRECRAWL_ENDPOINT = 'https://api.firecrawl.dev/v1/search';
const FIRECRAWL_MS = 30000;

type FirecrawlItem = {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string | null;
  metadata?: { title?: string | string[]; sourceURL?: string };
};

export const firecrawlSearchProvider: SearchProvider = {
  id: 'firecrawl',
  isConfigured(env) {
    return Boolean(env.FIRECRAWL_API_KEY?.trim());
  },
  async search({ entity, ocrText, env }) {
    const t0 = Date.now();
    const key = env.FIRECRAWL_API_KEY?.trim() || '';
    const jans = findJans(entity, ocrText);
    const res = await fetchWithTimeout(
      FIRECRAWL_ENDPOINT,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: buildSearchQuery(entity, jans),
          limit: MAX_RESULT_PAGES,
          timeout: FIRECRAWL_MS - 5000,
          scrapeOptions: {
            formats: ['markdown'],
            onlyMainContent: true,
            storeInCache: false,
          },
        }),
      },
      FIRECRAWL_MS
    );
    if (!res) {
      return { ok: false, brief: '', sources: [], error: 'upstream_unavailable', ms: Date.now() - t0, requests: 1 };
    }
    if (!res.ok) {
      let body = '';
      try {
        body = await res.text();
      } catch {
        /* ignore */
      }
      return {
        ok: false,
        brief: '',
        sources: [],
        error: mapSearchHttpError(res.status, body),
        ms: Date.now() - t0,
        requests: 1,
      };
    }
    let data: { success?: boolean; data?: FirecrawlItem[] };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      return { ok: false, brief: '', sources: [], error: 'upstream_error', ms: Date.now() - t0, requests: 1 };
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
    if (!pages.length) {
      return { ok: false, brief: '', sources: [], error: 'empty_response', ms: Date.now() - t0, requests: 1 };
    }
    return extractBriefFromPages({
      providerId: 'firecrawl',
      entity,
      ocrText,
      pages,
      env,
      requests: 1,
      t0,
    });
  },
};
