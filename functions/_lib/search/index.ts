/**
 * Search-provider chain for the "web" research pass.
 *
 *   SEARCH_PROVIDERS=gemini,brave,firecrawl   (default order)
 *
 * Providers without a key are skipped. The next provider runs when the
 * previous one failed, returned no Sources, or its pages did not name a
 * made-in (fewer than two pages, and nothing confirmed). A later provider's
 * own failure is the error shown only when no earlier provider returned
 * pages. Gemini's quota notice is kept only when that later provider never
 * answered (timeout or HTTP 5xx).
 * No query text is logged or stored anywhere in this chain.
 */

import { keepUnitPages } from './extract';
import { braveSearchProvider, firecrawlSearchProvider, geminiSearchProvider } from './providers';
import {
  SEARCH_PROVIDER_IDS,
  type SearchEnv,
  type SearchEvidence,
  type SearchInput,
  type SearchOutput,
  type SearchProvider,
  type SearchProviderId,
} from './types';
import type { DesignInfo, WebCooClaim, WebExcludedPage } from '../schema';

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

function mergeList<T>(a: T[] | undefined, b: T[] | undefined): T[] | undefined {
  const out = [...(a ?? []), ...(b ?? [])];
  return out.length ? out : undefined;
}

/** Keep the first provider's pages and add whatever the next one found. */
export function mergeSearchOutputs(first: SearchOutput, next: SearchOutput): SearchOutput {
  const sources = [...first.sources];
  for (const line of next.sources) if (!sources.includes(line)) sources.push(line);
  const brief = [first.brief, next.brief].filter((s) => s.trim()).join('\n\n');
  const productPages = mergeList(first.evidence?.pages, next.evidence?.pages);
  const factoryPages = mergeList(first.evidence?.factoryPages, next.evidence?.factoryPages);
  const evidence: SearchEvidence | undefined =
    productPages || factoryPages
      ? {
          pages: [...(first.evidence?.pages ?? []), ...(next.evidence?.pages ?? [])],
          factoryPages: factoryPages ?? [],
          droppedUrls: [...(first.evidence?.droppedUrls ?? []), ...(next.evidence?.droppedUrls ?? [])],
        }
      : undefined;
  return {
    ok: true,
    brief,
    sources,
    ms: first.ms + next.ms,
    requests: (first.requests || 0) + (next.requests || 0),
    model: first.model ?? next.model,
    coo: mergeList<WebCooClaim>(first.coo, next.coo),
    excluded: mergeList<WebExcludedPage>(first.excluded, next.excluded),
    design: mergeList<DesignInfo>(first.design, next.design),
    evidence,
  };
}

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
  /** Pages about another model of that name (winning provider). */
  excluded?: SearchOutput['excluded'];
  /** Design / brand wording on product pages (winning provider). */
  design?: SearchOutput['design'];
  /** Page text + dropped-claim URLs for the AI-cited check (winning provider). */
  evidence?: SearchOutput['evidence'];
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
  let geminiNotice: string | undefined;
  let lastError: string | undefined;
  let last: SearchProviderId | undefined;
  let held: SearchOutput | undefined;
  let heldProvider: SearchProviderId | undefined;

  const succeed = (out: SearchOutput, id: SearchProviderId): SearchChainResult => ({
    ok: true,
    brief: out.brief,
    sources: out.sources,
    ms: Date.now() - t0,
    requests,
    provider: id,
    model: out.model,
    coo: out.coo,
    excluded: out.excluded,
    design: out.design,
    evidence: out.evidence,
    tried,
  });

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
      const merged = held ? mergeSearchOutputs(held, out) : out;
      if (!heldProvider) heldProvider = id;
      const pageCount = keepUnitPages(input.entity, merged.evidence?.pages ?? [], input.markets).filter(
        (p) => p.text.trim().length > 80
      ).length;
      if (pageCount < 2) {
        held = merged;
        continue;
      }
      return succeed(merged, heldProvider ?? id);
    }
    if (id === 'gemini' && (err === 'upstream_quota' || err === 'search_grounding_unavailable' || err === 'upstream_credits')) {
      geminiNotice = err;
    }
    lastError = err;
  }

  // An empty Firecrawl/Brave reply is that provider's result. A timeout is not,
  // so the Gemini quota notice still explains why the check has no web data.
  if (held && heldProvider) return succeed(held, heldProvider);

  const laterNeverAnswered = lastError === 'upstream_unavailable' || lastError === 'upstream_error';
  const error = laterNeverAnswered && geminiNotice ? geminiNotice : lastError;

  return {
    ok: false,
    brief: '',
    sources: [],
    error: tried.length ? error ?? 'empty_response' : 'disabled',
    ms: Date.now() - t0,
    requests,
    provider: last,
    tried,
  };
}
