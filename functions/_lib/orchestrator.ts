/**
 * OriginWise check orchestrator.
 * One JSON query per check. Sections are chosen from the requested dimensions.
 * Emits progress events for SSE; pure-TS synthesize owns relationTier.
 */

import {
  assignProvider,
  isProviderDeadError,
  type AgentRole,
  type CheckMode,
} from './aiPool';
import {
  buildCheckPrompt,
  readQueryPartials,
  selectSections,
} from './checkQuery';
import { extractJsonObject } from './jsonExtract';
import {
  callProvider,
  type AskProviderId,
  type LlmEnv,
  type LlmImage,
} from './llm';
import type { CheckDimension, CheckResult, WebCooClaim, WebExcludedPage } from './schema';
import { WEB_KNOWLEDGE_NOTE, webKnowledgeNote } from './schema';
import type { GeoScope } from './regions';
import { normalizeLocale } from './locale';
import { SERVER_TEXT, SUMMARY_PREFIX } from './serverText';
import { synthesize } from './synthesize';
import { citedFetcher, verifyCitedSources, type CitedCheck } from './citedSources';
import { parseSourceLine, settleExactConflict } from './search/extract';
import type { SearchEvidence } from './search/types';
import { fixZhHantDeep } from './zhHant';
import {
  isSearchEnabled,
  runSearchChain,
  type SearchEnv,
  type SearchProviderId,
} from './search';

/** Server lines the client translates by exact match; never rewritten. */
const ZH_KEEP_SERVER_TEXT = [
  ...Object.values(SERVER_TEXT),
  ...Object.values(SUMMARY_PREFIX),
] as string[];
const ZH_SKIP_KEYS = new Set(['sources', 'meta', 'jobId', 'schemaVersion']);

export type ProgressEvent = {
  type: 'progress';
  jobId: string;
  step: string;
  status: 'running' | 'done' | 'skipped' | 'error';
  detail?: string;
};

export type OrchestratorEnv = LlmEnv &
  SearchEnv & {
    CHECK_MODE?: string;
    POOL_DISABLE_PROVIDERS?: string;
  };

export type OrchestratorInput = {
  jobId: string;
  locale: string;
  text: string;
  image?: LlmImage;
  geoScope: GeoScope;
  dimensions: CheckDimension[];
  env: OrchestratorEnv;
};

export type AgentMeta = {
  id: string;
  provider?: string;
  ok?: boolean;
  error?: string;
  ms?: number;
  /** Search API requests (web row only). */
  requests?: number;
};

export type OrchestratorOk = {
  ok: true;
  result: CheckResult;
  mode: CheckMode;
  agents: AgentMeta[];
};

export type OrchestratorErr = {
  ok: false;
  code: string;
  error: string;
  httpStatus: number;
  agents?: AgentMeta[];
};

export type ProgressEmit = (ev: ProgressEvent) => void;

type WebPass = {
  brief: string;
  used: boolean;
  error?: string;
  sources?: string[];
  /** Search provider that succeeded, else the last one tried. */
  provider?: SearchProviderId;
  /** Total search API requests across providers. */
  requests?: number;
  /** Gated made-in claims (Brave / Firecrawl only). */
  coo?: WebCooClaim[];
  /** Pages about another model of that name. */
  excluded?: WebExcludedPage[];
  /** Page text + dropped-claim URLs for the AI-cited check (not stored). */
  evidence?: SearchEvidence;
};

/**
 * Web research pass over the search-provider chain (Gemini grounding →
 * Brave → Firecrawl). Soft-fail; returns brief for prompts. The progress
 * event names the provider at the moment the lookup is sent to it.
 */
async function maybeWebResearch(
  opts: {
    jobId: string;
    locale: string;
    entity: string;
    ocrText?: string;
    env: OrchestratorEnv;
    agents: AgentMeta[];
  },
  emit: ProgressEmit
): Promise<WebPass> {
  const { jobId, locale, entity, ocrText, env, agents } = opts;
  if (!isSearchEnabled(env)) {
    emit({ type: 'progress', jobId, step: 'web', status: 'skipped' });
    agents.push({
      id: 'web',
      provider: 'gemini',
      ok: false,
      error: 'disabled',
      ms: 0,
      requests: 0,
    });
    return { brief: '', used: false, error: 'disabled', sources: [], requests: 0 };
  }
  const wr = await runSearchChain(
    { entity, ocrText, locale, env },
    {
      onAttempt: (id) =>
        emit({ type: 'progress', jobId, step: 'web', status: 'running', detail: id }),
    }
  );
  agents.push({
    id: 'web',
    provider: wr.provider ?? 'gemini',
    ok: wr.ok,
    error: wr.ok ? undefined : wr.error,
    ms: wr.ms,
    requests: wr.requests,
  });
  if (wr.ok && wr.brief.trim()) {
    emit({
      type: 'progress',
      jobId,
      step: 'web',
      status: 'done',
      detail: wr.provider,
    });
    return {
      brief: wr.brief,
      used: true,
      sources: wr.sources,
      provider: wr.provider,
      requests: wr.requests,
      coo: wr.coo,
      excluded: wr.excluded,
      evidence: wr.evidence,
    };
  }
  const failCode = wr.error || 'empty_response';
  emit({
    type: 'progress',
    jobId,
    step: 'web',
    status: 'error',
    detail: wr.provider ? `${wr.provider}:${failCode}` : failCode,
  });
  return {
    brief: '',
    used: false,
    error: failCode,
    sources: [],
    provider: wr.provider,
    requests: wr.requests,
  };
}

