/** OriginWise client types — keep in sync with server schema (PR 4). */

export type Locale = 'en' | 'zh-Hant';

export type ThemeMode = 'light' | 'dark' | 'system';

/** Server-side pool providers (keys stay on Cloudflare). */
export type AiProviderId = 'gemini' | 'openai' | 'grok' | 'claude';

export const AI_PROVIDERS: readonly AiProviderId[] = [
  'gemini',
  'openai',
  'grok',
  'claude',
] as const;

/**
 * Regions that count as China-related for tier factors.
 * **Taiwan (`TW`) is never in either set** — always treated as a separate country.
 * - `prc`: Mainland China only
 * - `greater_china`: CN + Hong Kong + Macau (not TW)
 */
export type GeoScope = 'prc' | 'greater_china';

export type CheckDimension =
  | 'origin'
  | 'manufacturer'
  | 'company_relations'
  | 'alt_brands'
  | 'alt_products';

/** Default: origin + manufacturer + company — alternatives are opt-in. */
export const DEFAULT_DIMENSIONS: readonly CheckDimension[] = [
  'origin',
  'manufacturer',
  'company_relations',
] as const;

export const ALL_DIMENSIONS: readonly CheckDimension[] = [
  'origin',
  'manufacturer',
  'company_relations',
  'alt_brands',
  'alt_products',
] as const;

export type RelationTier = 'none' | 'indirect' | 'direct' | 'unknown';

export type RegionCode = 'CN' | 'HK' | 'TW' | 'MO' | 'OTHER' | 'UNKNOWN';

export type ChinaRelationType =
  | 'ownership'
  | 'subsidiary'
  | 'hq'
  | 'manufacturing'
  | 'supply'
  | 'retail'
  | 'other';

export type AppSettings = {
  locale: Locale;
  theme: ThemeMode;
  /** PRC-only (default) or Greater China for tier factors. */
  geoScope: GeoScope;
  /** Dimensions enabled for checks (alts off by default). */
  defaultDimensions: CheckDimension[];
};

/** CheckResult v1 — keep in sync with functions/_lib/schema.ts */
export type CheckResult = {
  schemaVersion: 1;
  relationTier: RelationTier;
  title: string;
  summary: string;
  confidence?: number;
  tierReasons?: string[];
  caveats?: string[];
  regions?: RegionCode[];
  geoScope?: GeoScope;
  disclaimerKey?: string;
  knowledgeBasis?: 'model_memory' | 'web_enriched';
  knowledgeCutoffNote?: string;
  product?: {
    name?: string;
    brand?: string;
    originCountry?: string;
    madeIn?: string;
    manufacturedIn?: string;
    manufacturer?: string;
    manufacturerCountry?: string;
    category?: string;
    componentsOrigin?: string;
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
    brands?: Array<{
      name: string;
      relationTier?: RelationTier;
      note?: string;
      madeIn?: string;
      originCountry?: string;
      hqCountry?: string;
    }>;
    products?: Array<{
      name: string;
      relationTier?: RelationTier;
      note?: string;
      madeIn?: string;
      originCountry?: string;
      hqCountry?: string;
    }>;
  };
  graph?: {
    nodes: Array<{
      id: string;
      label: string;
      kind?: string;
      chinaRelated?: boolean;
      region?: RegionCode;
    }>;
    edges: Array<{
      from: string;
      to: string;
      label?: string;
      type?: string;
      strength?: 'strong' | 'moderate' | 'weak';
      chinaRelated?: boolean;
    }>;
  };
  meta?: {
    jobId?: string;
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

export type CheckHistoryItem = {
  id: string;
  query: string;
  hadImage: boolean;
  result: CheckResult;
  at: string;
  geoScope?: GeoScope;
};

export type DataCategory = 'all' | 'settings' | 'checkHistory' | 'disclaimer';
