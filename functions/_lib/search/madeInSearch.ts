/**
 * Shared two-step web search for Brave and Firecrawl.
 *
 * First query: the product name, a barcode when we have one, and a required
 * origin term. One follow-up, with different terms and no barcode, when those
 * pages do not already confirm a made-in or back one country on two pages.
 * The provider supplies the HTTP call; this file owns the request count, the
 * follow-up decision, and the page merge.
 */

import {
  buildFactoryQuery,
  buildMadeInQuery,
  buildSearchQuery,
  extractBriefFromPages,
  findJans,
  keepFactoryPages,
  keepUnitPages,
  mergePages,
} from './extract';
import { originSearchTerms } from './originTerms';
import { applyPageKinds, classifyPageKinds } from './pageKinds';
import type { FetchedPage, SearchEnv, SearchOutput } from './types';

export type PageBatch = { pages: FetchedPage[] } | { error: string };

function missed(error: string, requests: number, t0: number): SearchOutput {
  return { ok: false, brief: '', sources: [], error, ms: Date.now() - t0, requests };
}

export async function runMadeInSearch(opts: {
  providerId: 'brave' | 'firecrawl';
  entity: string;
  ocrText?: string;
  locale?: string;
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
  const terms = await originSearchTerms(opts.entity, opts.locale ?? 'en', opts.env);
  const first = await opts.fetchPages(
    buildSearchQuery(opts.entity, jans, terms.madeIn),
    'first',
    new Set()
  );
  if ('error' in first) return missed(first.error, 1, t0);
  if (!first.pages.length) return missed('empty_response', 1, t0);

  let pages = keepUnitPages(opts.entity, first.pages);
  let requests = 1;
  // Foreign or other-model hits do not count, so the follow-up still runs.
  if (pages.length < 2) {
    requests += 1;
    const extra = await opts.fetchPages(
      buildMadeInQuery(opts.entity, terms.madeIn),
      'followup',
      new Set(first.pages.map((p) => p.url))
    );
    if (!('error' in extra) && extra.pages.length) {
      pages = keepUnitPages(opts.entity, mergePages(pages, extra.pages));
    }
  }
  let factoryPages: FetchedPage[] = [];
  if (terms.factory.length) {
    requests += 1;
    const plants = await opts.fetchPages(
      buildFactoryQuery(opts.entity, terms.factory),
      'followup',
      new Set(pages.map((p) => p.url))
    );
    if (!('error' in plants) && plants.pages.length) {
      factoryPages = keepFactoryPages(opts.entity, plants.pages, terms.factory);
    }
  }
  if (!pages.length && !factoryPages.length) return missed('empty_response', requests, t0);
  const kinds = await classifyPageKinds(opts.entity, [...pages, ...factoryPages], opts.env);
  const split = applyPageKinds(pages, factoryPages, kinds);
  pages = split.pages;
  factoryPages = split.factoryPages;
  if (!pages.length && !factoryPages.length) return missed('empty_response', requests, t0);
  return extractBriefFromPages({
    providerId: opts.providerId,
    entity: opts.entity,
    ocrText: opts.ocrText,
    pages,
    factoryPages,
    env: opts.env,
    requests,
    t0,
  });
}