type JsonCallResult =
  | { ok: true; obj: Record<string, unknown>; ms: number }
  | { ok: false; code: string; ms: number };

async function callJson(
  provider: AskProviderId,
  prompt: string,
  env: OrchestratorEnv,
  image?: LlmImage
): Promise<JsonCallResult> {
  const t0 = Date.now();
  try {
    const text = await callProvider(provider, prompt, env, image);
    const obj = extractJsonObject(text);
    if (!obj) return { ok: false, code: 'parse_error', ms: Date.now() - t0 };
    return { ok: true, obj, ms: Date.now() - t0 };
  } catch (e) {
    const err = e as { code?: string };
    return {
      ok: false,
      code: err.code || 'upstream_error',
      ms: Date.now() - t0,
    };
  }
}

type PoolCallOpts = {
  role: AgentRole;
  agentId: string;
  prompt: string;
  env: OrchestratorEnv;
  image?: LlmImage;
  agents: AgentMeta[];
  /** Providers already used this wave (load spread) */
  usedInWave: Set<AskProviderId>;
  /** Providers that failed earlier this request (hard skip) */
  deadProviders: Set<AskProviderId>;
  /** Mutable call counter */
  getCalls: () => number;
  addCall: () => void;
  maxCalls: number;
};

/**
 * Call preferred free-tier provider; on quota/error mark dead and retry
 * once with the next healthy provider (usually Gemini).
 */
async function callJsonWithPool(
  opts: PoolCallOpts
): Promise<JsonCallResult> {
  const {
    role,
    agentId,
    prompt,
    env,
    image,
    agents,
    usedInWave,
    deadProviders,
    getCalls,
    addCall,
    maxCalls,
  } = opts;

  let last: JsonCallResult = {
    ok: false,
    code: 'provider_not_configured',
    ms: 0,
  };

  // Up to 2 attempts: preferred free tier, then fallback
  for (let attempt = 0; attempt < 2; attempt++) {
    if (getCalls() >= maxCalls) break;
    const asg = assignProvider(role, env, usedInWave, deadProviders);
    if (!asg) break;

    usedInWave.add(asg.provider);
    addCall();
    const out = await callJson(asg.provider, prompt, env, image);
    agents.push({
      id: agentId,
      provider: asg.provider,
      ok: out.ok,
      error: out.ok ? undefined : out.code,
      ms: out.ms,
    });
    last = out;
    if (out.ok) return out;

    if (isProviderDeadError(out.code)) {
      deadProviders.add(asg.provider);
    }
    // parse_error: same provider unlikely to help; try another once
    if (out.code === 'parse_error') {
      deadProviders.add(asg.provider);
    }
  }

  return last;
}

function entitySeed(text: string): string {
  return text.trim().slice(0, 80);
}

/**
 * One provider call. Which JSON fields are requested lives in CHECK_SECTIONS.
 */
