import type { CheckResult, RelationTier } from '../core/types';
import type { TFunction } from '../core/i18n';
import { normalizeRegion } from '../../functions/_lib/regions';
import { TierBadge } from './TierBadge';
import { localizeServerText } from '../core/localizeServerText';

type AltItem = {
  name: string;
  relationTier?: RelationTier;
  note?: string;
  madeIn?: string;
  originCountry?: string;
  hqCountry?: string;
};

function sameGeoLabel(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  if (na === nb) return true;
  const sa = na.replace(/[^a-z0-9\u4e00-\u9fff]+/g, '');
  const sb = nb.replace(/[^a-z0-9\u4e00-\u9fff]+/g, '');
  return sa.length >= 2 && sa === sb;
}

/**
 * Client-side safety net: never show Direct / made-in-China items under
 * "lower China-involvement" (covers old cached history entries too).
 */
export function isLowerChinaCandidate(b: AltItem): boolean {
  if (b.relationTier === 'direct') return false;
  if (normalizeRegion(b.madeIn) === 'CN' || normalizeRegion(b.originCountry) === 'CN') return false;
  const tier = b.relationTier;
  if (
    (tier === 'none' || tier === 'indirect') &&
    b.madeIn &&
    (sameGeoLabel(b.madeIn, b.originCountry) || sameGeoLabel(b.madeIn, b.hqCountry))
  ) {
    return false;
  }
  return true;
}

export function AlternativeCards({
  alternatives,
  t,
}: {
  alternatives?: CheckResult['alternatives'];
  t: TFunction;
}) {
  const brands = (alternatives?.brands ?? []).filter(isLowerChinaCandidate);
  const products = (alternatives?.products ?? []).filter(isLowerChinaCandidate);
  if (!brands.length && !products.length) return null;

  const renderItem = (b: AltItem, key: string) => (
    <li key={key} className="alt-card">
      <div className="alt-card-top">
        <strong>{b.name}</strong>
        {b.relationTier ? (
          <span className="alt-tier-wrap">
            <TierBadge
              tier={b.relationTier}
              label={t(`tier.${b.relationTier}`)}
              size="sm"
            />
            <span className="muted alt-est">({t('check.estimated')})</span>
          </span>
        ) : null}
      </div>
      {b.madeIn || b.originCountry || b.hqCountry ? (
        <p className="alt-facts">
          {b.madeIn ? <span className="rc-chip">{`${t('check.madeIn')} ${b.madeIn}`}</span> : null}
          {b.originCountry ? <span className="rc-chip">{`${t('check.origin')} ${b.originCountry}`}</span> : null}
          {b.hqCountry ? <span className="rc-chip">{`${t('check.hq')} ${b.hqCountry}`}</span> : null}
        </p>
      ) : null}
      {b.note ? <p className="muted">{localizeServerText(t, b.note)}</p> : null}
    </li>
  );

  return (
    <div className="alt-cards">
      <p className="muted alt-disclaimer">{t('check.altDisclaimer')}</p>
      {brands.length ? (
        <div>
          <h3 className="result-section-title">{t('check.altBrands')}</h3>
          <ul className="alt-list alt-list--grid">
            {brands.map((b) => renderItem(b, `b-${b.name}`))}
          </ul>
        </div>
      ) : null}
      {products.length ? (
        <div className={brands.length ? 'alt-products' : undefined}>
          <h3 className="result-section-title">{t('check.altProducts')}</h3>
          <ul className="alt-list alt-list--grid">
            {products.map((b) => renderItem(b, `p-${b.name}`))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
