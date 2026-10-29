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
 *   - Per-attempt caps so hang/slow models skip before burning the job budget
 *   - Interactions 503 "high demand" is retried; capacity miss stays upstream_unavailable
 *     (404/429 fallbacks must not become API-key Search caveat)
 *
 * Docs:
 *   https://ai.google.dev/gemini-api/docs/google-search
 *   https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/grounding/grounding-with-google-search
 */

import { langLabel } from '../../../locale';
import { marketLimitLine, queryMarketLine } from '../../../queryMarket';
import { isCreditsDepleted, preferFasterChatModels, type LlmEnv } from '../../../llm';

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
  /** Grounded Search model attempts made this pass (for the UI request count). */
  attempts?: number;
};

const BRIEF_MAX = 2200;
const SOURCE_CAP = 8;

export function stripModelPrefix(name: string): string {
  return name.replace(/^models\//, '').trim();
}

const NOT_CHAT_MODEL = /embed|tts|veo|lyria|live|transcribe|computer-use|imagen|image|audio/i;

/** Smaller chat ids from the models list, skipping non-chat models. */
export function usableSearchModels(listedIds: string[]): string[] {
  const out: string[] = [];
  for (const raw of listedIds) {
    const id = stripModelPrefix(raw);
    if (!id || NOT_CHAT_MODEL.test(id) || out.includes(id)) continue;
    out.push(id);
  }
  return preferFasterChatModels(out).slice(0, 4);
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
/** Wall budget for the Search pass, including the models list. */
const WEB_PASS_BUDGET_MS = 75000;
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

/** Used only when the models list cannot be read. */
const SEARCH_FALLBACK_MODEL = 'gemini-flash-lite-latest';

/**
 * Pin → that id only. Otherwise the first chat ids from the models list.
 * One fallback id when the list is empty.
 */
export async function resolveWebSearchModels(
  apiKey: string,
  env: WebResearchEnv
): Promise<string[]> {
  const pin = pinnedWebModel(env);
  if (pin) return [pin];
  const listed = usableSearchModels(await listGenerateContentModelIds(apiKey));
  return listed.length ? listed : [SEARCH_FALLBACK_MODEL];
}

function buildResearchPrompt(opts: {
  entity: string;
  ocrText?: string;
  locale: string;
  markets?: readonly string[];
}): string {
  const lang = langLabel(opts.locale);
  const limit = marketLimitLine(opts.entity, opts.markets);
  return `You are a product-origin research assistant for OriginWise.
Use Google Search to find CURRENT public facts about the product/brand/company below.
Respond in ${lang}.

Collect and summarize (bullet points, dense, factual):
1) Brand home market / design origin (this is NOT the factory country)
2) Legal parent / holding company HQ country (Taiwan is NOT China). Exclusive distributors,
   importers, local agents, and "Brand TW" market desks are NOT parents — list them separately
   if at all.
3) STRUCTURED FINISHED-UNIT COO (required section — quote fields when found):
   - List every made-in or country-of-origin field for THIS model/SKU from retailer product pages, official specs, or packaging. Use the field words of that page's language.
   - Format each as: COO: <country> | source: retailer|manufacturer|label | via: <site or field name>
   - Ownership / parent HQ is NOT a COO line — put that only under (2) or (4).
4) Mainland China links: ownership, manufacturing, assembly, OEM or contract factories, major suppliers. Search this model's factory and OEM, including plants in China, and name each country.
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
${limit
    ? `- ${limit}`
    : `- The query's own writing is the market, in whatever language it is. Search that unit. Another market's factory is not this unit's finished-unit COO. A part made elsewhere is a part origin, not the finished COO.`}
- Search with operators. Put + on the model and size tokens. Do not quote the whole product name. Do not write +(a OR b): that returns no pages. Join the origin-field words of the query's language with OR. Skip price-comparison and video pages. A design or domestic-marketing line is not the factory. Do not ask for a package photo.
${limit ? '' : queryMarketLine(opts.entity)}
- Taiwan (TW), Hong Kong and Macau companies are never China: name them by their own country/region.
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

  // Prepaid balance at zero — blocks every model on the key, not a daily reset.
  if (isCreditsDepleted(status, msg)) return 'upstream_credits';

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

  // Free-tier daily cap with a real (non-zero) limit was burned, e.g.
  // "free_tier_requests, limit: 20, model: gemini-robotics-er-2-preview".
  // That is "used up today", not "this key has no Search".
  if (/free_tier[a-z_]*,?\s*limit:\s*[1-9]\d*/.test(msg)) {
    return 'upstream_quota';
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

/** 503 / "high demand" retries — keep full fetch budget (tight caps abort recovery). */
const INTERACTIONS_CAPACITY_TRIES = 4;
const INTERACTIONS_RETRY_MS = 900;
/**
 * Retries keep the normal Interactions fetch budget. A shorter post-503 cap
 * (10s) was aborting recovering requests under load and forcing false
 * search_grounding_unavailable after dead fallback 404/429.
 */
const INTERACTIONS_RETRY_FETCH_MS = INTERACTIONS_FETCH_MS;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** True when Google asks us to retry (capacity), not entitlement/404. */
export function isInteractionsCapacityError(
  status: number,
  body: string
): boolean {
  if (status === 503 || status === 504) return true;
  const msg = String(body || '').toLowerCase();
  return /high demand|try again later|currently unavailable|spikes in demand/.test(
    msg
  );
}

async function postInteractions(
  url: string,
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs: number = INTERACTIONS_FETCH_MS
): Promise<{ res: Response; raw: string } | { ok: false; code: string }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal: AbortSignal.timeout(timeoutMs),
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
  // Prefer last good URL, but keep fallbacks (remembered-only hid v1beta recovery).
  const urls = rememberedInteractionsUrl
    ? [
        rememberedInteractionsUrl,
        ...INTERACTIONS_URLS.filter((u) => u !== rememberedInteractionsUrl),
      ]
    : [...INTERACTIONS_URLS];
  let last: GroundedCall = { ok: false, code: 'upstream_error' };

  for (const url of urls) {
    let sawCapacity = false;
    for (let attempt = 0; attempt < INTERACTIONS_CAPACITY_TRIES; attempt += 1) {
      const posted = await postInteractions(
        url,
        apiKey,
        model,
        prompt,
        sawCapacity ? INTERACTIONS_RETRY_FETCH_MS : INTERACTIONS_FETCH_MS
      );
      if ('code' in posted && posted.ok === false) {
        last = posted;
        // Timeout after a 503 on this host → still a capacity miss, not a dead model.
        if (sawCapacity) {
          return { ok: false, code: 'upstream_unavailable' };
        }
        // Full AbortSignal timeout with no prior 503 — try next URL / GC.
        break;
      }
      const { res, raw } = posted as { res: Response; raw: string };
      if (!res.ok) {
        const errMsg = readJsonError(raw);
        const code = mapWebResearchHttpError(res.status, errMsg);
        last = { ok: false, code };
        if (code === 'search_grounding_unavailable') return last;
        if (isInteractionsCapacityError(res.status, errMsg)) {
          sawCapacity = true;
          if (attempt < INTERACTIONS_CAPACITY_TRIES - 1) {
            await sleep(INTERACTIONS_RETRY_MS * (attempt + 1));
            continue;
          }
          // Exhausted fast 503 retries. Do not probe dead fallback hosts (v1beta2
          // 404 would mislabel this as model_unavailable).
          return { ok: false, code: 'upstream_unavailable' };
        }
        break;
      }
      let data: InteractionResp;
      try {
        data = JSON.parse(raw) as InteractionResp;
      } catch {
        last = { ok: false, code: 'empty_response' };
        break;
      }
      const parsed = parseInteractionSearch(data);
      if (!parsed.text) {
        last = { ok: false, code: 'empty_response' };
        break;
      }
      rememberedInteractionsUrl = url;
      return { ok: true, text: parsed.text, sources: parsed.sources };
    }
    // If this host only capacity-failed, stop — fallbacks are usually 404.
    if (sawCapacity) {
      return { ok: false, code: 'upstream_unavailable' };
    }
  }
  return last;
}


/** Legacy Search path: generateContent + tools: [{ google_search: {} }]. */
async function callGenerateContentSearch(
  apiKey: string,
  model: string,
  prompt: string
): Promise<GroundedCall> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
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

/**
 * Prefer a grounded Search hit. Capacity miss beats memory-only and beats
 * entitlement/404 labels from the other path (GC 429 must not overwrite Ix 503).
 */
function pickGroundedOrMiss(
  primary: GroundedCall,
  secondary: GroundedCall
): GroundedCall {
  if (primary.ok && isGroundedSearchHit(primary)) return primary;
  if (secondary.ok && isGroundedSearchHit(secondary)) return secondary;
  // Capacity / transient busy — keep this label so soft-fail is not "API key".
  if (!primary.ok && primary.code === 'upstream_unavailable') return primary;
  if (!secondary.ok && secondary.code === 'upstream_unavailable') {
    return secondary;
  }
  // Memory-only text is not a Search hit — keep walking the model chain.
  if (primary.ok || secondary.ok) {
    return { ok: false, code: 'empty_response' };
  }
  return primary.code !== 'upstream_error' ? primary : secondary;
}

async function callGeminiGrounded(
  apiKey: string,
  model: string,
  prompt: string
): Promise<GroundedCall> {
  const viaGc = await callGenerateContentSearch(apiKey, model, prompt);
  if (viaGc.ok && isGroundedSearchHit(viaGc)) return viaGc;
  const viaIx = await callInteractionsSearch(apiKey, model, prompt);
  return pickGroundedOrMiss(viaGc, viaIx);
}

/**
 * Run one grounded research pass. Soft-fail: never throws for orchestrator use.
 */
export async function runWebResearch(opts: {
  entity: string;
  ocrText?: string;
  locale: string;
  markets?: readonly string[];
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
    markets: opts.markets,
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
  /** Sticky: Default-pool capacity miss must not become API-key caveat later. */
  let sawCapacityMiss = false;
  let creditsDepleted = false;
  /** Sticky: a model hit its non-zero daily free cap (e.g. robotics 20/day). */
  let sawDailyQuota = false;
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
      if (sawCapacityMiss || last === 'upstream_error') {
        last = 'upstream_unavailable';
      }
      break;
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
        attempts,
      };
    }
    last = out.code;

    // 402 / prepaid credits empty: every model on this key fails the same way.
    if (out.code === 'upstream_credits') {
      creditsDepleted = true;
      break;
    }

    // Dead model id — keep walking; queue Google's suggested replacement if any.
    // Do NOT let 404/retired ids erase a prior capacity miss (that became the
    // false "unavailable on this API key" caveat after #8).
    if (out.code === 'model_unavailable' || out.code === 'upstream_error') {
      if (sawCapacityMiss) last = 'upstream_unavailable';
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
      // Later-pool Search 429 (often Gemini 3 0/0) must not overwrite a
      // Default-pool capacity miss as "API key has no Search".
      if (out.code === 'upstream_quota') sawDailyQuota = true;
      if (sawCapacityMiss) {
        last = 'upstream_unavailable';
      } else if (sawDailyQuota) {
        // Later Gemini 3 0/0 429s must not hide "daily free Search used up".
        last = 'upstream_quota';
      } else {
        last = 'search_grounding_unavailable';
      }
      continue;
    }

    if (out.code === 'upstream_unavailable') {
      sawCapacityMiss = true;
      last = 'upstream_unavailable';
      timeouts += 1;
      if (timeouts >= 3) break;
      continue;
    }

    if (out.code === 'empty_response') {
      if (sawCapacityMiss) last = 'upstream_unavailable';
      continue;
    }
  }

  return {
    ok: false,
    brief: '',
    sources: [],
    ms: Date.now() - t0,
    error: creditsDepleted
      ? 'upstream_credits'
      : sawCapacityMiss
        ? 'upstream_unavailable'
        : last,
    attempts,
  };
}
