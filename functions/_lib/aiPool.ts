/**
 * Provider pool for a check. Identity, tidy, and score each pick one
 * configured provider. A provider that already failed this request
 * (quota, credits, auth) is skipped so another key can finish the job.
 */

import {
  ASK_PROVIDERS,
  providerConfigured,
  type AskProviderId,
  type LlmEnv,
} from './llm';

export type AgentRole = 'identify' | 'monolith' | 'score';

/** Response field. A check is always this one path. */
export type CheckMode = 'monolith';

const ROLE_PREF: Record<AgentRole, AskProviderId[]> = {
  identify: ['gemini', 'openai', 'claude', 'grok'],
  monolith: ['gemini', 'openai', 'grok', 'claude'],
  score: ['gemini', 'openai', 'grok', 'claude'],
};

export function listConfiguredProviders(env: LlmEnv): AskProviderId[] {
  return ASK_PROVIDERS.filter((p) => providerConfigured(p, env));
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
    code === 'upstream_credits' ||
    code === 'upstream_error' ||
    code === 'provider_not_configured' ||
    code === 'gemini_not_configured' ||
    code === 'empty_response'
  );
}
