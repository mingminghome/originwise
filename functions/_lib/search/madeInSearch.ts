/**
 * Shared two-step web search for Brave and Firecrawl.
 *
 * With a barcode: one narrow query, then at most one wider query (no barcode)
 * when those pages do not already confirm a made-in or back one country on
 * two pages. With no barcode the first query is already the wide one, so
 * there is no second request. The provider supplies the HTTP call; this file
 * owns the request count, the follow-up decision, and the page merge.
 */

import {
  buildMadeInQuery,
  buildSearchQuery,
  extractBriefFromPages,
  findJans,
  mergePages,
  needsMadeInFollowup,
} from './extract';
import type { FetchedPage, SearchEnv, SearchOutput } from './types';

export type PageBatch = { pages: FetchedPage[] } | { error: string };

function missed(error: string, requests: number, t0: number): SearchOutput {
  return { ok: false, brief: '', sources: [], error, ms: Date.now() - t0, requests };
}

export async function runMadeInSearch(opts: {
  providerId: 'brave' | 'firecrawl';
  entity: string;
  ocrText?: string;
  env: SearchEnv;
  /**
   * One search API call. `skipUrls` are pages already kept, so the follow-up
   * does not fetch them again. An error skips the merge and keeps the pages
   * already in hand.
   */
  fetchPages: (
    query: string,
    phase: 'first' | 'followup',
    skipUrls: ReadonlySet<string>
  ) => Promise<PageBatch>;
}): Promise<SearchOutput> {
  const t0 = Date.now();
  const jans = findJans(opts.entity, opts.ocrText);
  // No barcode: the wide made-in query is the only request. A follow-up would
  // repeat it. A barcode stays on the narrow query, and the follow-up drops it.
  const first = await opts.fetchPages(
    jans.length ? buildSearchQuery(opts.entity, jans) : buildMadeInQuery(opts.entity),
    'first',
    new Set()
  );
  if ('error' in first) return missed(first.error, 1, t0);
  if (!first.pages.length) return missed('empty_response', 1, t0);

  let pages = first.pages;
  let requests = 1;
  if (jans.length && needsMadeInFollowup(opts.entity, opts.ocrText, pages)) {
    requests += 1;
    const extra = await opts.fetchPages(
      buildMadeInQuery(opts.entity),
      'followup',
      new Set(pages.map((p) => p.url))
    );
    if (!('error' in extra) && extra.pages.length) pages = mergePages(pages, extra.pages);
  }
  return extractBriefFromPages({
    providerId: opts.providerId,
    entity: opts.entity,
    ocrText: opts.ocrText,
    pages,
    env: opts.env,
    requests,
    t0,
  });
}
