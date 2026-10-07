/**
 * 'brave' provider: Brave Search API web results → fetch top pages (short
 * timeout, HTML stripped) → gemini-3.5-flash-lite extraction (no grounding).
 *
 * Env: BRAVE_SEARCH_API_KEY. Docs: https://api-dashboard.search.brave.com/
 */

import {
  MAX_RESULT_PAGES,
  PAGE_FETCH_MS,
  buildSearchQuery,
  extractBriefFromPages,
  fetchWithTimeout,
  findJans,
  mapSearchHttpError,
  stripHtml,
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

async function fetchPageText(r: BraveResult): Promise<FetchedPage> {
  const url = String(r.url);
  const title = stripHtml(r.title || '');
  const snippet = stripHtml(
    [r.description || '', ...(r.extra_snippets || [])].join('\n')
  );
  const res = await fetchWithTimeout(
    url,
    {
      headers: {
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8',
        'User-Agent': 'OriginWise/1.0 (+https://originwise.pages.dev)',
      },
      redirect: 'follow',
    },
    PAGE_FETCH_MS
  );
  let body = '';
  if (res && res.ok) {
    const ct = res.headers.get('content-type') || '';
    if (!ct || /text\/html|text\/plain|xhtml/i.test(ct)) {
      try {
        const raw = await res.text();
        body = /html/i.test(ct) || /<html|<body|<div/i.test(raw.slice(0, 2000))
          ? stripHtml(raw)
          : raw.slice(0, 200_000);
      } catch {
        body = '';
      }
    }
  }
  // Brave's own snippets for this URL stay as fallback text when fetch fails.
  return { url, title, text: [title, snippet, body].filter(Boolean).join('\n') };
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
