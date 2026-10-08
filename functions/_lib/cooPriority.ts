/**
 * Generic country-of-origin (COO) priority for OriginWise.
 *
 * Algorithm (no brand / retailer / SKU hardcodes):
 *   packaging OCR → retailer / product-page COO → manufacturer spec
 *   → ownership / parent (never directly stamps madeIn)
 *
 * When a higher-priority explicit non-CN COO conflicts with a China madeIn
 * stamp, clear madeIn and keep layered candidates — do not fake a stamp.
 */

import { MADE_IN_CODE_LABEL, madeInCodeMatches, NOT_PRODUCT_FIELD, PART_FIELD_WORDS } from './countryLabel';
import { COUNTRY_LIST_CJK, COUNTRY_LIST_LATIN, countryNameLabel } from './countryNames';
import { NOT_MADE_TAIL, stripDesignPhrases } from './designOrigin';
import { canonicalCountry } from './countryLabel';
import { normalizeRegion, type RegionCode } from './regions';
import {
  cooConflictChinaText,
  cooConflictMadeInText,
  SERVER_TEXT,
} from './serverText';

export type CooClaimSource =
  | 'ocr'
  | 'retailer'
  | 'manufacturer'
  | 'ownership'
  | 'unknown';

export type CooClaim = {
  /** Original country label as found in text */
  label: string;
  region: RegionCode;
  source: CooClaimSource;
};

const SOURCE_RANK: Record<CooClaimSource, number> = {
  ocr: 0,
  retailer: 1,
  manufacturer: 2,
  ownership: 3,
  unknown: 4,
};

/** Labels that look like packaging / OCR made-in lines. */
const OCR_CONTEXT =
  /\b(made[\s-]?in|manufactured[\s-]?in|assembled[\s-]?in|produced[\s-]?in|country\s+of\s+origin|coo|製造国|製造國|原産国|原產國|产地|產地|生产地|生產地)\b/i;

/** Retailer / product-page style fields (Amazon "Country of Publication", etc.). */
const RETAILER_CONTEXT =
  /\b(country\s+of\s+publication|retailer|product\s+page|product\s+information|asin|製造国|製造國|原産国|原產國|販売元|出品|amazon|楽天|rakuten|jd\.com|taobao|shopify)\b/i;

/** Manufacturer / official-spec context. */
const MANUFACTURER_CONTEXT =
  /\b(manufacturer|factory|assembly\s+plant|official\s+spec|spec\s*sheet|仕様|メーカー|工場|組立)\b/i;

/** Ownership / parent — never stamps madeIn by itself. */
const OWNERSHIP_CONTEXT =
  /\b(parent|holding|ownership|majority|owned\s+by|subsidiary|hq|headquarters|美的|midea|控股|母公司|总部|總部)\b/i;

/**
 * Country tokens we can pull after a COO cue.
 * Keep generic: English + common CJK forms. No product hardcodes.
 */
const COUNTRY_TOKEN =
  '(?:mainland\\s+china|p\\.\\s?r\\.\\s*china|new\\s+zealand|viet\\s+nam|netherlands|holland|portugal|turkey|cambodia|bangladesh|sri\\s+lanka|canada|australia|brazil|austria|belgium|denmark|hungary|romania|people.?s\\s+republic\\s+of\\s+china|(?<!people.?s\\s+)republic\\s+of\\s+china|r\\.o\\.c\\.?|roc|hong\\s+kong|macau|macao|taiwan|thailand|vietnam|indonesia|malaysia|philippines|india|japan|south\\s+korea|korea|china|prc|germany|france|italy|spain|united\\s+kingdom|great\\s+britain|sweden|switzerland|poland|czech\\s+republic|united\\s+states|usa|mexico|美國|美国|日本|韓國|韩国|泰國|泰国|越南|印尼|馬來西亞|马来西亚|菲律賓|菲律宾|印度|中國大陸|中国大陆|中國|中国|台灣|台湾|香港|澳門|澳门|德國|德国|法國|法国|義大利|意大利|英國|英国)(?![A-Za-z])';

/** CJK country names as written on Japanese / Chinese packaging. */
const CJK_COUNTRY_TOKEN =
  '(?:中華人民共和国|中華人民共和國|中国|中國|日本|北朝鮮|北韓|北韩|韓国|韓國|韩国|台湾|台灣|タイ|泰國|泰国|ベトナム|越南|インドネシア|印尼|マレーシア|馬來西亞|马来西亚|フィリピン|菲律賓|菲律宾|インド|印度|香港)';

/**
 * A made-in VALUE (right after a made-in cue or in a 產地 / 原産国 / COO / Origin
 * field): the full country list (en / ja / zh-Hant / zh-Hans, countryNames.ts)
 * plus the short forms above. Never used on free text: Turkey / Jordan / Chad /
 * Georgia … are ordinary words there.
 */
// A Latin name never runs into a hyphenated word ("Made in Ukraine-style",
// "Made in Georgia-Pacific", "Turkey-shaped"); "Japan-made" and "China-Japan" still read.
const HYPHEN_WORD_GUARD = `(?![A-Za-z]|-(?!made\\b|(?:${COUNTRY_LIST_LATIN})(?![A-Za-z]))[A-Za-z])`;
const VALUE_COUNTRY_TOKEN = `(?:${COUNTRY_LIST_CJK}|(?:${COUNTRY_TOKEN}|${COUNTRY_LIST_LATIN})${HYPHEN_WORD_GUARD})`;

/** Made-in cues (made in / 產地 / 原産国 / COO / Origin …) that a country value follows. */
const COO_CUE_SRC = `(?:(?:製造|制造|生產|生产|生産|組裝|组装|產|产|製|制)(?:於|于|在)|生產國|生产国|生産国|生產国|(?:製造地|生產地|生产地|製造|制造|生產|生产|生産)(?=\\s*[:：])|(?<!(?:brand|design)\\s+(?:of\\s+)?)origin(?=\\s*[:：])|made[\\s-]?in|manufactured[\\s-]?in|produced[\\s-]?in|assembled[\\s-]?in|(?<!(?:brand|design)\\s+)country\\s+of\\s+origin|country\\s+of\\s+publication|coo|${NOT_PRODUCT_FIELD}(?:製造国|製造國|原産国名?|原產國|原产国|产地|產地|生产地|生產地)|生産(?:[・･/／]組み?立て?)?|組み?立て?|組裝|组装)`;

/** Made-in cue, then the country value. */
const COO_LINE = new RegExp(`${COO_CUE_SRC}\\s*[:：]?\\s*(?:the\\s+)?(${VALUE_COUNTRY_TOKEN})`, 'gi');

/** US states (and DC), longest first. Abbreviations only in upper case after a comma. */
const US_STATES = [
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware',
  'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky',
  'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi',
  'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico',
  'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania',
  'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont',
  'virginia', 'washington', 'west virginia', 'wisconsin', 'wyoming', 'district of columbia',
  'washington d.c.', 'washington dc',
];
const US_STATE_ABBR =
  'AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC';
const US_STATE_NAME = US_STATES.slice()
  .sort((a, b) => b.length - a.length)
  .map((n) => n.replace(/\./g, '\\.').replace(/ /g, '\\s+'))
  .join('|');
const US_NAME = 'united\\s+states(?:\\s+of\\s+america)?|u\\.s\\.a\\.?|usa|u\\.s\\.|us';
/**
 * Country names that are also US towns (Georgia, Jordan MN, Lebanon TN, Peru IN,
 * Mexico MO …). Kept short and explicit: only these, followed by a US state or
 * USA, are read as a US place ("Made in Jordan, Minnesota"); "Made in China, USA"
 * and "Made in Vietnam, Texas" still mean China / Vietnam.
 */
