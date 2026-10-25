/**
 * OriginWise check.
 * 1. A model reads the user text and names the product.
 * 2. We fetch pages ourselves.
 * 3. A model writes the card from those pages.
 * 4. A quote stays only when it is on a page we fetched. The score step
 *    then writes the lines the page shows.
 */

import {
  assignProvider,
  isProviderDeadError,
  type AgentRole,
  type CheckMode,
} from './aiPool';
import { extractJsonObject } from './jsonExtract';
import {
  callProvider,
  type AskProviderId,
  type LlmEnv,
  type LlmImage,
} from './llm';
import type { CheckDimension, CheckResult } from './schema';
import { WEB_KNOWLEDGE_NOTE, webKnowledgeNote } from './schema';
import type { GeoScope } from './schema';
import { groundPageQuotes, identityPrompt, keepTidy, readIdentity, readTidy, resultFromTidy, tidyPrompt } from './pipeline';
import { pageMentionsUnit, pageOutsideMarket } from './search/extract';
import { buildScorePrompt, readOverall } from './score';
import type { SearchEvidence } from './search/types';
import {
  isSearchEnabled,
  runSearchChain,
  type SearchEnv,
  type SearchProviderId,
} from './search';

export type ProgressEvent = {
  type: 'progress';
  jobId: string;
  step: string;
  status: 'running' | 'done' | 'skipped' | 'error';
  detail?: string;
};

export type OrchestratorEnv = LlmEnv &
  SearchEnv & {
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
  /** Page text the tidy step may quote. */
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
    // One garbled JSON (a stray token) is common. Retry once before
    // skipping the provider. A second parse_error still skips it.
    if (out.code === 'parse_error' && attempt === 0) {
      agents.pop();
      usedInWave.delete(asg.provider);
      continue;
    }
    if (out.code === 'parse_error') {
      deadProviders.add(asg.provider);
    }
  }

  return last;
}

/** One JSON call. A missing or unreadable score leaves the check as it is. */
async function attachOverall(
  result: CheckResult,
  locale: string,
  env: OrchestratorEnv,
  agents: AgentMeta[],
  deadProviders: Set<AskProviderId>,
  emit: ProgressEmit,
  jobId: string
): Promise<void> {
  emit({ type: 'progress', jobId, step: 'score', status: 'running' });
  let calls = 0;
  const out = await callJsonWithPool({
    role: 'score',
    agentId: 'score',
    prompt: buildScorePrompt(result, locale),
    env,
    agents,
    usedInWave: new Set(),
    deadProviders,
    getCalls: () => calls,
    addCall: () => {
      calls += 1;
    },
    maxCalls: 2,
  });
  const overall = out.ok ? readOverall(out.obj) : undefined;
  if (!overall) {
    emit({
      type: 'progress',
      jobId,
      step: 'score',
      status: 'error',
      detail: out.ok ? 'parse_error' : out.code,
    });
    return;
  }
  result.overall = overall;
  emit({ type: 'progress', jobId, step: 'score', status: 'done' });
}

function pageTexts(web: WebPass, entity: string): {
  pages: Array<{ url: string; text: string }>;
  factoryPages: Array<{ url: string; text: string }>;
} {
  const pages = (web.evidence?.pages ?? [])
    .filter((p) => p.text.trim())
    .filter((p) => !pageOutsideMarket(p.finalUrl || p.url, entity))
    .filter((p) => pageMentionsUnit(entity, `${p.title ?? ''}\n${p.text}`))
    .map((p) => ({ url: p.finalUrl || p.url, text: p.text }));
  const seen = new Set(pages.map((p) => p.url));
  const factoryPages = (web.evidence?.factoryPages ?? [])
    .filter((p) => p.text.trim())
    .filter((p) => !pageOutsideMarket(p.finalUrl || p.url, entity))
    .map((p) => ({ url: p.finalUrl || p.url, text: p.text }))
    .filter((p) => !seen.has(p.url))
    .slice(0, 2);
  return { pages, factoryPages };
}

/**
 * Name the product, fetch pages, keep only quotes that are on those pages,
 * then let the score step write the card.
 */
