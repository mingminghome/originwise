/**
 * China link first: one line per link to China, from fields the result
 * already has (HQ, controlling owner, brand origin, made-in, parts).
 * Made-in keeps its strict rule; a company link never stands in for it.
 *
 * "China" here uses the same region rules as the server tier
 * (functions/_lib/regions.ts): mainland China (PRC) only by default.
 * Taiwan is never China. Hong Kong / Macau count only when the result was
 * checked with geoScope 'greater_china' — under the default 'prc' scope they
 * are separate places, so an HK-HQ company gets no chip.
 */
import { hqFoldedIntoParent, parentNamedInCompany } from '../../functions/_lib/chinaChip';
import { inScope, normalizeRegion, type GeoScope } from '../../functions/_lib/regions';
import { cleanSources, splitSourceLine } from '../../functions/_lib/sourceLine';
import { tierFromCodes } from '../../functions/_lib/tierRules';
import type { CheckResult, RelationTier } from '../core/types';

export type LinkStatus = 'china' | 'notChina' | 'unconfirmed';
export type ChinaLinkRow = {
  key: 'hq' | 'owner' | 'brandOrigin' | 'madeIn' | 'parts';
  status: LinkStatus;
  value: string;
  detail?: string;
};

/**
 * Company-level chip:
 * - 'chinaCompany' only when the company's own HQ is in China (Anker, TP-Link).
 * - 'chinaControlled' when the HQ is elsewhere but a majority / wholly
 *   controlling parent is in China (Cybex → Goodbaby).
 */
export type ChinaChip = 'chinaCompany' | 'chinaControlled' | null;

const VAGUE_RE = /^(unknown|n\/?a|none|null|unclear|not\s+(known|stated|confirmed)|unconfirmed|未知|不明|不詳|未確認|未确认|-|—)?$/i;

/** True for mainland China; HK/Macau only under 'greater_china'; Taiwan never. */
export function isChinaCountry(raw?: string, scope: GeoScope = 'prc'): boolean {
  return inScope(normalizeRegion(String(raw ?? '').trim()), scope);
}

function clean(raw?: string): string {
  const s = String(raw ?? '').trim();
  return VAGUE_RE.test(s) ? '' : s;
}

function scopeOf(result: CheckResult): GeoScope {
  return result.geoScope === 'greater_china' ? 'greater_china' : 'prc';
}

/**
 * True when the answer's China HQ is really a Chinese parent folded into the
 * company (brand origin elsewhere). See functions/_lib/chinaChip.ts.
 */
export function brandHqFolded(result: CheckResult): boolean {
  return hqFoldedIntoParent(
    {
      brandOrigin: clean(result.product?.originCountry),
      hqCountry: clean(result.company?.hqCountry),
      companyName: result.company?.name,
      parents: result.company?.parents,
    },
    scopeOf(result)
  );
}

/** The parent shown in 控股／母公司 (China-controlling first). */
export function pickOwner(result: CheckResult):
  | { name: string; country: string; control?: string }
  | undefined {
  const scope = scopeOf(result);
  const c = result.company;
  const folded = brandHqFolded(result);
  const owners = (c?.parents ?? []).filter((o) => o.name?.trim());
  const controlling = owners.filter((o) => o.control === 'majority' || o.control === 'wholly');
  const isCn = (v?: string) => isChinaCountry(clean(v), scope);
  const owner = folded
    ? owners.find((o) => isCn(o.country)) ??
      owners.find((o) => parentNamedInCompany(c?.name, o))
    : controlling.find((o) => isCn(o.country)) ?? controlling[0];
  if (!owner) return undefined;
  // Folded: a parent with no country owns the China HQ the answer reported.
  const country = clean(owner.country) || (folded ? clean(c?.hqCountry) : '');
  return { name: owner.name.trim(), country, control: owner.control };
}

export function buildChinaLinks(result: CheckResult): {
  rows: ChinaLinkRow[];
  chip: ChinaChip;
  /** The reported China HQ belongs to the parent, not the brand. */
  hqFolded: boolean;
} {
  const scope = scopeOf(result);
  const isCn = (v: string) => isChinaCountry(v, scope);
  const statusOf = (country: string): LinkStatus =>
    !country ? 'unconfirmed' : isCn(country) ? 'china' : 'notChina';

  const p = result.product;
  const c = result.company;
  const rows: ChinaLinkRow[] = [];
  const hqFolded = brandHqFolded(result);
  const hq = hqFolded ? '' : clean(c?.hqCountry);
  const company = c?.name?.trim() || p?.brand?.trim() || '';
  if (hq) rows.push({ key: 'hq', status: statusOf(hq), value: hq, detail: company || undefined });
  else if (hqFolded) rows.push({ key: 'hq', status: 'unconfirmed', value: '' });

  const owner = pickOwner(result);
  const controlsBrand =
    owner !== undefined &&
    (hqFolded || owner.control === 'majority' || owner.control === 'wholly');
  if (owner) {
    rows.push({
      key: 'owner',
      status: statusOf(owner.country),
      value: owner.country,
      detail: owner.name,
    });
  }

  const brandOrigin = clean(p?.originCountry);
  if (brandOrigin && !(hq && brandOrigin.toLowerCase() === hq.toLowerCase())) {
    rows.push({ key: 'brandOrigin', status: statusOf(brandOrigin), value: brandOrigin });
  }

  // No made-in / parts rows: made-in is decided only in the 製造地 card.

  const hqChina = hq !== '' && isCn(hq);
  const ownerChina = controlsBrand && isCn(owner!.country);
  // 中國公司 only for the brand's own China HQ; a Chinese parent → 中資控股.
  const chip: ChinaChip = hqChina ? 'chinaCompany' : ownerChina ? 'chinaControlled' : null;
  return { rows, chip, hqFolded };
}

