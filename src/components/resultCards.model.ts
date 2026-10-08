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
import { zhCountryText } from '../../functions/_lib/zhHant';
import { canonicalCountry } from '../../functions/_lib/countryLabel';
import { notesNameMadeIn } from '../../functions/_lib/noteText';
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
  /** Number of source rows shown (the chip and the rows always match). */
  sourceCount: number;
  /**
   * One row per distinct page URL among the searchCoo hits that back the
   * headline country with the shown basis (barcode/confirmed or
   * name/likely), at most MAX_SOURCE_ROWS. Label basis: none.
   */
  sourceRows: SourceRow[];
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
  const rb = normalizeRegion(b);
  const greater = (r: string) => r !== 'OTHER' && r !== 'UNKNOWN';
  // CN / HK / TW / MO compare by region code (中國（含港澳） = China).
  if (greater(ra) || greater(rb)) return ra === rb;
  // Every other country is 'OTHER' there, so compare names instead
  // (Thailand = 泰國 = タイ, but never Thailand = Japan).
  const ca = canonicalCountry(a);
  const cb = canonicalCountry(b);
  if (ca && cb) return ca === cb;
  const za = zhCountryText(a.trim()).toLowerCase();
  return Boolean(za) && za === zhCountryText(b.trim()).toLowerCase();
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

const RATING_RANK: Record<string, number> = { confirmed: 4, likely: 3, possible: 2, mentioned: 1 };

/** Candidate sources the 零件 list never shows (ownership / made-in / HQ echo). */
const PARTS_LIST_SKIP = new Set(['ownership', 'confirmed_coo', 'manufacturer']);

/**
 * A 'notes' candidate that only echoes the HQ / manufacturer / brand-origin
 * country (「品牌設計及總部設於日本」 → 日本 · 有提及 · 38%). Same rule as the
 * server (synthesize collectOriginCandidates), applied again here for cached
 * results: kept only when another product-specific candidate has that
 * country or a note ties it to manufacturing in the same clause.
 */
export function notesEchoCandidate(result: CheckResult, c: Pick<Candidate, 'label' | 'source'>): boolean {
  if (c.source !== 'notes') return false;
  const p = result.product;
  const echo = [result.company?.hqCountry, p?.manufacturerCountry, p?.originCountry]
    .map(cleanValue)
    .some((x) => x && sameCountryLabel(c.label, x));
  if (!echo) return false;
  const backed = (p?.originCandidates ?? []).some(
    (x) =>
      x.source !== 'notes' &&
      !PARTS_LIST_SKIP.has(String(x.source)) &&
      x.source !== 'model_memory' &&
      sameCountryLabel(x.label, c.label)
  );
  return !backed && !notesNameMadeIn(p?.notes, c.label);
}

/** Candidates the 零件 rows may use (none when parts were read from the label). */
export function partsListCandidates(result: CheckResult): Candidate[] {
  if (result.partsEvidence === 'label') return [];
  return (result.product?.originCandidates ?? []).filter(
    (c) => !PARTS_LIST_SKIP.has(String(c.source)) && !notesEchoCandidate(result, c)
  );
}

/**
 * Strongest web/label-backed candidate for THIS country (never another
 * country's). `partsOnly` limits it to part / components / notes evidence,
 * so a product-name match never grades a part.
 */
export function backedCandidate(
  result: CheckResult,
  country: string,
  partsOnly = false
): Candidate | undefined {
  return partsListCandidates(result)
    .filter(
      (c) =>
        (!partsOnly || PART_SOURCES.has(String(c.source))) &&
        !modelOnlyPartCandidate(result, c) &&
        sameCountryLabel(c.label, country)
    )
    .sort(
      (a, b) =>
        (RATING_RANK[b.rating] ?? 0) - (RATING_RANK[a.rating] ?? 0) || b.confidence - a.confidence
    )[0];
}

/**
 * What backs one part country, shared by the 產地分層 零件 row and the
 * 零件候選 list so both always agree:
 * - 'label': read from the package label photo (確認 · 依包裝標示),
 * - 'graded': a web-backed part candidate for the same country (its own
 *   grade + %),
 * - 'model': nothing backs it → 模型參考（未經確認） + ⓘ.
 * Result-level partsEvidence 'web' alone never grades a part: without a
 * candidate for that country there is nothing to take a grade from.
 */
