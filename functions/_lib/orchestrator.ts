/**
 * OriginWise check orchestrator: monolith | dual | multi (Policy B).
 * Emits progress events for SSE; pure-TS synthesize owns relationTier.
 */

import { assignProvider, resolveCheckMode, type CheckMode } from './aiPool';
import { extractJsonObject } from './jsonExtract';
import {
  callProvider,
  type AskProviderId,
  type LlmEnv,
  type LlmImage,
} from './llm';
import {
  buildAlternativesPrompt,
  buildCompanyPrompt,
  buildDualCorePrompt,
  buildIdentifyPrompt,
  buildMonolithPrompt,
  buildProductPrompt,
  buildVerifyPrompt,
} from './prompts';
import type {
  AlternativesPartial,
  CheckDimension,
  CheckResult,
  CompanyPartial,
  IdentifyPartial,
  ProductPartial,
  VerifyPartial,
} from './schema';
import type { GeoScope } from './regions';
import { synthesize } from './synthesize';

export type ProgressEvent = {
  type: 'progress';
  jobId: string;
  step: string;
  status: 'running' | 'done' | 'skipped' | 'error';
  detail?: string;
};

export type OrchestratorEnv = LlmEnv & {
  CHECK_MODE?: string;
  POOL_DISABLE_PROVIDERS?: string;
};

