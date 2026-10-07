/**
 * Pure-TS merge of agent partials → CheckResult.
 * Owns final relationTier via decision table. LLMs must not set overall tier.
 */

import {
  ALT_CAP,
  DEFAULT_DISCLAIMER_KEY,
  GRAPH_EDGE_CAP,
  GRAPH_NODE_CAP,
  KNOWLEDGE_NOTE,
  PART_CAP,
  WEB_KNOWLEDGE_NOTE,
  clampTier,
  type AgentPartials,
  type CheckResult,
  type CompanyPartial,
  type GraphEdge,
  type GraphNode,
  type PartKind,
  type ProductPart,
  type OriginCandidate,
  type OriginCandidateRating,
  type OriginCandidateSource,
  type ProductPartial,
  type RelationTier,
} from './schema';
import {
  inScope,
  isOutOfScopeGeo,
  normalizeRegion,
  type GeoScope,
  type RegionCode,
} from './regions';
import { applyCooPriority } from './cooPriority';

export type SynthesizeInput = {
  jobId: string;
  geoScope: GeoScope;
  locale?: string;
  queryText?: string;
  partials: AgentPartials;
  /** When company agent was skipped by dimensions */
  companySkipped?: boolean;
  productSkipped?: boolean;
  /** Live web research brief was successfully retrieved this job */
  webEnriched?: boolean;
  /** Soft-fail reason when web research did not enrich (timeout vs grounding vs empty). */
  webFailCode?: string;
  /** Live web research brief text (for COO priority ranking). */
  webBrief?: string;
  /** Packaging / label OCR text (highest COO priority). */
  ocrText?: string;
  /** Grounding Sources URLs/titles from live Search (when webEnriched). */
  sources?: string[];
};

type Factors = {
  F_MADE_IN_CN: boolean;
  F_ORIGIN_CN: boolean;
  F_MFG_CN: boolean;
  F_HQ_CN: boolean;
  F_PARENT_CN_MAJORITY: boolean;
  F_OWNERSHIP_STRONG_CN: boolean;
  F_OWNERSHIP_WEAK_CN: boolean;
  F_COMPONENT_CN: boolean;
  F_EXPLICIT_NON_CN_GEO: boolean;
  F_CONFLICT: boolean;
  F_CN_POSITIVE: boolean;
  F_STRONG_CN: boolean;
  F_INSUFFICIENT: boolean;
  reasons: string[];
  regions: RegionCode[];
};

const STRONG_REL = new Set([
  'ownership',
  'subsidiary',
  'hq',
  'parent_of',
  'owned_by',
  'controlling_shareholder',
  'state_owned_cn',
]);

const WEAK_REL = new Set([
  'manufacturing',
  'supply',
  'retail',
  'minority_stake',
  'supplier',
  'assembled_in',
  'retail_presence',
  'licensed_in',
  'joint_venture_minority',
  'other',
]);

function uniqRegions(list: RegionCode[]): RegionCode[] {
  const out: RegionCode[] = [];
  for (const r of list) {
    if (r !== 'UNKNOWN' && !out.includes(r)) out.push(r);
  }
  return out;
}

function extractFactors(
  partials: AgentPartials,
  geoScope: GeoScope
): Factors {
  const p = partials.product ?? {};
  const c = partials.company ?? {};
  const v = partials.verify ?? {};

  const madeIn = normalizeRegion(p.madeIn ?? p.manufacturedIn);
  const origin = normalizeRegion(p.originCountry);
  const mfg = normalizeRegion(p.manufacturerCountry);
  const hq = normalizeRegion(c.hqCountry);
  const component = normalizeRegion(p.componentsOrigin);
  const partRegions = (p.parts ?? []).map((part) =>
    normalizeRegion(part.madeIn || part.originCountry)
  );
  const F_PART_CN = (p.parts ?? []).some((part) => {
    const pr = normalizeRegion(part.madeIn || part.originCountry);
    if (pr !== 'UNKNOWN') return inScope(pr, geoScope);
    return Boolean(part.chinaRelated);
  });

  const regions = uniqRegions([
    madeIn,
    origin,
    mfg,
    hq,
    component,
    ...partRegions,
  ]);

  // Parent majority in scope
  let F_PARENT_CN_MAJORITY = false;
  for (const parent of c.parents ?? []) {
    const pr = normalizeRegion(parent.country);
    if (regions.indexOf(pr) === -1 && pr !== 'UNKNOWN') regions.push(pr);
    const control = String(parent.control ?? '').toLowerCase();
    if (
      inScope(pr, geoScope) &&
      (control === 'majority' || control === 'wholly')
    ) {
      F_PARENT_CN_MAJORITY = true;
    }
  }

  let F_OWNERSHIP_STRONG_CN = false;
  let F_OWNERSHIP_WEAK_CN = false;
  for (const rel of c.chinaRelations ?? []) {
    const rr = normalizeRegion(rel.country);
    if (rr !== 'UNKNOWN' && !regions.includes(rr)) regions.push(rr);
    const type = String(rel.type ?? 'other').toLowerCase();
    const strength = String(rel.strength ?? '').toLowerCase();
    // Relations without country: only count if type is strongly CN-coded
    const scoped =
      inScope(rr, geoScope) ||
      (rr === 'UNKNOWN' &&
        (type.includes('cn') || type === 'state_owned_cn'));
    if (!scoped && rr !== 'UNKNOWN') continue;
    if (!scoped && rr === 'UNKNOWN' && !type.includes('cn') && type !== 'state_owned_cn') {
      // ambiguous relation without geo — do not invent CN link
      continue;
    }
    // Ownership-class types only. strength "strong" on manufacturing/supply
    // is still a component/supply link, not HQ/parent control.
    if (STRONG_REL.has(type)) {
      if (inScope(rr, geoScope) || type === 'state_owned_cn') {
        F_OWNERSHIP_STRONG_CN = true;
      }
    } else if (
      inScope(rr, geoScope) &&
      (WEAK_REL.has(type) ||
        strength === 'weak' ||
        strength === 'moderate' ||
        strength === 'strong')
    ) {
      F_OWNERSHIP_WEAK_CN = true;
    }
  }

  const F_MADE_IN_CN = inScope(madeIn, geoScope);
  const F_ORIGIN_CN = inScope(origin, geoScope);
  const F_MFG_CN = inScope(mfg, geoScope);
  const F_HQ_CN = inScope(hq, geoScope);
  const F_COMPONENT_CN =
    (inScope(component, geoScope) || F_PART_CN) &&
    !F_MADE_IN_CN &&
    !F_MFG_CN;

  const geos = [madeIn, origin, mfg, hq];
  const F_EXPLICIT_NON_CN_GEO = geos.some((r) => isOutOfScopeGeo(r, geoScope));

  const F_CONFLICT = v.consistent === false;

  const F_CN_POSITIVE =
    F_MADE_IN_CN ||
    F_ORIGIN_CN ||
    F_MFG_CN ||
    F_HQ_CN ||
    F_PARENT_CN_MAJORITY ||
    F_OWNERSHIP_STRONG_CN ||
    F_OWNERSHIP_WEAK_CN ||
    F_COMPONENT_CN;

  const F_STRONG_CN =
    F_MADE_IN_CN ||
    F_MFG_CN ||
    F_HQ_CN ||
    F_PARENT_CN_MAJORITY ||
    F_OWNERSHIP_STRONG_CN;

  const F_INSUFFICIENT = !F_CN_POSITIVE && !F_EXPLICIT_NON_CN_GEO;

  const reasons: string[] = [];
  if (F_MADE_IN_CN) reasons.push('made_in_cn');
  if (F_ORIGIN_CN) reasons.push('origin_cn');
  if (F_MFG_CN) reasons.push('manufacturer_cn');
  if (F_HQ_CN) reasons.push('hq_cn');
  if (F_PARENT_CN_MAJORITY) reasons.push('parent_majority_cn');
  if (F_OWNERSHIP_STRONG_CN) reasons.push('ownership_strong_cn');
  if (F_OWNERSHIP_WEAK_CN) reasons.push('ownership_weak_cn');
  if (F_COMPONENT_CN) reasons.push('component_cn');
  if (F_EXPLICIT_NON_CN_GEO) reasons.push('explicit_non_cn_geo');
  if (F_CONFLICT) reasons.push('verify_conflict');
  if (madeIn === 'TW' || origin === 'TW' || hq === 'TW') {
    reasons.push('taiwan_as_country');
  }

  return {
    F_MADE_IN_CN,
    F_ORIGIN_CN,
    F_MFG_CN,
    F_HQ_CN,
    F_PARENT_CN_MAJORITY,
    F_OWNERSHIP_STRONG_CN,
    F_OWNERSHIP_WEAK_CN,
    F_COMPONENT_CN,
    F_EXPLICIT_NON_CN_GEO,
    F_CONFLICT,
    F_CN_POSITIVE,
    F_STRONG_CN,
    F_INSUFFICIENT,
    reasons,
    regions: uniqRegions(regions),
  };
}

