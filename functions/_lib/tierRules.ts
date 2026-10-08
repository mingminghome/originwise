/**
 * Relation tier from reason codes (shared by the server synthesize and the
 * client China card, so both decide the same way).
 *
 * Strong (→ direct): made_in_cn, manufacturer_cn, hq_cn, parent_majority_cn,
 * ownership_strong_cn (old cached results only; the server folds a named
 * controlling China parent into parent_majority_cn).
 * Weak (→ indirect): origin_cn, component_cn, ownership_weak_cn (a named
 * China parent with a minority stake).
 *
 * Unnamed / stake-less China relations ("strong ownership link", supply,
 * retail) never raise the tier. They only stop an "unrelated" (none) verdict:
 * with such a mention on file the tier is unknown, not none.
 */
import type { RelationTier } from './schema';

export const STRONG_CN_CODES: ReadonlySet<string> = new Set([
  'made_in_cn',
  'manufacturer_cn',
  'hq_cn',
  'parent_majority_cn',
  'ownership_strong_cn',
]);

export const WEAK_CN_CODES: ReadonlySet<string> = new Set([
  'origin_cn',
  'component_cn',
  'ownership_weak_cn',
]);

export function tierFromCodes(
  codes: readonly string[],
  opts: { unverifiedChinaMention?: boolean } = {}
): RelationTier {
  const has = (c: string) => codes.includes(c);
  const strong = codes.some((c) => STRONG_CN_CODES.has(c));
  const positive = strong || codes.some((c) => WEAK_CN_CODES.has(c));
  if (has('verify_conflict') && !strong) return 'unknown';
  if (strong) return 'direct';
  if (positive) return 'indirect';
  if (has('explicit_non_cn_geo')) return opts.unverifiedChinaMention ? 'unknown' : 'none';
  return 'unknown';
}
