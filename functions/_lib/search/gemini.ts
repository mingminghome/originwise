/**
 * 'gemini' provider: the existing Google Search grounding chain
 * (runWebResearch), wrapped unchanged.
 */

import { runWebResearch } from '../webResearch';
import type { SearchProvider } from './types';

export const geminiSearchProvider: SearchProvider = {
  id: 'gemini',
  isConfigured(env) {
    return Boolean(env.GEMINI_API_KEY?.trim());
  },
  async search({ entity, ocrText, locale, env }) {
    const wr = await runWebResearch({ entity, ocrText, locale, env });
    const ok = wr.ok && Boolean(wr.brief.trim());
    return {
      ok,
      brief: ok ? wr.brief : '',
      sources: ok ? wr.sources : [],
      error: ok ? undefined : wr.error || 'empty_response',
      ms: wr.ms,
      requests: typeof wr.attempts === 'number' ? wr.attempts : ok ? 1 : 0,
      model: wr.model,
    };
  },
};