const US_TOWN_NAMES = ['georgia', 'jordan', 'lebanon', 'peru', 'mexico', 'panama', 'cuba', 'poland', 'wales', 'chile', 'canton'];
const US_PLACE = new RegExp(
  `(${COO_CUE_SRC}\\s*[:：]?\\s*(?:the\\s+)?)((?:${US_STATE_NAME}|(?:${US_TOWN_NAMES.join('|')})(?:\\s+city)?)(\\s*,\\s*|\\s*[-–—/／]\\s*|\\s*[（(]\\s*|\\s+and\\s+|\\s*&\\s*|\\s+)(?:the\\s+)?)(${US_NAME}|${US_STATE_NAME}|${US_STATE_ABBR})(?![A-Za-z])`,
  'gi'
);
/** Listed towns that are no country name: before a bare USA they are a US place. */
const TOWNS_NOT_COUNTRIES = ['canton', 'wales'];
const US_NAME_ONLY = new RegExp(`^(?:${US_NAME})$`, 'i');
/** Georgia in CJK: with 州 it is the US state; before 美國 / USA it is the US too. */
const CJK_GEORGIA = '(?:喬治亞|乔治亚|佐治亞|佐治亚)';
const CJK_US = '(?:美國|美国|アメリカ|united\\s+states|u\\.s\\.a\\.?|usa)';
const CJK_SEP = '(?:\\s*[，,、/／（(]\\s*|\\s+)';
const CJK_US_PLACE = new RegExp(
  `(${COO_CUE_SRC}\\s*[:：]?\\s*)(${CJK_GEORGIA}州(?:${CJK_SEP}?${CJK_US}[）)]?)?|${CJK_GEORGIA}${CJK_SEP}${CJK_US}[）)]?)`,
  'gi'
);
/**
 * A US place after a made-in cue or in a made-in field; the place becomes one
 * "USA" / 美國 value (same length, so offsets and page quotes stay):
 * - a US state name before USA: 「Made in Georgia, USA」 "Georgia (USA)" "Georgia/USA"
 *   "Georgia and USA" "Texas & USA" (and / & only for a state name: "Wales and USA" is no US place)
 *   "Origin: Georgia, USA" "Origin: Texas, USA" "COO: California, USA";
 * - a listed town (or "<town> City") before a US state name or upper-case code,
 *   comma only: 「Made in Jordan, Minnesota」「Made in Mexico, NY」「Made in Panama City, Florida」;
 * - 州 is the state: 「產地：喬治亞州」「產地：喬治亞州，美國」, and 「產地：喬治亞，美國」.
 * Not a country-named town before a bare USA: "Made in Mexico, USA" is Mexico and
 * "Origin: Mexico, USA" a list of two countries; a town that is no country ("Made
 * in Canton, USA") stays a US place.
 */
