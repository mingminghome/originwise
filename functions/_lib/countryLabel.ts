/**
 * Country name / code tables shared by the server (synthesize) and the UI
 * (country matching in the result cards). Moved out of synthesize.ts as-is.
 */

/** Name/CJK patterns for whole-string scan (avoid short codes that match English words). */
export const COUNTRY_NAME_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'China', pattern: /\bchina\b|\bprc\b|中華人民共和國|中华人民共和国|中國大陸|中国大陆|中國|中国/i },
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

/**
 * Short forms read only right after an explicit made-in cue ("MADE IN CN",
 * "Country of Origin: CN", "COO: VN", "產地：TW", "Made in the UK"). Upper
 * case only, never in free prose. DE and IT are left out on purpose
 * ("IT company", German "DE" shop codes).
 */
export const MADE_IN_CODE_LABEL: Record<string, string> = {
  CN: 'China', TW: 'Taiwan', VN: 'Vietnam', TH: 'Thailand', JP: 'Japan', KR: 'South Korea',
  HK: 'Hong Kong', MY: 'Malaysia', PH: 'Philippines', ID: 'Indonesia', IN: 'India',
  BD: 'Bangladesh', KH: 'Cambodia', MX: 'Mexico', TR: 'Turkey', PT: 'Portugal', PL: 'Poland',
  CZ: 'Czech Republic', UK: 'United Kingdom', 'U.K.': 'United Kingdom', USA: 'United States',
  'U.S.A.': 'United States', 'U.S.': 'United States', PRC: 'China', EU: 'European Union',
};
const ci = (w: string) => w.replace(/[a-z]/g, (c) => `[${c}${c.toUpperCase()}]`);
const MADE_IN_CODE_CUE = [
  `(?:${['made', 'manufactured', 'assembled', 'produced'].map(ci).join('|')})[\\s-]?${ci('in')}\\s*[:：]?`,
  `${ci('country')}\\s+${ci('of')}\\s+${ci('origin')}\\s*[:：]?`,
  `(?<!${ci('brand')}\\s)${ci('origin')}\\s*[:：]`,
  `\\b${ci('coo')}\\s*[:：]`,
  '(?:產地|产地|原產國|原產国|原産国|原产国|製造国|製造國|生產國|生産国)\\s*[:：]?',
].join('|');
// MY / IN / ID are also English words: "MADE IN MY KITCHEN" is no claim.
const MADE_IN_CODE_TOKEN =
  'U\\.K\\.|U\\.S\\.A\\.|U\\.S\\.|(?:CN|TW|VN|TH|JP|KR|HK|PH|BD|KH|MX|TR|PT|PL|CZ|UK|USA|PRC|EU)(?![A-Za-z])|(?:MY|IN|ID)(?![A-Za-z])(?![ \\t]*[A-Za-z])';
/** Global regex: m[1] is the code (a key of MADE_IN_CODE_LABEL). */
export function madeInCodeRegex(): RegExp {
  return new RegExp(`(?:${MADE_IN_CODE_CUE})\\s*(?:${ci('the')}\\s+)?(${MADE_IN_CODE_TOKEN})`, 'g');
}
