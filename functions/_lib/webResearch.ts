/**
 * Live web research for check jobs (v1.1).
 *
 * Uses Gemini Grounding with Google Search when GEMINI_API_KEY is set and
 * WEB_LOOKUP is not off. Failures are soft — orchestrator continues on
 * model memory only.
 *
 * Env:
 *   WEB_LOOKUP=auto|on|off  (default auto = on when Gemini key present)
 *   GEMINI_API_KEY=…        required for this path
 *   GEMINI_MODEL=…          optional; same free-tier chain as llm.ts
 */

import { modelChain, type LlmEnv } from './llm';

export type WebResearchEnv = LlmEnv & {
  WEB_LOOKUP?: string;
};

export type WebResearchResult = {
  ok: boolean;
  /** Compact brief injected into product/company prompts */
  brief: string;
  /** Source titles/urls when Gemini returns grounding metadata */
  sources: string[];
  ms: number;
  error?: string;
  model?: string;
};

const BRIEF_MAX = 2200;
const SOURCE_CAP = 8;

export function isWebLookupEnabled(env: WebResearchEnv): boolean {
  const raw = String(env.WEB_LOOKUP ?? 'auto')
    .toLowerCase()
    .trim();
  const hasGemini = Boolean(env.GEMINI_API_KEY?.trim());
  if (raw === '0' || raw === 'off' || raw === 'false' || raw === 'no') {
    return false;
  }
  if (raw === '1' || raw === 'on' || raw === 'true' || raw === 'yes') {
    return hasGemini;
  }
  // auto
  return hasGemini;
}

function buildResearchPrompt(opts: {
  entity: string;
  ocrText?: string;
  locale: string;
}): string {
  const lang =
    opts.locale.startsWith('zh') ? 'Traditional Chinese (繁體中文)' : 'English';
  return `You are a product-origin research assistant for OriginWise.
Use Google Search to find CURRENT public facts about the product/brand/company below.
Respond in ${lang}.

Collect and summarize (bullet points, dense, factual):
1) Brand home market / design origin
2) Legal manufacturer / parent company HQ country (Taiwan is NOT China)
3) Typical "Made in" / country of origin for this model or product line (note market variants)
4) Mainland China links: ownership, manufacturing, assembly, major suppliers
5) Any recent ownership changes

Rules:
- Prefer official brand sites, retailer product pages, Wikipedia, company filings, reputable news.
- Distinguish brand HQ vs factory vs final assembly for a specific SKU.
- Taiwan (TW) companies (e.g. Foxconn/Hon Hai) are Taiwan — never call them China.
- If sources conflict, list both and say which is more specific to the model.
- If little is found, say so clearly — do not invent registry data.
- Keep under ~400 words. No markdown code fences.

ENTITY: ${opts.entity.slice(0, 200)}
OCR / LABEL HINT: ${(opts.ocrText || '(none)').slice(0, 500)}`;
}

type GeminiGrounded = {
  error?: { message?: string };
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: {
      webSearchQueries?: string[];
      groundingChunks?: Array<{
        web?: { uri?: string; title?: string };
      }>;
      groundingSupports?: unknown[];
    };
  }>;
};

function mapHttpError(status: number, body: string): string {
  const msg = body.toLowerCase();
  if (
    status === 429 ||
    /quota|rate limit|resource exhausted|billing|grounding/.test(msg)
  ) {
    return 'upstream_quota';
  }
  if (status === 503 || status === 504) return 'upstream_unavailable';
  return 'upstream_error';
}

async function callGeminiGrounded(
  apiKey: string,
  model: string,
  prompt: string
): Promise<
  | { ok: true; text: string; sources: string[] }
  | { ok: false; code: string }
> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        // Grounding with Google Search (current tool name)
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1400,
        },
      }),
    });
  } catch {
    return { ok: false, code: 'upstream_unavailable' };
  }

  const raw = await res.text();
  let data: GeminiGrounded;
  try {
    data = JSON.parse(raw) as GeminiGrounded;
  } catch {
    return { ok: false, code: mapHttpError(res.status, raw) };
  }

  if (!res.ok) {
    return {
      ok: false,
      code: mapHttpError(res.status, data.error?.message || raw),
    };
  }

  const cand = data.candidates?.[0];
  const text =
    cand?.content?.parts?.map((p) => p.text || '').join('') ?? '';
  if (!text.trim()) return { ok: false, code: 'empty_response' };

  const sources: string[] = [];
  for (const chunk of cand?.groundingMetadata?.groundingChunks ?? []) {
    const title = chunk.web?.title?.trim();
    const uri = chunk.web?.uri?.trim();
    if (!title && !uri) continue;
    const line = title && uri ? `${title} — ${uri}` : title || uri || '';
    if (line && !sources.includes(line)) sources.push(line);
    if (sources.length >= SOURCE_CAP) break;
  }

  return { ok: true, text: text.trim(), sources };
}

/**
 * Run one grounded research pass. Soft-fail: never throws for orchestrator use.
 */
export async function runWebResearch(opts: {
  entity: string;
  ocrText?: string;
  locale: string;
  env: WebResearchEnv;
}): Promise<WebResearchResult> {
  const t0 = Date.now();
  if (!isWebLookupEnabled(opts.env)) {
    return { ok: false, brief: '', sources: [], ms: 0, error: 'disabled' };
  }
  const apiKey = opts.env.GEMINI_API_KEY?.trim() || '';
  if (!apiKey) {
    return {
      ok: false,
      brief: '',
      sources: [],
      ms: Date.now() - t0,
      error: 'gemini_not_configured',
    };
  }

  const entity = opts.entity.trim().slice(0, 200);
  if (!entity || entity === 'unknown item') {
    return {
      ok: false,
      brief: '',
      sources: [],
      ms: Date.now() - t0,
      error: 'no_entity',
    };
  }

  const prompt = buildResearchPrompt({
    entity,
    ocrText: opts.ocrText,
    locale: opts.locale,
  });

  const models = modelChain('gemini', opts.env);
  let last = 'upstream_error';
  for (const model of models) {
    const out = await callGeminiGrounded(apiKey, model, prompt);
    if (out.ok) {
      let brief = out.text.slice(0, BRIEF_MAX);
      if (out.sources.length) {
        const srcBlock = out.sources
          .slice(0, SOURCE_CAP)
          .map((s, i) => `[${i + 1}] ${s}`)
          .join('\n');
        const withSrc = `${brief}\n\nSources:\n${srcBlock}`;
        brief = withSrc.slice(0, BRIEF_MAX);
      }
      return {
        ok: true,
        brief,
        sources: out.sources,
        ms: Date.now() - t0,
        model,
      };
    }
    last = out.code;
    // Model unsupported tool / bad request — try next model
    if (out.code === 'upstream_quota') break;
  }

  return {
    ok: false,
    brief: '',
    sources: [],
    ms: Date.now() - t0,
    error: last,
  };
}