export function usPlacesAsUsa(text: string): string {
  const out = text.replace(US_PLACE, (all, cue: string, town: string, sep: string, where: string) => {
    const place = town
      .replace(/(?:\s*,\s*|\s*[-–—/／]\s*|\s*[（(]\s*|\s+and\s+|\s*&\s*|\s+)(?:the\s+)?$/i, '')
      .toLowerCase()
      .replace(/\s+/g, ' ');
    if (US_NAME_ONLY.test(where)) {
      // A US state ("Georgia, USA", "Texas, USA") or a listed town that is no
      // country ("Canton, USA") is a US place.
      if (!TOWNS_NOT_COUNTRIES.includes(place) && !US_STATES.includes(place)) return all;
      // "US" only in upper case ("Made in Georgia, us …").
      if (/^u\.?s\.?$/i.test(where) && where !== where.toUpperCase()) return all;
      // and / & link only a real US state name ("Georgia and USA"; not "Wales and USA").
      if (/\band\b|&/i.test(sep) && !US_STATES.includes(place)) return all;
    } else {
      if (!/,/.test(sep)) return all;
      const base = place.replace(/\s+city$/, '');
      if (!US_TOWN_NAMES.includes(base)) return all;
      // A short state code only in upper case ("Made in Georgia, in …" is no state).
      if (/^[A-Za-z]{2}$/.test(where) && where !== where.toUpperCase()) return all;
    }
    const rest = town.length + where.length;
    return `${cue}${' '.repeat(rest - 3)}USA`;
  });
  return out.replace(CJK_US_PLACE, (_all, cue: string, place: string) => `${cue}${' '.repeat(place.length - 2)}美國`);
}

/**
 * A US field value with a later name that is a US state ("USA, Georgia",
 * "USA, Texas"): a location detail. Any other country after USA ("Origin: USA,
 * Mexico", "USA, Jordan", "USA (Lebanon)") is a second country.
 */
const US_FIELD_DETAIL = new Set(US_STATES);
function usLocationDetail(first: string, other: string): boolean {
  return canonCountry(first) === 'united states' && US_FIELD_DETAIL.has(other.toLowerCase());
}

/** "US-made" / "UK-made" / "EU-made": short forms in the 'X-made' claim form only. */
const SHORT_X_MADE = /(?<![A-Za-z.])(U\.S\.A\.|U\.S\.|U\.K\.|USA|US|UK|EU)(?=[\s-]made\b)/g;
const SHORT_X_LABEL: Record<string, string> = {
  'U.S.A.': 'United States', 'U.S.': 'United States', USA: 'United States', US: 'United States',
  'U.K.': 'United Kingdom', UK: 'United Kingdom', EU: 'European Union',
};

const SUFFIX_COUNTRY = `(?:${CJK_COUNTRY_TOKEN}|德國|德国|ドイツ|法國|法国|フランス|義大利|意大利|イタリア|英國|英国|イギリス|美國|美国|アメリカ)`;

/**
 * 「中國製造」「台灣製」「中國生產」「日本産」「越南工廠生產」「中國組裝」: country,
 * then a made word. Not 製造商 / 生產商 / 製造廠商 / 製商 (a maker: brand info)
 * unless 品 follows (「中國製造商品」 = goods made in China; 商品牌 stays a maker),
 * and not 製造業 / 生產業 (industry). Shared helper: NOT_MADE_TAIL. Not when 於 / 于 /
 * 在 plus a country follows: 「德國製造於中國」 is the verb form 製造於 X, so X
 * is read (COO_LINE). 「日本製 在庫あり」「中國製造於2023年」 still read. 「日本国内製造」
 * reads Japan; a bare 国内製造 / 国産 names no country.
 */
const COO_SUFFIX = new RegExp(
  `(${CJK_COUNTRY_TOKEN}|德國|德国|ドイツ|法國|法国|フランス|義大利|意大利|イタリア|英國|英国|イギリス|美國|美国|アメリカ)(?:国内|國內)?(?:工場|工廠|工厂|廠|厂)?(?:製造|制造|製|生產|生产|生産|組裝|组装|產(?![品業])|产(?![品业])|産(?![品業]))(?!造?\\s*[於于在]\\s*${SUFFIX_COUNTRY})${NOT_MADE_TAIL}`,
  'g'
);



/** Same country in English or CJK ("Japan" / 日本 / タイ vs Thailand). */
const CANON_COUNTRY: Record<string, string> = {
  日本: 'japan', jp: 'japan', 泰國: 'thailand', 泰国: 'thailand', タイ: 'thailand', th: 'thailand',
  越南: 'vietnam', ベトナム: 'vietnam', vn: 'vietnam', 'viet nam': 'vietnam',
  印尼: 'indonesia', インドネシア: 'indonesia', 馬來西亞: 'malaysia', 马来西亚: 'malaysia',
  マレーシア: 'malaysia', 菲律賓: 'philippines', 菲律宾: 'philippines', フィリピン: 'philippines',
  印度: 'india', インド: 'india', 韓國: 'korea', 韓国: 'korea', 韩国: 'korea',
  'south korea': 'korea', kr: 'korea', 美國: 'united states', 美国: 'united states',
  usa: 'united states', us: 'united states',
};

export function canonCountry(label: string | undefined): string {
  const s = String(label ?? '').trim();
  if (!s) return '';
  const region = normalizeRegion(s);
  if (region === 'CN' || region === 'HK' || region === 'TW' || region === 'MO') return region;
  return CANON_COUNTRY[s] ?? CANON_COUNTRY[s.toLowerCase()] ?? s.toLowerCase();
}

const CJK_TO_LABEL: Record<string, string> = {
  中華人民共和国: '中国', 中華人民共和國: '中國', 中國大陸: '中國', 中国大陆: '中国', タイ: 'Thailand', ベトナム: 'Vietnam',
  インドネシア: 'Indonesia', マレーシア: 'Malaysia', フィリピン: 'Philippines',
  インド: 'India', 韓国: '韓國', 北韓: 'North Korea', 北韩: 'North Korea', 北朝鮮: 'North Korea', 北朝鲜: 'North Korea',
  朝鲜: 'North Korea', 朝鮮民主主義人民共和國: 'North Korea', 朝鲜民主主义人民共和国: 'North Korea',
  中華民國: 'Taiwan', 中华民国: 'Taiwan',
};

function classifySource(window: string): CooClaimSource {
  if (OWNERSHIP_CONTEXT.test(window) && !OCR_CONTEXT.test(window) && !RETAILER_CONTEXT.test(window)) {
    return 'ownership';
  }
  if (OCR_CONTEXT.test(window) && /label|packaging|ocr|包裝|包装|銘板|铭板/i.test(window)) {
    return 'ocr';
  }
  if (RETAILER_CONTEXT.test(window) || /country\s+of\s+publication/i.test(window)) {
    return 'retailer';
  }
  if (MANUFACTURER_CONTEXT.test(window)) {
    return 'manufacturer';
  }
  // Bare "Made in X" / "製造国 X" without ownership noise → treat as retailer/product-page class
  if (OCR_CONTEXT.test(window)) {
    return 'retailer';
  }
  return 'unknown';
}

/**
 * Extract COO claims from free text (web brief, OCR, notes).
 * Source rank is inferred from nearby wording — no SKU/retailer allowlists.
 */
/** Field-style cues (a value follows): 產地：, 原産国：, 生產國：, COO:, Origin: … */
const FIELD_CUE = /產地|产地|原產|原産|原产|生產國|生产国|生産国|生產国|製造国|製造國|生產地|生产地|製造地|製造\s*[:：]|生產\s*[:：]|origin|\bcoo\b/i;
const ANY_COUNTRY = new RegExp(`(?<![A-Za-z])${VALUE_COUNTRY_TOKEN}`, 'gi');

/** Separators and joiners in a value that lists countries only. */
const LIST_JOINERS = /[\s、/／,，&・･+＋()（）[\]【】「」\-–—.。:：]|\b(?:and|or)\b|及|和|與|与|或/gi;
/** Whole-product nouns: transparent before a made-in clause (「本商品日本製」 "Product made in Japan"). */
const WHOLE_PRODUCT_EN = '(?:(?:this|the)\\s+)?(?:product|item|goods|unit)';
const WHOLE_PRODUCT_CJK = '(?:本商品|本產品|本产品|本製品|本貨品|本货品|本品|商品|產品|产品)';
/** Separators a clause may start after (dashes included: "China – Made in Japan"). */
const CLAUSE_SEP = '[\\s（(\\[【「,，、/／;；.。:：–—-]';
const CLAUSE_SEP_NO_SPACE = '[（(\\[【「,，、/／;；.。:：–—-]';
/** A made word right after a later country: 「日本製」「日本製造」「日本生產」「日本組裝」. */
// 製品 has one meaning: 「日本製品」 is a made-in claim (「日本製品牌」 is a brand).
const MADE_WORD_AT = /^\s*(?:国内|國內)?(?:工場|工廠|工厂|廠|厂)?(?:製品(?!牌|取扱|取り扱|販売店|専門店)|製造|制造|生產|生产|生産|組裝|组装|組立|製|制|產|产|産)/;
/**
 * A CJK claim ends here: end of value, a space (「日本製 保固一年」) or punctuation,
 * after an optional です / である. A noun attached with no space (日本製モーター,
 * 日本製造技術, 日本製品牌) is a descriptor.
 */
const CJK_CLAUSE_END = /^(?:です|である|でございます)?(?:$|[\s）)\]】」,，。.；;、/／!！|])/;
/** An English claim ends here: end of value or punctuation ("Made in Japan quality" is a descriptor). */
const EN_CLAUSE_END = /^\s*(?:$|[）)\]】」,，。.；;、/／!！|–—-])/;
/**
 * A CJK claim starts here: start of value or a separator, then optionally a
 * whole-product noun, は / 為 / 是, and 全 / 在 / 由 / 於 (「全日本製」「在日本製造」).
 */
const CJK_CLAUSE_START = new RegExp(`(?:^|${CLAUSE_SEP})${WHOLE_PRODUCT_CJK}?(?:は|為|为|是)?(?:全|在|由|於|于)?$`);
/**
 * "made in" at the start of a clause: "…, made in", ". Product made in", " – Made in",
 * ", but made in", ". The product is made in", ", is manufactured in". Never
 * "movement made in".
 */
const EN_LEAD = `(?:but\\s+|and\\s+)?(?:(?:${WHOLE_PRODUCT_EN}|it)\\s+)?(?:(?:is|was|are)\\s+)?`;
const EN_MADE_IN = '(?:made|manufactured|produced|assembled)[\\s-]*in\\s*(?:the\\s+)?';
const EN_CLAUSE_MADE_IN = new RegExp(`(?:^|${CLAUSE_SEP_NO_SPACE})\\s*${EN_LEAD}${EN_MADE_IN}$`, 'i');
/** "Japan made" / "Japan-made" at the start of a clause. */
const EN_CLAUSE_START = new RegExp(`(?:^|${CLAUSE_SEP_NO_SPACE})\\s*$`);
const EN_X_MADE = /^[\s-]*made\b/i;
/** The whole next clause / line is one standalone made-in claim (「日本製」 "Made in Japan"). */
const NEXT_CLAUSE_CJK = new RegExp(
  `^\\s*${WHOLE_PRODUCT_CJK}?(?:は|為|为|是)?(?:全|在|由|於|于)?(${VALUE_COUNTRY_TOKEN})(?:国内|國內)?(?:工場|工廠|工厂|廠|厂)?(?:製品|製造|制造|生產|生产|生産|組裝|组装|組立|製|制|產|产|産)(?:です|である)?\\s*$`,
  'i'
);
const NEXT_CLAUSE_EN = new RegExp(
  `^\\s*${EN_LEAD}${EN_MADE_IN}(${VALUE_COUNTRY_TOKEN})\\s*[.!]?\\s*$|^\\s*(${VALUE_COUNTRY_TOKEN})[\\s-]made\\s*[.!]?\\s*$`,
  'i'
);
/** A second country joined by a hyphen or slash right after a made-in value ("China-Japan", "China / EU"). */
const PAIR_AFTER = new RegExp(`^[ \\t]*[-–—/／][ \\t]*(${VALUE_COUNTRY_TOKEN}|E\\.U\\.|EU(?![A-Za-z]))`, 'i');
/**
 * "Made in EU / China", "Origin: EU / China", "COO: EU, China": the EU first (the EU
 * is no list country), then a second place. Group 1 is set for a field cue.
 */
