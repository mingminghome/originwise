/**
 * Free-tier AI pool: assign providers per agent role, with sequential
 * single-key mode and multi-provider parallel when ≥2 keys exist.
 *
 * Free-tier reality (2026):
 * - Gemini: real free Flash-Lite RPD (most reliable free API)
 * - OpenAI Free tier: low RPD (~50/day); prefer mini (gpt-5.4-mini) over flagship
 * - Anthropic: one-time trial credits, not ongoing free
 * - xAI: trial/credits required; no unlimited free model
 *
 * Prefer spreading roles, but skip providers that already failed this request
 * (quota/auth) so Gemini can finish the job.
 */

import {
  ASK_PROVIDERS,
  providerConfigured,
  type AskProviderId,
  type LlmEnv,
} from './llm';

export type AgentRole =
  | 'identify'
  | 'product'
  | 'company'
  | 'verify'
  | 'alternatives'
  | 'monolith'
  | 'dual_core'
  | 'dual_alts';

/**
 * Preferred providers per role.
 * Gemini is early in every list as free-tier safety net; other free keys
 * still get first shot when healthy so load spreads.
 */
const ROLE_PREF: Record<AgentRole, AskProviderId[]> = {
  identify: ['gemini', 'openai', 'claude', 'grok'],
  // product/company/alts still try other free tiers first when available
  product: ['openai', 'gemini', 'grok', 'claude'],
  company: ['grok', 'gemini', 'openai', 'claude'],
  verify: ['gemini', 'claude', 'openai', 'grok'],
  alternatives: ['claude', 'gemini', 'openai', 'grok'],
  monolith: ['gemini', 'openai', 'grok', 'claude'],
  dual_core: ['gemini', 'openai', 'grok', 'claude'],
  dual_alts: ['claude', 'gemini', 'openai', 'grok'],
};

export type CheckMode = 'multi' | 'dual' | 'monolith';

export function listConfiguredProviders(env: LlmEnv): AskProviderId[] {
  return ASK_PROVIDERS.filter((p) => providerConfigured(p, env));
}

export function resolveCheckMode(
  env: LlmEnv & { CHECK_MODE?: string },
  configured: AskProviderId[] = listConfiguredProviders(env)
): CheckMode {
  const forced = String(env.CHECK_MODE ?? '')
    .toLowerCase()
    .trim();
  if (forced === 'monolith' || forced === 'dual' || forced === 'multi') {
    return forced;
  }
  // Auto:
  // - ≥2 keys → multi (sub-agents + cross-provider pool / parallel wave)
  // - 1 key → multi sequential (same agents, one provider, no parallel)
  // Override anytime with CHECK_MODE=monolith|dual|multi
  if (configured.length >= 1) return 'multi';
  return 'monolith';
}

/**
 * Soft-disable list from env (comma-separated), e.g. after quota issues.
 */
function disabledSet(env: LlmEnv & { POOL_DISABLE_PROVIDERS?: string }): Set<string> {
  return new Set(
    String(env.POOL_DISABLE_PROVIDERS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export type PoolAssignment = {
  provider: AskProviderId;
  /** True when only one key — callers should not parallelize waves */
  sequential: boolean;
  configured: AskProviderId[];
};

/**
 * Pick a provider for a role.
 * - `usedInWave`: soft avoid (load spread)
 * - `skipProviders`: hard skip (already failed this request with quota/auth/error)
 */
export function assignProvider(
  role: AgentRole,
  env: LlmEnv & { POOL_DISABLE_PROVIDERS?: string },
  usedInWave: Set<AskProviderId> = new Set(),
  skipProviders: Set<AskProviderId> = new Set()
): PoolAssignment | null {
  const configured = listConfiguredProviders(env).filter(
    (p) => !disabledSet(env).has(p) && !skipProviders.has(p)
  );
  if (!configured.length) return null;

  const sequential = listConfiguredProviders(env).filter(
    (p) => !disabledSet(env).has(p)
  ).length < 2;
  const prefs = ROLE_PREF[role] ?? configured;

  // Prefer unused healthy providers when multi-key
  if (!sequential) {
    for (const p of prefs) {
      if (configured.includes(p) && !usedInWave.has(p)) {
        return { provider: p, sequential, configured };
      }
    }
  }

  for (const p of prefs) {
    if (configured.includes(p)) {
      return { provider: p, sequential, configured };
    }
  }

  return {
    provider: configured[0]!,
    sequential,
    configured,
  };
}

/** Errors that mean "don't use this provider again this request". */
export function isProviderDeadError(code: string | undefined): boolean {
  return (
    code === 'upstream_quota' ||
    code === 'upstream_error' ||
    code === 'upstream_unavailable' ||
    code === 'provider_not_configured' ||
    code === 'gemini_not_configured' ||
    code === 'empty_response'
  );
}
