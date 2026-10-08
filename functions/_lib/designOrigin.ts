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
import { COUNTRY_NAME_PATTERNS, canonicalCountry } from './countryLabel';

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
  [/^(united kingdom|britain|great britain|british|england)$/i, 'United Kingdom'],
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
  'austria|austrian|britain|british|england|usa|america|american|california|korea|korean|china|chinese|' +
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
  // Factory countries: so 「生產於越南」 is seen as the verb form with a country.
  中國大陸: 'China', 中国大陆: 'China', 越南: 'Vietnam', ベトナム: 'Vietnam', 泰國: 'Thailand',
  泰国: 'Thailand', 印尼: 'Indonesia', 印度尼西亞: 'Indonesia', インドネシア: 'Indonesia',
  馬來西亞: 'Malaysia', 马来西亚: 'Malaysia', マレーシア: 'Malaysia', 菲律賓: 'Philippines',
  菲律宾: 'Philippines', 印度: 'India', インド: 'India', 香港: 'Hong Kong', 柬埔寨: 'Cambodia',
  墨西哥: 'Mexico', 波蘭: 'Poland', 波兰: 'Poland', 葡萄牙: 'Portugal', 土耳其: 'Turkey',
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
    '\\bbased\\s+in\\b',
    '\\bbrand\\s+(?:from|of)\\b',
    '(?:設計|设计|研發|研发|開發|开发|研製|研制)(?:中心|團隊|团队)?(?:於|于|自|在|位於|位于|設於|设于)',
    '(?:品牌|設計|设计|技術|技术)(?:源自|來自|来自|源於|源于|發源於|发源于|創立於|创立于)',
    '(?:總部|总部)(?:設於|设于|位於|位于|在)',
    '(?:創立|创立|成立|創辦|创办|創建|创建)(?:於|于)',
    'デザイン(?:は|：|:)',
    // Label fields: 「設計：德國」「設計地：德國」「研發：德國」, "Design: Germany".
    '(?:設計|设计|研發|研发)(?:地|國|国)?\\s*[:：]',
    '\\bdesign(?:ed)?\\s*[:：]',
  ].join('|'),
  'gi'
);

/**
 * Maker words (shared with cooPriority so the two cannot drift): 製造商 /
 * 生產商 / 製造廠商 / 製商 are a manufacturer (brand / HQ info), but not when
 * 品 follows (「中國製造商品」 = goods made in China), except 商品牌
 * (「德國製造商品牌」 = a maker's brand).
 */
export const MAKER_TAIL = '(?:廠|厂)?商(?!品(?!牌))';
/** After a made word (製 / 製造 / 生產 …): not a maker, not an industry (製造業). */
export const NOT_MADE_TAIL = `(?!造?(?:${MAKER_TAIL}|[業业]))`;
const MAKER_WORD = `(?:製造|制造|生產|生产|生産|製|制)${MAKER_TAIL}`;

/** Place, then the cue ("German engineering", 德國設計): the phrase is the match. */
const PREFIX_CUES = new RegExp(
  [
    `\\b(?:${EN_COUNTRY})[\\s-]+(?:engineering|engineered|design|designed|designs|brand|brands|company|technology|heritage|developed|innovation|r\\s*&\\s*d)\\b`,
    `(?:${CJK_COUNTRY})(?:的)?(?:設計|设计|研發|研发|工程|工藝|工艺|技術|技术|品牌|廠牌|厂牌|廠商|厂商|公司|企業|企业|血統|血统|デザイン|ブランド|メーカー|發源|发源)`,
    `(?:${CJK_COUNTRY})(?:的)?${MAKER_WORD}`,
    // A value tagged as brand / design: 「產地：德國（品牌）中國（製造）」, "Germany (brand)".
    `(?:${CJK_COUNTRY})\\s*[（(]\\s*(?:品牌|設計|设计|研發|研发|brand|design(?:ed)?)\\s*[）)]`,
    `\\b(?:${EN_COUNTRY})\\s*[（(]\\s*(?:brand|design(?:ed)?)\\s*[）)]`,
  ].join('|'),
  'gi'
);

/**
 * Where a forward phrase must stop whatever follows: a sentence end, a
 * semicolon, "but", or a made-in word (a made-in clause is never eaten).
 */
const PHRASE_HARD_END =
  /[;；。！!？?\n|]|\.\s|\.$|\bbut\b|\bwhile\b|\bmade\b|\bmanufactured\b|\bassembled\b|\bproduced\b|\bcountry\s+of\s+origin\b|\borigin\b|\bcoo\b|但|製造|制造|產地|产地|組裝|组装|生產|生产|原產|原产|原産|生産/i;

