/**
 * Country name / code tables shared by the server (synthesize) and the UI
 * (country matching in the result cards). Moved out of synthesize.ts as-is.
 */

/** Name/CJK patterns for whole-string scan (avoid short codes that match English words). */
export const COUNTRY_NAME_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  // "Republic of China" / ROC is Taiwan; "People's Republic of China" stays China.
  { label: 'China', pattern: /(?<!(?<!people.?s\s+)republic\s+of\s+)\bchina\b|\bprc\b|\bp\.r\.c\b|中華人民共和國|中华人民共和国|中國大陸|中国大陆|中國|中国/i },
  { label: 'Hong Kong', pattern: /hong\s*kong|香港/i },
  { label: 'Taiwan', pattern: /\btaiwan\b|(?<!people.?s\s+)\brepublic\s+of\s+china\b|\br\.o\.c\b\.?|^roc$|台灣|台湾|臺灣|中華民國|中华民国/i },
  { label: 'Macau', pattern: /\bmacau\b|\bmacao\b|澳門|澳门/i },
  { label: 'Japan', pattern: /\bjapan\b|日本/i },
  // North Korea first, and never inside South Korea's pattern ("Made in North Korea" /
  // "Democratic People's Republic of Korea" / "D.P.R. Korea" are not 韓國; "Republic of Korea" is).
  { label: 'North Korea', pattern: /north[\s-]*korea|\bn\.?\s*korea\b|\bdprk\b|\bd\.p\.r\.k\b|democratic\s+people.?s\s+republic\s+of\s+korea|\bd\.?\s?p\.?\s?r\.?\s+korea\b|北韓|北韩|北朝鮮|北朝鲜|朝鮮民主|朝鲜民主/i },
  { label: 'South Korea', pattern: /south\s*korea|(?<!north[\s-]*|\bn\.?\s*|people.?s\s+republic\s+of\s+|\bd\.?\s?p\.?\s?r\.?\s+)\bkorea\b|韓國|韩国/i },
  { label: 'Vietnam', pattern: /\bviet\s?nam\b|越南/i },
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

/**
 * Field-name words before 產地 / 原產國 that make the field no whole-product
 * made-in: brand / design origin (品牌產地, 設計產地, ブランド原産国: 附加資訊 only)
 * and part / material fields (配件產地, 電池產地, 面料產地: a component). Any other
 * prefix (原產地, 商品產地, 產品產地, 製造產地, or one not listed) stays a full field.
 */
export const BRAND_FIELD_WORDS = ['品牌', '設計', '设计', 'ブランド', 'デザイン'];
export const PART_FIELD_WORDS = [
  '配件', '電池', '电池', '零件', '部件', '部品', '零組件', '零组件', '機芯', '机芯', '面料', '布料',
  '材料', '材質', '材质', '原料', '素材', '生地', '馬達', '马达', '電機', '电机', 'パーツ',
  // Packaging, manual, label, chip, lens, head (round 11). 機身 / 主機 / 本體 are the whole product.
  '外箱', '包裝', '包装', '外盒', '包材', 'パッケージ', '說明書', '说明书', '盒子', '標籤', '标签',
  '芯片', '晶片', '鏡頭', '镜头', '機頭', '机头',
  // Box, hang tag, power supply / cord, housing (round 12).
  '包裝盒', '包装盒', '吊牌', '電源', '电源', '電源線', '电源线', '外殼', '外壳',
  // Charger / battery pack (round 19): parts like 電池.
  '充電器', '充电器', 'バッテリー',
];
/**
 * Lookbehind: not right after a brand / design / part word (an optional 原 between).
 * The brand words are not redundant with designOrigin: 「品牌產地 德國」 (no colon)
 * would read 產地 德國 as a made-in without them.
 */
export const NOT_PRODUCT_FIELD = `(?<!(?:${[...BRAND_FIELD_WORDS, ...PART_FIELD_WORDS].join('|')})原?)`;

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
  'U.S.A.': 'United States', 'U.S.': 'United States', PRC: 'China', 'P.R.C.': 'China', 'P.R.C': 'China',
  EU: 'European Union',
};
const ci = (w: string) => w.replace(/[a-z]/g, (c) => `[${c}${c.toUpperCase()}]`);
const MADE_IN_CUE = `(?:${['made', 'manufactured', 'assembled', 'produced'].map(ci).join('|')})[\\s-]?${ci('in')}\\s*[:：]?`;
/** Cues that do not end in "in" (IN after them can be India). */
const FIELD_CODE_CUE = [
  `(?<!(?:${ci('brand')}|${ci('design')})\\s+)${ci('country')}\\s+${ci('of')}\\s+${ci('origin')}\\s*[:：]?`,
  `(?<!(?:${ci('brand')}|${ci('design')})\\s+(?:${ci('of')}\\s+)?)${ci('origin')}\\s*[:：]`,
  `\\b${ci('coo')}\\s*[:：]`,
  `${NOT_PRODUCT_FIELD}(?:產地|产地|産地|原產地|原产地|原産地|原產國|原產国|原産国|原产国|製造国|製造國|生產國|生産国|生産地)\\s*[:：]?`,
].join('|');
// MY / ID are also English words: "MADE IN MY KITCHEN" is no claim.
const MADE_IN_CODE_TOKEN =
  'U\\.K\\.|U\\.S\\.A\\.|U\\.S\\.|P\\.R\\.C\\.?|(?:CN|TW|VN|TH|JP|KR|HK|PH|BD|KH|MX|TR|PT|PL|CZ|UK|USA|PRC|EU)(?![A-Za-z])|(?:MY|ID)(?![A-Za-z])(?![ \\t]*[A-Za-z])';
// IN (India) only after a field cue, as the last token or before punctuation;
// "MADE IN IN" is ambiguous and never read.
const IN_TOKEN = 'IN(?=[ \\t]*(?:$|[\\r\\n.,;:!?)）\\]/|]))';

/**
 * Upper-case short forms right after an explicit made-in cue: "MADE IN CN",
 * "Country of Origin: CN", "COO: VN", "產地：TW", "Made in the UK",
 * "MADE IN P.R.C.". Returns the code (a key of MADE_IN_CODE_LABEL).
 */
export function madeInCodeMatches(text: string): Array<{ code: string; index: number; length: number }> {
  const re = new RegExp(
    `(?:${MADE_IN_CUE}|${FIELD_CODE_CUE})\\s*(?:${ci('the')}\\s+)?(${MADE_IN_CODE_TOKEN})|(?:${FIELD_CODE_CUE})\\s*(${IN_TOKEN})`,
    'gm'
  );
  const out: Array<{ code: string; index: number; length: number }> = [];
  const s = String(text ?? '');
  for (const m of s.matchAll(re)) {
    const code = m[1] ?? m[2];
    // "Not made in USA" / "never made in UK" / "isn't made in CN" (same line): no claim.
    const at = m.index ?? 0;
    if (/(?:\bnot|\bnever|n['’]t)[ \t\u00a0]+$/i.test(s.slice(s.lastIndexOf('\n', at - 1) + 1, at))) continue;
    if (code && MADE_IN_CODE_LABEL[code]) out.push({ code, index: at, length: m[0].length });
  }
  return out;
}