export type PartEvidence =
  | { kind: 'label' }
  | { kind: 'graded'; rating: Candidate['rating']; confidence: number; source: Candidate['source'] }
  | { kind: 'model' };

export function partCountryEvidence(result: CheckResult, country: string): PartEvidence {
  if (result.partsEvidence === 'label') return { kind: 'label' };
  const c = backedCandidate(result, country, true);
  return c
    ? { kind: 'graded', rating: c.rating, confidence: c.confidence, source: c.source }
    : { kind: 'model' };
}


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
    if (notesEchoCandidate(result, c)) continue;
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

/** host: the page's domain, shown when the title is not already the domain. */
export type SourceRow = {
  label: string;
  url?: string;
  host?: string;
  /**
   * Short URL part ("/…/01050000006850") shown after the domain when another
   * row has the same domain and the same (or a truncated) title, so two
   * pages never read as the same page twice.
   */
  pathHint?: string;
  country?: string;
};

/** Rows (and the count chip) stop here; the chip never claims more than shown. */
export const MAX_SOURCE_ROWS = 3;

type CooHit = NonNullable<NonNullable<CheckResult['meta']>['searchCoo']>[number];

/** Supporting hits → deduped (by URL) rows titled from the matching Source line. */
function supportingRows(
  hits: CooHit[],
  sources: string[],
  match: (h: CooHit) => boolean
): SourceRow[] {
  const rows: SourceRow[] = [];
  const seen = new Set<string>();
  for (const h of hits) {
    const url = h.url?.trim();
    if (!url || !match(h) || seen.has(url)) continue;
    seen.add(url);
    const parts = splitSourceLine(sources.find((s) => s.includes(url)) ?? url);
    const host = sourceLabel({ title: '', url: parts.url ?? url });
    const label = sourceLabel(parts) || host || url;
    // Canonical country (中国 / タイ → China / Thailand) so every locale names it.
    rows.push({
      label,
      url: parts.url ?? url,
      host: host && host !== label ? host : undefined,
      country: canonicalCountry(h.country) ?? h.country,
    });
    if (rows.length === MAX_SOURCE_ROWS) break;
  }
  return withPathHints(rows);
}

/** Title key for "nearly the same": no spaces / ellipses, case-folded. */
function titleKey(label: string): string {
  return label.replace(/\s+|…|\.\.\./g, '').toLowerCase();
}

function urlHost(url?: string): string {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : '';
  } catch {
    return '';
  }
}

/** First URL path segment (or the query) that differs from the other URLs. */
function distinguishingPart(url: string, others: string[]): string {
  const split = (u: string) => {
    try {
      const x = new URL(u);
      return { segs: x.pathname.split('/').filter(Boolean), query: x.search };
    } catch {
      return { segs: [] as string[], query: '' };
    }
  };
  const me = split(url);
  const them = others.map(split);
  const short = (v: string) => (v.length > 20 ? `${v.slice(0, 19)}…` : v);
  for (let i = 0; i < me.segs.length; i++) {
    if (them.some((o) => o.segs[i] !== me.segs[i])) return `/${i ? '…/' : ''}${short(me.segs[i]!)}`;
  }
  return me.query ? short(me.query) : '';
}

function withPathHints(rows: SourceRow[]): SourceRow[] {
  return rows.map((row, i) => {
    const host = urlHost(row.url);
    const key = titleKey(row.label);
    const twins = rows.filter((o, j) => {
      if (j === i || !o.url || urlHost(o.url) !== host) return false;
      const k = titleKey(o.label);
      return k === key || k.startsWith(key) || key.startsWith(k);
    });
    if (!host || !row.url || !twins.length) return row;
    const hint = distinguishingPart(row.url, twins.map((o) => o.url!));
    return hint ? { ...row, host: row.host ?? (row.label === host ? undefined : host), pathHint: hint } : row;
  });
}