const EU_FIRST = /(?:\b(?:made|manufactured|produced|assembled)[\s-]+in[ \t]+|(?<!(?:brand|design)\s+(?:of\s+)?)((?:country\s+of\s+)?origin|\bcoo)[ \t]*[:：][ \t]*)(?:the[ \t]+)?(?:E\.U\.|EU)(?![A-Za-z])/gi;
/** A field's second place after the EU: any list joiner. */
const EU_FIELD_PAIR = new RegExp(`^[ \\t]*(?:[-–—/／,，、&+]|\\band\\b|\\bor\\b)[ \\t]*(${VALUE_COUNTRY_TOKEN})`, 'i');
/** Prose "EU and USA", "EU & USA", "EU or USA": a USA second joined like "China and USA". */
const EU_US_JOIN = new RegExp(`^[ \\t]*(?:&|\\band\\b|\\bor\\b)[ \\t]*(?:the[ \\t]+)?(${VALUE_COUNTRY_TOKEN})`, 'i');
/** The EU named in a field value ("China / EU"); upper case only. */
const EU_IN_VALUE = /(?<![A-Za-z.])(?:E\.U\.|EU)(?![A-Za-z])/g;
/** USA, then a second country after a comma, and, & or or ("Made in USA, China"). */
const US_JOIN_AFTER = new RegExp(`^[ \\t]*(,|，|&|\\band\\b|\\bor\\b)[ \\t]*(?:the[ \\t]+)?(${VALUE_COUNTRY_TOKEN}|E\\.U\\.|EU(?![A-Za-z]))`, 'i');
/**
 * A US address right after a US-town-list country: ", <US state name or upper-case
 * code>" that ends the claim — an optional ZIP, then . ; ), the end of the text,
 * ", USA", or a newline before a line that is no further place ("Made in USA,
 * Lebanon, TN", "USA, Panama City, FL", "USA, Mexico, NY 10001", "USA, Lebanon, TN,
 * USA", "USA, Mexico, NY\nWeight: 2kg"). Never another word after the state ("USA,
 * Lebanon, OR Mexico", "USA, Vietnam, CA PROP 65"). A period ends the claim, so a
 * code that is also an English word is a state before it ("MADE IN USA, MEXICO,
 * OR." is Mexico, Oregon; "PERU, IN." Peru, Indiana — accepted). Georgia / GA is a
 * country too, so it is no address state here ("USA, Mexico, Georgia" / "GA" are 爭議).
 */
const US_ADDRESS_STATE = US_STATES.filter((n) => n !== 'georgia')
  .sort((a, b) => b.length - a.length)
  .map((n) => n.replace(/\./g, '\\.').replace(/ /g, '\\s+'))
  .join('|');
const US_ADDRESS_ABBR = US_STATE_ABBR.split('|').filter((c) => c !== 'GA').join('|');
const US_ADDRESS_AFTER = new RegExp(
  `^(?:[ \\t]+city)?[ \\t]*,[ \\t]*(${US_ADDRESS_STATE}|${US_ADDRESS_ABBR})(?:[ \\t]+\\d{5}(?:-\\d{4})?)?(?![A-Za-z0-9])`,
  'i'
);
const US_ADDRESS_END = /^[ \t]*(?:[.;)）。]|$|,[ \t]*(?:united\s+states(?:\s+of\s+america)?|u\.s\.a\.?|usa)(?![A-Za-z]))/i;
/**
 * A newline after the state. Only a code that is also an English word (OR IN ME OK
 * HI DE CO) can carry the place list over it ("MADE IN USA, MEXICO, OR\nCHINA" is
 * "…, or China"); TN / NY / FL, every other code and every full state name always
 * end the address at a newline. A word code carries only when the next non-empty
 * line — past whitespace, punctuation, joiners (& / - ( AND OR AND/OR 和 及 或 、)
 * and THE — starts with:
 * - a country that is not the US or the EU ("…, OR\nCHINA", "…, OR\nTHE PRC");
 * - PARTS / FROM before such a country ("…, IN\nPARTS FROM CHINA");
 * - a demonym / IMPORTED / FOREIGN before a part word, or OTHER COUNTRIES
 *   ("…, OR\nCHINESE PARTS", "…, OR\nIMPORTED PARTS");
 * - a spec line "Word: value" (: or ：) whose value names such a country
 *   ("…, OR\nBattery: China"); any other spec line ends it ("Battery: Li-ion"), and so
 *   does a part's own made-in ("Battery: made in China", 「電池：中國製」).
 * US / USA / U.S. / U.S.A. / United States (also after PARTS / FROM), the EU, a
 * made-in field or claim of its own ("Origin: …", 「中國製造」) and anything else end it.
 */
const ENGLISH_WORD_CODES = new Set(['OR', 'IN', 'ME', 'OK', 'HI', 'DE', 'CO']);
const NEXT_LINE_JOINERS = /^(?:[\s\p{P}\p{S}]|(?:and\/or|and|or|the)(?![A-Za-z])|[和及或、])*/iu;
const NEXT_LINE_FROM = /^(?:parts?[ \t]+)?(?:from[ \t]+)?(?:the[ \t]+)?/i;
const NEXT_LINE_US_EU = /^(?:united\s+states(?:\s+of\s+america)?|u\.s\.a\.?|u\.s\.|usa|us|e\.u\.|eu|european\s+union)(?![A-Za-z])/i;
const NEXT_LINE_OWN_FIELD = /^(?:country\s+of\s+origin|origin|coo|made\s+in|產地|产地|原產地|原产地|原産地|原産国|原產國|原产国)\s*[:：]/i;
const SPEC_LINE = /^[^\n:：]{1,30}[:：]([^\n]*)/;
const SPEC_MADE_IN = /\bmade\b|製造|制造|製|生產|生产|生産/i;
const DEMONYM = 'chinese|japanese|korean|taiwanese|vietnamese|thai|indian|mexican|canadian|german|italian|french|european|imported|foreign';
// Built on first use: PART_WORD is declared further down.
let nextLineCountryRe: RegExp | undefined;
const nextLineCountry = () => (nextLineCountryRe ??= new RegExp(`^(?:${VALUE_COUNTRY_TOKEN})`, 'i'));
let nextLinePartsRe: RegExp | undefined;
const nextLineParts = () =>
  (nextLinePartsRe ??= new RegExp(`^(?:(?:${DEMONYM})[ \\t]+${PART_WORD}|other[ \\t]+countr(?:y|ies)(?![A-Za-z]))`, 'i'));
