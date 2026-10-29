/**
 * The query's own writing is the market, unless the user picked markets.
 * There is no script-to-country table: a Polish query is the Polish-sold unit
 * the same way a Japanese query is the Japan-sold unit. A picked list replaces
 * that inference. The check and the research prompt both use this one line.
 */

import { countryMarketCodes, countryMatchesTld } from './regions';

const MAX_MARKETS = 8;
const GLOBAL_HOSTS = new Set(['com', 'net', 'org']);

/** Countries the user picked. A region code and a repeat are dropped. */
export function normalizeMarketCodes(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const allowed = new Set(countryMarketCodes());
  const out: string[] = [];
  for (const item of raw) {
    const code = String(item ?? '').trim().toUpperCase();
    if (!allowed.has(code) || out.includes(code)) continue;
    out.push(code);
    if (out.length >= MAX_MARKETS) break;
  }
  return out;
}

export function marketLabels(codes: readonly string[]): string[] {
  let dn: Intl.DisplayNames | undefined;
  try {
    dn = new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    dn = undefined;
  }
  return codes.map((code) => {
    let name = '';
    try {
      name = dn?.of(code) ?? '';
    } catch {
      name = '';
    }
    return name && name !== code ? `${name} (${code})` : code;
  });
}

/** English place names for a search line. The code in parentheses is dropped. */
function salePlaceNames(codes: readonly string[]): string[] {
  return marketLabels(codes).map((label) => label.replace(/ \([A-Z]{2}\)$/, ''));
}

/**
 * Empty when the user picked nothing.
 * The same name sold in another market can be a different finished unit.
 */
export function soldInPhrase(item: string, codes: readonly string[] | undefined): string {
  const picked = normalizeMarketCodes([...(codes ?? [])]);
  if (!picked.length) return '';
  const name = item.replace(/\s+/g, ' ').trim().slice(0, 180);
  const places = salePlaceNames(picked).join(', ');
  return name ? `${name} sold in ${places}` : `sold in ${places}`;
}

/**
 * Empty when the user picked nothing, so the usual market sentence stays.
 * The market is where the unit is sold. madeIn can be a different country.
 */
export function marketLimitLine(item: string, codes: readonly string[] | undefined): string {
  const phrase = soldInPhrase(item, codes);
  if (!phrase) return '';
  return `The unit is ${phrase}. Use those words in the search. Search and judge that sold unit. A shop from another country is not this unit. The same name sold only in another market can be a different finished unit, and that unit's factory is not this madeIn. When you recommend an alternative brand or product, it must be sold in at least one of these markets. Do not recommend one that is only sold somewhere else. The market is where it is sold. madeIn is where that finished unit is made, and the two can differ.`;
}

export function queryMarketLine(text: string, markets?: readonly string[]): string {
  const limit = marketLimitLine(text, markets);
  if (limit) return `QUERY MARKET: ${limit}`;
  const sample = text.replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!sample) return '';
  const where = searchMarket(text);
  const place = where
    ? ` Search ${where.location} pages in ${where.lang}. Do not use shops from other countries.`
    : '';
  return `QUERY MARKET: the user wrote ${JSON.stringify(sample)}. Search and judge the unit sold under that writing, in whatever language it is.${place} madeIn is that finished unit. The same name sold in another market can be finished in a different country, and that factory is not this madeIn. A part's country stays on that part. Use the origin-field words of this language. Design, brand-home, and domestic-marketing lines are not the factory.`;
}

export type PinnedMarket = { country: string; lang?: string; location: string };

/**
 * One picked market pins the search API. Several markets do not: one country
 * parameter would drop the others. With no pick, kana means the Japan-sold
 * unit. Kanji alone is not enough: a Chinese query has no kana.
 */
export function searchMarket(text: string, markets?: readonly string[]): PinnedMarket | undefined {
  const picked = normalizeMarketCodes([...(markets ?? [])]);
  if (picked.length > 1) return undefined;
  if (picked.length === 1) {
    const code = picked[0]!;
    if (code === 'JP' && /[\u3040-\u30ff]/.test(text)) {
      return { country: 'JP', lang: 'ja', location: 'Japan' };
    }
    const location = marketLabels([code])[0]?.replace(/ \([A-Z]{2}\)$/, '') || code;
    return { country: code, location };
  }
  if (/[\u3040-\u30ff]/.test(text)) return { country: 'JP', lang: 'ja', location: 'Japan' };
  return undefined;
}

/** A country-code shop ending outside the picked markets. .com, .net, and .org stay. */
export function hostOutsideMarkets(hostname: string, codes: readonly string[]): boolean {
  const last = hostname.split('.').pop()?.toLowerCase() ?? '';
  if (last.length !== 2 || GLOBAL_HOSTS.has(last)) return false;
  return !codes.some((code) => countryMatchesTld(code, last));
}
