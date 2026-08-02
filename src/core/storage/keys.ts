/** All OriginWise localStorage keys share this prefix for clean wipe. */
export const STORAGE_PREFIX = 'originwise_v1_';

export const STORAGE_KEYS = {
  settings: `${STORAGE_PREFIX}settings`,
  checkHistory: `${STORAGE_PREFIX}check_history`,
  /** ISO timestamp when user accepted first-visit disclaimer */
  disclaimerAck: `${STORAGE_PREFIX}disclaimer_ack`,
} as const;
