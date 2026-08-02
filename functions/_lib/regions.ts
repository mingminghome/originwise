/**
 * Country / region normalization for OriginWise.
 * Taiwan (`TW`) is always a country for tier purposes — never in China scope.
 */

export type RegionCode = 'CN' | 'HK' | 'TW' | 'MO' | 'OTHER' | 'UNKNOWN';
export type GeoScope = 'prc' | 'greater_china';

/** Regions that count as China-related for a given geoScope. TW never included. */
export function scopeSet(geoScope: GeoScope): ReadonlySet<RegionCode> {
  if (geoScope === 'greater_china') {
    return new Set<RegionCode>(['CN', 'HK', 'MO']);
  }
  return new Set<RegionCode>(['CN']);
}

export function inScope(
  region: RegionCode | undefined | null,
  geoScope: GeoScope
): boolean {
  if (!region || region === 'UNKNOWN') return false;
  return scopeSet(geoScope).has(region);
}

/** Defined geo that is not in active China scope (includes TW always). */
export function isOutOfScopeGeo(
  region: RegionCode | undefined | null,
  geoScope: GeoScope
): boolean {
  if (!region || region === 'UNKNOWN') return false;
  return !scopeSet(geoScope).has(region);
}

function includesAny(hay: string, needles: string[]): boolean {
  const h = hay.toLowerCase();
  return needles.some((n) => h.includes(n.toLowerCase()));
}

/**
 * Map free-text country / place labels to RegionCode.
 * Empty / unknown → UNKNOWN.
 * Taiwan is detected before mainland China so it never collapses into CN.
 */
export function normalizeRegion(raw: unknown): RegionCode {
  if (raw == null) return 'UNKNOWN';
  const s = String(raw).trim();
  if (!s) return 'UNKNOWN';

  const upper = s.toUpperCase();
  if (upper === 'CN' || upper === 'CHN') return 'CN';
  if (upper === 'HK' || upper === 'HKG') return 'HK';
  if (upper === 'TW' || upper === 'TWN') return 'TW';
  if (upper === 'MO' || upper === 'MAC') return 'MO';

  // Taiwan first (country — never China-related for tiers)
  if (
    includesAny(s, [
      'taiwan',
      'twn',
      '台灣',
      '台湾',
      '臺灣',
      '中華民國',
      '中华民国',
      'republic of china',
    ]) ||
    /(^|[^a-z])roc([^a-z]|$)/i.test(s)
  ) {
    return 'TW';
  }

  if (
    includesAny(s, ['hong kong', 'hongkong', 'hkg', '香港']) ||
    /(^|[^a-z])hk([^a-z]|$)/i.test(s)
  ) {
    return 'HK';
  }

  if (includesAny(s, ['macau', 'macao', '澳門', '澳门'])) {
    return 'MO';
  }

  if (
    includesAny(s, [
      'mainland china',
      "people's republic of china",
      'peoples republic of china',
      'prc',
      '中國大陸',
      '中国大陆',
      '中華人民共和國',
      '中华人民共和国',
    ]) ||
    /(^|[^a-z])china([^a-z]|$)/i.test(s) ||
    s.includes('中國') ||
    s.includes('中国')
  ) {
    return 'CN';
  }

  if (
    includesAny(s, [
      'japan',
      'usa',
      'united states',
      'korea',
      'germany',
      'france',
      'italy',
      'united kingdom',
      'vietnam',
      'thailand',
      'indonesia',
      'malaysia',
      'singapore',
      'india',
      'australia',
      'canada',
      'mexico',
      'brazil',
      'spain',
      'netherlands',
      'switzerland',
      'sweden',
      'poland',
      'turkey',
      'philippines',
    ]) ||
    /(^|[^a-z])(us|uk|jp|kr|de|fr|it|vn|th|in|au|ca)([^a-z]|$)/i.test(s)
  ) {
    return 'OTHER';
  }

  // Any other non-empty label counts as OTHER (explicit geo)
  if (s.length >= 2) return 'OTHER';
  return 'UNKNOWN';
}