export type OrchestratorInput = {
  jobId: string;
  locale: 'en' | 'zh-Hant';
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

const MAX_CALLS = 5;

async function callJson(
  provider: AskProviderId,
  prompt: string,
  env: OrchestratorEnv,
  image?: LlmImage
): Promise<{ ok: true; obj: Record<string, unknown>; ms: number } | { ok: false; code: string; ms: number }> {
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

function shouldRunProduct(dims: CheckDimension[]): boolean {
  return dims.includes('origin') || dims.includes('manufacturer');
}

function shouldRunCompany(dims: CheckDimension[]): boolean {
  return dims.includes('company_relations');
}

function shouldRunAlts(dims: CheckDimension[]): boolean {
  return dims.includes('alt_brands') || dims.includes('alt_products');
}

function entitySeed(text: string, identify?: IdentifyPartial | null): string {
  return (
    identify?.name ||
    identify?.brand ||
    text.trim().slice(0, 80) ||
    'unknown item'
  );
}

/** Policy B multi-agent (or sequential single-provider). */
async function runMulti(
  input: OrchestratorInput,
  emit: ProgressEmit
): Promise<OrchestratorOk | OrchestratorErr> {
  const { jobId, locale, text, image, geoScope, dimensions, env } = input;
  const agents: AgentMeta[] = [];
  let calls = 0;
  let identify: IdentifyPartial | null = null;

  // Identify when image present
  if (image) {
    emit({ type: 'progress', jobId, step: 'identify', status: 'running' });
    const asg = assignProvider('identify', env);
    if (!asg) {
      return {
        ok: false,
        code: 'provider_not_configured',
        error: 'Check is temporarily unavailable.',
        httpStatus: 503,
      };
    }
    calls++;
    const out = await callJson(
      asg.provider,
      buildIdentifyPrompt({ locale, text }),
      env,
      image
    );
    agents.push({
      id: 'identify',
      provider: asg.provider,
      ok: out.ok,
      error: out.ok ? undefined : out.code,
      ms: out.ms,
    });
    if (out.ok) {
      identify = out.obj as IdentifyPartial;
      emit({ type: 'progress', jobId, step: 'identify', status: 'done' });
    } else if (!text.trim()) {
      emit({
        type: 'progress',
        jobId,
        step: 'identify',
        status: 'error',
        detail: out.code,
      });
      return {
        ok: false,
        code: out.code,
        error: 'Could not read the image. Please try again or add a product name.',
        httpStatus: 502,
        agents,
      };
    } else {
      emit({
        type: 'progress',
        jobId,
        step: 'identify',
        status: 'error',
        detail: out.code,
      });
    }
  } else {
    emit({ type: 'progress', jobId, step: 'identify', status: 'skipped' });
  }

  const entity = entitySeed(text, identify);
  const sequential =
    (assignProvider('product', env)?.sequential ?? true) === true;

  let product: ProductPartial | null = null;
  let company: CompanyPartial | null = null;
  let productFailed = false;
  let companyFailed = false;

  const runProduct = async (used: Set<AskProviderId>) => {
    if (!shouldRunProduct(dimensions) || calls >= MAX_CALLS) {
      emit({ type: 'progress', jobId, step: 'product', status: 'skipped' });
      return;
    }
    emit({ type: 'progress', jobId, step: 'product', status: 'running' });
    const asg = assignProvider('product', env, used);
    if (!asg) {
      productFailed = true;
      return;
    }
    used.add(asg.provider);
    calls++;
    const out = await callJson(
      asg.provider,
      buildProductPrompt({
        locale,
        entity,
        ocrText: identify?.ocrText,
      }),
      env
    );
    agents.push({
      id: 'product',
      provider: asg.provider,
      ok: out.ok,
      error: out.ok ? undefined : out.code,
      ms: out.ms,
    });
    if (out.ok) {
      product = out.obj as ProductPartial;
      emit({ type: 'progress', jobId, step: 'product', status: 'done' });
    } else {
      productFailed = true;
      emit({
        type: 'progress',
        jobId,
        step: 'product',
        status: 'error',
        detail: out.code,
      });
    }
  };

  const runCompany = async (used: Set<AskProviderId>) => {
    if (!shouldRunCompany(dimensions) || calls >= MAX_CALLS) {
      emit({ type: 'progress', jobId, step: 'company', status: 'skipped' });
      return;
    }
    emit({ type: 'progress', jobId, step: 'company', status: 'running' });
    const asg = assignProvider('company', env, used);
    if (!asg) {
      companyFailed = true;
      return;
    }
    used.add(asg.provider);
    calls++;
    const out = await callJson(
      asg.provider,
      buildCompanyPrompt({
        locale,
        entity,
        productHint: product ? JSON.stringify(product).slice(0, 400) : '',
      }),
      env
    );
    agents.push({
      id: 'company',
      provider: asg.provider,
      ok: out.ok,
      error: out.ok ? undefined : out.code,
      ms: out.ms,
    });
    if (out.ok) {
      company = out.obj as CompanyPartial;
      emit({ type: 'progress', jobId, step: 'company', status: 'done' });
    } else {
      companyFailed = true;
      emit({
        type: 'progress',
        jobId,
        step: 'company',
        status: 'error',
        detail: out.code,
      });
    }
  };

  // Wave A
  if (sequential) {
    const used = new Set<AskProviderId>();
    await runProduct(used);
    await runCompany(used);
  } else {
    const used = new Set<AskProviderId>();
    await Promise.all([runProduct(used), runCompany(used)]);
  }

  // Verify
  let verify: VerifyPartial | null = null;
  if (product && company && calls < MAX_CALLS) {
    emit({ type: 'progress', jobId, step: 'verify', status: 'running' });
    const asg = assignProvider('verify', env);
    if (asg) {
      calls++;
      const out = await callJson(
        asg.provider,
        buildVerifyPrompt({
          locale,
          productJson: JSON.stringify(product).slice(0, 1200),
          companyJson: JSON.stringify(company).slice(0, 1200),
        }),
        env
      );
      agents.push({
        id: 'verify',
        provider: asg.provider,
        ok: out.ok,
        error: out.ok ? undefined : out.code,
        ms: out.ms,
      });
      if (out.ok) {
        verify = out.obj as VerifyPartial;
        emit({ type: 'progress', jobId, step: 'verify', status: 'done' });
      } else {
        emit({
          type: 'progress',
          jobId,
          step: 'verify',
          status: 'error',
          detail: out.code,
        });
      }
    }
  } else {
    emit({ type: 'progress', jobId, step: 'verify', status: 'skipped' });
  }

  // Alternatives (after product+company)
  let alternatives: AlternativesPartial | null = null;
  if (shouldRunAlts(dimensions) && calls < MAX_CALLS) {
    emit({ type: 'progress', jobId, step: 'alternatives', status: 'running' });
    const asg = assignProvider('alternatives', env);
    if (asg) {
      calls++;
      const out = await callJson(
        asg.provider,
        buildAlternativesPrompt({
          locale,
          entity,
          wantBrands: dimensions.includes('alt_brands'),
          wantProducts: dimensions.includes('alt_products'),
          contextJson: JSON.stringify({ product, company }).slice(0, 1000),
        }),
        env
      );
      agents.push({
        id: 'alternatives',
        provider: asg.provider,
        ok: out.ok,
        error: out.ok ? undefined : out.code,
        ms: out.ms,
      });
      if (out.ok) {
        alternatives = out.obj as AlternativesPartial;
        emit({
          type: 'progress',
          jobId,
          step: 'alternatives',
          status: 'done',
        });
      } else {
        emit({
          type: 'progress',
          jobId,
          step: 'alternatives',
          status: 'error',
          detail: out.code,
        });
      }
    }
  } else {
    emit({ type: 'progress', jobId, step: 'alternatives', status: 'skipped' });
  }

  if (!product && !company && !identify) {
    return {
      ok: false,
      code: 'empty_response',
      error: 'No answer was returned. Please try again.',
      httpStatus: 502,
      agents,
    };
  }

  emit({ type: 'progress', jobId, step: 'synthesize', status: 'running' });
  const result = synthesize({
    jobId,
    geoScope,
    locale,
    queryText: text,
    companySkipped: !shouldRunCompany(dimensions),
    productSkipped: !shouldRunProduct(dimensions),
    partials: {
      identify,
      product,
      company,
      verify,
      alternatives,
      productFailed,
      companyFailed,
    },
  });
  result.meta.agents = agents;
  result.meta.degraded =
    result.meta.degraded || productFailed || companyFailed || undefined;
  emit({ type: 'progress', jobId, step: 'synthesize', status: 'done' });

  return { ok: true, result, mode: 'multi', agents };
}

async function runMonolith(
  input: OrchestratorInput,
  emit: ProgressEmit
): Promise<OrchestratorOk | OrchestratorErr> {
  const { jobId, locale, text, image, geoScope, dimensions, env } = input;
  emit({ type: 'progress', jobId, step: 'monolith', status: 'running' });
  const asg = assignProvider('monolith', env);
  if (!asg) {
    return {
      ok: false,
      code: 'provider_not_configured',
      error: 'Check is temporarily unavailable.',
      httpStatus: 503,
    };
  }
  const out = await callJson(
    asg.provider,
    buildMonolithPrompt({
      locale,
      text,
      geoScope,
      dimensions,
      hasImage: Boolean(image),
    }),
    env,
    image
  );
  const agents: AgentMeta[] = [
    {
      id: 'monolith',
      provider: asg.provider,
      ok: out.ok,
      error: out.ok ? undefined : out.code,
      ms: out.ms,
    },
  ];
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
      httpStatus: out.code === 'upstream_quota' ? 429 : 502,
      agents,
    };
  }
  emit({ type: 'progress', jobId, step: 'monolith', status: 'done' });
  emit({ type: 'progress', jobId, step: 'synthesize', status: 'running' });

  const product = (out.obj.product ?? null) as ProductPartial | null;
  const company = (out.obj.company ?? null) as CompanyPartial | null;
  const verify = (out.obj.verification ??
    out.obj.verify ??
    null) as VerifyPartial | null;
  const alternatives = (out.obj.alternatives ??
    null) as AlternativesPartial | null;

  const result = synthesize({
    jobId,
    geoScope,
    locale,
    queryText: text,
    companySkipped: !shouldRunCompany(dimensions),
    productSkipped: !shouldRunProduct(dimensions),
    partials: {
      product: shouldRunProduct(dimensions) ? product : null,
      company: shouldRunCompany(dimensions) ? company : null,
      verify,
      alternatives: shouldRunAlts(dimensions) ? alternatives : null,
    },
  });
  result.meta.agents = agents;
  emit({ type: 'progress', jobId, step: 'synthesize', status: 'done' });
  return { ok: true, result, mode: 'monolith', agents };
}

