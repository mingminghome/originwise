/**
 * China scope only. Taiwan is never China. Hong Kong and Macau count only
 * when the user picked Greater China. Every other country stays the words
 * the model wrote. The spellings below are that scope rule, not a world list.
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
    ]) ||
    // "Republic of China" / ROC / R.O.C. is Taiwan; "People's Republic of China" is not.
    // Any apostrophe or none: People's / People’s / People s / Peoples.
    /(?<!people.?s\s+)republic\s+of\s+china/i.test(s) ||
    /(^|[^a-z.])r\.?o\.?c\b/i.test(s)
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
      'p.r.c',
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

  // Any other label is a country the model named. It is not looked up in a list.
  if (s.length >= 2) return 'OTHER';
  return 'UNKNOWN';
}

/**
 * A continent is not a factory country. The match is the whole label, so
 * "European Union" stays a place the page named.
 */
const CONTINENTS = new Set([
  'europe',
  'asia',
  'africa',
  'oceania',
  'antarctica',
  'north america',
  'south america',
  'america',
  '歐洲',
  '欧洲',
  '亞洲',
  '亚洲',
  '非洲',
  '大洋洲',
  '南極洲',
  '南极洲',
  '北美洲',
  '南美洲',
  '美洲',
]);

export function isRegionNotCountry(raw?: string): boolean {
  const s = String(raw ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return CONTINENTS.has(s);
}
