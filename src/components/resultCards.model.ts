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
import { notesNameMadeIn, notesNameOnlyAsDesign } from '../../functions/_lib/noteText';
import { brandHqFolded, companyFactsSourced, confirmedMadeIn, pickOwner } from './ChinaLink';

const VAGUE_RE =
  /^(unknown|n\/?a|na|none|null|unclear|not\s+(known|stated|confirmed)|unconfirmed|未知|不明|不詳|不清楚|未確認|未确认|-|—)?$/i;

export function cleanValue(raw?: string | null): string {
  const s = String(raw ?? '').trim();
  return VAGUE_RE.test(s) ? '' : s;
}

type Candidate = NonNullable<NonNullable<CheckResult['product']>['originCandidates']>[number];

export type MadeInBasis = 'barcode' | 'label' | 'model' | 'name';

/** Why a made-in stays 未確認 (one chip; replaces the old barcode-only reason). */
export type UnconfirmedReason = 'pagesDisagree' | 'aiCitedUnverified' | 'aiOnly' | 'onePageOnly';

export type MadeInView = {
  /**
   * confirmed (barcode / label / 依型號比對) or unconfirmed. Nothing else ever
   * reaches the headline: a likely country is a candidate under 未確認.
   */
  state: 'confirmed' | 'unconfirmed';
  /** Headline country (confirmed only). */
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
  /**
   * Candidate countries (not confirmed). Web candidates carry their own
   * source rows; `neutral` (exact-model pages disagree) shows no grade.
   */
  candidates: Array<{
    label: string;
    rating: Candidate['rating'];
    source: Candidate['source'];
    sources?: SourceRow[];
    neutral?: boolean;
    /**
     * 1 when the country rests on exactly one exact-model page (and no other
     * page): its meta reads 「1 個型號相符的網頁」 instead of a grade. Loose
     * name-match pages keep their grade.
     */
    exactPages?: 1;
  }>;
  /** Unconfirmed only: the one reason chip. */
  reason?: UnconfirmedReason;
  /**
   * 網頁說法不一 only: each side of the disagreement (爭議 line), in candidate
   * order, with its page counts. The pages are the candidate's source rows.
   */
  dispute?: DisputeSide[];
  /**
   * Design / brand wording (附加資訊), in every state: 「品牌標示「德國設計／研發」，
   * 這不是製造地。」 with the page link when a search page said it.
   */
  designRows: DesignRow[];
  /** Pages about another model of that name: 「型號不符（…），未計算」 rows. */
  excludedRows: Array<SourceRow & { model: string }>;
  /**
   * AI-cited pages that failed the check: listed as 「AI 引用，未能驗證」 in
   * every state, outside the numbered source rows and never in the chip.
   */
  citedRows: SourceRow[];
};

/** One 爭議 side; `label` = a claim on the package label (no page count). */
export type DisputeSide = { country: string; pages: number; exactPages: number; label?: boolean };

export type DesignRow = { country: string; kind: 'design' | 'brand'; source?: SourceRow };

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

/**
 * Candidate sources the 零件 list never shows: ownership / HQ echo, and the
 * made-in candidates (product-name web pages, the model's made-in guess),
 * which belong to the 製造地 card only.
 */
const PARTS_LIST_SKIP = new Set(['ownership', 'confirmed_coo', 'manufacturer', 'web_name', 'model_memory']);

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
 * - 'model': nothing backs it → 模型參考（未經多重確認） + ⓘ.
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
    // Older answers: a note naming the country only as design / brand wording.
    if (c.source === 'notes' && notesNameOnlyAsDesign(result.product?.notes, c.label)) continue;
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
  /** The AI answer counted as one source (依型號比對 'ai_web'); label from the view. */
  ai?: boolean;
};

/** Rows (and the count chip) stop here; the chip never claims more than shown. */
export const MAX_SOURCE_ROWS = 3;

type CooHit = NonNullable<NonNullable<CheckResult['meta']>['searchCoo']>[number];