/** A non-US, non-EU country at the start of the text. */
function startsWithOtherCountry(text: string): boolean {
  if (NEXT_LINE_US_EU.test(text)) return false;
  const c = nextLineCountry().exec(text);
  return Boolean(c && !isUs(normalizeCooLabel(c[0])));
}
/** True when the next line carries a word-code address on as a place list. */
function nextLineCarries(lines: string): boolean {
  const line = /^\s*([^\n]*)/.exec(lines)![1]!.trim();
  if (NEXT_CLAUSE_CJK.test(line) || NEXT_LINE_OWN_FIELD.test(line)) return false;
  const spec = SPEC_LINE.exec(line);
  if (spec) {
    // A part's own made-in ("Battery: made in China", 「電池：中國製」) is a claim of its
    // own, not more of the place list: the address ends.
    if (SPEC_MADE_IN.test(spec[1]!)) return false;
    const others = [...spec[1]!.matchAll(ANY_COUNTRY)].filter((c) => !isUs(normalizeCooLabel(c[0])));
    return others.length > 0;
  }
  const next = lines.replace(NEXT_LINE_JOINERS, '');
  if (startsWithOtherCountry(next)) return true;
  const from = NEXT_LINE_FROM.exec(next)![0];
  if (from && startsWithOtherCountry(next.slice(from.length))) return true;
  return nextLineParts().test(next);
}
function usAddressAfter(second: string, rest: string): boolean {
  if (!US_TOWN_COUNTRIES.has(canonCountry(second))) return false;
  const m = US_ADDRESS_AFTER.exec(rest);
  if (!m) return false;
  // A short state code only in upper case ("…, Mexico, ny" is no state).
  if (/^[A-Za-z]{2}$/.test(m[1]!) && m[1] !== m[1]!.toUpperCase()) return false;
  const after = rest.slice(m[0].length);
  if (US_ADDRESS_END.test(after)) return true;
  const wrap = /^[ \t]*\r?\n/.exec(after);
  if (!wrap) return false;
  if (!ENGLISH_WORD_CODES.has(m[1]!)) return true;
  return !nextLineCarries(after.slice(wrap[0].length));
}
/**
 * Country names that are also US towns: one FIRST, with a bare USA second, keeps
 * the country ("Made in Mexico/USA", "Mexico - USA", "Mexico, USA" are Mexico).
 * USA first is no town ("Made in USA/Mexico" is 爭議).
 */
const US_TOWN_COUNTRIES = new Set(['mexico', 'poland', 'chile', 'panama', 'peru', 'cuba', 'jordan', 'lebanon']);
const isUs = (x: string) => canonCountry(x) === 'united states';
/**
 * Two places joined in prose after a made-in cue are one claim, or a 爭議:
 * - the same country twice ("China / PRC") is one;
 * - a part / material word after the second ("Made in USA, China parts") makes it a component;
 * - USA with a US state ("Made in USA/Georgia", "USA, Texas") is the US;
 * - USA, then a US-town-list country with a US state ending the claim ("Made in USA,
 *   Lebanon, TN") is a US address (see usAddressAfter);
 * - the EU counts as a second place ("Made in USA, EU" is 爭議, as "EU / China");
 * - a town-list country first, bare USA second ("Made in Mexico/USA") keeps the country;
 * - a bare ", USA" tag after any country ("Made in China, USA", "Mexico, USA and
 *   China") keeps the country (an importer / market line);
 * - comma / and / & / or join two places only when one side is USA ("Made in USA,
 *   China", "Made in China and USA"); slash and dash pairs always count.
 */
function proseSecond(first: string, tail: string): { second: string; length: number } | undefined {
  const slash = PAIR_AFTER.exec(tail);
  const join = slash ? null : US_JOIN_AFTER.exec(tail);
  const hit = slash ?? join;
  if (!hit) return undefined;
  const found = slash ? slash[1]! : join![2]!;
  // The EU only in upper case ("…, eu" is no place).
  if (/^e\.?u\.?$/i.test(found) && found !== found.toUpperCase()) return undefined;
  const second = pairLabel(found);
  if (canonCountry(second) === canonCountry(first)) return undefined;
  if (new RegExp(`^[ \\t]*${PART_WORD}`, 'i').test(tail.slice(hit[0].length))) return undefined;
  if (isUs(first) && US_STATES.includes(second.toLowerCase())) return undefined;
  if (isUs(first) && usAddressAfter(second, tail.slice(hit[0].length))) return undefined;
  if (isUs(second) && US_TOWN_COUNTRIES.has(canonCountry(first)) && (slash || /^[,，]$/.test(join![1]!))) return undefined;
  if (join) {
    if (!isUs(first) && !isUs(second)) return undefined;
    if (isUs(second) && /^[,，]$/.test(join[1]!)) return undefined;
  }
  return { second, length: hit[0].length };
}
/** One country joined in a pair as the card names it ("EU" → European Union). */
function pairLabel(found: string): string {
  return /^e\.?u\.?$/i.test(found) ? 'European Union' : normalizeCooLabel(found);
}
/** Part / material words: a later country tied to one is a component, not a made-in. */
const PART_WORD =
  '(?:生地|布料|面料|布|材料|原料|素材|部品|零件|配件|零組件|零组件|パーツ|fabrics?|parts?|materials?|components?|leather|yarn|motors?|batter(?:y|ies)|chips?|movements?|electronics|lens(?:es)?)(?![A-Za-z])';
const PART_AFTER = new RegExp(
  `^\\s*(?:国内|國內)?(?:工場|工廠|工厂|廠|厂)?(?:製造|制造|製|制|生產|生产|生産|產|产|産)(?:の|的)?\\s*${PART_WORD}`,
  'i'
);
/** A CJK part field right before a value (「電池：」「配件產地：」). */
const CJK_PART_FIELD_BEFORE = new RegExp(`(?:${PART_FIELD_WORDS.join('|')})[^\\n：:]{0,4}[:：]\\s*$`);
/** A part word right after a CJK made-in (「中國製部品」「日本製モーター」). */
const PART_AFTER_SUFFIX = new RegExp(`^\\s*(?:の|的)?\\s*(?:${PART_WORD}|${PART_FIELD_WORDS.join('|')}|モーター)`, 'i');
const PART_BEFORE = new RegExp(`${PART_WORD}\\s*(?:[:：]|made\\s+in|from)?\\s*(?:the\\s+)?$`, 'i');

/**
 * One country name as the card shows it: ベトナム / "VIET NAM" → Vietnam,
 * カンボジア / 柬埔寨 → Cambodia, "SRI LANKA" → Sri Lanka. CJK names the short
 * tables already know (中國, 日本) stay as written.
 */
