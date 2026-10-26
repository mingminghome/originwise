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
import { confirmingCountry } from '../../functions/_lib/madeInConfirm';
import { isRegionNotCountry, normalizeRegion } from '../../functions/_lib/regions';
import { isUselessCooNote } from '../../functions/_lib/noteText';
import { factVerified, quoteNamesBrand } from '../core/evidence';
import { brandHqFolded, confirmedMadeIn, pickOwner } from './ChinaLink';

const VAGUE_RE =
  /^(unknown|n\/?a|na|none|null|unclear|not\s+(known|stated|confirmed)|unconfirmed|未知|不明|不詳|不清楚|未確認|未确认|-|—)?$/i;

export function cleanValue(raw?: string | null): string {
  const s = String(raw ?? '').trim();
  return VAGUE_RE.test(s) ? '' : s;
}

type Candidate = NonNullable<NonNullable<CheckResult['product']>['originCandidates']>[number];

export type MadeInBasis = 'barcode' | 'label' | 'model' | 'name';

/** Why a made-in stays 未確認 (one chip; replaces the old barcode-only reason). */
export type UnconfirmedReason =
  | 'pagesDisagree'
  | 'sourcesDisagree'
  | 'aiCitedUnverified'
  | 'aiOnly'
  | 'onePageOnly'
  | 'regionOnly';