async function runQuery(
  input: OrchestratorInput,
  emit: ProgressEmit
): Promise<OrchestratorOk | OrchestratorErr> {
  const { jobId, locale, text, image, geoScope, env } = input;
  const agents: AgentMeta[] = [];
  let calls = 0;
  const deadProviders = new Set<AskProviderId>();
  const pool = {
    env,
    agents,
    deadProviders,
    getCalls: () => calls,
    addCall: () => {
      calls += 1;
    },
    maxCalls: 6,
  };

  emit({ type: 'progress', jobId, step: 'identify', status: 'running' });
  const identify = callJsonWithPool({
    ...pool,
    role: 'identify',
    agentId: 'identify',
    prompt: identityPrompt(text, locale),
    image,
    usedInWave: new Set(),
  });
  // A photo with no text has nothing to search until the label is read.
  const searchNow = text.trim();
  const webTask: Promise<WebPass> = searchNow
    ? maybeWebResearch({ jobId, locale, entity: searchNow.slice(0, 180), env, agents }, emit)
    : Promise.resolve({ brief: '', used: false, sources: [] });
  const [named, webFirst] = await Promise.all([identify, webTask]);
  const identity = readIdentity(named.ok ? named.obj : null, text);
  emit({
    type: 'progress',
    jobId,
    step: 'identify',
    status: named.ok ? 'done' : 'error',
    detail: named.ok ? undefined : named.code,
  });

  const entity = [identity.brand, identity.name].filter(Boolean).join(' ').trim();
  let web = webFirst;
  if (!searchNow && entity) {
    web = await maybeWebResearch({ jobId, locale, entity, env, agents }, emit);
  } else if (!searchNow) {
    emit({ type: 'progress', jobId, step: 'web', status: 'skipped' });
  }

  const { pages, factoryPages } = pageTexts(web, text.trim() || entity);
  emit({ type: 'progress', jobId, step: 'monolith', status: 'running' });
  const tidyPromptText = tidyPrompt({ locale, identity, pages, factoryPages });
  let tidy = await callJsonWithPool({
    ...pool,
    role: 'monolith',
    agentId: 'monolith',
    prompt: tidyPromptText,
    usedInWave: new Set(),
  });
  if (!tidy.ok && tidy.code === 'upstream_unavailable') {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    tidy = await callJsonWithPool({
      ...pool,
      role: 'monolith',
      agentId: 'monolith',
      prompt: tidyPromptText,
      usedInWave: new Set(),
    });
  }
  if (!tidy.ok && !identity.name) {
    emit({ type: 'progress', jobId, step: 'monolith', status: 'error', detail: tidy.code });
    return {
      ok: false,
      code: tidy.code,
      error:
        tidy.code === 'parse_error'
          ? 'Could not understand the answer. Please try again.'
          : 'The answer service failed. Please try again later.',
      httpStatus: tidy.code === 'upstream_credits' ? 402 : tidy.code === 'upstream_quota' ? 429 : 502,
      agents,
    };
  }
  emit({
    type: 'progress',
    jobId,
    step: 'monolith',
    status: tidy.ok ? 'done' : 'error',
    detail: tidy.ok ? undefined : tidy.code,
  });

  const kept = keepTidy(
    groundPageQuotes(readTidy(tidy.ok ? tidy.obj : null), pages),
    [...pages, ...factoryPages].map((p) => p.text)
  );
  const result = resultFromTidy({
    jobId,
    geoScope,
    identity,
    facts: kept,
    sources: web.sources ?? [],
    web: web.used,
  });
  result.meta.agents = agents;
  if (tidy.ok) {
    await attachOverall(result, locale, env, agents, deadProviders, emit, jobId);
  }
  if (web.provider) {
    result.meta.searchProvider = web.provider;
    result.meta.searchRequests = web.requests ?? 0;
    if (result.knowledgeCutoffNote === WEB_KNOWLEDGE_NOTE) {
      result.knowledgeCutoffNote = webKnowledgeNote(web.provider);
    }
  }
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
