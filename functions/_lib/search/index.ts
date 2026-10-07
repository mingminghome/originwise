/**
 * Search-provider chain for the "web" research pass.
 *
 *   SEARCH_PROVIDERS=gemini,brave,firecrawl   (default order)
 *
 * Providers without a key are skipped. The next provider runs only when the
 * previous one failed or returned no Sources. When every provider fails, the
 * Gemini error code is kept (e.g. upstream_quota → daily quota notice).
 * No query text is logged or stored anywhere in this chain.
 */

import { braveSearchProvider } from './brave';
import { firecrawlSearchProvider } from './firecrawl';
import { geminiSearchProvider } from './gemini';
import {
  SEARCH_PROVIDER_IDS,
  type SearchEnv,
  type SearchInput,
  type SearchOutput,
  type SearchProvider,
  type SearchProviderId,
} from './types';

export * from './types';
export { braveSearchProvider, firecrawlSearchProvider, geminiSearchProvider };

export const DEFAULT_SEARCH_PROVIDERS: readonly SearchProviderId[] = SEARCH_PROVIDER_IDS;

export const SEARCH_PROVIDERS_BY_ID: Record<SearchProviderId, SearchProvider> = {
  gemini: geminiSearchProvider,
  brave: braveSearchProvider,
  firecrawl: firecrawlSearchProvider,
};

const ALIASES: Record<string, SearchProviderId> = {
  gemini: 'gemini',
  google: 'gemini',
  brave: 'brave',
  firecrawl: 'firecrawl',
};

/** Parse SEARCH_PROVIDERS; unknown ids dropped; empty → default order. */
export function parseSearchProviderOrder(env: SearchEnv): SearchProviderId[] {
  const raw = String(env.SEARCH_PROVIDERS ?? '').trim();
  if (!raw) return [...DEFAULT_SEARCH_PROVIDERS];
  const out: SearchProviderId[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const id = ALIASES[part.toLowerCase()];
    if (id && !out.includes(id)) out.push(id);
  }
  return out.length ? out : [...DEFAULT_SEARCH_PROVIDERS];
}

/** WEB_LOOKUP off → false; otherwise on when any listed provider has a key. */
export function isSearchEnabled(
  env: SearchEnv,
  providers: Record<SearchProviderId, SearchProvider> = SEARCH_PROVIDERS_BY_ID
): boolean {
  const raw = String(env.WEB_LOOKUP ?? 'auto')
    .toLowerCase()
    .trim();
  if (raw === '0' || raw === 'off' || raw === 'false' || raw === 'no') {
    return false;
  }
  return parseSearchProviderOrder(env).some((id) =>
    providers[id].isConfigured(env)
  );
}

export type SearchAttempt = {
  provider: SearchProviderId;
  ok: boolean;
  error?: string;
  requests: number;
  ms: number;
};

export type SearchChainResult = {
  ok: boolean;
  brief: string;
  sources: string[];
  error?: string;
  ms: number;
  /** Total search API requests across every provider tried. */
  requests: number;
  /** Provider that succeeded, else the last one tried. */
  provider?: SearchProviderId;
  model?: string;
  /** Gated made-in claims from the winning Brave/Firecrawl provider. */
  coo?: SearchOutput['coo'];
  tried: SearchAttempt[];
};

export async function runSearchChain(
  input: SearchInput,
  opts: {
    providers?: Record<SearchProviderId, SearchProvider>;
    /** Called right before a provider is sent the lookup (UI names it). */
    onAttempt?: (id: SearchProviderId) => void;
  } = {}
): Promise<SearchChainResult> {
  const t0 = Date.now();
  const providers = opts.providers ?? SEARCH_PROVIDERS_BY_ID;
  const tried: SearchAttempt[] = [];
  let requests = 0;
  let geminiError: string | undefined;
  let firstError: string | undefined;
  let last: SearchProviderId | undefined;

  for (const id of parseSearchProviderOrder(input.env)) {
    const p = providers[id];
    if (!p || !p.isConfigured(input.env)) continue;
    last = id;
    opts.onAttempt?.(id);
    let out;
    try {
      out = await p.search(input);
    } catch {
      out = {
        ok: false,
        brief: '',
        sources: [],
        error: 'upstream_error',
        ms: 0,
        requests: 0,
      };
    }
    requests += out.requests || 0;
    const hit = out.ok && out.sources.length > 0 && Boolean(out.brief.trim());
    const err = hit ? undefined : out.error || 'empty_response';
    tried.push({ provider: id, ok: hit, error: err, requests: out.requests || 0, ms: out.ms });
    if (hit) {
      return {
        ok: true,
        brief: out.brief,
        sources: out.sources,
        ms: Date.now() - t0,
        requests,
        provider: id,
        model: out.model,
        coo: out.coo,
        tried,
      };
    }
    if (id === 'gemini') geminiError = err;
    firstError ??= err;
  }

  return {
    ok: false,
    brief: '',
    sources: [],
    error: tried.length ? geminiError ?? firstError ?? 'empty_response' : 'disabled',
    ms: Date.now() - t0,
    requests,
    provider: last,
    tried,
  };
}
