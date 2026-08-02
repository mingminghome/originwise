/**
 * Map machine tierReason codes → user-facing copy.
 * Codes stay stable in storage/API; only the UI label is localized.
 */

import type { CheckResult } from '../types';
import type { TFunction } from './index';

const KNOWN = new Set([
  'made_in_cn',
  'origin_cn',
  'manufacturer_cn',
  'hq_cn',
  'parent_majority_cn',
  'ownership_strong_cn',
  'ownership_weak_cn',
  'component_cn',
  'explicit_non_cn_geo',
  'verify_conflict',
  'taiwan_as_country',
  'conflict_no_strong',
  'insufficient',
  'ownership_not_assessed',
]);

function uniquePlaces(result: CheckResult): string[] {
  const raw = [
    result.product?.madeIn,
    result.product?.manufacturedIn,
    result.product?.originCountry,
    result.product?.manufacturerCountry,
    result.company?.hqCountry,
  ]
    .map((s) => (s ? String(s).trim() : ''))
    .filter(Boolean);
  return [...new Set(raw)];
}

function humanizeCode(code: string): string {
  return code
    .replace(/_/g, ' ')
    .replace(/\bcn\b/gi, 'China')
    .replace(/\bhq\b/gi, 'HQ');
}

/**
 * One bullet for the "Why this tier" list.
 */
export function formatTierReason(
  code: string,
  t: TFunction,
  result: CheckResult
): string {
  const places = uniquePlaces(result);
  const placeStr = places.join(', ');

  // Prefer detail variants when we have concrete place names
  if (code === 'explicit_non_cn_geo' && placeStr) {
    return t('check.reason.explicit_non_cn_geo_detail', { places: placeStr });
  }
  if (code === 'made_in_cn') {
    const p = result.product?.madeIn || result.product?.manufacturedIn;
    if (p) return t('check.reason.made_in_cn_detail', { place: p });
  }
  if (code === 'origin_cn' && result.product?.originCountry) {
    return t('check.reason.origin_cn_detail', {
      place: result.product.originCountry,
    });
  }
  if (code === 'manufacturer_cn') {
    const p =
      result.product?.manufacturerCountry || result.product?.manufacturer;
    if (p) return t('check.reason.manufacturer_cn_detail', { place: p });
  }
  if (code === 'hq_cn' && result.company?.hqCountry) {
    return t('check.reason.hq_cn_detail', {
      place: result.company.hqCountry,
    });
  }
  if (code === 'taiwan_as_country' && placeStr) {
    return t('check.reason.taiwan_as_country_detail', { places: placeStr });
  }

  if (KNOWN.has(code)) {
    return t(`check.reason.${code}`);
  }

  // Unknown / future codes: soft humanize, never show raw snake_case alone if avoidable
  const key = `check.reason.${code}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return humanizeCode(code);
}
