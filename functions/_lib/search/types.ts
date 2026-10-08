/**
 * Pluggable web-search providers for the OriginWise "web" research pass.
 *
 * Order: SEARCH_PROVIDERS (default "gemini,brave,firecrawl"). A provider runs
 * only when the previous one failed or returned no Sources; providers with no
 * key are skipped. Nothing here records or logs the query text.
 */

import type { WebCooClaim, WebExcludedPage } from '../schema';
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
  /**
   * Gated made-in claims from fetched pages (every provider; for Gemini the
   * grounding Sources): basis 'barcode' → confirmed, 'name' → likely.
   */
  coo?: WebCooClaim[];
  /** Pages about another model of that name (not counted, listed on the card). */
  excluded?: WebExcludedPage[];
};

export interface SearchProvider {
  id: SearchProviderId;
  isConfigured(env: SearchEnv): boolean;
  search(input: SearchInput): Promise<SearchOutput>;
}

/** One fetched page handed to the extractor. */
export type FetchedPage = {
  url: string;
  /** Landing URL after redirects (Gemini Sources are redirect links). */
  finalUrl?: string;
  title: string;
  text: string;
  /**
   * Structural blocks used to tie a barcode to a made-in line on multi-variant
   * pages. 'html' = text of one <tr>/<li>/<dl>/<p>/<section>/variant element;
   * 'text' = one markdown/plain line or a small blank-line/heading-bounded block.
   * Derived from `text` (as 'text' blocks) when absent.
   */
  blocks?: PageBlock[];
};

export type PageBlock = { kind: 'html' | 'text'; text: string };
