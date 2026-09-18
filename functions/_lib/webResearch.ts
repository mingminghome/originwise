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
 * Free-tier Search is a SEPARATE quota from text RPM/RPD (AI Studio → Tools):
 *   - Gemini 3 Search: often **0 / 0** — do not try these first
 *   - Gemini 2.5 Search / Gemini 2 Search: typically **1.5K RPD**
 *   - Default Search: typically **1.5K RPD** (robotics ER, Gemma, …)
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
  provider?: 'gemini' | 'grok';
};

const BRIEF_MAX = 2200;
const SOURCE_CAP = 8;

/**
 * AI Studio Search grounding buckets (Tools → Search grounding):
 *   Default   — not Gemini 2 / 2.5 / 3 (robotics ER, Gemma, deep-research, …)
 *   Gemini 2 / 2.5 / 3 — billed by family; Gemini 3 is often 0/0 on free keys
 *
 * There is no API id named "Default". We list models for this key and keep
 * only the Default-pool ids (no hardcoded Flash version names).
 */
export type SearchGroundingPool =
  | 'default'
  | 'gemini2'
  | 'gemini25'
  | 'gemini3'
  | 'skip';

export function stripModelPrefix(name: string): string {
  return name.replace(/^models\//, '').trim();
}

export function searchGroundingPool(modelId: string): SearchGroundingPool {
  const n = stripModelPrefix(modelId).toLowerCase();
  if (
    /embedding|tts|veo|lyria|live|transcribe|computer-use|imagen|image/.test(n)
  ) {
    return 'skip';
  }
  if (/gemini-3/.test(n)) return 'gemini3';
  if (/gemini-2\.5/.test(n)) return 'gemini25';
  if (/^gemini-2([.-]|$)/.test(n)) return 'gemini2';
  return 'default';
}

/** Rank Default-pool ids: robotics ER, then Gemma, then other non-Gemini-Flash. */
function defaultPoolRank(id: string): number {
  const n = id.toLowerCase();
  if (n.includes('robotics-er')) return 0;
  if (n.includes('gemma')) return 1;
  if (n.includes('deep-research')) return 2;
  return 3;
}

export function selectDefaultSearchModels(listedIds: string[]): string[] {
  const ids = listedIds
    .map(stripModelPrefix)
    .filter((id) => id && searchGroundingPool(id) === 'default');
  const uniq = [...new Set(ids)];
  uniq.sort((a, b) => defaultPoolRank(a) - defaultPoolRank(b) || b.localeCompare(a));
  return uniq.slice(0, DEFAULT_POOL_TRY_CAP);
}

/** Default-pool Search (robotics ER) often needs ~10–20s, not a 7s abort. */
const INTERACTIONS_FETCH_MS = 20000;
const GENERATE_CONTENT_FETCH_MS = 25000;
/** Gemini 3 Search is often 0/0 — stop that family after this many 429s. */
const MAX_GEMINI3_SEARCH_FAILS = 1;
/** One or two Default-pool attempts; Search itself is slow. */
const WEB_PASS_BUDGET_MS = 40000;
const DEFAULT_POOL_TRY_CAP = 2;

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

function pinnedWebModel(env: WebResearchEnv): string | undefined {
  const raw = env.GEMINI_WEB_MODEL?.trim().replace(/^models\//, '') || '';
  const lower = raw.toLowerCase();
  if (!raw || lower === 'auto' || lower === 'free' || lower === 'default') {
    return undefined;
  }
  return raw;
}

/** Pin only — auto/default discovers Default-pool models from the Models API. */
export function webSearchModelChain(env: WebResearchEnv): string[] {
  const pin = pinnedWebModel(env);
  return pin ? [pin] : [];
}

type ListedModel = {
  name?: string;
  supportedGenerationMethods?: string[];
};

async function listGenerateContentModelIds(apiKey: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken = '';
  for (let page = 0; page < 4; page += 1) {
    const url = new URL(
      'https://generativelanguage.googleapis.com/v1beta/models'
    );
    url.searchParams.set('key', apiKey);
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      break;
    }
    if (!res.ok) break;
    let data: { models?: ListedModel[]; nextPageToken?: string };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      break;
    }
    for (const m of data.models ?? []) {
      const methods = m.supportedGenerationMethods ?? [];
      if (methods.length && !methods.includes('generateContent')) continue;
      const id = stripModelPrefix(m.name || '');
      if (id) ids.push(id);
    }
    pageToken = data.nextPageToken || '';
    if (!pageToken) break;
  }
  return ids;
}

