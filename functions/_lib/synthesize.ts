/**
 * Pure-TS merge of agent partials → CheckResult.
 * Owns final relationTier via decision table. LLMs must not set overall tier.
 */

import { cleanSources } from './sourceLine';
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
  type WebCooClaim,
} from './schema';
import {
  inScope,
  isOutOfScopeGeo,
  normalizeRegion,
  type GeoScope,
  type RegionCode,
} from './regions';
import { applyCooPriority, extractCooClaimsFromText } from './cooPriority';
import { hqFoldedIntoParent } from './chinaChip';
import { tierFromCodes } from './tierRules';
import { COUNTRY_CODE_TO_LABEL, COUNTRY_NAME_PATTERNS } from './countryLabel';
import { SERVER_TEXT, webFailText } from './serverText';
import { notesNameMadeIn, omittedPartNote } from './noteText';

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
  /**
   * Brave/Firecrawl only (undefined for Gemini grounding): gated made-in claims.
   * When set, a finished-unit made-in survives only if it matches a
   * barcode-confirmed claim (or the label OCR); name-only claims become
   * 'likely' candidates and never the final COO.
   */
  webCoo?: WebCooClaim[];
};

type Factors = {
  F_MADE_IN_CN: boolean;
  F_ORIGIN_CN: boolean;
  F_MFG_CN: boolean;
  F_HQ_CN: boolean;
  F_PARENT_CN_MAJORITY: boolean;
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

  // Ownership counts only for a NAMED parent with a stated stake:
  // majority / wholly in China → parent_majority_cn (one reason per fact; no
  // separate ownership_strong_cn), minority in China → ownership_weak_cn.
  // Unnamed chinaRelations ("strong ownership link", supply, retail,
  // manufacturing) never feed the tier or the confidence; they stay as notes.
  let F_PARENT_CN_MAJORITY = false;
  let F_OWNERSHIP_WEAK_CN = false;
  for (const parent of c.parents ?? []) {
    const pr = normalizeRegion(parent.country);
    if (regions.indexOf(pr) === -1 && pr !== 'UNKNOWN') regions.push(pr);
    if (!String(parent.name ?? '').trim() || !inScope(pr, geoScope)) continue;
    const control = String(parent.control ?? '').toLowerCase();
    if (control === 'majority' || control === 'wholly') F_PARENT_CN_MAJORITY = true;
    else if (control === 'minority') F_OWNERSHIP_WEAK_CN = true;
  }
  for (const rel of c.chinaRelations ?? []) {
    const rr = normalizeRegion(rel.country);
    if (rr !== 'UNKNOWN' && !regions.includes(rr)) regions.push(rr);
  }

  const F_MADE_IN_CN = inScope(madeIn, geoScope);
  const F_ORIGIN_CN = inScope(origin, geoScope);
  const F_MFG_CN = inScope(mfg, geoScope);
  // A China HQ folded in from a Chinese parent (brand origin elsewhere) is the
  // parent's HQ: count it as a China-controlling parent, not a China HQ.
  const hqFolded = hqFoldedIntoParent(
    {
      brandOrigin: p.originCountry,
      hqCountry: c.hqCountry,
      companyName: c.name,
      parents: c.parents,
    },
    geoScope
  );
  if (hqFolded) F_PARENT_CN_MAJORITY = true;
  const F_HQ_CN = inScope(hq, geoScope) && !hqFolded;
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
    F_OWNERSHIP_WEAK_CN ||
    F_COMPONENT_CN;

  const F_STRONG_CN =
    F_MADE_IN_CN ||
    F_MFG_CN ||
    F_HQ_CN ||
    F_PARENT_CN_MAJORITY;

  const F_INSUFFICIENT = !F_CN_POSITIVE && !F_EXPLICIT_NON_CN_GEO;

  const reasons: string[] = [];
  if (F_MADE_IN_CN) reasons.push('made_in_cn');
  if (F_ORIGIN_CN) reasons.push('origin_cn');
  if (F_MFG_CN) reasons.push('manufacturer_cn');
  if (F_HQ_CN) reasons.push('hq_cn');
  if (F_PARENT_CN_MAJORITY) reasons.push('parent_majority_cn');
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
  // Same rules as the client China card (functions/_lib/tierRules.ts).
  const tier = tierFromCodes(f.reasons);
  if (tier !== 'unknown') return { tier, tierReasons: [...f.reasons] };
  return {
    tier,
    tierReasons: [...f.reasons, f.F_CONFLICT && !f.F_STRONG_CN ? 'conflict_no_strong' : 'insufficient'],
  };
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

/** Schema field names the model sometimes echoes into prose, e.g. "(madeIn)". */
const SCHEMA_KEY_RE =
  /\s*[(（]\s*(?:madeIn|manufacturedIn|originCountry|componentsOrigin|manufacturerCountry|hqCountry|chinaRelated)\s*[)）]/g;

/** Strip echoed schema keys from model prose (notes, part notes). */
export function stripSchemaKeys(text: string): string {
  return String(text).replace(SCHEMA_KEY_RE, '').replace(/\s{2,}/g, ' ').trim();
}


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
  opts: {
    webEnriched?: boolean;
    productConfidence?: number;
    webLikely?: string[];
    /** Model-only made-in (not confirmed by barcode page or label). */
    modelMadeIn?: string;
    hqCountry?: string;
  }
): OriginCandidate[] {
  if (!p && !opts.webLikely?.length) return [];
  const out = new Map<string, OriginCandidate>();
  // Name-only web match (Brave/Firecrawl): 'likely' at most, never confirmed.
  for (const raw of opts.webLikely ?? []) {
    const lab = confirmedOriginLabel(raw);
    if (!lab) continue;
    const label = matchCountryLabel(lab) || lab;
    pushCandidate(out, label, 0.6, 'web_name', 'likely');
  }
  if (!p) return [...out.values()];
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

  if (!isVagueOriginLabel(p.componentsOrigin)) {
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

  // A note naming the HQ / manufacturer / brand-origin country is a company
  // fact ("品牌設計及總部設於日本", "TP-Link 品牌總部設於中國"), not a part or
  // made-in mention: same echo rule as the model made-in below (#28). It
  // stays only when a product-specific row already has that country, or the
  // note ties it to manufacturing in the same clause.
  const echoCountries = [opts.hqCountry, p.manufacturerCountry, p.originCountry];
  for (const n of p.notes ?? []) {
    for (const label of extractCountryLabelsFromText(String(n))) {
      if (out.get(label)?.rating === 'confirmed') continue;
      const echo = echoCountries.some((c) => sameCountry(label, c));
      if (echo && !out.has(label) && !notesNameMadeIn([n], label)) continue;
      pushCandidate(out, label, Math.min(0.55, 0.28 + webBoost), 'notes', 'mentioned');
    }
  }

  // Model-only made-in: one 'possible' row (source model_memory), merged into
  // an existing row for the same country (a web row keeps its own label). An
  // HQ / manufacturer echo with no product-specific mention (parts, components
  // line, notes) is dropped (#28 rule).
  const modelLab = confirmedOriginLabel(opts.modelMadeIn);
  if (modelLab) {
    const label = matchCountryLabel(modelLab) || modelLab;
    const echo =
      sameCountry(label, opts.hqCountry) || sameCountry(label, p.manufacturerCountry);
    if (!echo || out.has(label)) {
      pushCandidate(out, label, Math.min(0.5, base), 'model_memory', 'possible');
    }
  }

  // Manufacturer / HQ country is never a made-in candidate on its own: it is
  // where the company sits, not where this product is made (HQ echo, e.g.
  // "Japan · possible 50% · manufacturer" on Pigeon). Only parts, the
  // components line, notes or web/label claims name candidate countries.

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
        // The model's note about the dropped country goes too (no
        // 「中國製」 next to 「未列出零件產地」).
        note = omittedPartNote(note, why).slice(0, 160);
      }
    };

    if (madeIn || originCountry || chinaRelated) {
      if (!canConfirmCountries) {
        // Search fail / no OCR: never keep model-memory part countries (HQ echo).
        stripCountry(
          SERVER_TEXT.partOmittedNoEvidence
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
            SERVER_TEXT.partOmittedUnconfirmed
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
      SERVER_TEXT.madeInOmittedBrand
    );
  } else if (hadVagueMade && (p.componentsOrigin || (p.parts && p.parts.length))) {
    notes.push(
      SERVER_TEXT.cooUnconfirmedSeeParts
    );
  } else if (hadVagueMade) {
    notes.push(
      SERVER_TEXT.cooUnconfirmedNoLabel
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
      SERVER_TEXT.distributorOmitted
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
    note = SERVER_TEXT.chinaLinkUnclear;
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
  return webFailText(code);
}

/** Same country across labels / scripts (日本 ↔ Japan). */
function sameCountry(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  if (labelsMatch(a, b)) return true;
  const la = matchCountryLabel(a);
  const lb = matchCountryLabel(b);
  return Boolean(la && lb && labelsMatch(la, lb));
}

export type MadeInBasis = 'barcode' | 'label';

/** Confidence floor for a direct tier from China HQ / China-controlling parent. */
export const COMPANY_DIRECT_MIN_CONFIDENCE = 0.75;

/** True when the package-label OCR text names the same made-in country. */
export function labelConfirmsMadeIn(madeIn: string | undefined, ocrText?: string): boolean {
  if (!madeIn || !ocrText) return false;
  return extractCooClaimsFromText(ocrText).some((c) => sameCountry(c.label, madeIn));
}

/**
 * Brave/Firecrawl made-in gate (code-enforced; exported for tests).
 * Keeps product madeIn / manufacturedIn only when a barcode-confirmed web claim
 * (or the package-label OCR) names the same country. Everything else is
 * stripped; name-only claims come back as 'likely' candidate labels.
 */
export function applyWebCooGate(
  p: ProductPartial | null | undefined,
  webCoo: WebCooClaim[],
  ocrText?: string
): { product: ProductPartial | null | undefined; likely: string[]; madeInBasis?: MadeInBasis } {
  const confirmed = webCoo.filter((c) => c.status === 'confirmed' && c.basis === 'barcode');
  const likely = webCoo
    .filter((c) => c.status === 'likely')
    .map((c) => c.country)
    .filter((c) => !confirmed.some((k) => sameCountry(k.country, c)));
  if (!p) return { product: p, likely };
  const ocrClaims = extractCooClaimsFromText(ocrText || '');
  const byBarcode = (v: string) => confirmed.some((c) => sameCountry(c.country, v));
  const byOcr = (v: string) => ocrClaims.some((c) => sameCountry(c.label, v));
  let madeIn = p.madeIn;
  let manufacturedIn = p.manufacturedIn;
  let madeInBasis: MadeInBasis | undefined;
  let stripped = false;
  if (madeIn && confirmedOriginLabel(madeIn)) {
    if (byBarcode(madeIn)) madeInBasis = 'barcode';
    else if (byOcr(madeIn)) madeInBasis = 'label';
    else {
      madeIn = undefined;
      stripped = true;
    }
  }
  // Barcode-confirmed claim fills an empty made-in.
  if (!madeIn && !stripped && confirmed.length) {
    madeIn = confirmed[0]!.country;
    madeInBasis = 'barcode';
  }
  if (manufacturedIn && confirmedOriginLabel(manufacturedIn)) {
    if (!byBarcode(manufacturedIn) && !byOcr(manufacturedIn)) {
      manufacturedIn = undefined;
      stripped = true;
    }
  }
  if (!stripped && madeIn === p.madeIn && manufacturedIn === p.manufacturedIn) {
    return { product: p, likely, madeInBasis };
  }
  const notes = [...(p.notes ?? [])];
  if (stripped) {
    notes.push(
      SERVER_TEXT.cooUnconfirmedNoBarcode
    );
  }
  return {
    product: { ...p, madeIn, manufacturedIn, notes: notes.slice(0, 8) },
    likely,
    madeInBasis,
  };
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
  let webLikely: string[] = [];
  let madeInBasis: MadeInBasis | undefined;
  // What the model said before the web gate (the gate strips it silently).
  const modelSaid =
    confirmedOriginLabel(productSan?.madeIn) || confirmedOriginLabel(productSan?.manufacturedIn);
  if (input.webCoo && input.webEnriched) {
    const gated = applyWebCooGate(productSan, input.webCoo, input.ocrText);
    productSan = gated.product;
    webLikely = gated.likely;
    madeInBasis = gated.madeInBasis;
  }
  // Package label photo names the same country → label-confirmed made-in
  // (also when web research was off for this check).
  if (!madeInBasis && productSan?.madeIn && labelConfirmsMadeIn(productSan.madeIn, input.ocrText)) {
    madeInBasis = 'label';
  }
  // Model-only made-in (no barcode page, no package label): never the made-in,
  // never a tier / confidence input. It survives only as a 'model_memory'
  // candidate row (see collectOriginCandidates).
  let modelMadeIn: string | undefined;
  if (productSan && !madeInBasis && modelSaid) {
    modelMadeIn = modelSaid;
    productSan = { ...productSan, madeIn: undefined, manufacturedIn: undefined };
  }
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
    caveats.push(SERVER_TEXT.verifyConflict);
  }

  const rawGroundingSources = (
    input.webEnriched
      ? (input.sources?.length
          ? input.sources
          : parseSourcesFromBrief(input.webBrief))
      : []
  )
    .map((s) => String(s).trim())
    .filter(Boolean);
  const groundingSources = cleanSources(rawGroundingSources, 8);
  // The company floor needs a sourced company row (web research with at
  // least one Source line — the 確認 tag on the client). Model memory alone
  // gets no floor.
  const companySourced = Boolean(input.webEnriched) && groundingSources.length > 0;

  // A China HQ or China-controlling parent is company-level evidence: the
  // tier is direct whatever the made-in says, so its confidence follows the
  // company finding, not a weak / unconfirmed made-in (no 50% "weak" China HQ).
  if (tier === 'direct' && (f.F_HQ_CN || f.F_PARENT_CN_MAJORITY) && companySourced) {
    const companyConf = partials.company?.confidence;
    const base =
      typeof companyConf === 'number' && Number.isFinite(companyConf) && companyConf > 0
        ? companyConf
        : 0.8;
    confidence = Math.max(confidence, Math.min(base, 0.95), COMPANY_DIRECT_MIN_CONFIDENCE);
    // Verification conflicts usually concern the made-in; keep the floor.
    if (f.F_CONFLICT) confidence = COMPANY_DIRECT_MIN_CONFIDENCE;
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
    caveats.push(SERVER_TEXT.companyNotAssessed);
  }

  // TW country note
  if (tierReasons.includes('taiwan_as_country')) {
    caveats.push(SERVER_TEXT.taiwanSeparate);
  }

  if (!input.webEnriched) {
    caveats.push(
      hasOcrPartEvidence(input.ocrText)
        ? SERVER_TEXT.webUnavailableLabel
        : webFailCaveat(input.webFailCode)
    );
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
    webLikely,
    modelMadeIn,
    hqCountry: c?.hqCountry,
  });

  if (p && !p.madeIn) {
    caveats.push(
      SERVER_TEXT.cooUnconfirmedCandidates
    );
  }

  const summaryParts: string[] = [];
  if (p?.madeIn) {
    summaryParts.push(`Made in: ${p.madeIn}`);
  } else if (p) {
    summaryParts.push(SERVER_TEXT.sumCooUnconfirmed);
  }
  const labelPartsEvidence = hasOcrPartEvidence(input.ocrText);
  // A stamped made-in or label-read parts already answer the question; the
  // queried candidates line is noise there (e.g. "Japan (likely 55% · parts)").
  if (originCandidates.length && !p?.madeIn && !labelPartsEvidence) {
    const candBits = originCandidates
      // Model references carry no percentage anywhere (unconfirmed).
      .filter((c) => c.rating !== 'confirmed' && c.source !== 'model_memory')
      .slice(0, 5)
      .map(
        (c) =>
          `${c.label} (${c.rating} ${Math.round(c.confidence * 100)}% · ${c.source})`
      );
    if (candBits.length) {
      summaryParts.push(`Candidates: ${candBits.join('; ')}`);
    }
  }
  if (p && !isVagueOriginLabel(p.originCountry)) {
    summaryParts.push(`Brand origin: ${p.originCountry}`);
  }
  if (p && !isVagueOriginLabel(p.componentsOrigin)) {
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
  if (c && !isVagueOriginLabel(c.hqCountry)) summaryParts.push(`HQ: ${c.hqCountry}`);
  if (c?.name) summaryParts.push(`Company: ${c.name}`);
  if (!summaryParts.length) {
    summaryParts.push(
      tier === 'unknown'
        ? SERVER_TEXT.tierUnknown
        : tier === 'none'
          ? SERVER_TEXT.tierNone
          : tier === 'direct'
            ? SERVER_TEXT.tierDirect
            : SERVER_TEXT.tierIndirect
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
      SERVER_TEXT.altsAim
    );
  } else if (alts && ((alts.brands?.length ?? 0) > 0 || (alts.products?.length ?? 0) > 0)) {
    // Model returned only high-CN peers — nothing useful after filter
    caveats.push(
      SERVER_TEXT.altsNone
    );
  }

  const degraded = Boolean(
    partials.productFailed ||
      partials.companyFailed ||
      (partials.product == null && !input.productSkipped) ||
      (partials.company == null && !input.companySkipped && !input.productSkipped)
  );


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
    partsEvidence: resultParts.length
      ? labelPartsEvidence &&
        resultParts.some((x) => Boolean(x.madeIn || x.originCountry))
        ? 'label'
        : input.webEnriched && groundingSources.length
          ? 'web'
          : 'model'
      : undefined,
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
          componentsOrigin: !isVagueOriginLabel(p.componentsOrigin)
            ? String(p.componentsOrigin).slice(0, 160)
            : undefined,
          parts: resultParts.length ? resultParts : undefined,
          notes: Array.isArray(p.notes)
            ? p.notes
                .map((n) => stripSchemaKeys(String(n)).slice(0, 220))
                .filter(Boolean)
                .slice(0, 5)
            : undefined,
          originCandidates: originCandidates.length
            ? originCandidates.map((c) => ({
                label: c.label.slice(0, 80),
                confidence: Math.round(c.confidence * 100) / 100,
                source: c.source,
                rating: c.rating,
              }))
            : undefined,
          madeInBasis: madeInBasis && p.madeIn ? madeInBasis : undefined,
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
  collectOriginCandidates,
  sanitizeParts,
  extractFactors,
  decideTier,
  normalizeRegion,
};