function decideTier(f: Factors): {
  tier: RelationTier;
  tierReasons: string[];
} {
  // Priority 1
  if (f.F_CONFLICT && !f.F_STRONG_CN) {
    return { tier: 'unknown', tierReasons: [...f.reasons, 'conflict_no_strong'] };
  }
  // Priority 2
  if (f.F_STRONG_CN) {
    return { tier: 'direct', tierReasons: [...f.reasons] };
  }
  // Priority 3
  if (f.F_ORIGIN_CN) {
    return { tier: 'indirect', tierReasons: [...f.reasons] };
  }
  // Priority 4
  if (f.F_COMPONENT_CN || f.F_OWNERSHIP_WEAK_CN) {
    return { tier: 'indirect', tierReasons: [...f.reasons] };
  }
  // Priority 5
  if (!f.F_CN_POSITIVE && f.F_EXPLICIT_NON_CN_GEO) {
    return { tier: 'none', tierReasons: [...f.reasons] };
  }
  // Priority 6
  return { tier: 'unknown', tierReasons: [...f.reasons, 'insufficient'] };
}

const PART_KINDS = new Set<PartKind>([
  'part',
  'spare',
  'ingredient',
  'component',
]);

/** Treat placeholder COO strings as empty — never show "Made in: unknown". */
function isVagueOriginLabel(raw?: string | null): boolean {
  if (raw == null) return true;
  const s = String(raw).trim();
  if (!s) return true;
  return /^(unknown|n\/?a|n\.a\.|na|null|none|unclear|various|varies|multiple|asia|未知|不明|不詳|不清|無法確認|未確認|不清楚)$/i.test(
    s
  );
}

function confirmedOriginLabel(raw?: string | null): string | undefined {
  if (isVagueOriginLabel(raw)) return undefined;
  return String(raw).trim().slice(0, 80);
}


