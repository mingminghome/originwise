/**
 * Free-tier AI pool: assign providers per agent role, with sequential
 * single-key mode and multi-provider parallel when ≥2 keys exist.
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

/** Preferred providers per role (first available wins within a wave). */
const ROLE_PREF: Record<AgentRole, AskProviderId[]> = {
  identify: ['gemini', 'openai', 'claude', 'grok'],
  product: ['openai', 'gemini', 'grok', 'claude'],
  company: ['grok', 'openai', 'gemini', 'claude'],
  verify: ['gemini', 'claude', 'openai', 'grok'],
  alternatives: ['claude', 'openai', 'gemini', 'grok'],
  monolith: ['gemini', 'openai', 'grok', 'claude'],
  dual_core: ['gemini', 'openai', 'grok', 'claude'],
  dual_alts: ['claude', 'openai', 'gemini', 'grok'],
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
 * Pick a provider for a role, avoiding providers already used in this wave
 * when multiple keys exist (spread load). Falls back to any configured key.
 */
export function assignProvider(
  role: AgentRole,
  env: LlmEnv & { POOL_DISABLE_PROVIDERS?: string },
  usedInWave: Set<AskProviderId> = new Set()
): PoolAssignment | null {
  const configured = listConfiguredProviders(env).filter(
    (p) => !disabledSet(env).has(p)
  );
  if (!configured.length) return null;

  const sequential = configured.length < 2;
  const prefs = ROLE_PREF[role] ?? configured;

  // Prefer unused providers when multi-key
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
