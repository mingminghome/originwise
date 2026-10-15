/**
 * 'brave' provider: Brave Search API web results → fetch top pages (short
 * timeout, HTML stripped) → gemini-3.5-flash-lite extraction (no grounding).
 *
 * Env: BRAVE_SEARCH_API_KEY. Docs: https://api-dashboard.search.brave.com/
 */

import {
  MAX_RESULT_PAGES,
  fetchSourcePage,
  fetchWithTimeout,
  mapSearchHttpError,
} from './extract';
import { runMadeInSearch } from './madeInSearch';
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

/** One Brave web-search call → up to MAX_RESULT_PAGES new results (or an error code). */
async function braveResults(
  key: string,
  q: string,
  skip: ReadonlySet<string> = new Set()
): Promise<{ results: BraveResult[] } | { error: string }> {
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
  let data: { web?: { results?: BraveResult[] } };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return { error: 'upstream_error' };
  }
  const seen = new Set<string>(skip);
  const results = (data.web?.results ?? [])
    .filter((r) => r?.url && isHttpUrl(String(r.url)))
    .filter((r) => {
      const u = String(r.url);
      if (seen.has(u)) return false;
      seen.add(u);
      return true;
    })
    .slice(0, MAX_RESULT_PAGES);
  return { results };
}

export const braveSearchProvider: SearchProvider = {
  id: 'brave',
  isConfigured(env) {
    return Boolean(env.BRAVE_SEARCH_API_KEY?.trim());
  },
  async search({ entity, ocrText, env }) {
    const key = env.BRAVE_SEARCH_API_KEY?.trim() || '';
    return runMadeInSearch({
      providerId: 'brave',
      entity,
      ocrText,
      env,
      fetchPages: async (query, _phase, skip) => {
        const got = await braveResults(key, query, skip);
        if ('error' in got) return got;
        const pages = await Promise.all(got.results.map((r) => fetchPageText(r)));
        return { pages };
      },
    });
  },
};
