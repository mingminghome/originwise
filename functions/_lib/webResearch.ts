/**
 * Live web research for check jobs (v1.1).
 *
 * Uses Gemini Grounding with Google Search when GEMINI_API_KEY is set and
 * WEB_LOOKUP is not off. Robotics ER / Gemini 3 prefer the Interactions API
 * (`tools: [{ type: "google_search" }]`) so Sources populate; generateContent
 * is used for other pools and as fallback. Memory-only replies (no grounding
 * chunks / citations) are not treated as Search hits.
 * Failures are soft — orchestrator continues on model memory only.
 *
 * Env:
 *   WEB_LOOKUP=auto|on|off  (default auto = on when Gemini key present)
 *   GEMINI_API_KEY=…        required for this path
 *   GEMINI_WEB_MODEL=…      optional preferred Search model (still walks fallbacks)
 *
 * Free-tier Search is a SEPARATE quota from text RPM/RPD (AI Studio → Tools):
 *   - Gemini 3 Search: often **0 / 0** — skipped in auto chain
 *   - Default Search: typically **1.5K RPD** (robotics ER, Gemma) — tried first
 *   - Gemini 2.5 / Gemini 2 Search: typically **1.5K RPD** — fallbacks
 *   - WEB_SEARCH_MAX_ATTEMPTS caps cross-model retries (default 4)
 *   - Per-attempt ~14s so hang/slow models skip before burning the job budget
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
  /** Max Search model attempts per job (default 4, hard cap 8). */
  WEB_SEARCH_MAX_ATTEMPTS?: string;
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

/**
 * Rank Default-pool ids. Robotics ER is the free Search path that still works
 * for many keys; Gemma/antigravity often 500 or hang and burn the budget.
 */
function defaultPoolRank(id: string): number {
  const n = id.toLowerCase();
  if (n.includes('robotics-er')) return 0;
  if (n.includes('deep-research')) return 1;
  if (n.includes('gemma')) return 4;
  if (n.includes('antigravity')) return 5;
  return 2;
}

export function selectDefaultSearchModels(listedIds: string[]): string[] {
  const ids = listedIds
    .map(stripModelPrefix)
    .filter((id) => id && searchGroundingPool(id) === 'default');
  const uniq = [...new Set(ids)];
  uniq.sort((a, b) => defaultPoolRank(a) - defaultPoolRank(b) || b.localeCompare(a));
  return uniq.slice(0, DEFAULT_POOL_TRY_CAP);
}

/** Prefer lite / flash within a Gemini 2.x Search family. */
function flashFamilyRank(id: string): number {
  const n = id.toLowerCase();
  if (n.includes('flash-lite')) return 0;
  if (n.includes('flash')) return 1;
  if (n.includes('pro')) return 3;
  return 2;
}

function pickPoolModels(
  listedIds: string[],
  pool: SearchGroundingPool,
  cap: number
): string[] {
  const ids = listedIds
    .map(stripModelPrefix)
    .filter((id) => id && searchGroundingPool(id) === pool);
  const uniq = [...new Set(ids)];
  uniq.sort(
    (a, b) => flashFamilyRank(a) - flashFamilyRank(b) || b.localeCompare(a)
  );
  return uniq.slice(0, cap);
}

/**
 * Auto Search chain: Default → Gemini 2.5 → Gemini 2.
 * Default (robotics ER / Gemma) historically has Search headroom; 2.5 can be
 * slow and burn the budget before fallback. Skips Gemini 3 (often 0/0).
 * Pin via GEMINI_WEB_MODEL to force a single model.
 */
