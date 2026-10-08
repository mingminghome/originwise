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

import { MADE_IN_CODE_LABEL, madeInCodeRegex } from './countryLabel';
import { stripDesignPhrases } from './designOrigin';
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
  '(?:mainland\\s+china|people.?s\\s+republic\\s+of\\s+china|hong\\s+kong|macau|macao|taiwan|thailand|vietnam|indonesia|malaysia|philippines|india|japan|south\\s+korea|korea|china|prc|germany|france|italy|spain|united\\s+kingdom|sweden|switzerland|poland|czech\\s+republic|united\\s+states|usa|mexico|美國|美国|日本|韓國|韩国|泰國|泰国|越南|印尼|馬來西亞|马来西亚|菲律賓|菲律宾|印度|中國大陸|中国大陆|中國|中国|台灣|台湾|香港|澳門|澳门|德國|德国|法國|法国|義大利|意大利|英國|英国)(?![A-Za-z])';

/** CJK country names as written on Japanese / Chinese packaging. */
const CJK_COUNTRY_TOKEN =
  '(?:中華人民共和国|中華人民共和國|中国|中國|日本|韓国|韓國|韩国|台湾|台灣|タイ|泰國|泰国|ベトナム|越南|インドネシア|印尼|マレーシア|馬來西亞|马来西亚|フィリピン|菲律賓|菲律宾|インド|印度|香港)';

/** Suffix form on labels: 「日本製」「中国工場製」「タイ製」. */
const COO_LINE = new RegExp(
  `(?:(?:製造|制造|生產|生产|生産|組裝|组装|產|产|製|制)(?:於|于|在)|made[\\s-]?in|manufactured[\\s-]?in|produced[\\s-]?in|assembled[\\s-]?in|country\\s+of\\s+origin|country\\s+of\\s+publication|coo|製造国|製造國|原産国名?|原產國|产地|產地|生产地|生產地|生産(?:[・･/／]組み?立て?)?|組み?立て?|組裝|组装)\\s*[:：]?\\s*(?:the\\s+)?(${CJK_COUNTRY_TOKEN}|${COUNTRY_TOKEN})`,
  'gi'
);

/**
 * 「中國製造」「台灣製」「中國生產」「日本産」「越南工廠生產」「中國組裝」: country,
 * then a made word. Not when 於 / 于 / 在 follows: 「德國製造於中國」 is the verb
 * form 製造於 X, so X is read (COO_LINE), not 德國.
 */
const COO_SUFFIX = new RegExp(
  `(${CJK_COUNTRY_TOKEN}|德國|德国|ドイツ|法國|法国|フランス|義大利|意大利|イタリア|英國|英国|イギリス|美國|美国|アメリカ)(?:工場|工廠|工厂|廠|厂)?(?:製造|制造|製|生產|生产|生産|組裝|组装|產(?![品業])|产(?![品业])|産(?![品業]))(?![造]?\\s*[於于在])`,
  'g'
);

/**
 * Upper-case short forms count only right after an explicit made-in cue
 * ("MADE IN CN", "COO: VN", "Made in the UK"); DE / IT / my … never do.
 */
const MADE_IN_CODE = madeInCodeRegex();

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
  中華人民共和国: '中国', 中華人民共和國: '中國', タイ: 'Thailand', ベトナム: 'Vietnam',
  インドネシア: 'Indonesia', マレーシア: 'Malaysia', フィリピン: 'Philippines',
  インド: 'India', 韓国: '韓國',
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
export function extractCooClaimsFromText(text: string): CooClaim[] {
  // Design / brand wording is never a COO claim ("Designed in Germany, made in China" → China).
  const raw = stripDesignPhrases(String(text || ''));
  if (!raw.trim()) return [];
  const out: CooClaim[] = [];
  const seen = new Set<string>();
  COO_LINE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = COO_LINE.exec(raw)) !== null) {
    const label = CJK_TO_LABEL[m[1].trim()] ?? m[1].trim();
    const region = normalizeRegion(label);
    if (region === 'UNKNOWN') continue;
    const start = Math.max(0, m.index - 80);
    const end = Math.min(raw.length, m.index + m[0].length + 80);
    const window = raw.slice(start, end);
    const source = classifySource(window);
    const key = `${source}:${region}:${label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, region, source });
  }
  MADE_IN_CODE.lastIndex = 0;
  while ((m = MADE_IN_CODE.exec(raw)) !== null) {
    const label = MADE_IN_CODE_LABEL[m[1]]!;
    // "Made in USA" / "Made in PRC" already read by name above: one claim.
    if (out.some((c) => canonCountry(c.label) === canonCountry(label))) continue;
    const region = normalizeRegion(label);
    const start = Math.max(0, m.index - 80);
    const end = Math.min(raw.length, m.index + m[0].length + 80);
    const source = classifySource(raw.slice(start, end));
    const key = `${source}:${region}:${label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, region, source });
  }
  COO_SUFFIX.lastIndex = 0;
  while ((m = COO_SUFFIX.exec(raw)) !== null) {
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
