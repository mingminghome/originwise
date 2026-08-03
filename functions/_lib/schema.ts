/**
 * CheckResult schema v1 + partial agent shapes (server).
 * Keep field names aligned with src/core/types.ts.
 */

import type { GeoScope, RegionCode } from './regions';

export type RelationTier = 'none' | 'indirect' | 'direct' | 'unknown';

export type ChinaRelationType =
  | 'ownership'
  | 'subsidiary'
  | 'hq'
  | 'manufacturing'
  | 'supply'
  | 'retail'
  | 'parent_of'
  | 'owned_by'
  | 'controlling_shareholder'
  | 'state_owned_cn'
  | 'minority_stake'
  | 'supplier'
  | 'assembled_in'
  | 'retail_presence'
  | 'licensed_in'
  | 'joint_venture_minority'
  | 'other';

export type CheckDimension =
  | 'origin'
  | 'manufacturer'
  | 'company_relations'
  | 'alt_brands'
  | 'alt_products';

export type GraphNode = {
  id: string;
  label: string;
  kind?: string;
  chinaRelated?: boolean;
  region?: RegionCode;
};

export type GraphEdge = {
  from: string;
  to: string;
  label?: string;
  type?: string;
  strength?: 'strong' | 'moderate' | 'weak';
  chinaRelated?: boolean;
};

export type AlternativeItem = {
  name: string;
  /** Advisory — sanitized server-side; prefer unknown over false "none" */
  relationTier?: RelationTier;
  note?: string;
  /** Manufacturing country if known (helps reject false "unrelated") */
  madeIn?: string;
  originCountry?: string;
  hqCountry?: string;
};

export type CheckResult = {
  schemaVersion: 1;
  relationTier: RelationTier;
  title: string;
  summary: string;
  confidence: number;
  tierReasons: string[];
  caveats: string[];
  regions: RegionCode[];
  geoScope: GeoScope;
  disclaimerKey: string;
  knowledgeBasis: 'model_memory';
  knowledgeCutoffNote: string;
  product?: {
    name?: string;
    brand?: string;
    originCountry?: string;
    madeIn?: string;
    manufacturedIn?: string;
    manufacturer?: string;
    manufacturerCountry?: string;
    category?: string;
    /** Major parts / global line when different from final madeIn */
    componentsOrigin?: string;
    /** Multi-layer origin explanations (brand vs factory vs final COO) */
    notes?: string[];
  };
  company?: {
    name?: string;
    legalName?: string;
    hqCountry?: string;
    parents?: Array<{
      name: string;
      country?: string;
      control?: 'majority' | 'wholly' | 'minority' | 'unknown';
    }>;
    chinaRelations?: Array<{
      type: ChinaRelationType | string;
      note?: string;
      country?: string;
      strength?: 'strong' | 'moderate' | 'weak';
    }>;
  };
  verification?: {
    consistent?: boolean;
    conflicts?: string[];
    confidence?: number;
    caveats?: string[];
  };
  alternatives?: {
    brands?: AlternativeItem[];
    products?: AlternativeItem[];
  };
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  meta: {
    jobId: string;
    cached?: boolean;
    cachedAt?: string;
    degraded?: boolean;
    agents?: Array<{
      id: string;
      provider?: string;
      ok?: boolean;
      error?: string;
      ms?: number;
    }>;
  };
};

/** Loose partials from LLM agents before synthesize. */
export type ProductPartial = {
  name?: string;
  brand?: string;
  originCountry?: string;
  madeIn?: string;
  manufacturedIn?: string;
  manufacturer?: string;
  manufacturerCountry?: string;
  category?: string;
  componentsOrigin?: string;
  confidence?: number;
  notes?: string[];
};

export type CompanyPartial = {
  name?: string;
  legalName?: string;
  hqCountry?: string;
  parents?: Array<{
    name: string;
    country?: string;
    control?: string;
  }>;
  chinaRelations?: Array<{
    type?: string;
    note?: string;
    country?: string;
    strength?: string;
  }>;
  confidence?: number;
  notes?: string[];
};

export type VerifyPartial = {
  consistent?: boolean;
  conflicts?: string[];
  confidence?: number;
  caveats?: string[];
};

export type AlternativesPartial = {
  brands?: AlternativeItem[];
  products?: AlternativeItem[];
};

export type IdentifyPartial = {
  name?: string;
  brand?: string;
  category?: string;
  ocrText?: string;
  confidence?: number;
};

export type AgentPartials = {
  identify?: IdentifyPartial | null;
  product?: ProductPartial | null;
  company?: CompanyPartial | null;
  verify?: VerifyPartial | null;
  alternatives?: AlternativesPartial | null;
  productFailed?: boolean;
  companyFailed?: boolean;
};

export const GRAPH_NODE_CAP = 20;
export const GRAPH_EDGE_CAP = 30;
export const ALT_CAP = 6;

export const DEFAULT_DISCLAIMER_KEY = 'check.disclaimer';
export const KNOWLEDGE_NOTE =
  'Based on general model knowledge only (no live web lookup). Brand origin, component plants, and final assembly/COO can differ by SKU/market — prefer packaging labels. Not a corporate registry or customs database. Informational — not legal, trade, or sanctions advice.';

export function clampTier(raw: unknown): RelationTier {
  const s = String(raw ?? '')
    .toLowerCase()
    .trim();
  if (s === 'none' || s === 'unrelated') return 'none';
  if (s === 'indirect') return 'indirect';
  if (s === 'direct') return 'direct';
  return 'unknown';
}
