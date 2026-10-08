/**
 * View models for the China-first result layout (pure, unit-tested).
 *
 * Card order: 與中國的關係 (the only China verdict) → 製造地 (country, basis,
 * sources; never a China verdict) → 產地分層 → collapsible details.
 */
import {
  cleanSources,
  sourceLabel,
  splitSourceLine,
} from '../../functions/_lib/sourceLine';
import type { CheckResult } from '../core/types';
import { normalizeRegion } from '../../functions/_lib/regions';
import { brandHqFolded, companyFactsSourced, confirmedMadeIn, pickOwner } from './ChinaLink';

const VAGUE_RE =
  /^(unknown|n\/?a|na|none|null|unclear|not\s+(known|stated|confirmed)|unconfirmed|未知|不明|不詳|不清楚|未確認|未确认|-|—)?$/i;

export function cleanValue(raw?: string | null): string {
  const s = String(raw ?? '').trim();
  return VAGUE_RE.test(s) ? '' : s;
}

type Candidate = NonNullable<NonNullable<CheckResult['product']>['originCandidates']>[number];

export type MadeInBasis = 'barcode' | 'label' | 'name';

export type MadeInView = {
  /** A confirmed / B unconfirmed / C likely (name match only). */
  state: 'confirmed' | 'unconfirmed' | 'likely';
  /** Headline country (confirmed or likely). */
  country?: string;
  basis?: MadeInBasis;
  /** 0–1, for the confidence chip. */
  confidence?: number;
  sourceCount: number;
  /** First source backing the headline ("aeonretail.com"), when known. */
  source?: { label: string; url?: string; country?: string };
  /** B only: queried candidates, not confirmed. */
  candidates: Array<{ label: string; rating: Candidate['rating']; source: Candidate['source'] }>;
  /** Web research ran but no page showed the barcode with a made-in. */
  noBarcodePage: boolean;
};

/** Candidate sources that never stand for a made-in (HQ / owner echoes). */
const NOT_MADE_IN = new Set(['ownership', 'manufacturer', 'confirmed_coo']);

function sameLabel(a?: string, b?: string): boolean {
  return Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
}

type CandRow = MadeInView['candidates'][number];

/** Same country, by label or normalized region (中國 = China = PRC). */
export function sameCountryLabel(a: string, b: string): boolean {
  if (sameLabel(a, b)) return true;
  const ra = normalizeRegion(a);
  return ra !== 'UNKNOWN' && ra === normalizeRegion(b);
}

/** Candidate sources that name a part / component country. */
const PART_SOURCES = new Set(['parts', 'components_line', 'notes']);

/**
 * Part countries came from the model only: no package label photo and no
 * grounded web page. Older results without partsEvidence fall back to the
 * knowledge basis.
 */
export function partsFromModel(result: Pick<CheckResult, 'partsEvidence' | 'knowledgeBasis'>): boolean {
  if (result.partsEvidence) return result.partsEvidence === 'model';
  return result.knowledgeBasis === 'model_memory';
}

/**
 * 產地分層 / 零件 candidate that only the model named (shows 模型參考 + ⓘ,
 * never a grade or %). A model made-in guess (model_memory) is always
 * model-only; part / components / notes candidates are when the parts
 * evidence is model-only. Web-name rows never are.
 */
export function modelOnlyPartCandidate(
  result: Pick<CheckResult, 'partsEvidence' | 'knowledgeBasis'>,
  c: Pick<Candidate, 'source'>
): boolean {
  if (c.source === 'model_memory' || c.source === 'confirmed_coo') return true;
  return PART_SOURCES.has(String(c.source)) && partsFromModel(result);
}

/**
 * Same rule as the 製造地 card: when the model and a web/label row agree on
 * the country, the web row absorbs the model row (it keeps its grade/%).
 */
export function absorbModelRows<T>(
  rows: T[],
  isModel: (row: T) => boolean,
  country: (row: T) => string | undefined
): T[] {
  const backed = rows.filter((r) => !isModel(r)).map(country).filter(Boolean) as string[];
  return rows.filter((r) => {
    if (!isModel(r)) return true;
    const c = country(r);
    return !c || !backed.some((b) => sameCountryLabel(b, c));
  });
}

const RATING_RANK: Record<string, number> = { confirmed: 4, likely: 3, possible: 2, mentioned: 1 };

