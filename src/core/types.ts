/** OriginWise client types — keep in sync with server schema (PR 4). */

import type { Locale } from './i18n/locales';

export type { Locale };

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

export type PartKind = 'part' | 'spare' | 'ingredient' | 'component';

export type ProductPart = {
  name: string;
  kind?: PartKind;
  originCountry?: string;
  madeIn?: string;
  chinaRelated?: boolean;
  note?: string;
};

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
  /** Where part countries came from: package label OCR, grounded web, or model only. */
  partsEvidence?: 'label' | 'web' | 'model';
  knowledgeCutoffNote?: string;
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
    componentsOrigin?: string;
    parts?: ProductPart[];
    notes?: string[];
    originCandidates?: Array<{
      label: string;
      confidence: number;
      source:
        | 'web_name'
        | 'confirmed_coo'
        | 'parts'
        | 'components_line'
        | 'notes'
        | 'manufacturer'
        | 'filings'
        | 'model_memory'
        | 'ownership';
      rating: 'confirmed' | 'likely' | 'possible' | 'mentioned';
    }>;
    /**
     * How the made-in was confirmed: a web page showing the barcode/JAN with a
     * made-in ('barcode'), or the package label photo ('label').
     */
    madeInBasis?: 'barcode' | 'label' | 'model';
    /** 依型號比對: 'web' = 2+ exact-model domains; 'ai_web' = AI answer + 1+ page. */
    madeInSupport?: 'web' | 'ai_web';
    /** Design / brand country wording (附加資訊); never a made-in candidate. */
    designInfo?: Array<{ country: string; kind: 'design' | 'brand'; url?: string; quote?: string }>;
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
      /** Search API requests (web row). */
      requests?: number;
    }>;
    /** Web search provider used ('gemini' | 'brave' | 'firecrawl'), or last tried. */
    searchProvider?: string;
    /** Search API requests made for this check (all providers tried). */
    searchRequests?: number;
    /** Strongest match basis among kept Brave/Firecrawl made-in claims. */
    searchMatch?: 'barcode' | 'model' | 'name';
    /** Gated Brave/Firecrawl made-in claims with their match basis. */
    searchCoo?: Array<{
      country: string;
      basis: 'barcode' | 'name' | 'model';
      status: 'confirmed' | 'likely';
      /** On an exact-model page; no exact-model page disagrees. */
      exactModel?: boolean;
      /** An AI-cited page that passed the check ('search' match or 'fetched'). */
      cited?: 'search' | 'fetched';
      /** Exact-model made-in line the page gate dropped; only marks a conflict, never counts. */
      evidenceOnly?: boolean;
      url?: string;
    }>;
    /** Pages about another model of that name: shown as 「型號不符（…），未計算」. */
    searchExcluded?: Array<{ url: string; model: string; title?: string; country?: string }>;
    /** AI-cited made-in pages that failed the check: shown as 「AI 引用，未能驗證」, never counted. */
    citedUnverified?: Array<{ url: string; title?: string; quote?: string }>;
    citedFetches?: number;
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