export function normalizeCooLabel(found: string): string {
  const s = found.trim().replace(/\s+/g, ' ');
  const cjk = CJK_TO_LABEL[s] ?? s;
  if (!/^[A-Za-z][A-Za-z .'-]{1,}$/.test(cjk)) {
    return canonicalCountry(cjk) ? cjk : (countryNameLabel(cjk) ?? cjk);
  }
  const known = canonicalCountry(cjk) ?? countryNameLabel(cjk);
  if (known) return known;
  return cjk === cjk.toUpperCase() && cjk.length > 3
    ? cjk.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
    : cjk;
}

const LEADING_COUNTRY = new RegExp(`^\\s*(?:the\\s+)?(${VALUE_COUNTRY_TOKEN})`, 'i');

/**
 * The country a made-in value names, as the card shows it, or undefined. The one
 * validator for page values, with the same country token the label reader uses
 * after a cue (COO_LINE): the value must start with a listed country.
 * 「柬埔寨王國」 → Cambodia, 「中國廣東」 → 中國; 「內蒙古」「沿海地區」, "Importer",
 * "See Package" → undefined.
 */
export function madeInValueCountry(value: string): string | undefined {
  const s = value.trim();
  if (/^european\s+union$/i.test(s)) return 'European Union';
  const m = LEADING_COUNTRY.exec(s);
  return m ? normalizeCooLabel(m[1]!) : undefined;
}

export type FieldDispute = { sides: string[]; start: number; end: number };
type FieldPass = { text: string; disputes: FieldDispute[] };

/** A later country in a field value is its own made-in claim (a standalone clause). */
function secondClaim(value: string, o: RegExpMatchArray): boolean {
  const head = value.slice(0, o.index!);
  const tail = value.slice(o.index! + o[0].length);
  // Part / material words (生地, 布料, fabric, parts …): a component, never a claim.
  if (PART_AFTER.test(tail) || PART_BEFORE.test(head)) return false;
  // 「中國 日本製」「中國（日本製造）」「中國 在日本製造」「中國 全日本製」「中國 日本製 保固一年」.
  const made = MADE_WORD_AT.exec(tail);
  if (made && CJK_CLAUSE_END.test(tail.slice(made[0].length)) && CJK_CLAUSE_START.test(head)) return true;
  // "…, made in Germany" / " – Made in Japan" / ". The product is made in Japan", then the clause ends.
  if (EN_CLAUSE_MADE_IN.test(head) && EN_CLAUSE_END.test(tail)) return true;
  // "(Japan made)" / ", Japan-made".
  const xMade = EN_X_MADE.exec(tail);
  return Boolean(xMade && EN_CLAUSE_START.test(head) && EN_CLAUSE_END.test(tail.slice(xMade[0].length)));
}

/** One country in a field value as the card names it (short 'X-made' forms included). */
function labelOf(found: string): string {
  return SHORT_X_LABEL[found] ?? normalizeCooLabel(found);
}

/** The country before a bracket holding a part / material word (「日本（部品）」 "Japan (parts)"). */
const PART_BRACKET = new RegExp(`^\\s*[（(【\\[][^）)】\\]]*${PART_WORD}[^）)】\\]]*[）)】\\]]`, 'i');

/**
 * Field values with more than one country (「產地：…」「原産国：…」「COO: …」).
 * - Only country names and separators, maybe with a bracketed note that names no
 *   country (「產地：德國 中國」「Origin: China and Vietnam (see label)」): a conflict.
 * - A later country in its own made-in clause (「中國 日本製」「中国 MADE IN JAPAN」
 *   「中國（日本製造）」 ". Product made in Japan"), not a part or material: a conflict.
 *   Both kinds blank the whole field and return every side (a 爭議 line).
 * - Anything else (「中国（日本企画）」「中國 日本製モーター」「ベトナム（日本製生地使用）」
 *   "China (movement made in Japan)", "China, shipped from Hong Kong"): the first
 *   country is the made-in; the rest of the value is blanked so the later country
 *   is never read.
 * Blanking keeps the length, so offsets stay.
 */
function resolveFieldValues(input: string): FieldPass {
  const text = usPlacesAsUsa(input);
  const chars = text.split('');
  const disputes: FieldDispute[] = [];
  const blank = (a: number, b: number) => {
    for (let i = a; i < b; i++) if (chars[i] !== '\n') chars[i] = ' ';
  };
  const sides = (list: string[]) => {
    const out: string[] = [];
    for (const l of list) if (!out.some((x) => canonCountry(x) === canonCountry(l))) out.push(l);
    return out.slice(0, 4);
  };
  const hasCountry = new RegExp(ANY_COUNTRY.source, 'i');
  let blankedTo = 0;
  // Made-in fields that each name one country (「產地：中國」 … 「產地：日本」), settled after the loop.
  const singles: Array<{ country: string; start: number; end: number; part: boolean }> = [];
  const re = new RegExp(COO_LINE.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index < blankedTo) continue;
    const first = normalizeCooLabel(m[1]);
    if (normalizeRegion(first) === 'UNKNOWN') continue;
    if (!FIELD_CUE.test(m[0])) {
      // "Made in China-Japan" / "Made in China/Japan" / "Made in USA, China": two
      // places in one claim (see proseSecond).
      const pair = proseSecond(first, text.slice(m.index + m[0].length));
      if (pair) {
        const end = m.index + m[0].length + pair.length;
        blank(m.index, end);
        disputes.push({ sides: sides([first, pair.second]), start: m.index, end });
        blankedTo = end;
      }
      continue;
    }
    const valueStart = m.index + m[0].length;
    const after = text.slice(valueStart);
    // The value ends at a line / sentence break or the next "名稱：" field.
    const stop = /[\n。；;|]|[\u4e00-\u9fffA-Za-z]{2,6}\s*[:：]/.exec(after);
    const value = stop ? after.slice(0, stop.index) : after.slice(0, 40);
    const valueEnd = valueStart + value.length;
    // 「產地：中國。日本製」「COO: China; Made in Japan」「產地：中國\n日本製」: the next
    // clause / line counts only when it is one standalone made-in claim. (A second
    // made-in field anywhere later is settled after the loop.)
    let next: { country: string; end: number } | undefined;
    if (stop && /^[\n。；;]$/.test(stop[0])) {
      const nextStart = valueEnd + 1;
      const rest = text.slice(nextStart);
      const nextStop = /[\n。；;|]/.exec(rest);
      const clause = nextStop ? rest.slice(0, nextStop.index) : rest;
      const hit = NEXT_CLAUSE_CJK.exec(clause) ?? NEXT_CLAUSE_EN.exec(clause);
      const found = hit && (hit[1] ?? hit[2]);
      if (found && canonCountry(normalizeCooLabel(found)) !== canonCountry(first)) {
        next = { country: normalizeCooLabel(found), end: nextStart + clause.length };
      }
    }
    // A country followed by a part / material bracket (「日本（部品）」) is a component;
    // an ambiguous name after USA ("USA, Georgia", "USA (Jordan)") is a US location.
    // Short forms count only as 'X-made' ("China, US-made").
    // A bracketed note that names no country ((see label) / （詳見標籤）) is not a word;
    // a part / material bracket is settled below.
    const listed = value.replace(/[（([【][^）)\]】]*[）)\]】]/g, (b) => (hasCountry.test(b) ? b : ''));
    const found: RegExpMatchArray[] = [
      ...value.matchAll(ANY_COUNTRY),
      ...value.matchAll(SHORT_X_MADE),
      // "Origin: China / EU": the EU outside a note bracket is a second place.
      ...(new RegExp(EU_IN_VALUE.source).test(listed.replace(SHORT_X_MADE, '')) ? [...value.matchAll(EU_IN_VALUE)].filter((e) => !/^[\s-]made\b/i.test(value.slice(e.index! + e[0].length))) : []),
    ];
    const others = found.filter(
      (o) =>
        canonCountry(labelOf(o[0])) !== canonCountry(first) &&
        !usLocationDetail(first, labelOf(o[0])) &&
        !PART_BRACKET.test(value.slice(o.index! + o[0].length))
    );
    const dispute = (list: string[], end: number) => {
      blank(m!.index, end);
      disputes.push({ sides: sides([first, ...list]), start: m!.index, end });
      blankedTo = end;
    };
    // This field names one country (its rest is a part, a note or a location).
    const single = () =>
      singles.push({ country: first, start: m!.index, end: valueEnd, part: PART_BRACKET.test(value) });
    if (!others.length) {
      if (next) dispute([next.country], next.end);
      else {
        single();
        // Only a part country (「中國／日本（部品）」): the first country wins; the part is never read.
        if (value.match(ANY_COUNTRY)?.some((c) => canonCountry(normalizeCooLabel(c)) !== canonCountry(first))) {
          blank(valueStart, valueEnd);
          blankedTo = valueEnd;
        }
      }
      continue;
    }
    const rest = listed.replace(ANY_COUNTRY, '').replace(EU_IN_VALUE, '').replace(LIST_JOINERS, '');
    const otherLabels = others.map((o) => labelOf(o[0]));
    if (!rest) {
      dispute(next ? [...otherLabels, next.country] : otherLabels, next ? next.end : valueEnd);
      continue;
    }
    const claims = others.filter((o) => secondClaim(value, o)).map((o) => labelOf(o[0]));
    if (claims.length || next) {
      dispute(next ? [...claims, next.country] : claims, next ? next.end : valueEnd);
    } else {
      single();
      blank(valueStart, valueEnd);
      blankedTo = valueEnd;
    }
  }
  // "Made in EU / China", "Origin: EU / China": the EU and a second place.
  for (const e of text.matchAll(EU_FIRST)) {
    if (!/E\.?U\.?$/.test(e[0])) continue;
    const at = e.index!;
    if (chars.slice(at, at + e[0].length).join('').trim() !== e[0].trim()) continue;
    const after = text.slice(at + e[0].length);
    let pair = (e[1] ? EU_FIELD_PAIR : PAIR_AFTER).exec(after);
    if (!pair && !e[1]) {
      const join = EU_US_JOIN.exec(after);
      if (join && isUs(pairLabel(join[1]!)) && !new RegExp(`^[ \\t]*${PART_WORD}`, 'i').test(after.slice(join[0].length))) pair = join;
    }
    if (!pair) continue;
    const second = pairLabel(pair[1]!);
    if (second === 'European Union') continue;
    const end = at + e[0].length + pair[0].length;
    blank(at, end);
    disputes.push({ sides: sides(['European Union', second]), start: at, end });
  }
  // An English made-in claim and a CJK one naming another country ("Made in USA\n中國製造",
  // "Made in Germany 中國製造", "Made in USA\n產地：中國"): two claims, a 爭議 — the
  // label never picks one by spelling. A CJK claim tied to a part (「電池：中國製」
  // 「中國製部品」 "motor 中國製") is a component, not a claim.
  {
    const now = chars.join('');
    const en: Array<{ country: string; start: number; end: number }> = [];
    const cjk: Array<{ country: string; start: number; end: number }> = [];
    for (const e of now.matchAll(new RegExp(COO_LINE.source, 'gi'))) {
      const label = normalizeCooLabel(e[1]!);
      if (normalizeRegion(label) === 'UNKNOWN') continue;
      const cue = e[0].slice(0, e[0].length - e[1]!.length);
      const lineHead = now.slice(now.lastIndexOf('\n', e.index!) + 1, e.index!);
      if (PART_BEFORE.test(lineHead) || CJK_PART_FIELD_BEFORE.test(lineHead)) continue;
      if (/[A-Za-z]/.test(cue)) en.push({ country: label, start: e.index!, end: e.index! + e[0].length });
      else if (/[\u4e00-\u9fff\u3040-\u30ff]/.test(cue)) cjk.push({ country: label, start: e.index!, end: e.index! + e[0].length });
    }
    for (const e of now.matchAll(new RegExp(COO_SUFFIX.source, 'g'))) {
      const head = now.slice(now.lastIndexOf('\n', e.index!) + 1, e.index!);
      const tail = now.slice(e.index! + e[0].length);
      if (/(?:非|不是|並非|并非)$/.test(head) || /^\s*(?:では|じゃ)(?:ありません|ない|なく)/.test(tail)) continue;
      if (/^(?:業|业|品(?:牌|取扱|取り扱|販売店|専門店))/.test(tail)) continue;
      if (PART_BEFORE.test(head) || CJK_PART_FIELD_BEFORE.test(head) || PART_AFTER_SUFFIX.test(tail)) continue;
      const label = normalizeCooLabel(CJK_TO_LABEL[e[1]!] ?? e[1]!);
      if (normalizeRegion(label) === 'UNKNOWN') continue;
      cjk.push({ country: label, start: e.index!, end: e.index! + e[0].length });
    }
    const a = en[0];
    const b = a && cjk.find((c) => canonCountry(c.country) !== canonCountry(a.country));
    if (a && b && !cjk.some((c) => canonCountry(c.country) === canonCountry(a.country))) {
      const [x, y] = a.start < b.start ? [a, b] : [b, a];
      blank(a.start, a.end);
      blank(b.start, b.end);
      disputes.push({ sides: sides([x.country, y.country]), start: x.start, end: y.end });
    }
  }
  // Repeated made-in fields, adjacent or not (「產地：中國\n重量：5kg\n產地：日本」): two
  // countries are a 爭議. A field whose country carries a part bracket
  // (「產地：日本（部品）」) is a component next to a whole-product field.
  const whole = singles.filter((f) => !f.part);
  if (whole.length) {
    for (const f of singles) if (f.part && canonCountry(f.country) !== canonCountry(whole[0]!.country)) blank(f.start, f.end);
  }
  const countries = sides(whole.map((f) => f.country));
  if (countries.length >= 2) {
    for (const f of whole) blank(f.start, f.end);
    disputes.push({ sides: countries, start: whole[0]!.start, end: whole[whole.length - 1]!.end });
  }
  return { text: chars.join(''), disputes };
}

