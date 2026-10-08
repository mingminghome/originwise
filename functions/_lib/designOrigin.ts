/**
 * Design / brand wording is never made-in evidence (Cybex "Engineered in
 * Germany", "Designed by Apple in California, Assembled in China").
 *
 * Every made-in parser (page regex, model quotes, notes, OCR, parts evidence,
 * AI-cited pages) reads text with these phrases blanked out, so only the
 * made-in part of a mixed sentence counts. The phrases themselves are kept
 * as design / brand info (附加資訊), never as a made-in candidate.
 *
 * Client-safe (no Worker APIs): the cards use it on cached answers too.
 */
import { canonicalCountry } from './countryLabel';

export type DesignKind = 'design' | 'brand';

export type DesignMention = {
  /** English label ("Germany"), as the rest of the result uses. */
  country: string;
  kind: DesignKind;
  /** The wording as found (max 80 chars). */
  phrase: string;
};

/** Country names and adjectives (English) → English label. */
const EN_COUNTRIES: Array<[RegExp, string]> = [
  [/^(germany|german)$/i, 'Germany'],
  [/^(japan|japanese)$/i, 'Japan'],
  [/^(sweden|swedish)$/i, 'Sweden'],
  [/^(denmark|danish)$/i, 'Denmark'],
  [/^(norway|norwegian)$/i, 'Norway'],
  [/^(finland|finnish)$/i, 'Finland'],
  [/^(switzerland|swiss)$/i, 'Switzerland'],
  [/^(italy|italian)$/i, 'Italy'],
  [/^(france|french)$/i, 'France'],
  [/^(spain|spanish)$/i, 'Spain'],
  [/^(netherlands|holland|dutch)$/i, 'Netherlands'],
  [/^(belgium|belgian)$/i, 'Belgium'],
  [/^(austria|austrian)$/i, 'Austria'],
  [/^(united kingdom|uk|britain|great britain|british|england)$/i, 'United Kingdom'],
  [/^(united states|usa|u\.s\.a?\.?|america|american|california|silicon valley)$/i, 'United States'],
  [/^(south korea|korea|korean)$/i, 'South Korea'],
  [/^(china|chinese|prc)$/i, 'China'],
  [/^(taiwan|taiwanese)$/i, 'Taiwan'],
  [/^(hong kong)$/i, 'Hong Kong'],
  [/^(australia|australian)$/i, 'Australia'],
  [/^(canada|canadian)$/i, 'Canada'],
  [/^(israel|israeli)$/i, 'Israel'],
];
const EN_COUNTRY =
  'united kingdom|great britain|united states|south korea|hong kong|silicon valley|u\\.s\\.a?\\.?|' +
  'germany|german|japan|japanese|sweden|swedish|denmark|danish|norway|norwegian|finland|finnish|' +
  'switzerland|swiss|italy|italian|france|french|spain|spanish|netherlands|holland|dutch|belgium|belgian|' +
  'austria|austrian|uk|britain|british|england|usa|america|american|california|korea|korean|china|chinese|' +
  'prc|taiwan|taiwanese|australia|australian|canada|canadian|israel|israeli';

/** CJK country names (zh / ja) → English label. */
const CJK_COUNTRIES: Record<string, string> = {
  德國: 'Germany', 德国: 'Germany', ドイツ: 'Germany', 日本: 'Japan', 瑞典: 'Sweden', スウェーデン: 'Sweden',
  丹麥: 'Denmark', 丹麦: 'Denmark', デンマーク: 'Denmark', 挪威: 'Norway', 芬蘭: 'Finland', 芬兰: 'Finland',
  瑞士: 'Switzerland', スイス: 'Switzerland', 義大利: 'Italy', 意大利: 'Italy', イタリア: 'Italy',
  法國: 'France', 法国: 'France', フランス: 'France', 西班牙: 'Spain', 荷蘭: 'Netherlands', 荷兰: 'Netherlands',
  オランダ: 'Netherlands', 比利時: 'Belgium', 比利时: 'Belgium', 奧地利: 'Austria', 奥地利: 'Austria',
  英國: 'United Kingdom', 英国: 'United Kingdom', イギリス: 'United Kingdom', 美國: 'United States',
  美国: 'United States', アメリカ: 'United States', 加州: 'United States', 韓國: 'South Korea',
  韩国: 'South Korea', 韓国: 'South Korea', 中國: 'China', 中国: 'China', 台灣: 'Taiwan', 台湾: 'Taiwan',
  臺灣: 'Taiwan', 澳洲: 'Australia', 加拿大: 'Canada', 以色列: 'Israel',
};
const CJK_COUNTRY = Object.keys(CJK_COUNTRIES)
  .sort((a, b) => b.length - a.length)
  .join('|');

/** Cue, then the place: the phrase runs to the clause end or a made-in word. */
const FORWARD_CUES = new RegExp(
  [
    '\\b(?:designed|engineered|developed|conceived|created|styled|invented)(?:\\s+and\\s+(?:designed|engineered|developed|tested))?\\s+(?:in|by|at)\\b',
    '\\bdesign(?:ed)?\\s+from\\b',
    '\\bR\\s*&\\s*D\\s+(?:in|centre|center|centres|centers|based\\s+in)\\b',
    '\\bresearch\\s+(?:and|&)\\s+development\\s+(?:in|centre|center)\\b',
    '\\b(?:headquartered|founded|established)\\s+in\\b',
    '\\bheadquarters?\\s+(?:in|is\\s+in|are\\s+in)\\b',
    '\\b(?:company|brand)\\s+based\\s+in\\b',
    '\\bbrand\\s+(?:from|of)\\b',
    '(?:設計|设计|研發|研发|開發|开发|研製|研制)(?:中心|團隊|团队)?(?:於|于|自|在|位於|位于|設於|设于)',
    '(?:品牌|設計|设计|技術|技术)(?:源自|來自|来自|源於|源于|發源於|发源于|創立於|创立于)',
    '(?:總部|总部)(?:設於|设于|位於|位于|在)',
    'デザイン(?:は|：|:)',
  ].join('|'),
  'gi'
);

