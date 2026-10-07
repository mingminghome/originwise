/**
 * Pluggable web-search providers for the OriginWise "web" research pass.
 *
 * Order: SEARCH_PROVIDERS (default "gemini,brave,firecrawl"). A provider runs
 * only when the previous one failed or returned no Sources; providers with no
 * key are skipped. Nothing here records or logs the query text.
 */

import type { WebResearchEnv } from '../webResearch';

export type SearchProviderId = 'gemini' | 'brave' | 'firecrawl';

export const SEARCH_PROVIDER_IDS: readonly SearchProviderId[] = [
  'gemini',
  'brave',
  'firecrawl',
];

export type SearchEnv = WebResearchEnv & {
  /** Brave Search API subscription token (X-Subscription-Token). */
  BRAVE_SEARCH_API_KEY?: string;
  /** Firecrawl API key (Bearer). */
  FIRECRAWL_API_KEY?: string;
  /** Comma list, e.g. "gemini,brave,firecrawl" (default). Unknown ids ignored. */
  SEARCH_PROVIDERS?: string;
};

export type SearchInput = {
  entity: string;
  ocrText?: string;
  locale: string;
  env: SearchEnv;
};

export type SearchOutput = {
  ok: boolean;
  /** Same shape as the Gemini grounded brief: bullets + "Sources:" block. */
  brief: string;
  /** "title — url" lines (or bare URLs), every page used. */
  sources: string[];
  error?: string;
  ms: number;
  /** Paid/quota-counted search API requests made by this provider. */
  requests: number;
  /** Model id used (Gemini grounding model, or extraction model). */
  model?: string;
};

export interface SearchProvider {
  id: SearchProviderId;
  isConfigured(env: SearchEnv): boolean;
  search(input: SearchInput): Promise<SearchOutput>;
}

/** One fetched page handed to the extractor. */
export type FetchedPage = {
  url: string;
  title: string;
  text: string;
};