/** Name/CJK patterns for whole-string scan (avoid short codes that match English words). */
const COUNTRY_NAME_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
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
const COUNTRY_CODE_TO_LABEL: Record<string, string> = {
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

function matchCountryLabel(token: string): string | undefined {
  const s = token.trim();
  if (!s || isVagueOriginLabel(s)) return undefined;
  const code = COUNTRY_CODE_TO_LABEL[s.toLowerCase()];
  if (code) return code;
  for (const row of COUNTRY_NAME_PATTERNS) {
    if (row.pattern.test(s)) return row.label;
  }
  return undefined;
}

function extractCountryLabelsFromText(blob: string): string[] {
  if (!blob || !blob.trim()) return [];
  const found: string[] = [];
  const seen = new Set<string>();
  const add = (label: string) => {
    if (!seen.has(label)) {
      seen.add(label);
      found.push(label);
    }
  };
  for (const row of COUNTRY_NAME_PATTERNS) {
    if (row.pattern.test(blob)) add(row.label);
  }
  // Slash / comma lists: "CN / TH / VN" or "China, Thailand"
  for (const raw of blob.split(/[/|,;、＋+與和]|\band\b/i)) {
    const cleaned = raw.replace(/[()（）]/g, ' ').trim();
    const label = matchCountryLabel(cleaned);
    if (label) add(label);
    // "Often CN" / "mainly VN" — pick trailing ISO token
    const m = cleaned.match(/\b([A-Za-z]{2,3})\b\s*$/);
    if (m) {
      const fromCode = COUNTRY_CODE_TO_LABEL[m[1].toLowerCase()];
      if (fromCode) add(fromCode);
    }
  }
  // Bare ISO codes anywhere: "... CN / TH / VN ..."
  for (const m of blob.matchAll(/(?:^|[^A-Za-z])([A-Za-z]{2,3})(?=[^A-Za-z]|$)/g)) {
    const fromCode = COUNTRY_CODE_TO_LABEL[m[1].toLowerCase()];
    if (fromCode) add(fromCode);
  }
  return found;
}

function candidateRank(r: OriginCandidateRating): number {
  return { confirmed: 4, likely: 3, possible: 2, mentioned: 1 }[r];
}

function pushCandidate(
  map: Map<string, OriginCandidate>,
  label: string,
  confidence: number,
  source: OriginCandidateSource,
  rating: OriginCandidateRating
): void {
  const conf = Math.max(0, Math.min(1, confidence));
  const prev = map.get(label);
  if (!prev) {
    map.set(label, { label, confidence: conf, source, rating });
    return;
  }
  const keepRating =
    candidateRank(prev.rating) >= candidateRank(rating) ? prev.rating : rating;
  const keepSource =
    candidateRank(prev.rating) >= candidateRank(rating) ? prev.source : source;
  map.set(label, {
    label,
    confidence: Math.max(prev.confidence, conf),
    source: keepSource,
    rating: keepRating,
  });
}

/**
 * Collect all queried origin candidates from product layers.
 * Never invents a place that is not already present in notes/parts/line/COO.
 */
function collectOriginCandidates(
  p: ProductPartial | null | undefined,
  opts: { webEnriched?: boolean; productConfidence?: number }
): OriginCandidate[] {
  if (!p) return [];
  const out = new Map<string, OriginCandidate>();
  const base = typeof opts.productConfidence === 'number' ? opts.productConfidence : 0.45;
  const webBoost = opts.webEnriched ? 0.1 : 0;

  const confirmed = confirmedOriginLabel(p.madeIn) || confirmedOriginLabel(p.manufacturedIn);
  if (confirmed) {
    const label = matchCountryLabel(confirmed) || confirmed;
    pushCandidate(out, label, Math.min(0.95, base + 0.25 + webBoost), 'confirmed_coo', 'confirmed');
  }

  for (const part of p.parts ?? []) {
    for (const raw of [part.madeIn, part.originCountry]) {
      const lab = confirmedOriginLabel(raw);
      if (!lab) continue;
      const label = matchCountryLabel(lab) || lab;
      const rating: OriginCandidateRating = part.chinaRelated ? 'likely' : 'possible';
      pushCandidate(
        out,
        label,
        Math.min(0.85, (part.chinaRelated ? 0.55 : 0.4) + webBoost),
        'parts',
        rating
      );
    }
  }

  if (p.componentsOrigin) {
    for (const label of extractCountryLabelsFromText(String(p.componentsOrigin))) {
      // Do not promote to confirmed — components line is candidate only
      if (out.get(label)?.rating === 'confirmed') continue;
      pushCandidate(
        out,
        label,
        Math.min(0.7, 0.35 + webBoost),
        'components_line',
        'possible'
      );
    }
  }

  for (const n of p.notes ?? []) {
    for (const label of extractCountryLabelsFromText(String(n))) {
      if (out.get(label)?.rating === 'confirmed') continue;
      pushCandidate(out, label, Math.min(0.55, 0.28 + webBoost), 'notes', 'mentioned');
    }
  }

  const mfg = confirmedOriginLabel(p.manufacturerCountry);
  if (mfg) {
    const label = matchCountryLabel(mfg) || mfg;
    if (out.get(label)?.rating !== 'confirmed') {
      pushCandidate(out, label, Math.min(0.65, 0.4 + webBoost), 'manufacturer', 'possible');
    }
  }

  return [...out.values()]
    .sort((a, b) => {
      const rank: Record<OriginCandidateRating, number> = {
        confirmed: 4,
        likely: 3,
        possible: 2,
        mentioned: 1,
      };
      return rank[b.rating] - rank[a.rating] || b.confidence - a.confidence;
    })
    .slice(0, 8);
}

type PartsSanitizeCtx = {
  webEnriched?: boolean;
  webBrief?: string;
  ocrText?: string;
  brandOriginCountry?: string;
  hqCountry?: string;
};

/** Packaging / label cues that can support part countries without live Search. */
function hasOcrPartEvidence(ocrText?: string): boolean {
  if (!ocrText || !ocrText.trim()) return false;
  return /made\s*in|country\s*of\s*origin|原產|原产|產地|产地|びん|乳首|キャップ|瓶身|奶嘴|瓶蓋|瓶盖|日本製|中国製|中國製|タイ製|泰國製|泰国製|製造國|制造国|assembled\s*in/i.test(
    ocrText
  );
}

/** Synonyms so part names match JP/EN/ZH label wording in Search/OCR. */
const PART_NAME_SYNONYMS: Array<{ match: RegExp; cues: RegExp }> = [
  {
    match: /glass|bottle|瓶|びん|耐熱/i,
    cues: /glass|bottle|瓶身|玻璃|びん|哺乳びん|bottle\s*body/i,
  },
  {
    match: /nipple|teat|乳首|奶嘴/i,
    cues: /nipple|teat|乳首|奶嘴|sucking/i,
  },
  {
    match: /cap|collar|蓋|盖|栓|キャップ/i,
    cues: /cap|collar|蓋|盖|瓶蓋|瓶盖|瓶栓|キャップ|hood/i,
  },
  {
    match: /textile|fabric|布|織|织/i,
    cues: /textile|fabric|布|織|织|cloth|upholstery/i,
  },
  {
    match: /battery|電池|电池/i,
    cues: /battery|電池|电池|cell/i,
  },
  {
    match: /soy|醬|酱|sauce/i,
    cues: /soy|醬|酱|sauce|醤油|醬油|酱油/i,
  },
];

function evidenceMentionsCountry(evidence: string, country: string): boolean {
  if (!evidence.trim() || !country.trim()) return false;
  const label = matchCountryLabel(country) || country.trim();
  const labels = extractCountryLabelsFromText(evidence);
  if (labels.some((l) => labelsMatch(l, label) || labelsMatch(l, country))) {
    return true;
  }
  // Direct pattern / substring (e.g. 日本製, Thailand)
  for (const row of COUNTRY_NAME_PATTERNS) {
    if (
      (labelsMatch(row.label, label) || labelsMatch(row.label, country)) &&
      row.pattern.test(evidence)
    ) {
      return true;
    }
  }
  const low = evidence.toLowerCase();
  const c = country.trim().toLowerCase();
  if (c.length >= 2 && low.includes(c)) return true;
  if (label.length >= 2 && low.includes(label.toLowerCase())) return true;
  return false;
}

function evidenceMentionsPart(evidence: string, partName: string): boolean {
  if (!evidence.trim() || !partName.trim()) return false;
  const low = evidence.toLowerCase();
  const name = partName.trim().toLowerCase();
  if (name.length >= 2 && low.includes(name)) return true;
  for (const row of PART_NAME_SYNONYMS) {
    if (row.match.test(partName) && row.cues.test(evidence)) return true;
  }
  // Token overlap for multi-word names (skip very short tokens)
  for (const tok of name.split(/[^a-z0-9\u4e00-\u9fff\u3040-\u30ff]+/i)) {
    if (tok.length >= 3 && low.includes(tok)) return true;
  }
  return false;
}

/**
 * Cross-check a part country against Search brief / OCR.
 * Country must appear with THIS part (same segment / nearby), not merely
 * elsewhere in the brief (avoids glass→Japan leaking onto nipple).
 */
function partCountryCrossCheck(
  partName: string,
  country: string,
  evidence: string
): boolean {
  if (!evidenceMentionsCountry(evidence, country)) return false;

  // Segment association: "びん：日本製" / "乳首・キャップ：中国／タイ製"
  const segments = evidence.split(/[、，,;\n]+/);
  for (const seg of segments) {
    if (
      evidenceMentionsPart(seg, partName) &&
      evidenceMentionsCountry(seg, country)
    ) {
      return true;
    }
  }

  // Proximity window: part cue and country within ~48 chars
  const low = evidence.toLowerCase();
  const countryHits: number[] = [];
  const label = matchCountryLabel(country) || country;
  for (const row of COUNTRY_NAME_PATTERNS) {
    if (!labelsMatch(row.label, label) && !labelsMatch(row.label, country)) {
      continue;
    }
    const re = new RegExp(row.pattern.source, row.pattern.flags.includes('g') ? row.pattern.flags : row.pattern.flags + 'g');
    for (const m of evidence.matchAll(re)) {
      if (typeof m.index === 'number') countryHits.push(m.index);
    }
  }
  const partHits: number[] = [];
  if (partName.trim().length >= 2) {
    let idx = low.indexOf(partName.trim().toLowerCase());
    while (idx >= 0) {
      partHits.push(idx);
      idx = low.indexOf(partName.trim().toLowerCase(), idx + 1);
    }
  }
  for (const row of PART_NAME_SYNONYMS) {
    if (!row.match.test(partName)) continue;
    const re = new RegExp(row.cues.source, row.cues.flags.includes('g') ? row.cues.flags : row.cues.flags + 'g');
    for (const m of evidence.matchAll(re)) {
      if (typeof m.index === 'number') partHits.push(m.index);
    }
  }
  for (const p of partHits) {
    for (const c of countryHits) {
      if (Math.abs(p - c) <= 48) return true;
    }
  }

  // Single-country evidence + part mentioned somewhere (simple "soy sauce Made in China")
  const countries = extractCountryLabelsFromText(evidence);
  if (
    countries.length === 1 &&
    evidenceMentionsCountry(evidence, country) &&
    evidenceMentionsPart(evidence, partName)
  ) {
    return true;
  }

  return false;
}

function isHqEchoPartCountry(
  country: string | undefined,
  ctx: PartsSanitizeCtx
): boolean {
  if (!country) return false;
  if (
    madeInCopiedFromBrandOrigin({
      madeIn: country,
      originCountry: ctx.brandOriginCountry,
      hqCountry: ctx.hqCountry,
    })
  ) {
    return true;
  }
  // CJK ↔ English (日本 vs Japan) — labelsMatch alone misses this.
  const partLabel = matchCountryLabel(country);
  if (!partLabel) return false;
  const madeRegion = normalizeRegion(country);
  if (madeRegion === 'CN' || madeRegion === 'UNKNOWN') return false;
  for (const seed of [ctx.brandOriginCountry, ctx.hqCountry]) {
    if (!seed) continue;
    const seedLabel = matchCountryLabel(seed);
    if (seedLabel && labelsMatch(partLabel, seedLabel)) return true;
    if (normalizeRegion(seed) === madeRegion && madeRegion === 'OTHER') {
      if (seedLabel && partLabel && labelsMatch(seedLabel, partLabel)) return true;
    }
  }
  return false;
}

function sanitizeParts(
  raw: unknown,
  ctx: PartsSanitizeCtx = {}
): ProductPart[] {
  if (!Array.isArray(raw)) return [];
  const evidence = [ctx.webBrief, ctx.ocrText].filter(Boolean).join('\n');
  const grounded = Boolean(ctx.webEnriched);
  const ocrOk = hasOcrPartEvidence(ctx.ocrText);
  const canConfirmCountries = grounded || ocrOk;
  const out: ProductPart[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const name = String(rec.name ?? '').trim().slice(0, 80);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const kindRaw = String(rec.kind ?? 'part')
      .toLowerCase()
      .trim();
    const kind: PartKind = PART_KINDS.has(kindRaw as PartKind)
      ? (kindRaw as PartKind)
      : 'part';
    let originCountry = confirmedOriginLabel(
      rec.originCountry ? String(rec.originCountry) : undefined
    );
    let madeIn = confirmedOriginLabel(
      rec.madeIn ? String(rec.madeIn) : undefined
    );
    let chinaRelated =
      typeof rec.chinaRelated === 'boolean' ? rec.chinaRelated : undefined;
    let note = rec.note ? String(rec.note).trim().slice(0, 160) : undefined;
    const stripCountry = (why: string) => {
      madeIn = undefined;
      originCountry = undefined;
      chinaRelated = undefined;
      if (!note || !/no Search\/OCR|unknown/i.test(note)) {
        note = [note, why].filter(Boolean).join(' — ').slice(0, 160);
      }
    };

    if (madeIn || originCountry || chinaRelated) {
      if (!canConfirmCountries) {
        // Search fail / no OCR: never keep model-memory part countries (HQ echo).
        stripCountry(
          'Part country omitted: no Search/OCR evidence (brand HQ is not a part COO).'
        );
      } else {
        const keepMade =
          madeIn && partCountryCrossCheck(name, madeIn, evidence)
            ? madeIn
            : undefined;
        const keepOrigin =
          originCountry && partCountryCrossCheck(name, originCountry, evidence)
            ? originCountry
            : undefined;
        // Drop HQ-echo even if a loose country mention exists without part cue
        const madeHq = keepMade && isHqEchoPartCountry(keepMade, ctx);
        const originHq = keepOrigin && isHqEchoPartCountry(keepOrigin, ctx);
        const madeFinal =
          keepMade && !(madeHq && !evidenceMentionsPart(evidence, name))
            ? keepMade
            : undefined;
        const originFinal =
          keepOrigin && !(originHq && !evidenceMentionsPart(evidence, name))
            ? keepOrigin
            : undefined;
        if ((madeIn || originCountry) && !madeFinal && !originFinal) {
          stripCountry(
            'Part country omitted: not confirmed by Search/OCR for this part.'
          );
        } else {
          madeIn = madeFinal;
          originCountry = originFinal;
          if (chinaRelated) {
            const cnOk =
              (madeFinal && normalizeRegion(madeFinal) === 'CN') ||
              (originFinal && normalizeRegion(originFinal) === 'CN') ||
              evidenceMentionsCountry(evidence, 'China');
            if (!cnOk || !evidenceMentionsPart(evidence, name)) {
              chinaRelated = undefined;
            }
          }
        }
      }
    }

    out.push({
      name,
      kind,
      originCountry,
      madeIn,
      chinaRelated,
      note,
    });
    if (out.length >= PART_CAP) break;
  }
  return out;
}

function buildGraph(
  partials: AgentPartials,
  geoScope: GeoScope,
  title: string
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const addNode = (n: GraphNode) => {
    if (nodes.length >= GRAPH_NODE_CAP) return;
    if (nodes.some((x) => x.id === n.id)) return;
    nodes.push(n);
  };
  const addEdge = (e: GraphEdge) => {
    if (edges.length >= GRAPH_EDGE_CAP) return;
    edges.push(e);
  };

  const p = partials.product;
  const c = partials.company;
  const productId = 'product';
  const companyId = 'company';

  const madeRegion = normalizeRegion(p?.madeIn ?? p?.manufacturedIn);
  const originRegion = normalizeRegion(p?.originCountry);

  addNode({
    id: productId,
    label: p?.name || p?.brand || title || 'Product',
    kind: 'product',
    region: madeRegion !== 'UNKNOWN' ? madeRegion : originRegion,
    chinaRelated: inScope(
      madeRegion !== 'UNKNOWN' ? madeRegion : originRegion,
      geoScope
    ),
  });

  // Explicit place node so "made in X" is a visible relationship
  const madeLabel = (p?.madeIn || p?.manufacturedIn || '').trim();
  if (madeLabel && madeRegion !== 'UNKNOWN') {
    const placeId = `place:made:${madeRegion}`;
    addNode({
      id: placeId,
      label: madeLabel.slice(0, 40),
      kind: 'place',
      region: madeRegion,
      chinaRelated: inScope(madeRegion, geoScope),
    });
    addEdge({
      from: productId,
      to: placeId,
      label: 'made in',
      type: 'manufacturing',
      strength: 'strong',
      chinaRelated: inScope(madeRegion, geoScope),
    });
  }

  let hasCompany = false;
  if (c?.name || c?.hqCountry) {
    hasCompany = true;
    const hq = normalizeRegion(c.hqCountry);
    addNode({
      id: companyId,
      label: c.name || c.legalName || 'Company',
      kind: 'company',
      region: hq,
      chinaRelated: inScope(hq, geoScope),
    });
    addEdge({
      from: productId,
      to: companyId,
      label: 'brand',
      type: 'affiliation',
      chinaRelated: false,
    });
    if (c.hqCountry && hq !== 'UNKNOWN') {
      const hqId = `place:hq:${hq}`;
      addNode({
        id: hqId,
        label: String(c.hqCountry).trim().slice(0, 40),
        kind: 'place',
        region: hq,
        chinaRelated: inScope(hq, geoScope),
      });
      addEdge({
        from: companyId,
        to: hqId,
        label: 'HQ',
        type: 'hq',
        chinaRelated: inScope(hq, geoScope),
      });
    }
  }

  // Parts already sanitized in synthesize() (evidence / HQ-echo rules).
  const parts = p?.parts ?? [];
  for (const part of parts) {
    const pr = normalizeRegion(part.madeIn || part.originCountry);
    const partCn =
      pr !== 'UNKNOWN' ? inScope(pr, geoScope) : Boolean(part.chinaRelated);
    const id = `part:${part.name}`.slice(0, 64);
    addNode({
      id,
      label: part.name,
      kind: part.kind || 'part',
      region: pr,
      chinaRelated: partCn,
    });
    addEdge({
      from: productId,
      to: id,
      label: part.kind || 'part',
      type: part.kind || 'part',
      strength: partCn ? 'moderate' : 'weak',
      chinaRelated: partCn,
    });
    const placeLabel = (part.madeIn || part.originCountry || '').trim();
    if (placeLabel && pr !== 'UNKNOWN') {
      const reuse = nodes.find(
        (n) => n.kind === 'place' && n.region === pr
      );
      const placeId = reuse?.id || `place:part:${pr}`.slice(0, 64);
      if (!reuse) {
        addNode({
          id: placeId,
          label: placeLabel.slice(0, 40),
          kind: 'place',
          region: pr,
          chinaRelated: inScope(pr, geoScope),
        });
      }
      addEdge({
        from: id,
        to: placeId,
        label: 'made in',
        type: 'manufacturing',
        chinaRelated: inScope(pr, geoScope),
      });
    }
  }

  for (const parent of c?.parents ?? []) {
    if (!parent?.name) continue;
    const id = `parent:${parent.name}`.slice(0, 64);
    const pr = normalizeRegion(parent.country);
    addNode({
      id,
      label: parent.name,
      kind: 'parent',
      region: pr,
      chinaRelated: inScope(pr, geoScope),
    });
    const control = String(parent.control || 'parent').toLowerCase();
    addEdge({
      from: hasCompany ? companyId : productId,
      to: id,
      label: control === 'unknown' ? 'parent' : control,
      type: 'ownership',
      strength:
        control === 'majority' || control === 'wholly' ? 'strong' : 'weak',
      chinaRelated: inScope(pr, geoScope),
    });
  }

  // Drop edges whose endpoints were never added (cap / missing company)
  const ids = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter((e) => ids.has(e.from) && ids.has(e.to));

  return {
    nodes: nodes.slice(0, GRAPH_NODE_CAP),
    edges: validEdges.slice(0, GRAPH_EDGE_CAP),
  };
}

function clampAltTier(raw: unknown): RelationTier | undefined {
  if (raw == null) return undefined;
  return clampTier(raw);
}

const CN_TEXT =
  /\b(china|prc|mainland\s*china|people'?s\s*republic|made\s*in\s*cn|manufactured\s*in\s*china|中國|中国|中國大陸|中国大陆)\b/i;

/** Named plant / COO — not 工廠產地, 廠區, 產線, or China+1 rumors. */
const FACTORY_EVIDENCE =
  /\b(assembled in|assembly plant|manufacturing (?:site|base|hub|plant)|final assembl)\b|[A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)*\s+plant\b|組裝廠|组装厂|生產基地|生产基地|最終組裝|最终组装/i;

const DENIES_CN_MFG =
  /\b(?:not|never)\s+(?:made|produced|manufactured|assembled)\s+in\s+china\b|non[\s-]?china\s+(?:made|production|manufactur)|outside\s+(?:of\s+)?china|does\s+not\s+rely\s+on\s+china|不依賴中國|不依赖中国|非中國(?:生產|製造|產製|产制|廠區|厂区|地區|地区)|非中国(?:生产|制造|产制|厂区|地区)|不是中國(?:製|造|生產)|不是中国(?:制|造|生产)/i;

const DISTRIBUTOR_NAME =
  /總代理|独家代理|獨家代理|代理商|exclusive\s+(?:distributor|agent)|local\s+(?:distributor|agent|importer)|official\s+distributor|進口商|进口商|經銷商|经销商|授權代理|授权代理/i;

const MARKET_DESK_SUFFIX =
  /(?:^|[\s\-_/（(])(?:tw|twn|taiwan|台灣|台湾|hk|hong\s*kong)\)?\s*$/i;

const HOLDING_NAME =
  /\b(?:group|holdings?|nv|plc|se|inc|ltd|llc|corp(?:oration)?)\b|集團|集团|控股|實業|实业|工業|工业/i;

/** Lower = better as a "lower China involvement" alternative. */
const ALT_TIER_RANK: Record<RelationTier, number> = {
  none: 0,
  indirect: 1,
  unknown: 2,
  direct: 3,
};

type SanitizedAlt = {
  name: string;
  relationTier: RelationTier;
  note?: string;
  madeIn?: string;
  originCountry?: string;
  hqCountry?: string;
};

function labelsMatch(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  if (na === nb) return true;
  const sa = na.replace(/[^a-z0-9\u4e00-\u9fff]+/g, '');
  const sb = nb.replace(/[^a-z0-9\u4e00-\u9fff]+/g, '');
  return sa.length >= 2 && sa === sb;
}

const ALT_NAME_STOP = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'car',
  'seat',
  'baby',
  'next',
  'system',
  'brand',
  'series',
  'model',
]);