export function selectSearchModelChain(listedIds: string[]): string[] {
  const defaults = selectDefaultSearchModels(listedIds);
  const gemini25 = pickPoolModels(listedIds, 'gemini25', GEMINI25_POOL_TRY_CAP);
  const gemini2 = pickPoolModels(listedIds, 'gemini2', GEMINI2_POOL_TRY_CAP);
  // Gemini 3 last: often Search 0/0, but better than dying on retired 2.x ids.
  const gemini3 = pickPoolModels(listedIds, 'gemini3', GEMINI3_POOL_TRY_CAP);
  const out: string[] = [];
  for (const id of [...defaults, ...gemini25, ...gemini2, ...gemini3]) {
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

export function parseWebSearchMaxAttempts(env: WebResearchEnv): number {
  const raw = String(env.WEB_SEARCH_MAX_ATTEMPTS ?? '').trim();
  if (!raw) return DEFAULT_WEB_SEARCH_MAX_ATTEMPTS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_WEB_SEARCH_MAX_ATTEMPTS;
  return Math.min(n, HARD_WEB_SEARCH_MAX_ATTEMPTS);
}

/**
 * Per-attempt caps: short enough that hang/slow models skip to the next
 * before burning the whole job budget (was 20–25s × few tries → miss Default).
 */
const INTERACTIONS_FETCH_MS = 18000;
/** Workers edge → Google can exceed 14s; too-tight caps skip working Default pool. */
const GENERATE_CONTENT_FETCH_MS = 22000;
/** Gemini 3 Search is often 0/0 — stop that family after this many 429s. */
const MAX_GEMINI3_SEARCH_FAILS = 1;
/**
 * Wall budget for the whole Search pass. Must fit a slow Default attempt plus
 * fallbacks (robotics hang then 2.5/3) with headroom for Models list.
 */
const WEB_PASS_BUDGET_MS = 75000;
const DEFAULT_POOL_TRY_CAP = 2;
const GEMINI25_POOL_TRY_CAP = 1;
const GEMINI2_POOL_TRY_CAP = 1;
const GEMINI3_POOL_TRY_CAP = 1;
/** Cap how many Search models we try per job (env WEB_SEARCH_MAX_ATTEMPTS). */
const DEFAULT_WEB_SEARCH_MAX_ATTEMPTS = 5;
const HARD_WEB_SEARCH_MAX_ATTEMPTS = 8;
const MODELS_LIST_TIMEOUT_MS = 10000;

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
        signal: AbortSignal.timeout(MODELS_LIST_TIMEOUT_MS),
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

/**
 * Last-resort Search models when the Models list is empty (Workers timeout /
 * transient API miss). Family-level ids only — not a "Default" Flash invent.
 * Prefer discovery via selectSearchModelChain whenever listing works.
 */
const STATIC_SEARCH_FALLBACK = [
  'gemini-robotics-er-2-preview',
  'gemini-robotics-er-1.6-preview',
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
] as const;

/**
 * Search model chain for this key.
 * - Pin (GEMINI_WEB_MODEL) is preferred first, never sole — dead pins must
 *   still walk Default → Gemini 2.5 → Gemini 2.
 * - Auto chain from Models API; if listing is empty, append static fallbacks
 *   so the pass does not die as model_unavailable with zero retries.
 */
export async function resolveWebSearchModels(
  apiKey: string,
  env: WebResearchEnv
): Promise<string[]> {
  const pin = pinnedWebModel(env);
  const listed = await listGenerateContentModelIds(apiKey);
  const auto = selectSearchModelChain(listed);
  const chain: string[] = [...auto];
  // Empty list OR no robotics in discovery → inject static (robotics-first).
  // New-user keys 404 on Gemini 2.x; robotics is the free Search path that works.
  const hasRobotics = chain.some((id) => /robotics-er/i.test(id));
  if (!listed.length || !hasRobotics) {
    for (const id of STATIC_SEARCH_FALLBACK) {
      if (!chain.includes(id)) chain.push(id);
    }
    // Keep robotics at the front of the auto segment
    chain.sort((a, b) => {
      const ar = /robotics-er/i.test(a) ? 0 : 1;
      const br = /robotics-er/i.test(b) ? 0 : 1;
      return ar - br;
    });
  }
  if (pin) {
    return [pin, ...chain.filter((id) => id !== pin)];
  }
  return chain;
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
1) Brand home market / design origin (this is NOT the factory country)
2) Legal parent / holding company HQ country (Taiwan is NOT China). Exclusive distributors,
   importers, local agents, and "Brand TW" market desks are NOT parents — list them separately
   if at all.
3) STRUCTURED FINISHED-UNIT COO (required section — quote fields when found):
   - List every "Made in …" / "Country of origin" / "Country of Publication" / 製造国 / 原産国 /
     產地 claim for THIS model/SKU from retailer product pages, official specs, or packaging.
   - Format each as: COO: <country> | source: retailer|manufacturer|label | via: <site or field name>
   - Ownership / parent HQ is NOT a COO line — put that only under (2) or (4).
4) Mainland China links: ownership, manufacturing, assembly, major suppliers
5) Isolate major parts, spare parts, or ingredients AND where THEY are typically made
   (not only the finished unit). Flag mainland China vs other countries.
6) Any recent ownership changes
7) Grounding sources: keep the most relevant retailer / official URLs in the Sources list.

Rules:
- Prefer official brand sites, retailer product pages, Wikipedia, company filings, reputable news.
- Distinguish four layers: design HQ vs legal parent vs local distributor vs factory/COO.
- Two brands sharing a local distributor does not mean one owns the other.
- Same spelling can be two companies: split by category and legal parent. Do not mix their factories.
- Talk of moving some parts or assembly out of China is not the finished-unit "Made in" unless the label for THIS SKU says so.
- Taiwan (TW) companies (e.g. Foxconn/Hon Hai) are Taiwan — never call them China.
- If sources conflict, list BOTH COO lines with source tags — do not pick China from ownership alone.
- If little is found, say so clearly — do not invent registry data or factory countries.
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
  // v1beta is the live Interactions Search endpoint; v1beta2 404s for many keys.
  'https://generativelanguage.googleapis.com/v1beta/interactions',
  'https://generativelanguage.googleapis.com/v1beta2/interactions',
] as const;

function isGemini3SearchFamily(model: string): boolean {
  return /gemini-3/i.test(model) || /flash-latest|flash-lite-latest/i.test(model);
}