async function runDual(
  input: OrchestratorInput,
  emit: ProgressEmit
): Promise<OrchestratorOk | OrchestratorErr> {
  const { jobId, locale, text, image, geoScope, dimensions, env } = input;
  const agents: AgentMeta[] = [];

  emit({ type: 'progress', jobId, step: 'dual_core', status: 'running' });
  const asg = assignProvider('dual_core', env);
  if (!asg) {
    return {
      ok: false,
      code: 'provider_not_configured',
      error: 'Check is temporarily unavailable.',
      httpStatus: 503,
    };
  }
  const core = await callJson(
    asg.provider,
    buildDualCorePrompt({
      locale,
      text,
      geoScope,
      hasImage: Boolean(image),
    }),
    env,
    image
  );
  agents.push({
    id: 'dual_core',
    provider: asg.provider,
    ok: core.ok,
    error: core.ok ? undefined : core.code,
    ms: core.ms,
  });
  if (!core.ok) {
    emit({
      type: 'progress',
      jobId,
      step: 'dual_core',
      status: 'error',
      detail: core.code,
    });
    return {
      ok: false,
      code: core.code,
      error: 'The answer service failed. Please try again later.',
      httpStatus: 502,
      agents,
    };
  }
  emit({ type: 'progress', jobId, step: 'dual_core', status: 'done' });

  const product = (core.obj.product ?? null) as ProductPartial | null;
  const company = (core.obj.company ?? null) as CompanyPartial | null;
  const verify = (core.obj.verification ?? null) as VerifyPartial | null;

  let alternatives: AlternativesPartial | null = null;
  if (shouldRunAlts(dimensions)) {
    emit({ type: 'progress', jobId, step: 'alternatives', status: 'running' });
    const asg2 = assignProvider('dual_alts', env);
    if (asg2) {
      const alt = await callJson(
        asg2.provider,
        buildAlternativesPrompt({
          locale,
          entity: entitySeed(text),
          wantBrands: dimensions.includes('alt_brands'),
          wantProducts: dimensions.includes('alt_products'),
          contextJson: JSON.stringify({ product, company }).slice(0, 1000),
        }),
        env
      );
      agents.push({
        id: 'alternatives',
        provider: asg2.provider,
        ok: alt.ok,
        error: alt.ok ? undefined : alt.code,
        ms: alt.ms,
      });
      if (alt.ok) {
        alternatives = alt.obj as AlternativesPartial;
        emit({
          type: 'progress',
          jobId,
          step: 'alternatives',
          status: 'done',
        });
      } else {
        emit({
          type: 'progress',
          jobId,
          step: 'alternatives',
          status: 'error',
        });
      }
    }
  }

  emit({ type: 'progress', jobId, step: 'synthesize', status: 'running' });
  const result = synthesize({
    jobId,
    geoScope,
    locale,
    queryText: text,
    companySkipped: !shouldRunCompany(dimensions),
    productSkipped: !shouldRunProduct(dimensions),
    partials: {
      product: shouldRunProduct(dimensions) ? product : null,
      company: shouldRunCompany(dimensions) ? company : null,
      verify,
      alternatives: shouldRunAlts(dimensions) ? alternatives : null,
    },
  });
  result.meta.agents = agents;
  emit({ type: 'progress', jobId, step: 'synthesize', status: 'done' });
  return { ok: true, result, mode: 'dual', agents };
}

