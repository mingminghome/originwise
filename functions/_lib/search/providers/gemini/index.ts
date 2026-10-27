/**
 * Gemini search provider. Google Search grounding lives in this folder.
 * Brave and Firecrawl have their own files. This one returns page text.
 * The tidy step reads that text. This file does not name a country.
 */

import {
  MAX_RESULT_PAGES,
  fetchSourcePage,
  keepUnitPages,
  parseSourceLine,
  productSourceLines,
} from '../../extract';
import { applyPageKinds, classifyPageKinds } from '../../pageKinds';
import type { FetchedPage, SearchEvidence, SearchProvider } from '../../types';
import { runWebResearch } from './research';

export const geminiSearchProvider: SearchProvider = {
  id: 'gemini',
  isConfigured(env) {
    return Boolean(env.GEMINI_API_KEY?.trim());
  },
  async search({ entity, ocrText, locale, env }) {
    const wr = await runWebResearch({ entity, ocrText, locale, env });
    const ok = wr.ok && Boolean(wr.brief.trim());
    let sources = ok ? wr.sources : [];
    const evidence: SearchEvidence = { pages: [], droppedUrls: [] };
    if (ok && sources.length) {
      const seen = new Set<string>();
      const targets = sources
        .map(parseSourceLine)
        .filter((s): s is { url: string; title: string } => {
          if (!s || seen.has(s.url)) return false;
          seen.add(s.url);
          return true;
        })
        .slice(0, MAX_RESULT_PAGES);
      const pages = await Promise.all(
        targets.map((s) => fetchSourcePage(s.url, s.title).catch(() => null))
      );
      const fetched = pages.filter((p): p is NonNullable<typeof p> => Boolean(p));
      const named = keepUnitPages(entity, fetched).slice(0, MAX_RESULT_PAGES);
      const kinds = await classifyPageKinds(entity, named, env);
      const split = applyPageKinds(named, [], kinds);
      const kept = split.pages;
      const plants = split.factoryPages;
      const pack = (p: FetchedPage) => ({
        url: p.url,
        ...(p.finalUrl ? { finalUrl: p.finalUrl } : {}),
        title: p.title,
        text: p.text.slice(0, 40_000),
      });
      evidence.pages = kept.map(pack);
      evidence.factoryPages = plants.map(pack);
      const used = new Set([...kept, ...plants].map((p) => p.url));
      evidence.droppedUrls = fetched.filter((p) => !used.has(p.url)).map((p) => p.url);
      sources = productSourceLines(entity, ocrText, [...kept, ...plants]);
    }
    return {
      ok,
      brief: ok ? wr.brief : '',
      sources,
      error: ok ? undefined : wr.error || 'empty_response',
      ms: wr.ms,
      requests: typeof wr.attempts === 'number' ? wr.attempts : ok ? 1 : 0,
      model: wr.model,
      evidence,
    };
  },
};
