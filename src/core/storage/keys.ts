/**
 * All OriginWise localStorage keys share this prefix for a clean wipe.
 * v2: the share image is one result card drawn from the score JSON.
 * v1 stored a separate post per layer (originwise_v1_*). store.ts copies those once.
 */
export const STORAGE_PREFIX = 'originwise_v2_';

/** Previous prefix. Read once, then removed. */
export const LEGACY_STORAGE_PREFIX = 'originwise_v1_';

export const STORAGE_KEYS = {
  settings: `${STORAGE_PREFIX}settings`,
  checkHistory: `${STORAGE_PREFIX}check_history`,
  /** ISO timestamp when user accepted first-visit disclaimer */
  disclaimerAck: `${STORAGE_PREFIX}disclaimer_ack`,
} as const;