export function buildMadeInView(result: CheckResult): MadeInView {
  const p = result.product;
  const meta = result.meta;
  const sources = Array.isArray(result.sources) ? cleanSources(result.sources, 8) : [];
  const searchCoo = meta?.searchCoo ?? [];
  const candidates = p?.originCandidates ?? [];
  const madeIn = cleanValue(p?.madeIn);
  const webRan = result.knowledgeBasis === 'web_enriched';

  const made = confirmedMadeIn(result);
  if (made) {
    const basis: MadeInBasis = made.basis;
    const confirmed = candidates.find((c) => c.rating === 'confirmed');
    // Label basis: the package photo, no web rows, so no web-source chip.
    const sourceRows =
      basis === 'label'
        ? []
        : supportingRows(
            searchCoo,
            sources,
            (h) => h.status === 'confirmed' && h.basis === 'barcode' && sameCountryLabel(h.country, madeIn)
          );
    return {
      state: 'confirmed',
      country: madeIn,
      basis,
      confidence: confirmed?.confidence ?? result.confidence,
      sourceCount: sourceRows.length,
      sourceRows,
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
    const sourceRows = supportingRows(
      searchCoo,
      sources,
      (h) => h.status === 'likely' && h.basis === 'name' && sameCountryLabel(h.country, nameLikely.label)
    );
    return {
      state: 'likely',
      country: nameLikely.label,
      basis: 'name',
      confidence: nameLikely.confidence,
      sourceCount: sourceRows.length,
      sourceRows,
      candidates: [],
      noBarcodePage: webRan && !hadBarcode,
    };
  }

  const rows = candidateRows(result, candidates, madeIn);
  return {
    state: 'unconfirmed',
    basis: rows.some((c) => c.source === 'web_name') ? 'name' : undefined,
    // B: no source-count chip, no source rows.
    sourceCount: 0,
    sourceRows: [],
    candidates: rows,
    noBarcodePage: webRan && !hadBarcode,
  };
}

/** 零件 rows in 產地分層: one per part country, at most this many. */
export const MAX_PART_ROWS = 3;

export type LayerTag = 'confirmed' | 'likely' | 'mentioned' | 'unconfirmed';
export type LayerRowView = {
  key: 'brandOrigin' | 'hq' | 'manufacturer' | 'parts' | 'parent';
  value: string;
  /** Parts: every part name for this country (joined by the view). */
  names?: string[];
  /** Country part of the value (localized by the view). */
  country?: string;
  tag: LayerTag;
  /** Model-only parts: shown with 模型參考（未經確認） + ⓘ instead of a tag. */
  modelRef?: boolean;
  /** Parts: the part country's own candidate grade + confidence (0–1). */
  grade?: { rating: Candidate['rating']; confidence: number };
};

/**
 * 產地分層 rows. Tags say how far the value is backed:
 * web-searched company facts → 確認; model memory → 有提及; label-read parts
 * → 確認; web parts → their own candidate grade + %; model parts →
 * 模型參考（未經確認） + ⓘ (no tag); nothing → 未確認.
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

  // 製造商: the maker the answer names (Pigeon Corporation · 日本), same tag
  // rule as the company rows. No row when the answer names none.
  const maker = cleanValue(p?.manufacturer);
  const makerCountry = cleanValue(p?.manufacturerCountry);
  if (maker || makerCountry) {
    rows.push({ key: 'manufacturer', value: maker, country: makerCountry || undefined, tag: factTag });
  }

  // One 零件 row per part country (Softouch label: 乳首、キャップ、フード ·
  // 中國 and びん · 日本), never only the first part.
  const byCountry: Array<{ country: string; names: string[] }> = [];
  for (const part of p?.parts ?? []) {
    const country = cleanValue(part.madeIn) || cleanValue(part.originCountry);
    if (!country) continue;
    const group = byCountry.find((g) => sameCountryLabel(g.country, country));
    if (group) group.names.push(part.name);
    else byCountry.push({ country, names: [part.name] });
  }
  for (const { country, names } of byCountry.slice(0, MAX_PART_ROWS)) {
    // Same evidence as the 零件候選 list (partCountryEvidence): never a grade
    // borrowed from another country or from result-level partsEvidence.
    const ev = partCountryEvidence(result, country);
    const base = { key: 'parts' as const, value: names.join(', '), names, country };
    if (ev.kind === 'label') rows.push({ ...base, tag: 'confirmed' });
    else if (ev.kind === 'graded')
      rows.push({
        ...base,
        tag: ev.rating === 'confirmed' ? 'confirmed' : ev.rating === 'likely' ? 'likely' : 'mentioned',
        grade: { rating: ev.rating, confidence: ev.confidence },
      });
    else rows.push({ ...base, tag: 'mentioned', modelRef: true });
  }
  if (!byCountry.length) {
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
