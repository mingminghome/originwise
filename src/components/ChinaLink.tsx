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
import type { CheckResult, RelationTier } from '../core/types';
import type { TFunction } from '../core/i18n';
import { localizeCountry } from '../core/i18n/countries';

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
 * Tier reasons that speak about where the product is made (made-in,
 * manufacturer location, "product origin", parts). The China card never
 * repeats them: made-in is decided only in the 製造地 card (barcode / label).
 */
export const MADE_IN_REASONS: ReadonlySet<string> = new Set([
  'made_in_cn',
  'manufacturer_cn',
  'origin_cn',
  'component_cn',
]);

/** Reason codes for the China card + whether made-in reasons were held back. */
export function chinaCardReasons(codes: readonly string[] | undefined): {
  shown: string[];
  madeInHidden: boolean;
} {
  const all = codes ?? [];
  const shown = all.filter((c) => !MADE_IN_REASONS.has(c));
  return { shown, madeInHidden: shown.length !== all.length };
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
 * Tier + confidence shown on the badge. A China HQ or China-controlling
 * parent is a direct link, so the badge never reads weaker than the China
 * card (older cached results could say 'indirect' / 50%).
 */
export function displayTier(result: CheckResult): {
  tier: RelationTier;
  confidence?: number;
} {
  const { chip } = buildChinaLinks(result);
  if (!chip) return { tier: result.relationTier, confidence: result.confidence };
  const conf =
    typeof result.confidence === 'number'
      ? Math.max(result.confidence, COMPANY_DIRECT_MIN_CONFIDENCE)
      : undefined;
  return { tier: 'direct', confidence: conf };
}

export function ChinaLink({ result, t }: { result: CheckResult; t: TFunction }) {
  const { rows, chip, hqFolded } = buildChinaLinks(result);
  if (!rows.length) return null;
  return (
    <section className="china-link" data-testid="china-link">
      <h3 className="result-section-title">{t('check.chinaLink.title')}</h3>
      {chip ? (
        <p className={`china-link-company is-${chip}`} data-testid="china-chip">
          {t(`check.chinaLink.${chip}`)}
        </p>
      ) : null}
      <ul className="china-link-rows">
        {rows.map((r) => (
          <li key={r.key} className={`china-link-row is-${r.status}`}>
            <span className="china-link-label">{t(`check.chinaLink.${r.key}`)}</span>
            <span className={`china-link-status is-${r.status}`}>
              {r.key === 'parts'
                ? t('check.chinaLink.partsChina')
                : r.status === 'unconfirmed'
                  ? t('check.chinaLink.unconfirmed')
                  : localizeCountry(t, r.value)}
            </span>
            {r.key === 'hq' && hqFolded ? (
              <span className="china-link-detail muted">{t('check.chinaLink.hqParentNote')}</span>
            ) : r.detail ? (
              <span className="china-link-detail muted">{r.detail}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
