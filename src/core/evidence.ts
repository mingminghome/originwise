/**
 * One card rule: nothing reads stronger than its evidence.
 *
 * A row, note, caveat or link label may say 確認 / confirmed / strong only
 * when a verified quote backs it: a confirmed made-in (barcode / label /
 * exact-model match), a package-label read, or a search hit that passed the
 * page gate with status 'confirmed'. Grounding redirects, AI-cited links that
 * failed the check, model memory and the answer's own prose never count.
 */
import type { CheckResult } from './types';

export function hasVerifiedQuote(result: CheckResult): boolean {
  if (result.partsEvidence === 'label') return true;
  if ((result.product?.labelDispute ?? []).length) return true;
  return (result.meta?.searchCoo ?? []).some((h) => h.status === 'confirmed' && !h.evidenceOnly);
}

// "未確認" / "not confirmed" style wording is a hedge, not a claim.
const HEDGE = /((未|無法|不能|沒有|未能|尚未|難以)[^，。；,.;]{0,6}(確認|證實|核實)|unconfirmed|not\s+(been\s+)?(fully\s+|yet\s+)?(confirmed|verified)|unverified|could\s+not\s+(be\s+)?(confirm|verif)\w*|cannot\s+(be\s+)?(confirm|verif)\w*|no\s+confirm\w*)/i;
const CLAIM = /(確認|證實|核實|confirmed|verified|confirms)/i;

/** Text that asserts a confirmation (「經零售通路規格表確認…」, "verified as…"). */
export function claimsConfirmation(text: string): boolean {
  const t = text.replace(new RegExp(HEDGE.source, 'gi'), '');
  return CLAIM.test(t);
}

// 「台灣品牌」「法國品牌」「德國品牌中國製造」, "a French brand".
const BRAND_LABEL = /([\u4e00-\u9fff]{1,4}品牌)|\b(?:[A-Z][a-z]+)\s+brand\b/;

/** Text that hands out a brand-country label. */
export function namesBrandCountry(text: string): boolean {
  return BRAND_LABEL.test(text.replace(/(替代|自有|該|此|本|其|母公司|子)品牌/g, ''));
}

/** A server note / caveat the card may show as-is. */
export function noteWithinEvidence(result: CheckResult, text: string): boolean {
  const verified = hasVerifiedQuote(result);
  if (!verified && claimsConfirmation(text)) return false;
  if (namesBrandCountry(text) && !sourcedBrandInfo(result)) return false;
  return true;
}

function sourcedBrandInfo(result: CheckResult): boolean {
  return (result.product?.designInfo ?? []).some((d) => d.kind === 'brand' && Boolean(d.url?.trim() || d.quote?.trim()));
}

/** China-link strength as shown: 'strong' needs a verified quote. */
export function shownStrength(
  result: CheckResult,
  strength: string | undefined
): string | undefined {
  if (strength === 'strong' && !hasVerifiedQuote(result)) return 'unverified';
  return strength;
}