/** A clause break: where a phrase with no country in it ends. */
const PHRASE_SOFT_END = /[,，、（(]/;
const PHRASE_MAX = 80;

const BRAND_CUE = /brand|company|headquarter|based|founded|established|品牌|廠牌|厂牌|廠商|厂商|製造商|制造商|生產商|生产商|製商|制商|公司|企業|企业|ブランド|メーカー|總部|总部|源自|來自|来自|源於|源于|發源|发源|創立|创立|成立|創辦|创办|創建|创建|血統|血统|heritage/i;

type Span = { start: number; end: number; prefix: boolean };

/**
 * A country that starts a made-in clause: 「中國製」「台灣製造」「越南工廠生產」
 * 「中國組裝」, "China-made". A forward phrase stops before it, so "Designed by
 * CYBEX 中國製" keeps 中國 as the made-in.
 */
const MADE_WORD =
  '(?:工場|工廠|工厂|廠|厂)?(?:製造|制造|製|制|生產|生产|生産|組裝|组装|產(?![品業])|产(?![品业])|産(?![品業]))' +
  // Not a field name: 「德國 產地：中國」「製造国：中国」「製造：中國」 (the field's value is the made-in).
  '(?![地國国:：造業业])';
const MADE_COUNTRY = new RegExp(
  `(?:${CJK_COUNTRY})\\s*${MADE_WORD}|\\b(?:${EN_COUNTRY})[\\s-]+made\\b(?!\\s+in\\b)`,
  'gi'
);
/** The verb form: 製造 / 生產 … then 於 / 于 / 在 and a country (「製造於中國」). */
const VERB_FORM_AFTER = new RegExp(`^造?\\s*[於于在]\\s*(?:${CJK_COUNTRY})`);
/** More design countries in a list right after the first: 「設計於德國、日本」. */
const LIST_MORE = new RegExp(`^\\s*(?:[、/／&]|和|與|与|及|\\band\\b)\\s*(?:${CJK_COUNTRY}|\\b(?:${EN_COUNTRY})\\b)`, 'i');

function spans(text: string): Span[] {
  const out: Span[] = [];
  FORWARD_CUES.lastIndex = 0;
  for (const m of text.matchAll(FORWARD_CUES)) {
    const start = m.index ?? 0;
    const from = start + m[0].length;
    const raw = text.slice(from, from + PHRASE_MAX);
    // Hard end: a sentence end or a made-in word / field (Made in, COO:,
    // Origin:, 產地, 原産国, 製造：…). A made-in clause is never eaten.
    const hard = PHRASE_HARD_END.exec(raw);
    let cut = hard ? hard.index : raw.length;
    // Also before a country that starts a made-in clause (「中國製」), except
    // the verb form right after the cue: 「設計於德國製造於中國」 keeps 德國 as the
    // design country and reads 製造於中國. 「設計於德國 德國製造」: the 德國
    // with 製造 right after it is the made-in.
    MADE_COUNTRY.lastIndex = 0;
    for (const mc of raw.matchAll(MADE_COUNTRY)) {
      const at = mc.index ?? 0;
      if (at >= cut) break;
      const straight = /^[\s:：]*$/.test(raw.slice(0, at));
      if (straight && VERB_FORM_AFTER.test(raw.slice(at + mc[0].length))) continue;
      cut = at;
      break;
    }
    const rest = raw.slice(0, cut);
    // The phrase ends right after its first country (plus a 、 / and list of
    // countries), so a later country is never eaten. "Founded in 1947 in
    // Bayreuth, Germany, made in China" runs past a comma to Germany; with no
    // country the phrase ends at the first clause break.
    const place = firstCountry(rest);
    let end: number;
    if (place) {
      end = place.end;
      for (let more = LIST_MORE.exec(rest.slice(end)); more; more = LIST_MORE.exec(rest.slice(end))) {
        end += more[0].length;
      }
    } else {
      const soft = PHRASE_SOFT_END.exec(rest);
      end = soft ? soft.index : rest.length;
    }
    out.push({ start, end: from + end, prefix: false });
  }
  PREFIX_CUES.lastIndex = 0;
  for (const m of text.matchAll(PREFIX_CUES)) {
    const start = m.index ?? 0;
    out.push({ start, end: start + m[0].length, prefix: true });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** First country name in the text (names only, never 2-letter codes). */
function firstCountry(text: string): { index: number; end: number } | undefined {
  const en = new RegExp(`\\b(${EN_COUNTRY})\\b`, 'i').exec(text);
  const cjk = new RegExp(`(${CJK_COUNTRY})`).exec(text);
  const m = en && cjk ? (en.index <= cjk.index ? en : cjk) : (en ?? cjk);
  return m ? { index: m.index, end: m.index + m[0].length } : undefined;
}

function countriesIn(phrase: string): string[] {
  const out: string[] = [];
  let rest = phrase;
  for (let place = firstCountry(rest); place; place = firstCountry(rest)) {
    const c = countryIn(rest.slice(place.index, place.end));
    if (c && !out.includes(c)) out.push(c);
    rest = rest.slice(place.end);
  }
  return out;
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
    const kind: DesignKind = BRAND_CUE.test(phrase) ? 'brand' : 'design';
    // Every country in the phrase (「設計於德國、日本」 → 德國, 日本).
    for (const country of countriesIn(phrase)) {
      if (out.some((d) => d.country === country && d.kind === kind)) continue;
      out.push({ country, kind, phrase: phrase.slice(0, PHRASE_MAX) });
    }
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
  // Other spellings (中國大陸 …) through the shared name table (no 2-letter codes).
  const row = COUNTRY_NAME_PATTERNS.find((r) => r.label === (canonicalCountry(want) ?? want));
  return Boolean(row && row.pattern.test(rest));
}