/** Default Search pool for this API key (discovered, not a hardcoded Flash id). */
export async function resolveWebSearchModels(
  apiKey: string,
  env: WebResearchEnv
): Promise<string[]> {
  const pin = pinnedWebModel(env);
  if (pin) return [pin];
  const listed = await listGenerateContentModelIds(apiKey);
  return selectDefaultSearchModels(listed);
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
  outputText?: string;
  steps?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      annotations?: Array<{
        type?: string;
        url?: string;
        uri?: string;
        title?: string;
      }>;
    }>;
  }>;
};

const INTERACTIONS_URLS = [
  'https://generativelanguage.googleapis.com/v1beta2/interactions',
  'https://generativelanguage.googleapis.com/v1beta/interactions',
] as const;

function isGemini3SearchFamily(model: string): boolean {
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
  let text = String(data.output_text ?? data.outputText ?? '').trim();
  for (const step of data.steps ?? []) {
    if (step.type !== 'model_output' && step.type !== 'google_search_result') {
      continue;
    }
    for (const block of step.content ?? []) {
      if (block.type && block.type !== 'text') continue;
      if (!text && block.text?.trim()) text = block.text.trim();
      for (const ann of block.annotations ?? []) {
        if (ann.type && ann.type !== 'url_citation') continue;
        pushSource(sources, ann.title, ann.url || ann.uri);
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

let rememberedInteractionsUrl: string | null = null;

async function postInteractions(
  url: string,
  apiKey: string,
  model: string,
  prompt: string
): Promise<{ res: Response; raw: string } | { ok: false; code: string }> {
  try {
    const res = await fetch(url, {
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
    const raw = await res.text();
    return { res, raw };
  } catch {
    return { ok: false, code: 'upstream_unavailable' };
  }
}

/** Current Search path: Interactions API + tools: [{ type: "google_search" }]. */
async function callInteractionsSearch(
  apiKey: string,
  model: string,
  prompt: string
): Promise<GroundedCall> {
  const urls = rememberedInteractionsUrl
    ? [rememberedInteractionsUrl]
    : [...INTERACTIONS_URLS];
  let last: GroundedCall = { ok: false, code: 'upstream_error' };

  for (const url of urls) {
    const posted = await postInteractions(url, apiKey, model, prompt);
    if ('code' in posted && posted.ok === false) {
      last = posted;
      if (posted.code === 'upstream_unavailable') return last;
      continue;
    }
    const { res, raw } = posted as { res: Response; raw: string };
    if (!res.ok) {
      last = {
        ok: false,
        code: mapWebResearchHttpError(res.status, readJsonError(raw)),
      };
      if (last.code === 'search_grounding_unavailable') return last;
      continue;
    }
    let data: InteractionResp;
    try {
      data = JSON.parse(raw) as InteractionResp;
    } catch {
      last = { ok: false, code: 'empty_response' };
      continue;
    }
    const parsed = parseInteractionSearch(data);
    if (!parsed.text) {
      last = { ok: false, code: 'empty_response' };
      continue;
    }
    rememberedInteractionsUrl = url;
    return { ok: true, text: parsed.text, sources: parsed.sources };
  }
  return last;
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
  // Default-pool Search (robotics / Gemma) is generateContent + google_search.
  // Trying Interactions as well doubled timeouts (~40s) and aborted live searches.
  if (isGemini3SearchFamily(model)) {
    return callInteractionsSearch(apiKey, model, prompt);
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

  const models = await resolveWebSearchModels(apiKey, opts.env);
  if (!models.length) {
    return {
      ok: false,
      brief: '',
      sources: [],
      ms: Date.now() - t0,
      error: 'search_grounding_unavailable',
    };
  }
  let last = 'upstream_error';
  let gemini3Fails = 0;
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
        provider: 'gemini',
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
      last = 'search_grounding_unavailable';
      // Gemini 3 Search is often 0/0 — don't spend the rest of the budget there.
      // Default / 2.x pools must still be tried even after several 429s.
      if (isGemini3SearchFamily(model)) {
        gemini3Fails += 1;
        if (gemini3Fails >= MAX_GEMINI3_SEARCH_FAILS) break;
      }
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
