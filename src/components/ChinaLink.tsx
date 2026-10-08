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

export function buildChinaLinks(result: CheckResult): {
  rows: ChinaLinkRow[];
  chip: ChinaChip;
} {
  const scope: GeoScope = result.geoScope === 'greater_china' ? 'greater_china' : 'prc';
  const isCn = (v: string) => isChinaCountry(v, scope);
  const statusOf = (country: string): LinkStatus =>
    !country ? 'unconfirmed' : isCn(country) ? 'china' : 'notChina';

  const p = result.product;
  const c = result.company;
  const rows: ChinaLinkRow[] = [];
  const hq = clean(c?.hqCountry);
  const company = c?.name?.trim() || p?.brand?.trim() || '';
  if (hq) rows.push({ key: 'hq', status: statusOf(hq), value: hq, detail: company || undefined });

  const owners = (c?.parents ?? []).filter((o) => o.name?.trim());
  const controlling = owners.filter(
    (o) => o.control === 'majority' || o.control === 'wholly'
  );
  const owner = controlling.find((o) => isCn(clean(o.country))) ?? controlling[0];
  if (owner) {
    const country = clean(owner.country);
    rows.push({
      key: 'owner',
      status: statusOf(country),
      value: country,
      detail: owner.name.trim(),
    });
  }

  const brandOrigin = clean(p?.originCountry);
  if (brandOrigin && !(hq && brandOrigin.toLowerCase() === hq.toLowerCase())) {
    rows.push({ key: 'brandOrigin', status: statusOf(brandOrigin), value: brandOrigin });
  }

  const madeIn = clean(p?.madeIn);
  rows.push({ key: 'madeIn', status: statusOf(madeIn), value: madeIn });

  const chinaParts = (p?.parts ?? []).filter((x) =>
    isCn(clean(x.madeIn) || clean(x.originCountry))
  );
  if (chinaParts.length) {
    rows.push({
      key: 'parts',
      status: 'china',
      value: '',
      detail: chinaParts.map((x) => x.name).filter(Boolean).slice(0, 3).join('、'),
    });
  }

  const hqChina = hq !== '' && isCn(hq);
  const ownerChina = owner !== undefined && isCn(clean(owner.country));
  const chip: ChinaChip = hqChina ? 'chinaCompany' : ownerChina ? 'chinaControlled' : null;
  return { rows, chip };
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
  const { rows, chip } = buildChinaLinks(result);
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
            {r.detail ? <span className="china-link-detail muted">{r.detail}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