/** Supporting hits → deduped (by URL) rows titled from the matching Source line. */
function supportingRows(
  hits: CooHit[],
  sources: string[],
  match: (h: CooHit) => boolean,
  max = MAX_SOURCE_ROWS
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
    if (rows.length >= max) break;
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

function buildMadeInViewCore(result: CheckResult): Omit<MadeInView, 'citedRows' | 'excludedRows' | 'designRows'> {
  const p = result.product;
  const meta = result.meta;
  const sources = Array.isArray(result.sources) ? cleanSources(result.sources, 8) : [];
  const searchCoo = meta?.searchCoo ?? [];
  const candidates = p?.originCandidates ?? [];
  const madeIn = cleanValue(p?.madeIn);

  const made = confirmedMadeIn(result);
  if (made) {
    const basis: MadeInBasis = made.basis;
    const confirmed = candidates.find((c) => c.rating === 'confirmed');
    // Label basis: the package photo, no web rows, so no web-source chip.
    // 依型號比對: the exact-model pages, plus the AI answer as the first row
    // when it was one of the two sources ('ai_web').
    const aiRow = basis === 'model' && p?.madeInSupport === 'ai_web';
    const webRows =
      basis === 'label'
        ? []
        : supportingRows(
            searchCoo,
            sources,
            (h) =>
              sameCountryLabel(h.country, madeIn) &&
              (basis === 'model'
                ? (h.status === 'confirmed' && h.basis === 'model') || Boolean(h.exactModel)
                : h.status === 'confirmed' && h.basis === 'barcode'),
            aiRow ? MAX_SOURCE_ROWS - 1 : MAX_SOURCE_ROWS
          );
    const sourceRows: SourceRow[] = aiRow
      ? [{ label: '', ai: true, country: canonicalCountry(madeIn) ?? madeIn }, ...webRows]
      : webRows;
    // 2+ domains outvoted the AI answer: its country stays a candidate row.
    const outvoted =
      basis === 'model'
        ? candidates
            .filter((c) => c.source === 'model_memory' && !sameCountryLabel(c.label, madeIn))
            .map((c) => ({ label: c.label, rating: c.rating, source: c.source }))
        : [];
    return {
      state: 'confirmed',
      country: madeIn,
      basis,
      confidence: confirmed?.confidence ?? result.confidence,
      sourceCount: sourceRows.length,
      sourceRows,
      candidates: outvoted,
    };
  }

  // Not confirmed: the headline is 未確認 and every country is a candidate
  // row underneath, web ones with their own source rows.
  let rows = candidateRows(result, candidates, madeIn);
  const likelyHits = searchCoo.filter((c) => c.status === 'likely');
  for (const h of likelyHits) {
    if (!rows.some((r) => sameCountryLabel(r.label, h.country))) {
      rows.push({ label: canonicalCountry(h.country) ?? h.country, rating: 'likely', source: 'web_name' });
    }
  }
  const webCountries: string[] = [];
  for (const r of rows) {
    if (r.source === 'web_name' && !webCountries.some((c) => sameCountryLabel(c, r.label))) webCountries.push(r.label);
  }
  // Pages that disagree (exact-model ones, or name-matched ones): neutral rows.
  const exactCountries = searchCoo.filter((c) => c.exactModel).map((c) => c.country);
  const disagree =
    exactCountries.some((c) => !sameCountryLabel(c, exactCountries[0]!)) || webCountries.length >= 2;
  rows = rows.map((r) => {
    if (r.source !== 'web_name') return r;
    const srcRows = supportingRows(
      likelyHits,
      sources,
      (h) => sameCountryLabel(h.country, r.label)
    );
    const pages = new Set(likelyHits.filter((h) => sameCountryLabel(h.country, r.label)).map((h) => h.url ?? ''));
    const exact = new Set(
      likelyHits.filter((h) => h.exactModel && sameCountryLabel(h.country, r.label)).map((h) => h.url ?? '')
    );
    const onlyOneExact = !disagree && pages.size === 1 && exact.size === 1;
    return {
      ...r,
      ...(srcRows.length ? { sources: srcRows } : {}),
      ...(disagree ? { neutral: true } : {}),
      ...(onlyOneExact ? { exactPages: 1 as const } : {}),
    };
  });
  const webPages = new Set(likelyHits.map((h) => h.url).filter(Boolean)).size;
  const aiSaid = [madeIn, ...candidates.filter((c) => c.source === 'model_memory').map((c) => c.label)].filter(Boolean);
  const aiBacks = (label: string) => aiSaid.some((a) => sameCountryLabel(a, label));
  const reason: UnconfirmedReason | undefined = disagree
    ? 'pagesDisagree'
    : (meta?.citedUnverified ?? []).length
      ? 'aiCitedUnverified'
      : !webCountries.length && aiSaid.length && rows.some((r) => modelOnlyPartCandidate(result, r))
        ? 'aiOnly'
        : webCountries.length === 1 && webPages === 1 && !aiBacks(webCountries[0]!)
          ? 'onePageOnly'
          : undefined;
  // 爭議: every side of the disagreement with its page counts.
  const pageDispute: DisputeSide[] =
    reason === 'pagesDisagree'
      ? rows
          .filter((r) => r.source === 'web_name')
          .map((r) => {
            const hits = likelyHits.filter((h) => sameCountryLabel(h.country, r.label));
            return {
              country: r.label,
              pages: new Set(hits.map((h) => h.url ?? '')).size,
              exactPages: new Set(hits.filter((h) => h.exactModel).map((h) => h.url ?? '')).size,
            };
          })
          .filter((d) => d.pages > 0)
      : [];
  // Two made-in claims in one label field (「產地：中國 日本製」「產地：德國 中國」):
  // merged with any page 爭議, each country once with each of its sources, label first.
  const labelSides = p?.labelDispute ?? [];
  let dispute: DisputeSide[] = pageDispute;
  if (labelSides.length >= 2) {
    const merged: DisputeSide[] = labelSides.map((country) => {
      const hits = likelyHits.filter((h) => sameCountryLabel(h.country, country));
      return {
        country,
        pages: new Set(hits.map((h) => h.url ?? '')).size,
        exactPages: new Set(hits.filter((h) => h.exactModel).map((h) => h.url ?? '')).size,
        label: true,
      };
    });
    for (const d of pageDispute) if (!merged.some((x) => sameCountryLabel(x.country, d.country))) merged.push(d);
    dispute = merged;
  }
  return {
    state: 'unconfirmed',
    // No basis / confidence / source-count chip on a 未確認 headline.
    sourceCount: 0,
    sourceRows: [],
    candidates: rows,
    ...(reason ? { reason } : {}),
    ...(dispute.length >= 2 ? { dispute } : {}),
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
  /** Model-only parts: shown with 模型參考（未經多重確認） + ⓘ instead of a tag. */
  modelRef?: boolean;
  /** Parts: the part country's own candidate grade + confidence (0–1). */
  grade?: { rating: Candidate['rating']; confidence: number };
};

/**
 * 產地分層 rows. Tags say how far the value is backed:
 * web-searched company facts → 確認; model memory → 有提及; label-read parts
 * → 確認; web parts → their own candidate grade + %; model parts →
 * 模型參考（未經多重確認） + ⓘ (no tag); nothing → 未確認.
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

/** AI-cited made-in pages that failed the check (meta.citedUnverified). */
function citedRows(result: CheckResult): SourceRow[] {
  const rows: SourceRow[] = [];
  for (const c of result.meta?.citedUnverified ?? []) {
    const url = c.url?.trim();
    if (!url || rows.some((r) => r.url === url)) continue;
    const host = sourceLabel({ title: '', url });
    const title = c.title?.trim();
    rows.push({ label: title || host || url, url, host: title && host && host !== title ? host : undefined });
  }
  return rows;
}

/** Search pages about another model of that name (meta.searchExcluded). */
function excludedRows(result: CheckResult): MadeInView['excludedRows'] {
  const rows: MadeInView['excludedRows'] = [];
  for (const e of result.meta?.searchExcluded ?? []) {
    const url = e.url?.trim();
    if (!url || !e.model || rows.some((r) => r.url === url)) continue;
    const host = sourceLabel({ title: '', url });
    const title = e.title?.trim();
    rows.push({ label: title || host || url, url, host: title && host && host !== title ? host : undefined, model: e.model });
  }
  return rows;
}

export function buildMadeInView(result: CheckResult): MadeInView {
  const core = buildMadeInViewCore(result);
  return {
    ...core,
    citedRows: citedRows(result),
    excludedRows: excludedRows(result),
    designRows: designRows(result, core.state === 'confirmed' ? core.country : undefined),
  };
}

/** At most this many 附加資訊 lines. */
export const MAX_DESIGN_ROWS = 2;

/** product.designInfo → 附加資訊 rows (not the confirmed made-in country). */
function designRows(result: CheckResult, madeIn?: string): DesignRow[] {
  const sources = Array.isArray(result.sources) ? cleanSources(result.sources, 8) : [];
  const rows: DesignRow[] = [];
  for (const d of result.product?.designInfo ?? []) {
    const country = cleanValue(d.country);
    if (!country || (madeIn && sameCountryLabel(country, madeIn))) continue;
    if (rows.some((r) => sameCountryLabel(r.country, country))) continue;
    const url = d.url?.trim();
    let source: SourceRow | undefined;
    if (url) {
      const parts = splitSourceLine(sources.find((s) => s.includes(url)) ?? url);
      const host = sourceLabel({ title: '', url: parts.url ?? url });
      const label = sourceLabel(parts) || host || url;
      source = { label, url: parts.url ?? url, host: host && host !== label ? host : undefined };
    }
    rows.push({ country: canonicalCountry(country) ?? country, kind: d.kind === 'brand' ? 'brand' : 'design', ...(source ? { source } : {}) });
    if (rows.length >= MAX_DESIGN_ROWS) break;
  }
  return rows;
}
