/**
 * Auto re-submit after a free-server 429 ("check already in progress" or the
 * 30 s window). At most MAX_AUTO_RETRIES automatic re-submits per check the
 * user started; after that the user re-submits by hand. Before this cap an
 * in-flight 429 re-armed the 30 s countdown on every attempt and kept
 * re-submitting while a slow check was still running.
 */
import type { RateLimitMeta } from '../ai/client';

export const MAX_AUTO_RETRIES = 1;

export type RateHit = {
  code: 'rate_limited' | 'rate_limited_day';
  meta?: RateLimitMeta;
};

/** Seconds until the automatic re-submit, or null for none. */
export function autoRetrySeconds(hit: RateHit, autoAttempts = 0): number | null {
  if (autoAttempts >= MAX_AUTO_RETRIES) return null;
  const w = hit.meta?.window;
  if (hit.code === 'rate_limited_day' || w === 'long' || w === 'day') {
    return null;
  }
  // An in-flight check can take over a minute: wait the full server hint.
  const fallback = 30;
  const s = hit.meta?.retryAfterSec ?? fallback;
  return Math.max(1, Math.min(Math.ceil(s), 120));
}
