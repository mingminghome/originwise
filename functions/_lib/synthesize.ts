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

function sanitizeParts(raw: unknown): ProductPart[] {
  if (!Array.isArray(raw)) return [];
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
    out.push({
      name,
      kind,
      originCountry: rec.originCountry
        ? String(rec.originCountry).trim().slice(0, 80)
        : undefined,
      madeIn: rec.madeIn ? String(rec.madeIn).trim().slice(0, 80) : undefined,
      chinaRelated:
        typeof rec.chinaRelated === 'boolean' ? rec.chinaRelated : undefined,
      note: rec.note ? String(rec.note).trim().slice(0, 160) : undefined,
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

  const parts = sanitizeParts(p?.parts);
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

/** Named plant / COO — not the mere word "factory" / 工廠產地. */
const FACTORY_EVIDENCE =
  /\b(assembled in|assembly plant|manufacturing (?:site|base|hub|plant)|final assembl)\b|[A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)*\s+plant\b|組裝廠|组装厂|生產基地|生产基地|最終組裝|最终组装|廠區|厂区|產線|产线/i;

const DENIES_CN_MFG =
  /\b(?:not|never)\s+(?:made|produced|manufactured|assembled)\s+in\s+china\b|non[\s-]?china\s+(?:made|production|manufactur)|outside\s+(?:of\s+)?china|非中國(?:生產|製造|產製|产制)|非中国(?:生产|制造|产制)|不是中國(?:製|造|生產)|不是中国(?:制|造|生产)/i;

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
  p?: ProductPartial | null
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
  if (!madeCopied && !mfgCopied) return p;
  const notes = [...(p.notes ?? [])];
  notes.push(
    'Made-in omitted: it matched brand/design country without factory/COO evidence.'
  );
  return {
    ...p,
    madeIn: madeCopied ? undefined : p.madeIn,
    manufacturedIn: mfgCopied ? undefined : p.manufacturedIn,
    notes,
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
  geoScope: GeoScope
): SanitizedAlt | null {
  const name = String(raw.name ?? '').trim().slice(0, 80);
  if (!name) return null;

  const madeIn = raw.madeIn
    ? String(raw.madeIn).trim().slice(0, 80)
    : undefined;
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
  if (DENIES_CN_MFG.test(noteRaw) && !FACTORY_EVIDENCE.test(noteRaw)) {
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

/**
 * Deterministic synthesize. Safe for Workers CPU budget.
 */
export function synthesize(input: SynthesizeInput): CheckResult {
  const { jobId, geoScope } = input;
  const partials: AgentPartials = {
    ...input.partials,
    product: sanitizeProduct(input.partials.product) ?? input.partials.product,
    company: sanitizeCompany(input.partials.company) ?? input.partials.company,
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
  if (p?.originCountry) summaryParts.push(`Brand origin: ${p.originCountry}`);
  if (p?.componentsOrigin) {
    summaryParts.push(`Components/global line: ${String(p.componentsOrigin).slice(0, 80)}`);
  }
  const resultParts = sanitizeParts(p?.parts);
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
  const brandsSan = finalizeAlternativesList(
    (alts?.brands ?? [])
      .map((b) =>
        sanitizeAlternative(
          b as Parameters<typeof sanitizeAlternative>[0],
          geoScope
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
          geoScope
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