/**
 * 查到的產地候選（未確認）. One row per country. A model-only made-in (no
 * barcode page, no label) is a 'possible' 模型參考 row only:
 * - an HQ / manufacturer-country echo with no product-specific mention is
 *   dropped (#28),
 * - a web row for the same country absorbs it (no duplicate 中國 rows).
 * Older cached answers may carry it as madeIn or a 'confirmed_coo' candidate.
 */
function candidateRows(result: CheckResult, candidates: Candidate[], unconfirmedMadeIn: string): CandRow[] {
  const rows: CandRow[] = [];
  // Model-only rows (model made-in guess, or parts when parts evidence is
  // model-only) show 模型參考 + ⓘ; a web/label row for the same country wins.
  const isModel = (r: CandRow) => modelOnlyPartCandidate(result, r);
  const put = (row: CandRow) => {
    const i = rows.findIndex((r) => sameCountryLabel(r.label, row.label));
    if (i === -1) {
      rows.push(row);
      return;
    }
    const prev = rows[i]!;
    // A web row keeps its own label; a backed row absorbs a model row;
    // otherwise the stronger rating wins.
    if (prev.source === 'web_name') return;
    if (isModel(row) && !isModel(prev)) return;
    if (
      row.source === 'web_name' ||
      (isModel(prev) && !isModel(row)) ||
      (RATING_RANK[row.rating] ?? 0) > (RATING_RANK[prev.rating] ?? 0)
    ) {
      rows[i] = row;
    }
  };
  const modelLabels: string[] = [];
  for (const c of candidates) {
    if (c.source === 'confirmed_coo' || c.source === 'model_memory') {
      modelLabels.push(c.label);
      continue;
    }
    if (NOT_MADE_IN.has(String(c.source))) continue;
    put({ label: c.label, rating: c.rating, source: c.source });
  }
  if (unconfirmedMadeIn) modelLabels.push(unconfirmedMadeIn);
  const hq = cleanValue(result.company?.hqCountry);
  const mfg = cleanValue(result.product?.manufacturerCountry);
  for (const label of modelLabels) {
    const echo = (hq && sameCountryLabel(label, hq)) || (mfg && sameCountryLabel(label, mfg));
    const productSpecific = rows.some((r) => sameCountryLabel(r.label, label));
    if (echo && !productSpecific) continue;
    put({ label, rating: 'possible', source: 'model_memory' });
  }
  return rows
    .sort((a, b) => (RATING_RANK[b.rating] ?? 0) - (RATING_RANK[a.rating] ?? 0))
    .slice(0, 4);
}

export function buildMadeInView(result: CheckResult): MadeInView {
  const p = result.product;
  const meta = result.meta;
  const sources = Array.isArray(result.sources) ? cleanSources(result.sources, 8) : [];
  const searchCoo = meta?.searchCoo ?? [];
  const candidates = p?.originCandidates ?? [];
  const madeIn = cleanValue(p?.madeIn);
  const webRan = result.knowledgeBasis === 'web_enriched';

  const firstSource = (url?: string, country?: string) => {
    const line = url ? sources.find((s) => s.includes(url)) ?? url : sources[0];
    if (!line) return undefined;
    const parts = splitSourceLine(line);
    const label = sourceLabel(parts);
    return label ? { label, url: parts.url, country } : undefined;
  };

  const made = confirmedMadeIn(result);
  if (made) {
    const basis: MadeInBasis = made.basis;
    const confirmed = candidates.find((c) => c.rating === 'confirmed');
    const barcodeHit = searchCoo.find((c) => c.status === 'confirmed' && c.basis === 'barcode');
    return {
      state: 'confirmed',
      country: madeIn,
      basis,
      confidence: confirmed?.confidence ?? result.confidence,
      sourceCount: Math.max(sources.length, searchCoo.length),
      source:
        basis === 'label'
          ? undefined
          : firstSource(barcodeHit?.url, barcodeHit?.country),
      candidates: [],
      noBarcodePage: false,
    };
  }

  // C: a single name-matched page says "likely <country>" — never confirmed.
  const nameLikely =
    candidates.find((c) => c.source === 'web_name' && c.rating === 'likely') ??
    (searchCoo.find((c) => c.status === 'likely' && c.basis === 'name')
      ? {
          label: searchCoo.find((c) => c.status === 'likely' && c.basis === 'name')!.country,
          confidence: 0.55,
          source: 'web_name' as const,
          rating: 'likely' as const,
        }
      : undefined);
  const hadBarcode = searchCoo.some((c) => c.basis === 'barcode');
  if (nameLikely) {
    const hit = searchCoo.find(
      (c) => c.status === 'likely' && sameLabel(c.country, nameLikely.label)
    );
    return {
      state: 'likely',
      country: nameLikely.label,
      basis: 'name',
      confidence: nameLikely.confidence,
      sourceCount: Math.max(sources.length, searchCoo.length),
      source: firstSource(hit?.url, hit?.country),
      candidates: [],
      noBarcodePage: webRan && !hadBarcode,
    };
  }

  const rows = candidateRows(result, candidates, madeIn);
  return {
    state: 'unconfirmed',
    basis: rows.some((c) => c.source === 'web_name') ? 'name' : undefined,
    sourceCount: Math.max(sources.length, searchCoo.length),
    candidates: rows,
    noBarcodePage: webRan && !hadBarcode,
  };
}