/**
 * Result as the China card should read it: only company-level places, so a
 * reason line like 「明確地點訊號在中國大陸以外：…」 never lists a made-in
 * country, and a folded parent HQ is not shown as the brand's HQ.
 */
export function companyView(result: CheckResult): CheckResult {
  const p = result.product;
  return {
    ...result,
    product: p
      ? { ...p, madeIn: undefined, manufacturedIn: undefined, manufacturerCountry: undefined }
      : p,
    company:
      result.company && brandHqFolded(result)
        ? { ...result.company, hqCountry: undefined }
        : result.company,
  };
}

/** Floor for a China HQ / China-controlling parent (company-level evidence). */
export const COMPANY_DIRECT_MIN_CONFIDENCE = 0.75;

/**
 * Company rows count as sourced (tag 確認) only after web research that left
 * at least one Source line. Model memory alone is 有提及 and gets no floor.
 */
export function companyFactsSourced(result: CheckResult): boolean {
  return (
    result.knowledgeBasis === 'web_enriched' &&
    cleanSources(Array.isArray(result.sources) ? result.sources : [], 8).length > 0
  );
}

/**
 * Made-in confirmed by a barcode page or the package label. A made-in without
 * that basis is a model reference only (candidate row, never a verdict).
 */
export function confirmedMadeIn(
  result: CheckResult
): { country: string; basis: 'barcode' | 'label' } | undefined {
  const p = result.product;
  const madeIn = clean(p?.madeIn);
  if (!madeIn) return undefined;
  if (p?.madeInBasis === 'barcode' || p?.madeInBasis === 'label') {
    return { country: madeIn, basis: p.madeInBasis };
  }
  const meta = result.meta;
  if (
    meta?.searchMatch === 'barcode' &&
    (meta.searchCoo ?? []).some((c) => c.status === 'confirmed' && c.basis === 'barcode')
  ) {
    return { country: madeIn, basis: 'barcode' };
  }
  return undefined;
}

/**
 * Stake words (全資 / 多數控股 / 少數股權) only when a Source line says so.
 * Source lines carry titles only here, so this matches the title text.
 */
const STAKE_RE: Record<'wholly' | 'majority' | 'minority', RegExp> = {
  wholly: /wholly[\s-]*owned|\b100\s*%|全資|全资|完全子会社|100%子会社/i,
  majority: /majority[\s-]*(?:owned|stake|share|control)|多數股權|多数股权|過半|过半|過半數/i,
  minority: /minority[\s-]*(?:stake|share|interest)|少數股權|少数股权|參股|参股/i,
};

export function stakeInSources(result: CheckResult, control?: string): boolean {
  if (control !== 'wholly' && control !== 'majority' && control !== 'minority') return false;
  const re = STAKE_RE[control];
  return cleanSources(Array.isArray(result.sources) ? result.sources : [], 12).some((line) =>
    re.test(splitSourceLine(line).title ?? line)
  );
}

export type ChinaCardChip = 'chinaCompany' | 'chinaControlled' | 'madeInChina';

/** One line in the China card; each maps to a row / fact shown in the card. */
export type ChinaCardReason =
  | { kind: 'code'; code: string }
  | { kind: 'parent' }
  | { kind: 'brandOrigin'; country: string }
  | { kind: 'madeIn'; country: string; basis: 'barcode' | 'label' }
  | { kind: 'pointer' };

export type ChinaCardView = {
  chips: ChinaCardChip[];
  tier: RelationTier;
  /** undefined → no confidence chip (made-in-only link: see the 製造地 card). */
  confidence?: number;
  hqFolded: boolean;
  hq: string;
  owner?: { name: string; country: string; control?: string };
  /** 'stated' stake word, neutral 「控股」, or nothing. */
  stake: { kind: 'stated'; control: string } | { kind: 'neutral' } | { kind: 'none' };
  brandOrigin: string;
  reasons: ChinaCardReason[];
};

/** Codes that never speak for a shown row; kept as caveats. */
const META_CODES = new Set([
  'verify_conflict',
  'taiwan_as_country',
  'conflict_no_strong',
  'insufficient',
  'ownership_not_assessed',
]);

