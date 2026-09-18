/**
 * Live web research for check jobs (v1.1).
 *
 * Uses Gemini Grounding with Google Search when GEMINI_API_KEY is set and
 * WEB_LOOKUP is not off. Gemini 3.x uses the Interactions API
 * (`tools: [{ type: "google_search" }]`); generateContent is the fallback.
 * Failures are soft — orchestrator continues on model memory only.
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
 * Models for Google Search grounding (current docs, Sept 2026).
 *
 * Gemini 3.x Search now goes through the Interactions API:
 *   POST /v1beta/interactions  tools: [{ type: "google_search" }]
 *   default model: gemini-3.8-flash
 * generateContent + `{ google_search: {} }` remains a fallback (legacy).
 *
 * @see https://ai.google.dev/gemini-api/docs/google-search#supported-models
 */
export const WEB_SEARCH_MODEL_CHAIN: readonly string[] = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

/** Interactions Search can take several seconds; fail-fast generateContent stays shorter. */
const INTERACTIONS_FETCH_MS = 18000;
const GENERATE_CONTENT_FETCH_MS = 7000;
/** Stop after this many Search-tool quota / 0-entitlement misses. */
const MAX_GROUNDING_FAILS = 4;
/** Hard cap for the whole web pass (orchestrator still continues without it). */
const WEB_PASS_BUDGET_MS = 40000;

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

type InteractionResp = {
  error?: { message?: string; status?: string; code?: number };
  output_text?: string;
  steps?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      annotations?: Array<{
        type?: string;
        url?: string;
        title?: string;
      }>;
    }>;
  }>;
};

function usesInteractionsSearch(model: string): boolean {
  return /gemini-3/i.test(model) || /flash-latest|flash-lite-latest/i.test(model);
}

function pushSource(sources: string[], title?: string, uri?: string): void {
  const t = title?.trim();
  const u = uri?.trim();
  if (!t && !u) return;
  const line = t && u ? `${t} — ${u}` : t || u || '';
  if (line && !sources.includes(line)) sources.push(line);
}

/** Parse Interactions API Search response (exported for tests). */
export function parseInteractionSearch(data: InteractionResp): {
  text: string;
  sources: string[];
} {
  const sources: string[] = [];
  let text = String(data.output_text ?? '').trim();
  for (const step of data.steps ?? []) {
    if (step.type !== 'model_output') continue;
    for (const block of step.content ?? []) {
      if (block.type !== 'text') continue;
      if (!text && block.text?.trim()) text = block.text.trim();
      for (const ann of block.annotations ?? []) {
        if (ann.type === 'url_citation') pushSource(sources, ann.title, ann.url);
        if (sources.length >= SOURCE_CAP) break;
      }
    }
  }
  return { text, sources };
}

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

type GroundedCall =
  | { ok: true; text: string; sources: string[] }
  | { ok: false; code: string };

function readJsonError(raw: string): string {
  try {
    const data = JSON.parse(raw) as { error?: { message?: string } };
    return data.error?.message || raw;
  } catch {
    return raw;
  }
}

/** Current Search path: Interactions API + tools: [{ type: "google_search" }]. */
async function callInteractionsSearch(
  apiKey: string,
  model: string,
  prompt: string
): Promise<GroundedCall> {
  const url = 'https://generativelanguage.googleapis.com/v1beta/interactions';
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal: AbortSignal.timeout(INTERACTIONS_FETCH_MS),
      body: JSON.stringify({
        model,
        input: prompt,
        tools: [{ type: 'google_search' }],
        store: false,
      }),
    });
  } catch {
    return { ok: false, code: 'upstream_unavailable' };
  }

  const raw = await res.text();
  if (!res.ok) {
    return { ok: false, code: mapWebResearchHttpError(res.status, readJsonError(raw)) };
  }
  let data: InteractionResp;
  try {
    data = JSON.parse(raw) as InteractionResp;
  } catch {
    return { ok: false, code: 'empty_response' };
  }
  const parsed = parseInteractionSearch(data);
  if (!parsed.text) return { ok: false, code: 'empty_response' };
  return { ok: true, text: parsed.text, sources: parsed.sources };
}

/** Legacy Search path: generateContent + tools: [{ google_search: {} }]. */
async function callGenerateContentSearch(
  apiKey: string,
  model: string,
  prompt: string
): Promise<GroundedCall> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(GENERATE_CONTENT_FETCH_MS),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
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
    pushSource(sources, chunk.web?.title, chunk.web?.uri);
    if (sources.length >= SOURCE_CAP) break;
  }

  return { ok: true, text: text.trim(), sources };
}

async function callGeminiGrounded(
  apiKey: string,
  model: string,
  prompt: string
): Promise<GroundedCall> {
  if (usesInteractionsSearch(model)) {
    const ix = await callInteractionsSearch(apiKey, model, prompt);
    if (ix.ok) return ix;
    if (
      ix.code === 'search_grounding_unavailable' ||
      ix.code === 'upstream_quota'
    ) {
      return ix;
    }
    const gc = await callGenerateContentSearch(apiKey, model, prompt);
    if (gc.ok) return gc;
    return ix;
  }
  return callGenerateContentSearch(apiKey, model, prompt);
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
