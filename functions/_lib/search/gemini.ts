/**
 * 'gemini' provider: the existing Google Search grounding chain
 * (runWebResearch), plus the same made-in gate as Brave / Firecrawl:
 * Gemini's grounding Sources are fetched and a made-in only counts when a
 * source page shows the barcode/JAN (tied to the made-in block on
 * multi-variant pages). Name-only → likely on single-variant pages, else
 * dropped. No sources → no claims, so the answer's made-in stays 未確認.
 */

import { runWebResearch } from '../webResearch';
import {
  MAX_RESULT_PAGES,
  cooClaimsFromSourcePages,
  fetchSourcePage,
  parseSourceLine,
} from './extract';
import type { SearchEvidence, SearchProvider } from './types';
import type { DesignInfo, WebExcludedPage } from '../schema';

export const geminiSearchProvider: SearchProvider = {
  id: 'gemini',
  isConfigured(env) {
    return Boolean(env.GEMINI_API_KEY?.trim());
  },
  async search({ entity, ocrText, locale, env }) {
    const wr = await runWebResearch({ entity, ocrText, locale, env });
    const ok = wr.ok && Boolean(wr.brief.trim());
    const sources = ok ? wr.sources : [];
    let coo: ReturnType<typeof cooClaimsFromSourcePages> = [];
    const excluded: WebExcludedPage[] = [];
    const design: DesignInfo[] = [];
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
      coo = cooClaimsFromSourcePages(
        entity,
        ocrText,
        pages.filter((p): p is NonNullable<typeof p> => Boolean(p)),
        excluded,
        evidence,
        design
      );
    }
    return {
      ok,
      brief: ok ? wr.brief : '',
      sources,
      error: ok ? undefined : wr.error || 'empty_response',
      ms: wr.ms,
      requests: typeof wr.attempts === 'number' ? wr.attempts : ok ? 1 : 0,
      model: wr.model,
      coo,
      excluded,
      design,
      evidence,
    };
  },
};