/** The text with multi-country field values settled (see resolveFieldValues); same length. */
export function settleCooFields(text: string): FieldPass {
  return resolveFieldValues(String(text || ''));
}

/**
 * Two made-in claims inside one label field (「產地：中國 日本製」「產地：德國 中國」):
 * each set is shown as a 爭議 line; neither side is label-confirmed.
 */
export function cooFieldDisputes(text: string): string[][] {
  return resolveFieldValues(stripDesignPhrases(String(text || ''))).disputes.map((d) => d.sides);
}

export function extractCooClaimsFromText(text: string): CooClaim[] {
  // Design / brand wording is never a COO claim ("Designed in Germany, made in China" → China).
  const raw = resolveFieldValues(stripDesignPhrases(String(text || ''))).text;
  if (!raw.trim()) return [];
  const out: CooClaim[] = [];
  const seen = new Set<string>();
  COO_LINE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = COO_LINE.exec(raw)) !== null) {
    // Names as the card's own name: "Viet Nam" → Vietnam (越南), ベトナム → Vietnam.
    // Fields with a second country were settled by resolveFieldValues; tagged
    // values (德國（品牌）) are already blanked as brand info.
    const label = normalizeCooLabel(m[1]);
    const region = normalizeRegion(label);
    if (region === 'UNKNOWN') continue;
    // "Not made in China" / "never made in China" is no claim.
    // Same line only: "Do not\nMade in China" still reads China.
    if (/\b(?:not|never)[ \t]+$/i.test(raw.slice(Math.max(0, m.index - 8), m.index))) continue;
    const start = Math.max(0, m.index - 80);
    const end = Math.min(raw.length, m.index + m[0].length + 80);
    const window = raw.slice(start, end);
    const source = classifySource(window);
    const key = `${source}:${region}:${label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, region, source });
  }
  // Upper-case short forms only right after an explicit made-in cue
  // ("MADE IN CN", "COO: VN", "Made in the UK"); DE / IT / my … never.
  for (const c of madeInCodeMatches(raw)) {
    const label = MADE_IN_CODE_LABEL[c.code]!;
    // "Made in USA" / "Made in PRC" already read by name above: one claim.
    if (out.some((c) => canonCountry(c.label) === canonCountry(label))) continue;
    const region = normalizeRegion(label);
    const start = Math.max(0, c.index - 80);
    const end = Math.min(raw.length, c.index + c.length + 80);
    const source = classifySource(raw.slice(start, end));
    const key = `${source}:${region}:${label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, region, source });
  }
  COO_SUFFIX.lastIndex = 0;
  while ((m = COO_SUFFIX.exec(raw)) !== null) {
    // 「非中國製」「不是中國製造」「中国製ではありません」: negated, no claim.
    if (/(?:非|不是|並非|并非)$/.test(raw.slice(Math.max(0, m.index - 2), m.index))) continue;
    if (/^\s*(?:では|じゃ)(?:ありません|ない|なく)/.test(raw.slice(m.index + m[0].length))) continue;
    // 「日本製品牌」 (a brand) / 「日本製品取扱店」 (a store selling Japanese goods): no made-in.
    if (/^品(?:牌|取扱|取り扱|販売店|専門店)/.test(raw.slice(m.index + m[0].length))) continue;
    const label = CJK_TO_LABEL[m[1]] ?? m[1];
    const region = normalizeRegion(label);
    if (region === 'UNKNOWN') continue;
    const start = Math.max(0, m.index - 80);
    const end = Math.min(raw.length, m.index + m[0].length + 80);
    const source = classifySource(raw.slice(start, end));
    const key = `${source}:${region}:${label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, region, source });
  }
  return out;
}

const VERB_FORM_MAKER = new RegExp(
  `${SUFFIX_COUNTRY}(?=(?:製造|制造|製|制|生產|生产|生産|組裝|组装)\\s*[於于在]\\s*${SUFFIX_COUNTRY})` +
    // 「中國製造業」「台灣生產業」: an industry, not a place this product was made.
    `|${SUFFIX_COUNTRY}(?=(?:製造|制造|製|制|生產|生产|生産)[業业])`,
  'g'
);

/**
 * Blank the country before a verb-form made-in (「德國製造於中國」 → 「  製造於中國」):
 * only the country after 於 / 于 / 在 is the made-in, so a note never lists the
 * first one as a mention. Same for an industry (「中國製造業」). Same length, so
 * offsets stay.
 */
export function blankVerbFormMakers(text: string): string {
  return String(text ?? '').replace(VERB_FORM_MAKER, (m) => ' '.repeat(m.length));
}

export function bestCooClaim(
  claims: CooClaim[],
  opts?: { allowOwnership?: boolean }
): CooClaim | undefined {
  const allowOwnership = opts?.allowOwnership === true;
  const usable = claims.filter(
    (c) => allowOwnership || c.source !== 'ownership'
  );
  if (!usable.length) return undefined;
  usable.sort(
    (a, b) =>
      SOURCE_RANK[a.source] - SOURCE_RANK[b.source] ||
      // By the country's English name, so 「中國製」 ranks as "China made" does.
      canonCountry(a.label).localeCompare(canonCountry(b.label)) ||
      a.label.localeCompare(b.label)
  );
  return usable[0];
}

export type CooPriorityInput = {
  ocrText?: string;
  webBrief?: string;
  notes?: string[];
  /** LLM-proposed madeIn / manufacturedIn */
  madeIn?: string;
  manufacturedIn?: string;
};

export type CooPriorityResult = {
  madeIn?: string;
  manufacturedIn?: string;
  notes: string[];
  /** Cap product confidence when we had to clear a conflicting China stamp */
  confidenceCap?: number;
  /** Winning non-ownership claim, if any */
  preferred?: CooClaim;
};

/**
 * Apply COO priority to a product partial.
 * Ownership/parent never stamps madeIn. Explicit higher-priority non-CN
 * retailer/OCR COO clears a conflicting China madeIn.
 */
export function applyCooPriority(input: CooPriorityInput): CooPriorityResult {
  const notes = [...(input.notes ?? [])];
  const ocrClaims = extractCooClaimsFromText(input.ocrText || '');
  // Force OCR source for anything pulled from the OCR blob
  const ocrForced = ocrClaims.map((c) => ({ ...c, source: 'ocr' as const }));
  const webClaims = extractCooClaimsFromText(input.webBrief || '');
  const noteClaims = extractCooClaimsFromText((input.notes ?? []).join('\n'));
  const all = [...ocrForced, ...webClaims, ...noteClaims];
  const preferred = bestCooClaim(all);

  let madeIn = input.madeIn?.trim() || undefined;
  let manufacturedIn = input.manufacturedIn?.trim() || undefined;
  let confidenceCap: number | undefined;

  const madeRegion = normalizeRegion(madeIn);
  const mfgRegion = normalizeRegion(manufacturedIn);

  // The label / page also names the stamped made-in (e.g. body 日本 and
  // nipple 中国工場製 on one box): that is the made-in, not a conflict.
  const madeInBacked =
    Boolean(madeIn) &&
    Boolean(preferred) &&
    all.some(
      (c) =>
        c.source !== 'ownership' &&
        SOURCE_RANK[c.source] <= SOURCE_RANK[preferred!.source] &&
        canonCountry(c.label) === canonCountry(madeIn)
    );

  if (preferred && preferred.source !== 'ownership' && !madeInBacked) {
    // Prefer explicit higher-priority COO when LLM left madeIn empty / vague
    if (!madeIn || normalizeRegion(madeIn) === 'UNKNOWN') {
      madeIn = preferred.label;
    } else if (
      preferred.region !== 'CN' &&
      preferred.region !== 'UNKNOWN' &&
      madeRegion === 'CN'
    ) {
      // Conflict: retailer/OCR non-CN vs China stamp → do not fake stamp
      madeIn = undefined;
      confidenceCap = 0.55;
      notes.push(
        cooConflictChinaText(preferred.source, preferred.label)
      );
    } else if (
      preferred.region === 'CN' &&
      madeRegion !== 'CN' &&
      madeRegion !== 'UNKNOWN' &&
      (preferred.source === 'ocr' || preferred.source === 'retailer')
    ) {
      // Higher-priority China claim vs non-CN LLM stamp — clear and layer
      madeIn = undefined;
      confidenceCap = 0.55;
      notes.push(
        cooConflictMadeInText(preferred.source, preferred.label, String(input.madeIn))
      );
    }
  }

  // Same conflict check on manufacturedIn
  if (
    preferred &&
    preferred.source !== 'ownership' &&
    preferred.region !== 'CN' &&
    preferred.region !== 'UNKNOWN' &&
    mfgRegion === 'CN'
  ) {
    manufacturedIn = undefined;
    if (confidenceCap == null) confidenceCap = 0.55;
  }

  // Ownership-only China with no higher-priority COO → never keep high-trust China
  const hasSkuCoo = all.some(
    (c) =>
      (c.source === 'ocr' ||
        c.source === 'retailer' ||
        c.source === 'manufacturer') &&
      c.region !== 'UNKNOWN'
  );
  const ownershipCnClaim = all.some(
    (c) => c.source === 'ownership' && c.region === 'CN'
  );
  const ownershipCnContext =
    OWNERSHIP_CONTEXT.test(
      `${input.webBrief || ''} ${(input.notes ?? []).join(' ')}`
    ) &&
    /\b(china|prc|cn|中國|中国)\b/i.test(
      `${input.webBrief || ''} ${(input.notes ?? []).join(' ')}`
    );
  if (
    madeRegion === 'CN' &&
    !hasSkuCoo &&
    (ownershipCnClaim || ownershipCnContext)
  ) {
    madeIn = undefined;
    confidenceCap = Math.min(confidenceCap ?? 0.5, 0.5);
    notes.push(
      SERVER_TEXT.madeInOmittedOwnership
    );
  }

  return {
    madeIn,
    manufacturedIn,
    notes: notes.slice(0, 10),
    confidenceCap,
    preferred,
  };
}
