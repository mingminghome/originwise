/**
 * 'brave' provider: Brave Search API web results → fetch top pages (short
 * timeout, HTML stripped) → gemini-3.5-flash-lite extraction (no grounding).
 *
 * Env: BRAVE_SEARCH_API_KEY. Docs: https://api-dashboard.search.brave.com/
 */

import {
  MAX_RESULT_PAGES,
  buildSearchQuery,
  extractBriefFromPages,
  fetchSourcePage,
  fetchWithTimeout,
  findJans,
  mapSearchHttpError,
} from './extract';
import type { FetchedPage, SearchProvider } from './types';

export const BRAVE_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';
const BRAVE_SEARCH_MS = 10000;

type BraveResult = {
  url?: string;
  title?: string;
  description?: string;
  extra_snippets?: string[];
};

function isHttpUrl(u: string): boolean {
  return /^https?:\/\//i.test(u);
}

function fetchPageText(r: BraveResult): Promise<FetchedPage> {
  return fetchSourcePage(String(r.url), r.title || '', [
    r.description || '',
    ...(r.extra_snippets || []),
  ].join('\n'));
}

export const braveSearchProvider: SearchProvider = {
  id: 'brave',
  isConfigured(env) {
    return Boolean(env.BRAVE_SEARCH_API_KEY?.trim());
  },
  async search({ entity, ocrText, env }) {
    const t0 = Date.now();
    const key = env.BRAVE_SEARCH_API_KEY?.trim() || '';
    const jans = findJans(entity, ocrText);
    const q = buildSearchQuery(entity, jans);
    const params = new URLSearchParams({
      q,
      count: String(MAX_RESULT_PAGES + 2),
      extra_snippets: 'true',
      safesearch: 'moderate',
    });
    const res = await fetchWithTimeout(
      `${BRAVE_ENDPOINT}?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': key,
        },
      },
      BRAVE_SEARCH_MS
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
    let data: { web?: { results?: BraveResult[] } };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      return { ok: false, brief: '', sources: [], error: 'upstream_error', ms: Date.now() - t0, requests: 1 };
    }
    const seen = new Set<string>();
    const results = (data.web?.results ?? [])
      .filter((r) => r?.url && isHttpUrl(String(r.url)))
      .filter((r) => {
        const u = String(r.url);
        if (seen.has(u)) return false;
        seen.add(u);
        return true;
      })
      .slice(0, MAX_RESULT_PAGES);
    if (!results.length) {
      return { ok: false, brief: '', sources: [], error: 'empty_response', ms: Date.now() - t0, requests: 1 };
    }
    const pages = await Promise.all(results.map((r) => fetchPageText(r)));
    return extractBriefFromPages({
      providerId: 'brave',
      entity,
      ocrText,
      pages,
      env,
      requests: 1,
      t0,
    });
  },
};
