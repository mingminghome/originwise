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
 *   GEMINI_WEB_MODEL=…      optional pin for grounded search only
 *
 * Free-tier reality (2026 AI Studio “new user” keys):
 *   - Gemini 3 family often shows Search grounding **0 / 0** (not usage burn).
 *   - gemini-2.5-flash* may return 404 “no longer available to new users”.
 *   - Plain generateContent can still succeed while google_search returns 429.
 *   Enabling billing / paid Search grounding is required for the web row on
 *   those accounts — see docs/DEPLOY.md.
 *
 * Docs:
 *   https://ai.google.dev/gemini-api/docs/google-search
 *   https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/grounding/grounding-with-google-search
 */

import type { LlmEnv } from './llm';

export type WebResearchEnv = LlmEnv & {
  WEB_LOOKUP?: string;
  /** Override model for Google Search grounding only (not product/company agents). */
  GEMINI_WEB_MODEL?: string;
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

/**
 * Models for Google Search grounding, ordered for current free-tier availability.
 *
 * AI Studio free keys often split Search RPD by family:
 *   - Gemini 3 Search: frequently **0 / 0** (Flash/Flash-Lite agents work without Search)
 *   - Gemini 2.5 Search: RPD may show, but `gemini-2.5-flash*` can be blocked for new users
 *   - **Default Search** (~1.5K RPD): includes robotics ER / deep-research / Gemma, etc.
 *
 * Live probe on free new-user keys: `gemini-robotics-er-2-preview` successfully
 * returns `groundingMetadata` via `tools: [{ google_search: {} }]` against Default RPD.
 * Prefer that first so the web row works without paid Gemini 3 Search.
 *
 * @see https://ai.google.dev/gemini-api/docs/google-search#supported-models
 */
export const WEB_SEARCH_MODEL_CHAIN: readonly string[] = [
  // Default Search grounding pool (free ~1.5K RPD on many free keys)
  'gemini-robotics-er-2-preview',
  'gemini-robotics-er-1.6-preview',
  // Standard Flash (needs Gemini 3/2.5 Search entitlement — often 0 free for 3.x)
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  // Legacy 2.x (blocked or free generate limit 0 for many new keys)
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

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

/** Resolve try-order for grounded Google Search (separate from agent LLM chain). */
export function webSearchModelChain(env: WebResearchEnv): string[] {
  const raw = env.GEMINI_WEB_MODEL?.trim().replace(/^models\//, '') || '';
  const lower = raw.toLowerCase();
  if (!raw || lower === 'auto' || lower === 'free' || lower === 'default') {
    return [...WEB_SEARCH_MODEL_CHAIN];
  }
  return [raw, ...WEB_SEARCH_MODEL_CHAIN.filter((m) => m !== raw)];
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
  error?: { message?: string; status?: string; code?: number };
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

/**
 * Map Gemini HTTP failures for web research (exported for unit tests).
 *
 * Distinguishes “you burned RPD” from “this model/tool has free limit 0 / gone”.
 */
export function mapWebResearchHttpError(status: number, body: string): string {
  const msg = body.toLowerCase();

  // Dead / retired model ids for new users (not a rate-limit burn)
  if (
    status === 404 ||
    /no longer available to new users|is not found for api version|model .* not found/.test(
      msg
    )
  ) {
    return 'model_unavailable';
  }

  // Free-tier entitlement is zero for this model/metric (dashboard may show 0/0)
  if (
    /limit:\s*0\b/.test(msg) ||
    /quota exceeded for metric:.*free_tier.*limit:\s*0/.test(msg)
  ) {
    return 'search_grounding_unavailable';
  }

  if (
    status === 429 ||
    /resource.?exhausted|rate.?limit|quota.?exceeded|insufficient.?quota/.test(
      msg
    )
  ) {
    // When Search grounding free quota is 0/0, Google still returns 429
    // RESOURCE_EXHAUSTED with a generic billing message (usage can be 0).
    // Treat Search-tool 429s as grounding entitlement, not “busy from usage”.
    if (
      /billing|plan and billing|check your plan/.test(msg) ||
      status === 429
    ) {
      return 'search_grounding_unavailable';
    }
    return 'upstream_quota';
  }

  if (status === 503 || status === 504) return 'upstream_unavailable';

  if (
    status === 400 ||
    /not supported|unsupported|invalid.?argument|unknown.?tool/.test(msg)
  ) {
    return 'upstream_error';
  }

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
        // Gemini Developer API: snake_case tool (Vertex uses googleSearch camelCase)
        tools: [{ google_search: {} }],
        generationConfig: {
          // Google grounding docs recommend temperature ~1.0 for search quality
          temperature: 1.0,
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
    return { ok: false, code: mapWebResearchHttpError(res.status, raw) };
  }

  if (!res.ok) {
    return {
      ok: false,
      code: mapWebResearchHttpError(res.status, data.error?.message || raw),
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

  const models = webSearchModelChain(opts.env);
  let last = 'upstream_error';
  let consecutiveHardFail = 0;
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

    // Model id dead for this key — try next without counting as entitlement fail
    if (out.code === 'model_unavailable' || out.code === 'upstream_error') {
      consecutiveHardFail = 0;
      continue;
    }

    // Search grounding not entitled / free 0/0 / 429 with Search tool:
    // try one more model (older keys may still have 2.x Search RPD), then stop.
    if (
      out.code === 'search_grounding_unavailable' ||
      out.code === 'upstream_quota'
    ) {
      consecutiveHardFail += 1;
      if (consecutiveHardFail >= 2) {
        last = 'search_grounding_unavailable';
        break;
      }
      continue;
    }

    if (out.code === 'upstream_unavailable') {
      consecutiveHardFail += 1;
      if (consecutiveHardFail >= 2) break;
      continue;
    }

    consecutiveHardFail = 0;
  }

  return {
    ok: false,
    brief: '',
    sources: [],
    ms: Date.now() - t0,
    error: last,
  };
}