/** First Latin brand token (skip generic words and parenthetical agents). */
function coreBrandKey(raw: string): string {
  const cut = raw.replace(/[（(].*$/, '').trim().toLowerCase();
  const m = cut.match(/[a-z][a-z0-9]{2,}/);
  if (!m) return '';
  if (ALT_NAME_STOP.has(m[0])) return '';
  return m[0];
}

function isSameBrandAlt(altName: string, seeds: string[]): boolean {
  const a = coreBrandKey(altName);
  if (!a) return false;
  for (const seed of seeds) {
    const k = coreBrandKey(seed);
    if (k && a === k) return true;
    const low = seed.toLowerCase();
    if (low.includes(a) && a.length >= 4) return true;
  }
  return false;
}

/** madeIn is only the brand/design country, not an independent factory COO. */
function madeInCopiedFromBrandOrigin(raw: {
  madeIn?: string;
  originCountry?: string;
  hqCountry?: string;
  note?: string;
}): boolean {
  const madeIn = raw.madeIn?.trim();
  if (!madeIn) return false;
  const madeRegion = normalizeRegion(madeIn);
  if (madeRegion === 'CN' || madeRegion === 'UNKNOWN') return false;
  return (
    labelsMatch(madeIn, raw.originCountry) || labelsMatch(madeIn, raw.hqCountry)
  );
}

export function looksLikeDistributorParent(name: string): boolean {
  const n = name.trim();
  if (!n) return true;
  if (DISTRIBUTOR_NAME.test(n)) return true;
  if (MARKET_DESK_SUFFIX.test(n) && !HOLDING_NAME.test(n)) return true;
  return false;
}


function sanitizeProduct(
  p?: ProductPartial | null,
  ctx?: { webBrief?: string; ocrText?: string }
): ProductPartial | null | undefined {
  if (!p) return p;
  const noteBlob = (p.notes ?? []).join(' ');
  const madeCopied = madeInCopiedFromBrandOrigin({
    madeIn: p.madeIn,
    originCountry: p.originCountry,
    note: noteBlob,
  });
  const mfgCopied = madeInCopiedFromBrandOrigin({
    madeIn: p.manufacturedIn,
    originCountry: p.originCountry,
    note: noteBlob,
  });
  const hadVagueMade =
    (Boolean(p.madeIn && String(p.madeIn).trim()) &&
      isVagueOriginLabel(p.madeIn)) ||
    (Boolean(p.manufacturedIn && String(p.manufacturedIn).trim()) &&
      isVagueOriginLabel(p.manufacturedIn));
  let madeIn = madeCopied ? undefined : confirmedOriginLabel(p.madeIn);
  let manufacturedIn = mfgCopied
    ? undefined
    : confirmedOriginLabel(p.manufacturedIn);
  const notes = [...(p.notes ?? [])];
  if (madeCopied || mfgCopied) {
    notes.push(
      'Made-in omitted: it matched brand/design country without factory/COO evidence.'
    );
  } else if (hadVagueMade && (p.componentsOrigin || (p.parts && p.parts.length))) {
    notes.push(
      'Final COO unconfirmed — see components/global line or parts for candidates (not confirmed made-in).'
    );
  } else if (hadVagueMade) {
    notes.push(
      'Final COO unconfirmed — no SKU/label country of origin; do not invent made-in.'
    );
  }

  // Generic COO priority: OCR → retailer/product page → manufacturer → ownership never stamps
  const coo = applyCooPriority({
    ocrText: ctx?.ocrText,
    webBrief: ctx?.webBrief,
    notes,
    madeIn,
    manufacturedIn,
  });
  madeIn = coo.madeIn;
  manufacturedIn = coo.manufacturedIn;
  notes.length = 0;
  notes.push(...coo.notes);
  let confidence = p.confidence;
  if (
    typeof coo.confidenceCap === 'number' &&
    (typeof confidence !== 'number' || confidence > coo.confidenceCap)
  ) {
    confidence = coo.confidenceCap;
  }

  if (
    madeIn === p.madeIn &&
    manufacturedIn === p.manufacturedIn &&
    notes.length === (p.notes ?? []).length &&
    confidence === p.confidence
  ) {
    return p;
  }
  return {
    ...p,
    madeIn,
    manufacturedIn,
    confidence,
    notes: notes.length ? notes.slice(0, 8) : p.notes,
  };
}

function sanitizeCompany(
  c?: CompanyPartial | null
): CompanyPartial | null | undefined {
  if (!c) return c;
  const rawParents = c.parents ?? [];
  const parents = rawParents.filter(
    (p) => p?.name && !looksLikeDistributorParent(p.name)
  );
  const dropped = rawParents.length - parents.length;
  const chinaRelations = (c.chinaRelations ?? []).map((rel) => {
    const blob = `${rel.type ?? ''} ${rel.note ?? ''}`;
    const dist = DISTRIBUTOR_NAME.test(blob);
    const ownership = /ownership|subsidiary|parent|owned_by|hq|controlling/.test(
      String(rel.type ?? '').toLowerCase()
    );
    if (dist && ownership) {
      return { ...rel, type: 'retail', strength: 'weak' };
    }
    return rel;
  });
  const notes = [...(c.notes ?? [])];
  if (dropped > 0) {
    notes.push(
      'Local distributor / market agent omitted from parents (not a legal owner).'
    );
  }
  return {
    ...c,
    parents: parents.length ? parents : undefined,
    chinaRelations: chinaRelations.length ? chinaRelations : c.chinaRelations,
    notes: notes.length ? notes : c.notes,
  };
}

/**
 * Sanitize LLM alternative tiers so we don't claim "Unrelated" for items
 * commonly made in China (or with unknown manufacture).
 */
function sanitizeAlternative(
  raw: {
    name?: string;
    relationTier?: unknown;
    note?: string;
    madeIn?: string;
    originCountry?: string;
    hqCountry?: string;
    manufacturedIn?: string;
  },
  geoScope: GeoScope,
  querySeeds: string[] = []
): SanitizedAlt | null {
  const name = String(raw.name ?? '').trim().slice(0, 80);
  if (!name) return null;
  if (isSameBrandAlt(name, querySeeds)) return null;
  if (/代理|distributor|exclusive agent/i.test(name)) return null;

  const madeIn = confirmedOriginLabel(raw.madeIn);
  const originCountry = raw.originCountry
    ? String(raw.originCountry).trim().slice(0, 80)
    : undefined;
  const hqCountry = raw.hqCountry
    ? String(raw.hqCountry).trim().slice(0, 80)
    : undefined;
  const noteRaw = raw.note ? String(raw.note).trim().slice(0, 220) : '';
  const hqCopied = madeInCopiedFromBrandOrigin({
    madeIn,
    originCountry,
    hqCountry,
    note: noteRaw,
  });
  // Design/HQ country is not a factory COO — do not recommend as lower-CN.
  if (hqCopied) return null;
  const namedPlant = FACTORY_EVIDENCE.test(noteRaw);
  if (DENIES_CN_MFG.test(noteRaw) && !namedPlant) {
    return null;
  }
  // A country name without a named plant/COO is not factory evidence
  // (homonyms, China+1 rumors, "主要產地為越南").
  if (madeIn && !namedPlant) {
    return null;
  }
  const blob = [madeIn, originCountry, hqCountry, noteRaw, raw.manufacturedIn]
    .filter(Boolean)
    .join(' ');

  const madeRegion = normalizeRegion(
    madeIn || raw.manufacturedIn || originCountry
  );
  const hqRegion = normalizeRegion(hqCountry);
  let tier = clampAltTier(raw.relationTier) ?? 'unknown';

  const textSaysCn = CN_TEXT.test(blob);
  const madeInCn = inScope(madeRegion, geoScope) || textSaysCn;
  const hqInCn = inScope(hqRegion, geoScope);

  if (madeInCn || hqInCn) {
    // Manufacturing/HQ in scope → at least indirect; pure made-in CN → direct
    if (
      madeRegion === 'CN' ||
      textSaysCn ||
      (hqRegion === 'CN' && madeRegion === 'CN')
    ) {
      tier = 'direct';
    } else if (tier === 'none' || tier === 'unknown') {
      tier = 'indirect';
    }
  } else if (tier === 'none') {
    // "Unrelated" requires explicit non-CN *manufacturing* evidence.
    // HQ in USA/EU alone is NOT enough (e.g. Bissell/Shark units often made in CN).
    const madeExplicitlyNonCn = isOutOfScopeGeo(madeRegion, geoScope);
    const madeMissingOrVague =
      !madeIn ||
      madeRegion === 'UNKNOWN' ||
      /^unknown|n\/a|null|unclear|various|varies|multiple|asia$/i.test(
        madeIn
      );
    if (!madeExplicitlyNonCn || madeMissingOrVague) {
      tier = 'unknown';
    }
  }

  let note = noteRaw || undefined;
  if (madeIn && note && !note.toLowerCase().includes(madeIn.toLowerCase())) {
    note = `${note} · Made in: ${madeIn}`.slice(0, 220);
  } else if (madeIn && !note) {
    note = `Made in: ${madeIn}`;
  }
  if (tier === 'unknown' && !note) {
    note = 'China link unclear — do not treat as confirmed non-China.';
  }

  return {
    name,
    relationTier: tier,
    note,
    madeIn,
    originCountry,
    hqCountry,
  };
}

/**
 * Keep alternatives that help the user avoid China-heavy options:
 * drop direct / made-in-China fillers; rank lower China involvement first.
 */
function isHighChinaAlt(x: SanitizedAlt, geoScope: GeoScope): boolean {
  if (x.relationTier === 'direct') return true;
  const made = normalizeRegion(x.madeIn);
  const origin = normalizeRegion(x.originCountry);
  if (inScope(made, geoScope) || made === 'CN') return true;
  if (inScope(origin, geoScope) && made === 'UNKNOWN') {
    // Origin-only CN without clear non-CN made-in — not a lower-CN pick
    return true;
  }
  const blob = [x.madeIn, x.note, x.originCountry].filter(Boolean).join(' ');
  if (CN_TEXT.test(blob) && (made === 'CN' || made === 'UNKNOWN')) return true;
  return false;
}

function finalizeAlternativesList(
  items: SanitizedAlt[],
  geoScope: GeoScope
): SanitizedAlt[] {
  const lower = items.filter((x) => !isHighChinaAlt(x, geoScope));
  const ranked = lower.sort(
    (a, b) => ALT_TIER_RANK[a.relationTier] - ALT_TIER_RANK[b.relationTier]
  );
  return ranked.slice(0, ALT_CAP);
}


/** Pull Sources lines embedded in a web research brief. */
function parseSourcesFromBrief(brief?: string): string[] {
  if (!brief) return [];
  const m = brief.match(/\nSources:\s*\n([\s\S]*)$/i);
  if (!m) return [];
  const out: string[] = [];
  for (const line of m[1].split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const cleaned = t.replace(/^\[\d+\]\s*/, '').replace(/^[-*]\s*/, '').trim();
    if (cleaned && !out.includes(cleaned)) out.push(cleaned);
    if (out.length >= 8) break;
  }
  return out;
}

/** Classify web soft-fail for notes (not a single “no web” bucket). */
export function webFailCaveat(code?: string): string {
  switch (code) {
    case 'model_unavailable':
      return 'Live web Search models were unavailable on this API key — made-in and part countries are more conservative (model knowledge only).';
    case 'search_grounding_unavailable':
    case 'upstream_quota':
      return 'Live Google Search grounding unavailable on this API key — made-in and part countries are more conservative (model knowledge only).';
    case 'upstream_unavailable':
      return 'Live web research timed out or upstream was busy — made-in and part countries are more conservative (model knowledge only).';
    case 'empty_response':
      return 'Live web research returned an empty reply — made-in and part countries are more conservative (model knowledge only).';
    case 'disabled':
      return 'Live web research was disabled for this check — made-in and part countries are more conservative (model knowledge only).';
    case 'gemini_not_configured':
      return 'Gemini not configured for live web — made-in and part countries are more conservative (model knowledge only).';
    case 'no_entity':
      return 'No product name for live web research — made-in and part countries are more conservative (model knowledge only).';
    default:
      return 'No live web research for this check — made-in and part countries are more conservative (model knowledge only).';
  }
}

/**
 * Deterministic synthesize. Safe for Workers CPU budget.
 */
export function synthesize(input: SynthesizeInput): CheckResult {
  const { jobId, geoScope } = input;
  const companySan =
    sanitizeCompany(input.partials.company) ?? input.partials.company;
  let productSan =
    sanitizeProduct(input.partials.product, {
      webBrief: input.webBrief,
      ocrText: input.ocrText,
    }) ?? input.partials.product;
  if (productSan?.parts?.length) {
    const partsCtx: PartsSanitizeCtx = {
      webEnriched: input.webEnriched,
      webBrief: input.webBrief,
      ocrText: input.ocrText,
      brandOriginCountry: productSan.originCountry,
      hqCountry: companySan?.hqCountry,
    };
    const cleanedParts = sanitizeParts(productSan.parts, partsCtx);
    productSan = { ...productSan, parts: cleanedParts };
  }
  const partials: AgentPartials = {
    ...input.partials,
    product: productSan,
    company: companySan,
  };
  const f = extractFactors(partials, geoScope);
  let { tier, tierReasons } = decideTier(f);
  const madeInOmitted = (partials.product?.notes ?? []).some((n) =>
    String(n).includes('Made-in omitted:')
  );
  if (madeInOmitted && tier === 'none') {
    // Brand/design country is not factory evidence for "Unrelated".
    tier = 'unknown';
    if (!tierReasons.includes('insufficient')) {
      tierReasons = [...tierReasons, 'insufficient'];
    }
  }

  const confCandidates = [
    partials.product?.confidence,
    partials.company?.confidence,
    partials.verify?.confidence,
    partials.identify?.confidence,
  ].filter((n): n is number => typeof n === 'number' && Number.isFinite(n));

  let confidence =
    confCandidates.length > 0 ? Math.min(...confCandidates) : 0.35;
  confidence = Math.max(0, Math.min(1, confidence));

  const caveats: string[] = [];
  if (partials.verify?.caveats) {
    caveats.push(...partials.verify.caveats.map(String).slice(0, 5));
  }
  if (partials.verify?.conflicts?.length) {
    for (const c of partials.verify.conflicts.slice(0, 3)) {
      caveats.push(String(c));
    }
  }
  // Surface multi-layer origin notes (users often only read caveats)
  if (partials.product?.notes?.length) {
    for (const n of partials.product.notes.slice(0, 3)) {
      const s = String(n).trim();
      if (s) caveats.push(s);
    }
  }
  if (partials.company?.notes?.length) {
    for (const n of partials.company.notes.slice(0, 2)) {
      const s = String(n).trim();
      if (s) caveats.push(s);
    }
  }

  // Post-pass: conflict + direct → cap confidence
  if (tier === 'direct' && f.F_CONFLICT) {
    confidence = Math.min(confidence, 0.45);
    caveats.push('Verification reported conflicting signals');
  }

  const companyMissing =
    input.companySkipped ||
    partials.companyFailed ||
    (!partials.company && !input.companySkipped);

  if (tier === 'none' && companyMissing) {
    confidence = Math.min(confidence, 0.55);
    if (!tierReasons.includes('ownership_not_assessed')) {
      tierReasons = [...tierReasons, 'ownership_not_assessed'];
    }
    caveats.push('Company/ownership data not assessed');
  }

  // TW country note
  if (tierReasons.includes('taiwan_as_country')) {
    caveats.push('Taiwan is treated as a separate country for relation tiers');
  }

  if (!input.webEnriched) {
    caveats.push(webFailCaveat(input.webFailCode));
  }

  const p = partials.product;
  const c = partials.company;
  const id = partials.identify;

  const title =
    p?.name ||
    id?.name ||
    p?.brand ||
    id?.brand ||
    c?.name ||
    input.queryText?.trim().slice(0, 80) ||
    'Result';

  const originCandidates = collectOriginCandidates(p, {
    webEnriched: input.webEnriched,
    productConfidence: p?.confidence,
  });

  if (p && !p.madeIn) {
    caveats.push(
      'Final COO unconfirmed — candidates below are queried signals, not a stamped made-in label.'
    );
  }

  const summaryParts: string[] = [];
  if (p?.madeIn) {
    summaryParts.push(`Made in: ${p.madeIn}`);
  } else if (p) {
    summaryParts.push('Final COO unconfirmed');
  }
  if (originCandidates.length) {
    const candBits = originCandidates
      .filter((c) => c.rating !== 'confirmed')
      .slice(0, 5)
      .map(
        (c) =>
          `${c.label} (${c.rating} ${Math.round(c.confidence * 100)}% · ${c.source})`
      );
    if (candBits.length) {
      summaryParts.push(`Candidates: ${candBits.join('; ')}`);
    }
  }
  if (p?.originCountry) summaryParts.push(`Brand origin: ${p.originCountry}`);
  if (p?.componentsOrigin) {
    summaryParts.push(`Components/global line: ${String(p.componentsOrigin).slice(0, 80)}`);
  }
  const resultParts = sanitizeParts(p?.parts, {
    webEnriched: input.webEnriched,
    webBrief: input.webBrief,
    ocrText: input.ocrText,
    brandOriginCountry: p?.originCountry,
    hqCountry: c?.hqCountry,
  });
  if (resultParts.length) {
    summaryParts.push(
      `Parts: ${resultParts
        .slice(0, 4)
        .map((x) => x.name)
        .join(', ')}`
    );
  }
  if (c?.hqCountry) summaryParts.push(`HQ: ${c.hqCountry}`);
  if (c?.name) summaryParts.push(`Company: ${c.name}`);
  if (!summaryParts.length) {
    summaryParts.push(
      tier === 'unknown'
        ? 'Insufficient evidence to assess China-related links.'
        : tier === 'none'
          ? 'No China-related links found from available signals.'
          : tier === 'direct'
            ? 'Direct China-related signals found.'
            : 'Indirect China-related signals found.'
    );
  }

  const alts = partials.alternatives;
  const querySeeds = [
    p?.brand,
    p?.name,
    id?.brand,
    id?.name,
    input.queryText,
  ].filter((s): s is string => Boolean(s && String(s).trim()));
  const brandsSan = finalizeAlternativesList(
    (alts?.brands ?? [])
      .map((b) =>
        sanitizeAlternative(
          b as Parameters<typeof sanitizeAlternative>[0],
          geoScope,
          querySeeds
        )
      )
      .filter((x): x is SanitizedAlt => Boolean(x)),
    geoScope
  );
  const productsSan = finalizeAlternativesList(
    (alts?.products ?? [])
      .map((b) =>
        sanitizeAlternative(
          b as Parameters<typeof sanitizeAlternative>[0],
          geoScope,
          querySeeds
        )
      )
      .filter((x): x is SanitizedAlt => Boolean(x)),
    geoScope
  );
  const alternatives =
    brandsSan.length || productsSan.length
      ? { brands: brandsSan, products: productsSan }
      : undefined;
  if (alternatives) {
    caveats.push(
      'Alternative brands/products aim for lower China involvement (not merely similar). Tiers are estimates; HQ alone does not prove non-China manufacture.'
    );
  } else if (alts && ((alts.brands?.length ?? 0) > 0 || (alts.products?.length ?? 0) > 0)) {
    // Model returned only high-CN peers — nothing useful after filter
    caveats.push(
      'No lower China-involvement brand/product alternatives found with enough confidence.'
    );
  }

  const degraded = Boolean(
    partials.productFailed ||
      partials.companyFailed ||
      (partials.product == null && !input.productSkipped) ||
      (partials.company == null && !input.companySkipped && !input.productSkipped)
  );

  const groundingSources = (
    input.webEnriched
      ? (input.sources?.length
          ? input.sources
          : parseSourcesFromBrief(input.webBrief))
      : []
  )
    .map((s) => String(s).trim().slice(0, 240))
    .filter(Boolean)
    .slice(0, 8);

  return {
    schemaVersion: 1,
    relationTier: tier,
    title: String(title).slice(0, 120),
    summary: summaryParts.join(' · ').slice(0, 800),
    confidence,
    tierReasons,
    caveats: caveats.slice(0, 8).map((c) => c.slice(0, 200)),
    regions: f.regions,
    geoScope,
    disclaimerKey: DEFAULT_DISCLAIMER_KEY,
    knowledgeBasis: input.webEnriched ? 'web_enriched' : 'model_memory',
    knowledgeCutoffNote: input.webEnriched ? WEB_KNOWLEDGE_NOTE : KNOWLEDGE_NOTE,
    sources: groundingSources.length ? groundingSources : undefined,
    product: p
      ? {
          name: p.name,
          brand: p.brand,
          originCountry: p.originCountry,
          madeIn: p.madeIn,
          manufacturedIn: p.manufacturedIn,
          manufacturer: p.manufacturer,
          manufacturerCountry: p.manufacturerCountry,
          category: p.category,
          componentsOrigin: p.componentsOrigin
            ? String(p.componentsOrigin).slice(0, 160)
            : undefined,
          parts: resultParts.length ? resultParts : undefined,
          notes: Array.isArray(p.notes)
            ? p.notes.map((n) => String(n).slice(0, 220)).filter(Boolean).slice(0, 5)
            : undefined,
          originCandidates: originCandidates.length
            ? originCandidates.map((c) => ({
                label: c.label.slice(0, 80),
                confidence: Math.round(c.confidence * 100) / 100,
                source: c.source,
                rating: c.rating,
              }))
            : undefined,
        }
      : id
        ? { name: id.name, brand: id.brand, category: id.category }
        : undefined,
    company: c
      ? {
          name: c.name,
          legalName: c.legalName,
          hqCountry: c.hqCountry,
          parents: c.parents?.slice(0, 8).map((x) => ({
            name: x.name,
            country: x.country,
            control:
              x.control === 'majority' ||
              x.control === 'wholly' ||
              x.control === 'minority'
                ? x.control
                : 'unknown',
          })),
          chinaRelations: c.chinaRelations?.slice(0, 12).map((r) => ({
            type: r.type || 'other',
            note: r.note,
            country: r.country,
            strength:
              r.strength === 'strong' ||
              r.strength === 'moderate' ||
              r.strength === 'weak'
                ? r.strength
                : undefined,
          })),
        }
      : undefined,
    verification: partials.verify
      ? {
          consistent: partials.verify.consistent,
          conflicts: partials.verify.conflicts?.slice(0, 5),
          confidence: partials.verify.confidence,
          caveats: partials.verify.caveats?.slice(0, 5),
        }
      : undefined,
    alternatives,
    graph: buildGraph(partials, geoScope, String(title)),
    meta: {
      jobId,
      degraded: degraded || undefined,
    },
  };
}

/** Exported for unit tests */
export const __test = {
  extractFactors,
  decideTier,
  normalizeRegion,
};
