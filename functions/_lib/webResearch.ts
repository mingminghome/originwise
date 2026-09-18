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

import { langLabel } from './locale';
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
 * Models for Google Search grounding, ordered for current availability.
 *
 * Official Search-capable Flash models first (3.8 / 3.5 / 3.1, then 2.5).
 * Robotics ER is last-ditch Default-pool — it often 429s slowly and used to
 * abort the chain after two failures before Flash was tried.
 *
 * @see https://ai.google.dev/gemini-api/docs/google-search#supported-models
 */
export const WEB_SEARCH_MODEL_CHAIN: readonly string[] = [
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-robotics-er-2-preview',
  'gemini-robotics-er-1.6-preview',
];

/** Per-model wall clock so a slow 429 cannot burn the whole job. */
const GROUNDED_FETCH_MS = 7000;
/** Stop after this many Search-tool quota / 0-entitlement misses. */
const MAX_GROUNDING_FAILS = 5;
/** Hard cap for the whole web pass (orchestrator still continues without it). */
const WEB_PASS_BUDGET_MS = 20000;

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
  const lang = langLabel(opts.locale);
  return `You are a product-origin research assistant for OriginWise.
Use Google Search to find CURRENT public facts about the product/brand/company below.
Respond in ${lang}.

Collect and summarize (bullet points, dense, factual):
1) Brand home market / design origin
2) Legal manufacturer / parent company HQ country (Taiwan is NOT China)
3) Typical "Made in" / country of origin for this model or product line (note market variants)
4) Mainland China links: ownership, manufacturing, assembly, major suppliers
5) Isolate major parts, spare parts, or ingredients AND where THEY are typically made
   (not only the finished unit). Food/cosmetics: key ingredients. Devices: battery, board,
   display, motor, optics, etc. when public. Flag mainland China vs other countries.
6) Any recent ownership changes

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
      signal: AbortSignal.timeout(GROUNDED_FETCH_MS),
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
  let groundingFails = 0;
  let timeouts = 0;
  for (const model of models) {
    if (Date.now() - t0 >= WEB_PASS_BUDGET_MS) break;
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

    // Dead model id — keep walking the chain
    if (out.code === 'model_unavailable' || out.code === 'upstream_error') {
      continue;
    }

    if (
      out.code === 'search_grounding_unavailable' ||
      out.code === 'upstream_quota'
    ) {
      groundingFails += 1;
      last = 'search_grounding_unavailable';
      if (groundingFails >= MAX_GROUNDING_FAILS) break;
      continue;
    }

    if (out.code === 'upstream_unavailable') {
      timeouts += 1;
      if (timeouts >= 3) break;
      continue;
    }
  }

  return {
    ok: false,
    brief: '',
    sources: [],
    ms: Date.now() - t0,
    error: last,
  };
}