/** Place, then the cue ("German engineering", 德國設計): the phrase is the match. */
const PREFIX_CUES = new RegExp(
  [
    `\\b(?:${EN_COUNTRY})[\\s-]+(?:engineering|engineered|design|designed|designs|brand|brands|company|technology|heritage|developed|innovation|r\\s*&\\s*d)\\b`,
    `(?:${CJK_COUNTRY})(?:的)?(?:設計|设计|研發|研发|工程|工藝|工艺|技術|技术|品牌|血統|血统|デザイン|ブランド|發源|发源)`,
  ].join('|'),
  'gi'
);

/** Where a forward phrase stops: clause punctuation, "but", or a made-in word. */
const PHRASE_END =
  /[,;，；。、！!？?\n|（(]|\.\s|\.$|\bbut\b|\bwhile\b|\bmade\s*in\b|\bmanufactured\b|\bassembled\b|\bproduced\b|\bcountry\s+of\s+origin\b|但|製造|制造|產地|产地|組裝|组装|生產|生产|原產|原产|原産|生産|[国國]製/i;
const PHRASE_MAX = 80;

const BRAND_CUE = /brand|company|headquarter|founded|established|品牌|ブランド|總部|总部|源自|來自|来自|源於|源于|發源|发源|創立|创立|血統|血统|heritage/i;

type Span = { start: number; end: number; prefix: boolean };

function spans(text: string): Span[] {
  const out: Span[] = [];
  FORWARD_CUES.lastIndex = 0;
  for (const m of text.matchAll(FORWARD_CUES)) {
    const start = m.index ?? 0;
    const from = start + m[0].length;
    const rest = text.slice(from, from + PHRASE_MAX);
    const stop = PHRASE_END.exec(rest);
    out.push({ start, end: from + (stop ? stop.index : rest.length), prefix: false });
  }
  PREFIX_CUES.lastIndex = 0;
  for (const m of text.matchAll(PREFIX_CUES)) {
    const start = m.index ?? 0;
    out.push({ start, end: start + m[0].length, prefix: true });
  }
  return out.sort((a, b) => a.start - b.start);
}

function countryIn(phrase: string): string | undefined {
  const en = new RegExp(`\\b(${EN_COUNTRY})\\b`, 'i').exec(phrase);
  const cjk = new RegExp(`(${CJK_COUNTRY})`).exec(phrase);
  const first = en && cjk ? (en.index <= cjk.index ? en : cjk) : (en ?? cjk);
  if (!first) return undefined;
  const word = first[1]!;
  return (
    CJK_COUNTRIES[word] ??
    EN_COUNTRIES.find(([re]) => re.test(word.replace(/\s+/g, ' ')))?.[1] ??
    canonicalCountry(word)
  );
}

/**
 * The text with every design / brand phrase blanked (same length, so offsets
 * and quotes elsewhere still line up). "Designed in Germany, made in China"
 * → "                  , made in China".
 */
export function stripDesignPhrases(text: string): string {
  const s = String(text ?? '');
  const found = spans(s);
  if (!found.length) return s;
  // UTF-16 offsets throughout; rebuilt by slices so surrogate pairs stay whole.
  let out = '';
  let at = 0;
  for (const sp of found) {
    if (sp.end <= at) continue;
    const from = Math.max(sp.start, at);
    out += s.slice(at, from) + ' '.repeat(sp.end - from);
    at = sp.end;
  }
  return out + s.slice(at);
}

/** Design / brand phrases that name a country (deduped by country + kind). */
export function designMentions(text: string): DesignMention[] {
  const s = String(text ?? '');
  const out: DesignMention[] = [];
  for (const sp of spans(s)) {
    const phrase = s.slice(sp.start, sp.end).trim().replace(/\s+(?:and|&)$/i, '');
    const country = countryIn(phrase);
    if (!country) continue;
    const kind: DesignKind = BRAND_CUE.test(phrase) ? 'brand' : 'design';
    if (out.some((d) => d.country === country && d.kind === kind)) continue;
    out.push({ country, kind, phrase: phrase.slice(0, PHRASE_MAX) });
  }
  return out;
}

/** The text has design / brand wording at all. */
export function hasDesignPhrase(text: string): boolean {
  return spans(String(text ?? '')).length > 0;
}

/**
 * A made-in quote still names this country once its design / brand wording
 * is blanked ("Designed in Germany, made in China" backs China only).
 */
export function quoteBacksCountry(quote: string, country: string): boolean {
  const q = String(quote ?? '');
  if (!hasDesignPhrase(q)) return true;
  const rest = stripDesignPhrases(q);
  const want = canonicalCountry(country) ?? countryIn(country) ?? country.trim();
  const en = new RegExp(`\\b(${EN_COUNTRY})\\b`, 'gi');
  const cjk = new RegExp(`(${CJK_COUNTRY})`, 'g');
  const named = [...rest.matchAll(en), ...rest.matchAll(cjk)].map((m) => countryIn(m[1]!));
  if (named.some((c) => c && (c === want || canonicalCountry(c) === canonicalCountry(want)))) return true;
  // Other spellings (中國大陸, PRC …) through the shared table.
  return canonicalCountry(rest) !== undefined && canonicalCountry(rest) === canonicalCountry(want);
}