/**
 * The China card, built only from facts it shows on screen:
 * - hq_cn → 總部 row (not when the HQ was reassigned to the parent)
 * - parent_majority_cn → 控股／母公司 row (one line per fact; a folded hq_cn or
 *   a named-parent ownership_strong_cn is the same fact)
 * - ownership_weak_cn → only with a named China parent holding a minority stake
 * - origin_cn → 品牌來源地 row
 * - made_in_cn → only label / barcode confirmed, as one 製造地 line
 * Unnamed ownership relations are dropped and do not feed tier / confidence.
 */
export function buildChinaCard(result: CheckResult): ChinaCardView {
  const scope = scopeOf(result);
  const isCn = (v?: string) => Boolean(v) && isChinaCountry(v, scope);
  const { chip, hqFolded } = buildChinaLinks(result);
  const c = result.company;
  const codes = result.tierReasons ?? [];
  const has = (k: string) => codes.includes(k);

  const hq = hqFolded ? '' : clean(c?.hqCountry);
  const parents = (c?.parents ?? []).filter((x) => x.name?.trim());
  const picked = pickOwner(result);
  const owner =
    picked ??
    (parents[0]
      ? { name: parents[0].name.trim(), country: clean(parents[0].country), control: parents[0].control }
      : undefined);
  const controlling =
    owner !== undefined &&
    (hqFolded || owner.control === 'majority' || owner.control === 'wholly');
  const ownerCnControlling = controlling && isCn(owner!.country);
  const ownerCnMinority = owner !== undefined && owner.control === 'minority' && isCn(owner.country);
  const brandOrigin = clean(result.product?.originCountry);
  const made = confirmedMadeIn(result);
  const madeCn = made !== undefined && isCn(made.country);

  // Codes as the card reads them (what may feed tier / confidence).
  const cardCodes: string[] = [];
  const add = (k: string) => {
    if (!cardCodes.includes(k)) cardCodes.push(k);
  };
  for (const k of codes) {
    if (k === 'hq_cn') add(hqFolded ? 'parent_majority_cn' : 'hq_cn');
    else if (k === 'ownership_strong_cn') {
      if (ownerCnControlling) add('parent_majority_cn');
    } else if (k === 'ownership_weak_cn') {
      if (ownerCnMinority) add('ownership_weak_cn');
    } else if (k === 'made_in_cn') {
      if (madeCn) add('made_in_cn');
    } else add(k);
  }
  if (madeCn) add('made_in_cn');
  const same =
    cardCodes.length === codes.length && cardCodes.every((k) => codes.includes(k));
  let tier: RelationTier = same ? result.relationTier : tierFromCodes(cardCodes);
  if (chip || madeCn) tier = 'direct';

  const chips: ChinaCardChip[] = [];
  if (chip) chips.push(chip);
  if (madeCn) chips.push('madeInChina');

  let confidence: number | undefined =
    typeof result.confidence === 'number' ? result.confidence : undefined;
  if (!chip && madeCn) {
    // Made-in-only link: the number lives once, in the 製造地 card.
    confidence = undefined;
  } else if (chip && confidence !== undefined && companyFactsSourced(result)) {
    confidence = Math.max(confidence, COMPANY_DIRECT_MIN_CONFIDENCE);
  }

  const reasons: ChinaCardReason[] = [];
  if (cardCodes.includes('hq_cn') && isCn(hq)) reasons.push({ kind: 'code', code: 'hq_cn' });
  if (cardCodes.includes('parent_majority_cn') && ownerCnControlling) reasons.push({ kind: 'parent' });
  if (cardCodes.includes('ownership_weak_cn') && ownerCnMinority) {
    reasons.push({ kind: 'code', code: 'ownership_weak_cn' });
  }
  if (has('origin_cn') && isCn(brandOrigin)) reasons.push({ kind: 'brandOrigin', country: brandOrigin });
  if (madeCn) reasons.push({ kind: 'madeIn', country: made!.country, basis: made!.basis });
  const nonCnShown = [hq, brandOrigin].some((v) => {
    const r = normalizeRegion(v);
    return r !== 'UNKNOWN' && !inScope(r, scope);
  });
  if (has('explicit_non_cn_geo') && nonCnShown) reasons.push({ kind: 'code', code: 'explicit_non_cn_geo' });
  for (const k of codes) if (META_CODES.has(k)) reasons.push({ kind: 'code', code: k });
  const madeInTalk = ['made_in_cn', 'manufacturer_cn', 'component_cn'].some(has);
  if (madeInTalk && !madeCn) reasons.push({ kind: 'pointer' });

  const stake: ChinaCardView['stake'] = !owner
    ? { kind: 'none' }
    : stakeInSources(result, owner.control)
      ? { kind: 'stated', control: owner.control! }
      : controlling
        ? { kind: 'neutral' }
        : { kind: 'none' };

  return { chips, tier, confidence, hqFolded, hq, owner, stake, brandOrigin, reasons };
}

/** Tier + confidence of the China card (also used by the history list). */
export function displayTier(result: CheckResult): {
  tier: RelationTier;
  confidence?: number;
} {
  const v = buildChinaCard(result);
  return { tier: v.tier, confidence: v.confidence };
}