/** Default-pool robotics ER — free Search path; needs Interactions for real grounding. */
export function isRoboticsSearchModel(model: string): boolean {
  return /robotics-er/i.test(stripModelPrefix(model));
}

/**
 * True when generateContent often answers from memory with empty groundingMetadata.
 * Interactions + google_search is the path that returns citations / Sources.
 */
function prefersInteractionsSearch(model: string): boolean {
  return isRoboticsSearchModel(model) || isGemini3SearchFamily(model);
}

/** Search success requires grounding evidence (Sources), not memory-only text. */
function isGroundedSearchHit(out: { sources: string[] }): boolean {
  return out.sources.length > 0;
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
/** Google 404 bodies often name a replacement: "use models/gemini-3.5-flash-lite". */
export function suggestedReplacementModel(body: string): string | undefined {
  const m = String(body || '').match(
    /use models\/([a-z0-9][a-z0-9._-]*[a-z0-9])/i
  );
  if (!m?.[1]) return undefined;
  const id = stripModelPrefix(m[1].replace(/\.+$/, ''));
  return id || undefined;
}

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
  | { ok: false; code: string; suggestModel?: string };

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
    const errBody = data.error?.message || raw;
    const code = mapWebResearchHttpError(res.status, errBody);
    return {
      ok: false,
      code,
      suggestModel:
        code === 'model_unavailable'
          ? suggestedReplacementModel(errBody)
          : undefined,
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

function pickGroundedOrMiss(
  primary: GroundedCall,
  secondary: GroundedCall
): GroundedCall {
  if (primary.ok && isGroundedSearchHit(primary)) return primary;
  if (secondary.ok && isGroundedSearchHit(secondary)) return secondary;
  // Memory-only text is not a Search hit — keep walking the model chain.
  if (primary.ok || secondary.ok) {
    return { ok: false, code: 'empty_response' };
  }
  if (
    primary.code === 'upstream_unavailable' &&
    secondary.code !== 'upstream_error'
  ) {
    return secondary;
  }
  return primary.code !== 'upstream_error' ? primary : secondary;
}

async function callGeminiGrounded(
  apiKey: string,
  model: string,
  prompt: string
): Promise<GroundedCall> {
  // Robotics ER (and Gemini 3): Interactions + google_search is the path that
  // actually runs Search and returns url_citation Sources. generateContent on
  // robotics often returns memory text with empty groundingMetadata — which
  // looked like "Search ok" while Sources stayed none, or burned the pass when
  // GC 429'd and Interactions was never tried (Gemini 3-only fallback).
  if (prefersInteractionsSearch(model)) {
    const viaIx = await callInteractionsSearch(apiKey, model, prompt);
    if (viaIx.ok && isGroundedSearchHit(viaIx)) return viaIx;
    const viaGc = await callGenerateContentSearch(apiKey, model, prompt);
    return pickGroundedOrMiss(viaIx, viaGc);
  }

  const viaGc = await callGenerateContentSearch(apiKey, model, prompt);
  if (viaGc.ok && isGroundedSearchHit(viaGc)) return viaGc;
  // Ungrounded GC text is not a Search hit for COO / Sources.
  if (viaGc.ok) return { ok: false, code: 'empty_response' };
  return viaGc;
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
  const maxAttempts = parseWebSearchMaxAttempts(opts.env);
  let last = 'upstream_error';
  let gemini3Fails = 0;
  let timeouts = 0;
  let attempts = 0;
  const pending = [...models];
  const seen = new Set<string>();
  for (let mi = 0; mi < pending.length; mi += 1) {
    const model = pending[mi];
    if (seen.has(model)) continue;
    seen.add(model);
    if (attempts >= maxAttempts) break;
    if (Date.now() - t0 >= WEB_PASS_BUDGET_MS) {
      if (last === 'upstream_error') last = 'upstream_unavailable';
      break;
    }
    // After one Gemini 3 Search 0/0 fail, skip further Gemini 3 ids but keep walking.
    if (isGemini3SearchFamily(model) && gemini3Fails >= MAX_GEMINI3_SEARCH_FAILS) {
      continue;
    }
    attempts += 1;
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

    // Dead model id — keep walking; queue Google's suggested replacement if any
    if (out.code === 'model_unavailable' || out.code === 'upstream_error') {
      const suggest = !out.ok ? out.suggestModel : undefined;
      if (
        suggest &&
        !seen.has(suggest) &&
        !pending.includes(suggest)
      ) {
        pending.splice(mi + 1, 0, suggest);
      }
      continue;
    }

    if (
      out.code === 'search_grounding_unavailable' ||
      out.code === 'upstream_quota'
    ) {
      last = 'search_grounding_unavailable';
      if (isGemini3SearchFamily(model)) {
        gemini3Fails += 1;
      }
      continue;
    }

    if (out.code === 'upstream_unavailable') {
      timeouts += 1;
      if (timeouts >= 3) break;
      continue;
    }

    if (out.code === 'empty_response') {
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