export async function runCheckOrchestrator(
  input: OrchestratorInput,
  emit: ProgressEmit = () => undefined
): Promise<OrchestratorOk | OrchestratorErr> {
  const mode = resolveCheckMode(input.env);
  emit({
    type: 'progress',
    jobId: input.jobId,
    step: 'start',
    status: 'running',
    detail: mode,
  });

  if (mode === 'monolith') return runMonolith(input, emit);
  if (mode === 'dual') {
    const dual = await runDual(input, emit);
    if (dual.ok) return dual;
    // Fall back to monolith if dual failed hard
    emit({
      type: 'progress',
      jobId: input.jobId,
      step: 'monolith',
      status: 'running',
      detail: 'fallback_after_dual',
    });
    const mono = await runMonolith(input, emit);
    if (mono.ok) {
      mono.result.meta.degraded = true;
      mono.result.meta.agents = [
        ...(dual.agents ?? []),
        ...(mono.result.meta.agents ?? []),
      ];
      return { ...mono, mode: 'monolith' };
    }
    return dual;
  }

  // multi
  const multi = await runMulti(input, emit);
  if (multi.ok) return multi;

  // Free-tier quotas often fail one agent; retry once as monolith
  if (
    multi.code === 'empty_response' ||
    multi.code === 'upstream_quota' ||
    multi.code === 'upstream_error' ||
    multi.code === 'parse_error'
  ) {
    emit({
      type: 'progress',
      jobId: input.jobId,
      step: 'monolith',
      status: 'running',
      detail: 'fallback_after_multi',
    });
    const mono = await runMonolith(input, emit);
    if (mono.ok) {
      mono.result.meta.degraded = true;
      mono.result.meta.agents = [
        ...(multi.agents ?? []),
        ...(mono.result.meta.agents ?? []),
      ];
      mono.result.caveats = [
        ...(mono.result.caveats ?? []),
        'Used single-call fallback after multi-agent pool errors',
      ].slice(0, 8);
      return { ...mono, mode: 'monolith' };
    }
  }
  return multi;
}