export type MadeInView = {
  /**
   * confirmed (barcode / label / 依型號比對) or unconfirmed. A likely web
   * page never becomes the headline country. Parts that clearly lead can
   * read 「大多產自 X」 (`mostly`) while the card stays unconfirmed.
   */
  state: 'confirmed' | 'unconfirmed';
  /** Headline country (confirmed only). */
  country?: string;
  /**
   * Unconfirmed headline when web-graded parts name one country clearly
   * ahead of the others. Not a confirmed made-in.
   */
  mostly?: string;
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
   * Pages that name a region, not a country. Shown beside the unconfirmed
   * country. They do not vote and do not confirm.
   */
  regionRows: Array<{ region: string; sources: SourceRow[] }>;
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
  /**
   * Unconfirmed only: every other made-in candidate the answer holds, with
   * its confidence and where it came from, shown under 模型參考（未經確認）.
   * Never graded, never confirmed; HQ / owner echoes and countries a note
   * names only as design / brand wording are left out.
   */
  weakCandidates?: WeakCandidate[];
  /** What the card lists under 模型參考（未經確認）: candidates + weakCandidates, never the confirmed country. */
  unconfirmedTier: WeakCandidate[];
  /** Unconfirmed only: the one reason chip. */
  reason?: UnconfirmedReason;
  /**
   * What each consulted source said. `n` of `total` (pages plus the AI answer)
   * named this country, for example Germany (1/5). Not a confirmed made-in.
   */
  votes: SourceVote[];
  /** Consulted sources that named no country. */
  silent: number;
  /** Pages fetched plus the AI answer. */
  sourceTotal: number;
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

export type WeakCandidate = {
  label: string;
  /** 0–1 when the answer gave one (a page-only row has none). */
  confidence?: number;
  source: Candidate['source'];
  /** Pages behind a name-matched row (shown, never counted). */
  sources?: SourceRow[];
  /** A 爭議 side: no % (the pages disagree). */
  neutral?: boolean;
  /** Rests on exactly one exact-model page: 「1 個型號相符的網頁」 as its source. */
  exactPages?: 1;
};

/** `verified`: a brand quote read on a fetched page / the label (確認); otherwise a brand row reads 有提及. */
export type DesignRow = { country: string; kind: 'design' | 'brand'; source?: SourceRow; verified?: boolean };

/** Candidate sources that never stand for a made-in (HQ / owner echoes). */
const NOT_MADE_IN = new Set(['ownership', 'manufacturer', 'confirmed_coo']);

type CandRow = MadeInView['candidates'][number];

function countryText(raw: string | undefined | null): string {
  return String(raw ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
}

/** Same written country. China-scope labels also match (中國 = China). */
export function sameCountryLabel(a: string, b: string): boolean {
  const fa = countryText(a).toLowerCase();
  const fb = countryText(b).toLowerCase();
  if (fa && fa === fb) return true;
  const ra = normalizeRegion(a);
  const rb = normalizeRegion(b);
  return ra !== 'OTHER' && ra !== 'UNKNOWN' && ra === rb;
}

/** Candidate sources that name a part / component country. */
const PART_SOURCES = new Set(['parts', 'components_line', 'notes']);

/** Parts / components line only: these can support a 「大多產自」 headline. */
const MOSTLY_SOURCES = new Set(['parts', 'components_line']);
/** Likely-band floor (chinaRelated parts with a web pass sit at 0.65). */
const MOSTLY_MIN = 0.55;
/** Two part countries this close stay 未確認 instead of 「大多產自」. */
const MOSTLY_GAP = 0.1;

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

/** A notes candidate is not a made-in or a part row. The score lines are. */
export function notesEchoCandidate(_result: CheckResult, c: Pick<Candidate, 'label' | 'source'>): boolean {
  return c.source === 'notes';
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
 * A part country is worth a row only when it is relatively confirmed:
 * read from the package label, or graded confirmed / likely from a web
 * source that is not the model's own guess. Possible, mentioned, model-only,
 * and omitted countries stay off the parts list. The product country of
 * origin stays on the made-in card.
 */
export function partOriginShown(ev: PartEvidence | undefined): boolean {
  if (ev?.kind === 'label') return true;
  return ev?.kind === 'graded' && (ev.rating === 'confirmed' || ev.rating === 'likely');
}


/**
 * 查到的產地候選（未確認）. One row per country. A model-only made-in (no
 * barcode page, no label) is a 'possible' 模型參考 row, including when it
 * matches HQ. A web row for the same country absorbs it (no duplicate rows).
 * Older cached answers may carry it as madeIn or a 'confirmed_coo' candidate.
 */
/** Pages named a region and no country, so the model's country is not a vote. */
function regionOnlyPages(result: CheckResult): boolean {
  const hits = result.meta?.searchCoo ?? [];
  const region = hits.some((h) => h.regionOnly && h.url?.trim());
  const country = hits.some(
    (h) => !h.regionOnly && !h.evidenceOnly && cleanValue(h.country) && h.url?.trim() && !isRegionNotCountry(h.country)
  );
  return region && !country;
}

function candidateRows(result: CheckResult, candidates: Candidate[], unconfirmedMadeIn: string): CandRow[] {
  const rows: CandRow[] = [];
  // Model-only rows (model made-in guess, or parts when parts evidence is
  // model-only) show 模型參考 + ⓘ; a web/label row for the same country wins.
  const isModel = (r: CandRow) => modelOnlyPartCandidate(result, r);
  const put = (row: CandRow) => {
    if (isRegionNotCountry(row.label)) return;
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
  // Pages named a region and no country. The model's country is not a vote.
  if (!regionOnlyPages(result)) {
    for (const label of modelLabels) {
      // Shown even when it matches HQ. The card lists it as an AI vote
      // (Germany 1/5), not as a confirmed made-in.
      put({ label, rating: 'possible', source: 'model_memory' });
    }
  }
  return rows
    .sort((a, b) => (RATING_RANK[b.rating] ?? 0) - (RATING_RANK[a.rating] ?? 0))
    .slice(0, 4);
}

/**
 * Candidates the graded list left out, for the 模型參考（未經確認） tier. Same
 * design guard as candidateRows: a country a note names only as design /
 * brand wording, or an HQ / owner echo, never shows as a made-in here.
 */
function weakRows(result: CheckResult, candidates: Candidate[], shown: CandRow[]): WeakCandidate[] {
  const out: WeakCandidate[] = [];
  for (const c of candidates) {
    const label = cleanValue(c.label);
    if (!label || c.rating === 'confirmed' || isRegionNotCountry(label)) continue;
    if (regionOnlyPages(result) && (c.source === 'model_memory' || c.source === 'confirmed_coo')) continue;
    if (c.source !== 'confirmed_coo' && NOT_MADE_IN.has(String(c.source))) continue;
    if (c.source === 'notes') continue;
    if (shown.some((r) => sameCountryLabel(r.label, label))) continue;
    if (out.some((r) => sameCountryLabel(r.label, label))) continue;
    const ev = PART_SOURCES.has(String(c.source)) ? partCountryEvidence(result, label) : undefined;
    const pagePart = ev?.kind === 'graded' && (ev.rating === 'likely' || ev.rating === 'confirmed');
    const barePart = ev !== undefined && !pagePart;
    const conf = Number.isFinite(c.confidence) ? Math.max(0, Math.min(1, c.confidence)) : 0;
    out.push({
      label,
      ...(!barePart && conf ? { confidence: conf } : {}),
      source: barePart || c.source === 'confirmed_coo' ? 'model_memory' : c.source,
    });
  }
  return out.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)).slice(0, 4);
}

/** host: the page's domain, shown when the title is not already the domain. */
export type SourceVote = {
  country: string;
  /** Sources that named this country. */
  n: number;
  /** Pages consulted plus the AI answer. */
  total: number;
  sources: SourceRow[];
};

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
      country: countryText(h.country) ?? h.country,
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

function buildMadeInViewCore(
  result: CheckResult
): Omit<MadeInView, 'citedRows' | 'excludedRows' | 'designRows' | 'unconfirmedTier' | 'votes' | 'silent' | 'sourceTotal' | 'regionRows'> {
  const p = result.product;
  const meta = result.meta;
  const sources = Array.isArray(result.sources) ? cleanSources(result.sources, 8) : [];
  const searchCoo = meta?.searchCoo ?? [];
  const candidates = p?.originCandidates ?? [];
  const madeIn = cleanValue(p?.madeIn);

  const made = confirmedMadeIn(result);
  if (made) {
    const basis: MadeInBasis = made.basis;
    const confirmed = candidates.find(
      (c) =>
        c.rating === 'confirmed' &&
        sameCountryLabel(c.label, madeIn) &&
        typeof c.confidence === 'number' &&
        c.confidence > 0
    );
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
      ? [{ label: '', ai: true, country: countryText(madeIn) ?? madeIn }, ...webRows]
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
      confidence: confirmed?.confidence,
      sourceCount: sourceRows.length,
      sourceRows,
      candidates: outvoted,
    };
  }

  // Not confirmed: the headline is 未確認 and every country is a candidate
  // row underneath, web ones with their own source rows.
  let rows = candidateRows(result, candidates, madeIn);
  // Two made-in claims on the package label: label evidence outranks pages, so
  // exact-model pages that agreed (依型號比對) are only one more 爭議 side.
  const labelSides = p?.labelDispute ?? [];
  const labelDisputed = labelSides.length >= 2;
  const likelyHits = searchCoo.filter(
    (c) =>
      !isRegionNotCountry(c.country) &&
      (c.status === 'likely' || (labelDisputed && c.status === 'confirmed' && c.basis === 'model'))
  );
  for (const h of likelyHits) {
    if (countryText(h.country) && !rows.some((r) => sameCountryLabel(r.label, h.country))) {
      rows.push({ label: countryText(h.country) ?? h.country, rating: 'likely', source: 'web_name' });
    }
  }
  // Page countries come from the fetched pages, even when the model row
  // already used that label. Otherwise the badge stays "AI answer only".
  const pageCountries: string[] = [];
  for (const h of likelyHits) {
    const label = countryText(h.country);
    if (label && !pageCountries.some((c) => sameCountryLabel(c, label))) pageCountries.push(label);
  }
  const exactCountries = searchCoo.filter((c) => c.exactModel).map((c) => c.country);
  const pagesDisagree =
    pageCountries.length >= 2 ||
    (exactCountries.length > 0 && exactCountries.some((c) => !sameCountryLabel(c, exactCountries[0]!)));
  // Every country is a 爭議 side (ungraded) when pages disagree or the label does.
  const disagree = pagesDisagree || labelDisputed;
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
  const regionNamed = searchCoo.some((h) => h.regionOnly && cleanValue(h.country) && h.url?.trim());
  const aiSaid = [madeIn, ...candidates.filter((c) => c.source === 'model_memory').map((c) => c.label)].filter(Boolean);
  const aiBacks = (label: string) => aiSaid.some((a) => a && sameCountryLabel(a, label));
  // 「網頁說法不一」 only when every side is a web page; with the label as a side 「來源說法不一」.
  const reason: UnconfirmedReason | undefined = labelDisputed
    ? 'sourcesDisagree'
    : pagesDisagree
      ? 'pagesDisagree'
      : (meta?.citedUnverified ?? []).length
        ? 'aiCitedUnverified'
        : pageCountries.length === 0 && regionNamed
          ? 'regionOnly'
          : pageCountries.length === 0 && aiSaid.length
            ? 'aiOnly'
          : pageCountries.length === 1 && webPages === 1 && !aiBacks(pageCountries[0]!)
            ? 'onePageOnly'
            : undefined;
  // 爭議: every side of the disagreement with its page counts.
  const pageDispute: DisputeSide[] =
    pageCountries.length >= 2
      ? pageCountries
          .map((country) => {
            const hits = likelyHits.filter((h) => sameCountryLabel(h.country, country));
            return {
              country,
              pages: new Set(hits.map((h) => h.url ?? '')).size,
              exactPages: new Set(hits.filter((h) => h.exactModel).map((h) => h.url ?? '')).size,
            };
          })
          .filter((d) => d.pages > 0)
      : [];
  // Two made-in claims in one label field (「產地：中國 日本製」「產地：德國 中國」):
  // merged with every page country, each country once with each of its sources, label first.
  let dispute: DisputeSide[] = pageDispute;
  if (labelDisputed) {
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
  const weakCandidates = weakRows(result, candidates, rows);
  return {
    state: 'unconfirmed',
    ...(weakCandidates.length ? { weakCandidates } : {}),
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
 * company facts → 有提及 (brand origin → 確認 only with a brand quote naming that
 * country, src/core/evidence.ts); label-read parts
 * → 確認; web parts → their own confirmed / likely grade + %. A part country
 * that is only possible, mentioned, or model-only is omitted. No empty
 * 未確認 parts row: the product country of origin stays on the made-in card.
 */
export function buildLayerRows(result: CheckResult): LayerRowView[] {
  const p = result.product;
  const c = result.company;
  // Per row: 確認 only when a verified quote names this row's own fact and
  // country (src/core/evidence.ts). A Source line alone is 有提及.
  const factTag: LayerTag = 'mentioned';
  const rows: LayerRowView[] = [];

  const brandOrigin = cleanValue(p?.originCountry);
  rows.push(
    brandOrigin
      ? { key: 'brandOrigin', value: '', country: brandOrigin, tag: factVerified(result, 'brand', brandOrigin) ? 'confirmed' : factTag }
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

  // 製造商: the maker the answer names (Example Corporation · 日本), same tag
  // rule as the company rows. No row when the answer names none.
  const maker = cleanValue(p?.manufacturer);
  const makerCountry = cleanValue(p?.manufacturerCountry);
  if (maker || makerCountry) {
    rows.push({ key: 'manufacturer', value: maker, country: makerCountry || undefined, tag: factTag });
  }

  // One 零件 row per part country (Gamma label: 乳首、キャップ、フード ·
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
    if (!partOriginShown(ev) || ev.kind === 'model') continue;
    const base = { key: 'parts' as const, value: names.join(', '), names, country };
    if (ev.kind === 'label') rows.push({ ...base, tag: 'confirmed' });
    else
      rows.push({
        ...base,
        tag: ev.rating === 'confirmed' ? 'confirmed' : 'likely',
        grade: { rating: ev.rating, confidence: ev.confidence },
      });
  }

  const parents = (c?.parents ?? []).filter((x) => x.name?.trim());
  const picked = pickOwner(result);
  const parent =
    (picked && parents.find((x) => x.name.trim() === picked.name)) ??
    parents.find((x) => x.control === 'majority' || x.control === 'wholly') ??
    parents[0];
  if (parent) {
    rows.push({
      key: 'parent',
      value: parent.name.trim(),
      country:
        cleanValue(parent.country) ||
        (folded && picked?.name === parent.name.trim() ? picked.country : '') ||
        undefined,
      tag: 'mentioned',
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
      .filter((n) => Boolean(n) && !isUselessCooNote(n)) ?? []
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

/**
 * 模型參考（未經確認）: the main list holds only the confirmed country (the
 * headline); every other candidate, from any source, is listed here with its
 * % (when the answer gave one), its source and 未確認.
 */
function tierRows(result: CheckResult, core: ReturnType<typeof buildMadeInViewCore>): WeakCandidate[] {
  const cands = result.product?.originCandidates ?? [];
  const out: WeakCandidate[] = [];
  for (const c of core.candidates) {
    if (core.state === 'confirmed' && core.country && sameCountryLabel(c.label, core.country)) continue;
    const own =
      cands.find((x) => sameCountryLabel(x.label, c.label) && x.source === c.source) ??
      cands.find((x) => sameCountryLabel(x.label, c.label) && x.source !== 'ownership' && x.source !== 'manufacturer');
    // A part country with no likely/confirmed page grade is the model's guess.
    // Show it as 模型知識, with no % and no 零件／物料 label.
    const ev = PART_SOURCES.has(String(c.source)) ? partCountryEvidence(result, c.label) : undefined;
    const pagePart = ev?.kind === 'graded' && (ev.rating === 'likely' || ev.rating === 'confirmed');
    const barePart = ev !== undefined && !pagePart;
    const conf =
      !barePart && !c.neutral && !c.exactPages && own && Number.isFinite(own.confidence)
        ? Math.max(0, Math.min(1, own.confidence))
        : undefined;
    out.push({
      ...(c.neutral ? { neutral: true } : {}),
      ...(c.exactPages ? { exactPages: 1 as const } : {}),
      label: c.label,
      source: barePart || c.source === 'confirmed_coo' ? 'model_memory' : c.source,
      ...(conf !== undefined ? { confidence: conf } : {}),
      ...(c.sources?.length ? { sources: c.sources } : {}),
    });
  }
  for (const w of core.weakCandidates ?? []) if (!out.some((r) => sameCountryLabel(r.label, w.label))) out.push(w);
  return out;
}

/**
 * One row per country named by a fetched page or by the AI answer.
 * The denominator is every fetched page plus the AI answer, so a single
 * Gemini answer among four silent pages reads Germany (1/5).
 */
function sourceUrlKey(url: string): string {
  return url.replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
}

/** Pages the reader can open. Another model (型號不符) is not one of them. */
export function visibleSourceLines(result: CheckResult): string[] {
  const blocked = new Set(
    (result.meta?.searchExcluded ?? []).map((e) => sourceUrlKey(e.url)).filter(Boolean)
  );
  const sources = Array.isArray(result.sources) ? cleanSources(result.sources, 12) : [];
  return sources.filter((line) => {
    const url = splitSourceLine(line).url?.trim();
    return !url || !blocked.has(sourceUrlKey(url));
  });
}

function regionSourceRows(result: CheckResult): Array<{ region: string; sources: SourceRow[] }> {
  const sources = visibleSourceLines(result);
  const groups: Array<{ region: string; sources: SourceRow[] }> = [];
  for (const h of result.meta?.searchCoo ?? []) {
    if (!h.regionOnly || !cleanValue(h.country) || !h.url?.trim()) continue;
    const region = countryText(h.country) ?? h.country;
    const url = h.url.trim();
    const parts = splitSourceLine(sources.find((s) => s.includes(url)) ?? url);
    const host = sourceLabel({ title: '', url: parts.url ?? url });
    const label = sourceLabel(parts) || host || url;
    let group = groups.find((g) => sameCountryLabel(g.region, region));
    if (!group) {
      group = { region, sources: [] };
      groups.push(group);
    }
    if (group.sources.some((s) => s.url === (parts.url ?? url))) continue;
    group.sources.push({
      label,
      url: parts.url ?? url,
      host: host && host !== label ? host : undefined,
    });
  }
  return groups;
}

function buildSourceVotes(result: CheckResult): { votes: SourceVote[]; silent: number; total: number } {
  const blocked = new Set(
    (result.meta?.searchExcluded ?? []).map((e) => sourceUrlKey(e.url)).filter(Boolean)
  );
  const sources = visibleSourceLines(result);
  const urls = new Set<string>();
  for (const s of sources) {
    const url = splitSourceLine(s).url?.trim();
    if (url && !blocked.has(sourceUrlKey(url))) urls.add(url);
  }
  const hits = (result.meta?.searchCoo ?? []).filter(
    (h) =>
      !h.evidenceOnly &&
      Boolean(cleanValue(h.country)) &&
      Boolean(h.url?.trim()) &&
      (h.status === 'likely' || h.basis === 'model')
  );
  for (const h of hits) {
    const url = h.url!.trim();
    if (!blocked.has(sourceUrlKey(url))) urls.add(url);
  }

  const buckets: Array<{ country: string; sources: SourceRow[]; keys: Set<string> }> = [];
  const named = new Set<string>();
  const bucketFor = (country: string) => {
    const label = countryText(country) ?? country;
    let b = buckets.find((x) => sameCountryLabel(x.country, label));
    if (!b) {
      b = { country: label, sources: [], keys: new Set() };
      buckets.push(b);
    }
    return b;
  };
  const add = (country: string, key: string, row: SourceRow) => {
    if (!countryText(country) || isRegionNotCountry(country)) return;
    const b = bucketFor(country);
    if (b.keys.has(key)) return;
    b.keys.add(key);
    b.sources.push(row);
    named.add(key);
  };

  for (const h of hits) {
    const url = h.url!.trim();
    if (blocked.has(sourceUrlKey(url))) continue;
    const parts = splitSourceLine(sources.find((s) => s.includes(url)) ?? url);
    const host = sourceLabel({ title: '', url: parts.url ?? url });
    const label = sourceLabel(parts) || host || url;
    add(h.country, `page:${url}`, {
      label,
      url: parts.url ?? url,
      host: host && host !== label ? host : undefined,
      country: countryText(h.country) ?? h.country,
    });
  }

  const confirmedBasis = result.product?.madeInBasis;
  const confirmed =
    confirmedBasis === 'barcode' || confirmedBasis === 'label' || confirmedBasis === 'model';
  if (!confirmed && !regionOnlyPages(result)) {
    const aiCountries: string[] = [];
    for (const c of result.product?.originCandidates ?? []) {
      if (c.source === 'model_memory' && cleanValue(c.label)) aiCountries.push(c.label);
    }
    const madeIn = cleanValue(result.product?.madeIn);
    if (madeIn && !aiCountries.some((c) => sameCountryLabel(c, madeIn))) aiCountries.push(madeIn);
    for (const c of aiCountries) {
      add(c, 'ai', { label: '', ai: true, country: countryText(c) ?? c });
    }
  }
  // A page that names a region did write a place. It is not a silent source.
  for (const h of result.meta?.searchCoo ?? []) {
    if (h.regionOnly && h.url?.trim()) named.add(`page:${h.url.trim()}`);
  }
  // The AI answer counts only when it named a country. A silent answer is not
  // a row in 全部來源, so it must not inflate 「N 個來源」.
  const total = urls.size + (named.has('ai') ? 1 : 0);

  const votes = buckets
    .map((b) => ({
      country: b.country,
      n: b.keys.size,
      total,
      sources: withPathHints(b.sources).slice(0, 8),
    }))
    .filter((v) => v.n > 0)
    .sort((a, b) => b.n - a.n || a.country.localeCompare(b.country));
  return { votes, silent: Math.max(0, total - named.size), total };
}

/**
 * 「大多產自中國」: web-graded parts (or the components line) name one
 * country at likely/confirmed, clearly ahead of any other part country.
 * A model-only guess, a page that names a different country, and a
 * two-sided dispute stay 未確認. This is not a confirmed made-in.
 */
function mostlyCountry(
  result: CheckResult,
  core: { state: MadeInView['state']; candidates: CandRow[]; dispute?: DisputeSide[] },
  tier: WeakCandidate[]
): string | undefined {
  if (core.state !== 'unconfirmed' || (core.dispute?.length ?? 0) >= 2) return undefined;
  const cands = result.product?.originCandidates ?? [];
  const lead: { label: string; confidence: number }[] = [];
  for (const row of tier) {
    if (!MOSTLY_SOURCES.has(String(row.source)) || modelOnlyPartCandidate(result, row)) continue;
    const own = cands.find((c) => c.source === row.source && sameCountryLabel(c.label, row.label));
    if (own?.rating !== 'likely' && own?.rating !== 'confirmed') continue;
    const confidence = row.confidence ?? own.confidence ?? 0;
    if (confidence < MOSTLY_MIN) continue;
    const i = lead.findIndex((x) => sameCountryLabel(x.label, row.label));
    if (i === -1) lead.push({ label: row.label, confidence });
    else if (confidence > lead[i]!.confidence) lead[i]!.confidence = confidence;
  }
  lead.sort((a, b) => b.confidence - a.confidence);
  const top = lead[0];
  if (!top) return undefined;
  const next = lead[1];
  if (next && top.confidence - next.confidence < MOSTLY_GAP) return undefined;
  // A finished-unit country (the model's made-in, or a page) that is not the
  // parts country stays the made-in story. Parts do not become 「大多產自」.
  if (
    core.candidates.some(
      (c) =>
        (c.source === 'web_name' || c.source === 'model_memory' || c.source === 'confirmed_coo') &&
        !sameCountryLabel(c.label, top.label)
    )
  ) {
    return undefined;
  }
  return top.label;
}

/** Stamp 已確認 from the fetched pages when the server has not already. */
function withPageConfirmation(result: CheckResult): CheckResult {
  const basis = result.product?.madeInBasis;
  if (basis === 'barcode' || basis === 'label' || basis === 'model') return result;
  const pages = result.meta?.searchCoo ?? [];
  const found = confirmingCountry(pages, result.product?.madeIn);
  if (!found) return result;
  return {
    ...result,
    product: {
      ...result.product,
      madeIn: found.country,
      madeInBasis: 'model',
      madeInSupport: found.support,
    },
    meta: {
      ...result.meta,
      searchCoo: pages.map((h) =>
        h.url && h.country && !isRegionNotCountry(h.country) ? { ...h, exactModel: true } : h
      ),
    },
  };
}

export function buildMadeInView(result: CheckResult): MadeInView {
  const stamped = withPageConfirmation(result);
  const core = buildMadeInViewCore(stamped);
  const tier = tierRows(stamped, core);
  const { votes, silent, total } = buildSourceVotes(stamped);
  const regionRows = regionSourceRows(stamped);
  // 「大多產自」 is a parts headline. Agreeing pages confirm, or they stay 未確認.
  const mostly = mostlyCountry(stamped, core, tier);
  return {
    ...core,
    ...(mostly ? { mostly } : {}),
    unconfirmedTier: tier,
    votes,
    regionRows,
    silent,
    sourceTotal: total,
    citedRows: citedRows(stamped),
    excludedRows: excludedRows(stamped),
    designRows: designRows(stamped, core.state === 'confirmed' ? core.country : undefined),
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
    // A brand country only with the page that says it (no unsourced 「X品牌」).
    if (d.kind === 'brand' && !quoteNamesBrand(d.quote, country)) continue;
    if (rows.some((r) => sameCountryLabel(r.country, country))) continue;
    const url = d.url?.trim();
    let source: SourceRow | undefined;
    if (url) {
      const parts = splitSourceLine(sources.find((s) => s.includes(url)) ?? url);
      const host = sourceLabel({ title: '', url: parts.url ?? url });
      const label = sourceLabel(parts) || host || url;
      source = { label, url: parts.url ?? url, host: host && host !== label ? host : undefined };
    }
    const brand = d.kind === 'brand';
    rows.push({
      country: countryText(country) ?? country,
      kind: brand ? 'brand' : 'design',
      ...(source ? { source } : {}),
      ...(brand && factVerified(result, 'brand', country) ? { verified: true } : {}),
    });
    if (rows.length >= MAX_DESIGN_ROWS) break;
  }
  return rows;
}
