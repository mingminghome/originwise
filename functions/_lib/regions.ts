/**
 * China scope only. Taiwan is never China. Hong Kong and Macau count only
 * when the user picked Greater China. Every other country stays the words
 * the model wrote. The spellings below are that scope rule, not a world list.
 */

import { SUPPORTED_LOCALES } from './locale';
import {
  COUNTRY_CODE_BY_LABEL,
  COUNTRY_LABELS,
  COUNTRY_SPELLINGS,
  REGION_LABELS,
} from './regionLabels.generated';

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
 * A made-in has to be a country. UN M.49 regions and CLDR groupings are not.
 * Labels are the Intl names for the UI locales, generated into
 * regionLabels.generated.ts so a browser with a thin Intl still matches.
 * The runtime's own Intl names are added when it has them. A territory with
 * a time zone, or its own language, stays a country.
 */

function foldPlace(raw: string): string {
  return raw.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

function englishRegions(): Intl.DisplayNames | undefined {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
  } catch {
    return undefined;
  }
}

function namedRegion(dn: Intl.DisplayNames, code: string): boolean {
  try {
    const name = dn.of(code);
    return Boolean(name) && name !== code;
  } catch {
    return false;
  }
}

/** The runtime exposes time zones on a locale. The type library does not. */
function timeZonesOf(code: string): readonly string[] | undefined {
  const loc = new Intl.Locale(`und-${code}`) as Intl.Locale & { timeZones?: readonly string[] };
  return loc.timeZones;
}

/** Alpha-2 codes that are not territories: no time zone and no language of their own. */
function groupingCode(dn: Intl.DisplayNames, code: string): boolean {
  if (!namedRegion(dn, code)) return false;
  let zones: readonly string[] | undefined;
  try {
    zones = timeZonesOf(code);
  } catch {
    return false;
  }
  if (zones === undefined || zones.length > 0) return false;
  try {
    return new Intl.Locale(`und-${code}`).maximize().language === 'en';
  } catch {
    return false;
  }
}

let placeNames: { region: Set<string>; country: Set<string> } | undefined;

function longEnough(name: string): boolean {
  if (name.length < 2) return false;
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(name)) return true;
  return name.length >= 5;
}

function hasPhrase(hay: string, names: ReadonlySet<string>): boolean {
  for (const name of names) {
    if (longEnough(name) && hay.includes(name)) return true;
  }
  return false;
}

function placeNameSets(): { region: Set<string>; country: Set<string> } {
  if (placeNames) return placeNames;
  const region = new Set<string>(REGION_LABELS);
  const country = new Set<string>(COUNTRY_LABELS);
  const dn = englishRegions();
  if (dn) {
    const codes: string[] = [];
    for (let i = 1; i <= 999; i++) {
      const code = String(i).padStart(3, '0');
      if (namedRegion(dn, code)) codes.push(code);
    }
    for (let i = 0; i < 26; i++) {
      for (let j = 0; j < 26; j++) {
        const code = String.fromCharCode(65 + i) + String.fromCharCode(65 + j);
        if (groupingCode(dn, code)) codes.push(code);
        else if (namedRegion(dn, code)) country.add(code.toLowerCase());
      }
    }
    for (const code of codes) {
      if (/^[A-Z]{2}$/.test(code)) region.add(code.toLowerCase());
    }
    for (const locale of [...SUPPORTED_LOCALES, 'zh']) {
      let local: Intl.DisplayNames;
      try {
        local = new Intl.DisplayNames([locale], { type: 'region' });
      } catch {
        continue;
      }
      for (const code of codes) {
        const name = local.of(code);
        if (name) region.add(foldPlace(name));
      }
    }
  }
  placeNames = { region, country };
  return placeNames;
}

/** A region name, including one wrapped in punctuation or sitting in a longer label that names no country. */
export function isRegionNotCountry(raw?: string): boolean {
  const s = foldPlace(String(raw ?? ''));
  if (s.length < 2) return false;
  const { region, country } = placeNameSets();
  if (country.has(s)) return false;
  if (region.has(s)) return true;
  const bare = s.replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
  if (bare !== s) {
    if (country.has(bare)) return false;
    if (region.has(bare)) return true;
  }
  if (hasPhrase(s, country)) return false;
  return hasPhrase(s, region);
}

function phraseIn(hay: string, name: string): boolean {
  if (name.length < 2) return false;
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(name) || name.length >= 5) return hay.includes(name);
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`).test(hay);
}

const spellingsByCode = new Map<string, readonly string[]>();

/**
 * Long CLDR names, plus a short or narrow form when Intl has one
 * ("UK") that is not the alpha-2 code itself ("US", "IN").
 */
function spellingsFor(code: string): readonly string[] {
  const cached = spellingsByCode.get(code);
  if (cached) return cached;
  const names = new Set<string>(COUNTRY_SPELLINGS[code] ?? []);
  for (const style of ['short', 'narrow'] as const) {
    for (const locale of [...SUPPORTED_LOCALES, 'zh']) {
      let name: string | undefined;
      try {
        name = new Intl.DisplayNames([locale], { type: 'region', style }).of(code);
      } catch {
        continue;
      }
      if (!name) continue;
      const folded = foldPlace(name);
      if (folded.length < 2 || folded === code.toLowerCase()) continue;
      names.add(folded);
    }
  }
  const list = [...names];
  spellingsByCode.set(code, list);
  return list;
}

/**
 * The quote states this country when it contains one of that country's
 * names. A region is not stated. An unknown spelling is left to the model.
 */
export function quoteNamesCountry(quote: string | undefined, country: string): boolean {
  if (isRegionNotCountry(country)) return false;
  const code = COUNTRY_CODE_BY_LABEL[foldPlace(country)];
  if (!code) return true;
  const q = foldPlace(quote ?? '');
  if (!q) return false;
  return spellingsFor(code).some((name) => phraseIn(q, name));
}

/** A longer country name wins, so Nigeria does not also count as Niger. */
function countriesNamed(line: string): { code: string; name: string }[] {
  const hay = foldPlace(line);
  const hits: { code: string; name: string }[] = [];
  for (const [code, names] of Object.entries(COUNTRY_SPELLINGS)) {
    for (const name of names) {
      if (phraseIn(hay, name)) hits.push({ code, name });
    }
  }
  return hits.filter((h) => !hits.some((o) => o.name.length > h.name.length && o.name.includes(h.name)));
}

/**
 * The shortest line that names this country and no other. A region is not
 * one. "French ovens" is not France. A line that also names China is not
 * a France line.
 */
export function lineNamingCountry(pageText: string | undefined, country: string): string | undefined {
  if (!pageText || isRegionNotCountry(country)) return undefined;
  const code = COUNTRY_CODE_BY_LABEL[foldPlace(country)];
  if (!code) return undefined;
  let best: string | undefined;
  for (const raw of pageText.split(/\n+/)) {
    const line = raw.replace(/[ \t]+/g, ' ').trim();
    if (line.length < 2 || line.length > 180) continue;
    if (!quoteNamesCountry(line, country)) continue;
    // FX shares France's names, and UK shares the United Kingdom's. A name
    // this country also uses is not a second country.
    const own = new Set(spellingsFor(code));
    if (countriesNamed(line).some((h) => h.code !== code && !own.has(h.name))) continue;
    if (!best || line.length < best.length) best = line;
  }
  return best;
}