async function runQuery(
  input: OrchestratorInput,
  emit: ProgressEmit
): Promise<OrchestratorOk | OrchestratorErr> {
  const { jobId, locale, text, image, geoScope, dimensions, env } = input;
  const agents: AgentMeta[] = [];
  let calls = 0;
  const deadProviders = new Set<AskProviderId>();
  const entity = entitySeed(text);
  const ctx = { dimensions, hasImage: Boolean(image) };
  const sections = selectSections(ctx);

  let web: WebPass;
  if (entity) {
    web = await maybeWebResearch(
      { jobId, locale, entity, env, agents },
      emit
    );
  } else {
    emit({ type: 'progress', jobId, step: 'web', status: 'skipped' });
    web = { brief: '', used: false, sources: [] };
  }

  emit({ type: 'progress', jobId, step: 'monolith', status: 'running' });
  const out = await callJsonWithPool({
    role: 'monolith',
    agentId: 'monolith',
    prompt: buildCheckPrompt({
      locale,
      text,
      geoScope,
      dimensions,
      hasImage: Boolean(image),
      webContext: web.brief,
    }),
    env,
    image,
    agents,
    usedInWave: new Set(),
    deadProviders,
    getCalls: () => calls,
    addCall: () => {
      calls += 1;
    },
    maxCalls: 3,
  });

  if (!out.ok) {
    emit({
      type: 'progress',
      jobId,
      step: 'monolith',
      status: 'error',
      detail: out.code,
    });
    return {
      ok: false,
      code: out.code,
      error:
        out.code === 'parse_error'
          ? 'Could not understand the answer. Please try again.'
          : 'The answer service failed. Please try again later.',
      httpStatus:
        out.code === 'upstream_credits'
          ? 402
          : out.code === 'upstream_quota'
            ? 429
            : 502,
      agents,
    };
  }

  emit({ type: 'progress', jobId, step: 'monolith', status: 'done' });
  const parts = readQueryPartials(out.obj, sections);
  if (!parts.product && !parts.company && !parts.alternatives && !parts.ocrText) {
    return {
      ok: false,
      code: 'empty_response',
      error: 'No answer was returned. Please try again.',
      httpStatus: 502,
      agents,
    };
  }

  // AI-cited made-in pages: checked (search match, else ≤2 fetches) before they count.
  let webCoo = web.used ? web.coo ?? [] : undefined;
  let sources = web.sources ?? [];
  let cited: CitedCheck | undefined;
  if (web.used && entity && parts.product?.madeInSources?.length) {
    cited = await verifyCitedSources({
      entity,
      country: parts.product.madeIn,
      cited: parts.product.madeInSources,
      searchUrls: [
        ...(web.sources ?? []).map((l) => parseSourceLine(l)?.url ?? ''),
        ...(web.coo ?? []).map((c) => c.url ?? ''),
      ].filter(Boolean),
      searchPages: web.evidence?.pages ?? [],
      droppedUrls: web.evidence?.droppedUrls ?? [],
      excludedUrls: (web.excluded ?? []).map((e) => e.url),
      searchCoo: web.coo ?? [],
      fetchPage: citedFetcher(web.provider, env),
    });
    // All exact-model evidence together: any disagreement → nothing confirms by model.
    webCoo = settleExactConflict([...(webCoo ?? []), ...cited.verified]);
    const titles = new Map(parts.product.madeInSources.map((c) => [c.url, c.title]));
    sources = [
      ...sources,
      ...cited.verified
        .filter((v) => v.cited === 'fetched' && v.url)
        .map((v) => (titles.get(v.url!) ? `${titles.get(v.url!)} — ${v.url}` : v.url!)),
    ];
  }

  emit({ type: 'progress', jobId, step: 'synthesize', status: 'running' });
  const result = synthesize({
    jobId,
    geoScope,
    locale,
    queryText: text,
    companySkipped: !sections.some((section) => section.partial === 'company'),
    productSkipped: !sections.some((section) => section.partial === 'product'),
    webEnriched: web.used,
    webFailCode: web.used ? undefined : web.error,
    webBrief: web.brief,
    sources,
    // Every provider (Gemini included): made-in needs a barcode / label /
    // 依型號比對 basis from source pages (AI-cited pages only once verified).
    webCoo,
    ocrText: parts.ocrText,
    partials: {
      product: parts.product,
      company: parts.company,
      verify: parts.verify,
      alternatives: parts.alternatives,
    },
  });
  if (normalizeLocale(locale) === 'zh-Hant') {
    // Model text sometimes slips into Simplified or leaves English words.
    Object.assign(
      result,
      fixZhHantDeep(result, ZH_KEEP_SERVER_TEXT, ZH_SKIP_KEYS)
    );
  }
  result.meta.agents = agents;
  if (web.provider) {
    result.meta.searchProvider = web.provider;
    result.meta.searchRequests = web.requests ?? 0;
    // Name the search service that ran (not always Gemini's Google Search).
    if (result.knowledgeCutoffNote === WEB_KNOWLEDGE_NOTE) {
      result.knowledgeCutoffNote = webKnowledgeNote(web.provider);
    }
  }
  if (web.used && webCoo?.length) {
    result.meta.searchCoo = webCoo;
    result.meta.searchMatch = webCoo.some((c) => c.basis === 'barcode')
      ? 'barcode'
      : webCoo.some((c) => c.basis === 'model') || result.product?.madeInBasis === 'model'
        ? 'model'
        : 'name';
  }
  if (web.used && web.excluded?.length) result.meta.searchExcluded = web.excluded;
  if (cited?.unverified.length) result.meta.citedUnverified = cited.unverified;
  if (cited?.fetches) result.meta.citedFetches = cited.fetches;
  // Cited links live in meta (checked) only, not on the product.
  if (result.product && 'madeInSources' in result.product) {
    delete (result.product as { madeInSources?: unknown }).madeInSources;
  }
  emit({ type: 'progress', jobId, step: 'synthesize', status: 'done' });
  return { ok: true, result, mode: 'monolith', agents };
}

export async function runCheckOrchestrator(
  input: OrchestratorInput,
  emit: ProgressEmit = () => undefined
): Promise<OrchestratorOk | OrchestratorErr> {
  emit({
    type: 'progress',
    jobId: input.jobId,
    step: 'start',
    status: 'running',
    detail: 'query',
  });
  return runQuery(input, emit);
}
