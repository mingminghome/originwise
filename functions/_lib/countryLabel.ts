/**
 * Country name / code tables shared by the server (synthesize) and the UI
 * (country matching in the result cards). Moved out of synthesize.ts as-is.
 */

/** Name/CJK patterns for whole-string scan (avoid short codes that match English words). */
export const COUNTRY_NAME_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'China', pattern: /\bchina\b|\bprc\b|中國大陸|中国大陆|中國|中国/i },
  { label: 'Hong Kong', pattern: /hong\s*kong|香港/i },
  { label: 'Taiwan', pattern: /\btaiwan\b|台灣|台湾|臺灣/i },
  { label: 'Macau', pattern: /\bmacau\b|\bmacao\b|澳門|澳门/i },
  { label: 'Japan', pattern: /\bjapan\b|日本/i },
  { label: 'South Korea', pattern: /south\s*korea|\bkorea\b|韓國|韩国/i },
  { label: 'Vietnam', pattern: /\bvietnam\b|越南/i },
  { label: 'Thailand', pattern: /\bthailand\b|泰國|泰国|タイ/i },
  { label: 'Indonesia', pattern: /\bindonesia\b|印尼|印度尼西亞/i },
  { label: 'Malaysia', pattern: /\bmalaysia\b|馬來西亞|马来西亚/i },
  { label: 'India', pattern: /\bindia\b|印度/i },
  { label: 'Philippines', pattern: /\bphilippines\b|菲律賓|菲律宾/i },
  { label: 'United States', pattern: /united\s*states|\busa\b|u\.s\.a\.|美國|美国/i },
  { label: 'Germany', pattern: /\bgermany\b|德國|德国/i },
  { label: 'France', pattern: /\bfrance\b|法國|法国/i },
  { label: 'Italy', pattern: /\bitaly\b|意大利|義大利/i },
  { label: 'United Kingdom', pattern: /united\s*kingdom|\bbritain\b|英國|英国/i },
  { label: 'Netherlands', pattern: /\bnetherlands\b|\bholland\b|荷蘭|荷兰/i },
  { label: 'Switzerland', pattern: /\bswitzerland\b|瑞士/i },
  { label: 'Mexico', pattern: /\bmexico\b|墨西哥/i },
  { label: 'Brazil', pattern: /\bbrazil\b|巴西/i },
  { label: 'Turkey', pattern: /\bturkey\b|türkiye|土耳其/i },
  { label: 'Poland', pattern: /\bpoland\b|波蘭|波兰/i },
  { label: 'Australia', pattern: /\baustralia\b|澳洲|澳大利亞/i },
  { label: 'Canada', pattern: /\bcanada\b|加拿大/i },
];

/** ISO / short tokens — only when the token itself is short (after split). */
export const COUNTRY_CODE_TO_LABEL: Record<string, string> = {
  cn: 'China',
  chn: 'China',
  prc: 'China',
  hk: 'Hong Kong',
  hkg: 'Hong Kong',
  tw: 'Taiwan',
  twn: 'Taiwan',
  mo: 'Macau',
  mac: 'Macau',
  jp: 'Japan',
  jpn: 'Japan',
  kr: 'South Korea',
  kor: 'South Korea',
  vn: 'Vietnam',
  vnm: 'Vietnam',
  th: 'Thailand',
  tha: 'Thailand',
  id: 'Indonesia',
  idn: 'Indonesia',
  my: 'Malaysia',
  mys: 'Malaysia',
  ind: 'India',
  ph: 'Philippines',
  phl: 'Philippines',
  us: 'United States',
  usa: 'United States',
  de: 'Germany',
  deu: 'Germany',
  fr: 'France',
  fra: 'France',
  it: 'Italy',
  ita: 'Italy',
  uk: 'United Kingdom',
  gbr: 'United Kingdom',
  nl: 'Netherlands',
  ch: 'Switzerland',
  che: 'Switzerland',
  mx: 'Mexico',
  mex: 'Mexico',
  br: 'Brazil',
  bra: 'Brazil',
  tr: 'Turkey',
  pl: 'Poland',
  pol: 'Poland',
  au: 'Australia',
  aus: 'Australia',
  ca: 'Canada',
  can: 'Canada',
};

/**
 * Canonical English label for one country value ("タイ" / "泰國" / "TH" →
 * "Thailand"), or undefined when unknown.
 */
export function canonicalCountry(raw: string | undefined | null): string | undefined {
  const s = String(raw ?? '').trim();
  if (!s) return undefined;
  const code = COUNTRY_CODE_TO_LABEL[s.toLowerCase()];
  if (code) return code;
  return COUNTRY_NAME_PATTERNS.find((row) => row.pattern.test(s))?.label;
}
