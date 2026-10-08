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

export type PartKind = 'part' | 'spare' | 'ingredient' | 'component';

export type ProductPart = {
  name: string;
  kind?: PartKind;
  originCountry?: string;
  madeIn?: string;
  chinaRelated?: boolean;
  note?: string;
};


/** Made-in claim from a Brave/Firecrawl page, after the barcode/name gate. */
export type WebCooClaim = {
  country: string;
  /** 'barcode' = JAN/EAN on the page; 'name' = product name only. */
  basis: 'barcode' | 'name';
  /** barcode → confirmed; name-only single-variant page → likely (never confirmed). */
  status: 'confirmed' | 'likely';
  url?: string;
};

export type OriginCandidateSource =
  | 'web_name'
  | 'confirmed_coo'
  | 'parts'
  | 'components_line'
  | 'notes'
  | 'manufacturer'
  | 'filings'
  | 'model_memory';

export type OriginCandidateRating =
  | 'confirmed'
  | 'likely'
  | 'possible'
  | 'mentioned';

/** Queried origin places with confidence — not a confirmed final COO unless rating=confirmed. */
export type OriginCandidate = {
  label: string;
  confidence: number;
  source: OriginCandidateSource;
  rating: OriginCandidateRating;
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
  knowledgeBasis: 'model_memory' | 'web_enriched';
  /** Where part countries came from: package label OCR, grounded web, or model only. */
  partsEvidence?: 'label' | 'web' | 'model';
  knowledgeCutoffNote: string;
  /** Grounding Sources from live Search (when web_enriched). */
  sources?: string[];
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
    /** Structured BOM / spares / ingredients when known */
    parts?: ProductPart[];
    /** Multi-layer origin explanations (brand vs factory vs final COO) */
    notes?: string[];
    /** All queried origin candidates (confirmed COO is rating=confirmed only) */
    originCandidates?: OriginCandidate[];
    /**
     * How the made-in was confirmed: a web page showing the barcode/JAN with a
     * made-in ('barcode'), or the package label photo ('label').
     */
    madeInBasis?: 'barcode' | 'label';
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
      /** Search API requests (web row). */
      requests?: number;
    }>;
    /** Web search provider used ('gemini' | 'brave' | 'firecrawl'), or last tried. */
    searchProvider?: string;
    /** Search API requests made for this check (all providers tried). */
    searchRequests?: number;
    /** Strongest match basis among kept Brave/Firecrawl made-in claims. */
    searchMatch?: 'barcode' | 'name';
    /** Gated Brave/Firecrawl made-in claims with their match basis. */
    searchCoo?: WebCooClaim[];
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
  parts?: ProductPart[];
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

export const GRAPH_NODE_CAP = 24;
export const GRAPH_EDGE_CAP = 36;
export const ALT_CAP = 6;
export const PART_CAP = 8;

export const DEFAULT_DISCLAIMER_KEY = 'check.disclaimer';
export const KNOWLEDGE_NOTE =
  'Based on general model knowledge only (no live web lookup). Brand origin, component plants, and final assembly/COO can differ by SKU/market — prefer packaging labels. Not a corporate registry or customs database. Informational — not legal, trade, or sanctions advice.';
const WEB_SEARCH_NAME: Record<string, string> = {
  gemini: 'Google Search via Gemini grounding',
  brave: 'Brave Search',
  firecrawl: 'Firecrawl',
};
/** Web-enriched note naming the search service that actually ran. */
export function webKnowledgeNote(provider = 'gemini'): string {
  const name = WEB_SEARCH_NAME[provider] ?? WEB_SEARCH_NAME.gemini;
  return `Includes a live web research pass (${name}) plus model knowledge. Still not a corporate registry or customs database — labels and official filings can disagree with web pages. Informational — not legal, trade, or sanctions advice.`;
}
export const WEB_KNOWLEDGE_NOTE = webKnowledgeNote('gemini');

export function clampTier(raw: unknown): RelationTier {
  const s = String(raw ?? '')
    .toLowerCase()
    .trim();
  if (s === 'none' || s === 'unrelated') return 'none';
  if (s === 'indirect') return 'indirect';
  if (s === 'direct') return 'direct';
  return 'unknown';
}