export type LayerTag = 'confirmed' | 'likely' | 'mentioned' | 'unconfirmed';
export type LayerRowView = {
  key: 'brandOrigin' | 'hq' | 'parts' | 'parent';
  value: string;
  /** Country part of the value (localized by the view). */
  country?: string;
  tag: LayerTag;
  /** Model-only parts: shown with 模型參考（未經確認） + ⓘ instead of a tag. */
  modelRef?: boolean;
};

/**
 * 產地分層 rows. Tags say how far the value is backed:
 * web-searched company facts → 確認; model memory → 有提及; label-read parts
 * → 確認; web parts → 較可能; model parts → 模型參考（未經確認） + ⓘ (no tag);
 * nothing → 未確認.
 */
export function buildLayerRows(result: CheckResult): LayerRowView[] {
  const p = result.product;
  const c = result.company;
  // 確認 = web research with a Source line (same rule as the company floor).
  const web = companyFactsSourced(result);
  const factTag: LayerTag = web ? 'confirmed' : 'mentioned';
  const rows: LayerRowView[] = [];

  const brandOrigin = cleanValue(p?.originCountry);
  rows.push(
    brandOrigin
      ? { key: 'brandOrigin', value: '', country: brandOrigin, tag: factTag }
      : { key: 'brandOrigin', value: '', tag: 'unconfirmed' }
  );
  // Folded parent HQ (see brandHqFolded): the China HQ is the parent's, so
  // the brand's own HQ stays 未確認 here; the parent row carries the country.
  const folded = brandHqFolded(result);
  const hq = folded ? '' : cleanValue(c?.hqCountry);
  rows.push(
    hq
      ? { key: 'hq', value: '', country: hq, tag: factTag }
      : { key: 'hq', value: '', tag: 'unconfirmed' }
  );

  const partWithCountry = (p?.parts ?? []).find(
    (x) => cleanValue(x.madeIn) || cleanValue(x.originCountry)
  );
  if (partWithCountry) {
    const tag: LayerTag =
      result.partsEvidence === 'label'
        ? 'confirmed'
        : result.partsEvidence === 'web'
          ? 'likely'
          : 'mentioned';
    rows.push({
      key: 'parts',
      value: partWithCountry.name,
      country: cleanValue(partWithCountry.madeIn) || cleanValue(partWithCountry.originCountry),
      tag,
      ...(result.partsEvidence !== 'label' && partsFromModel(result) ? { modelRef: true } : {}),
    });
  } else {
    rows.push({ key: 'parts', value: '', tag: 'unconfirmed' });
  }

  const parents = (c?.parents ?? []).filter((x) => x.name?.trim());
  const picked = pickOwner(result);
  const parent =
    (picked && parents.find((x) => x.name.trim() === picked.name)) ??
    parents.find((x) => x.control === 'majority' || x.control === 'wholly') ??
    parents[0];
  if (parent) {
    const controlling = parent.control === 'majority' || parent.control === 'wholly';
    rows.push({
      key: 'parent',
      value: parent.name.trim(),
      country:
        cleanValue(parent.country) ||
        (folded && picked?.name === parent.name.trim() ? picked.country : '') ||
        undefined,
      tag: controlling && web ? 'confirmed' : 'mentioned',
    });
  }
  return rows;
}

/** Product notes without echoed schema keys (older cached results). */
export function cleanNotes(result: CheckResult): string[] {
  return (
    result.product?.notes
      ?.map((n) =>
        n
          .replace(
            /\s*[(（]\s*(?:madeIn|manufacturedIn|originCountry|componentsOrigin|manufacturerCountry|hqCountry|chinaRelated)\s*[)）]/g,
            ''
          )
          .trim()
      )
      .filter(Boolean) ?? []
  );
}
