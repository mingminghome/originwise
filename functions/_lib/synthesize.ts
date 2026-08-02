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
  clampTier,
  type AgentPartials,
  type CheckResult,
  type GraphEdge,
  type GraphNode,
  type RelationTier,
} from './schema';
import {
  inScope,
  isOutOfScopeGeo,
  normalizeRegion,
  type GeoScope,
  type RegionCode,
} from './regions';

export type SynthesizeInput = {
  jobId: string;
  geoScope: GeoScope;
  locale?: string;
  queryText?: string;
  partials: AgentPartials;
  /** When company agent was skipped by dimensions */
  companySkipped?: boolean;
  productSkipped?: boolean;
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

  const regions = uniqRegions([madeIn, origin, mfg, hq, component]);

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
    if (STRONG_REL.has(type) || strength === 'strong') {
      if (inScope(rr, geoScope) || type === 'state_owned_cn') {
        F_OWNERSHIP_STRONG_CN = true;
      }
    } else if (WEAK_REL.has(type) || strength === 'weak' || strength === 'moderate') {
      if (inScope(rr, geoScope)) F_OWNERSHIP_WEAK_CN = true;
    }
  }

  const F_MADE_IN_CN = inScope(madeIn, geoScope);
  const F_ORIGIN_CN = inScope(origin, geoScope);
  const F_MFG_CN = inScope(mfg, geoScope);
  const F_HQ_CN = inScope(hq, geoScope);
  const F_COMPONENT_CN =
    inScope(component, geoScope) && !F_MADE_IN_CN && !F_MFG_CN;

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

  addNode({
    id: productId,
    label: p?.name || p?.brand || title || 'Product',
    kind: 'product',
    region: normalizeRegion(p?.madeIn ?? p?.originCountry),
    chinaRelated: inScope(
      normalizeRegion(p?.madeIn ?? p?.originCountry),
      geoScope
    ),
  });

  if (c?.name || c?.hqCountry) {
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
      label: 'brand/company',
      type: 'affiliation',
      chinaRelated: inScope(hq, geoScope),
    });
  }

  for (const parent of c?.parents ?? []) {
    const id = `parent:${parent.name}`.slice(0, 64);
    const pr = normalizeRegion(parent.country);
    addNode({
      id,
      label: parent.name,
      kind: 'parent',
      region: pr,
      chinaRelated: inScope(pr, geoScope),
    });
    addEdge({
      from: companyId,
      to: id,
      label: parent.control || 'parent',
      type: 'ownership',
      strength:
        parent.control === 'majority' || parent.control === 'wholly'
          ? 'strong'
          : 'weak',
      chinaRelated: inScope(pr, geoScope),
    });
  }

  return { nodes: nodes.slice(0, GRAPH_NODE_CAP), edges: edges.slice(0, GRAPH_EDGE_CAP) };
}

function clampAltTier(raw: unknown): RelationTier | undefined {
  if (raw == null) return undefined;
  return clampTier(raw);
}

/**
 * Deterministic synthesize. Safe for Workers CPU budget.
 */
export function synthesize(input: SynthesizeInput): CheckResult {
  const { jobId, geoScope, partials } = input;
  const f = extractFactors(partials, geoScope);
  let { tier, tierReasons } = decideTier(f);

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

  const summaryParts: string[] = [];
  if (p?.madeIn) summaryParts.push(`Made in: ${p.madeIn}`);
  if (p?.originCountry) summaryParts.push(`Origin: ${p.originCountry}`);
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
  const alternatives =
    alts && (alts.brands?.length || alts.products?.length)
      ? {
          brands: (alts.brands ?? []).slice(0, ALT_CAP).map((b) => ({
            name: String(b.name).slice(0, 80),
            relationTier: clampAltTier(b.relationTier),
            note: b.note ? String(b.note).slice(0, 200) : undefined,
          })),
          products: (alts.products ?? []).slice(0, ALT_CAP).map((b) => ({
            name: String(b.name).slice(0, 80),
            relationTier: clampAltTier(b.relationTier),
            note: b.note ? String(b.note).slice(0, 200) : undefined,
          })),
        }
      : undefined;

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
    knowledgeBasis: 'model_memory',
    knowledgeCutoffNote: KNOWLEDGE_NOTE,
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
