import type { CheckResult, RelationTier } from '../core/types';
import type { TFunction } from '../core/i18n';
import { TierBadge } from './TierBadge';

export function AlternativeCards({
  alternatives,
  t,
}: {
  alternatives?: CheckResult['alternatives'];
  t: TFunction;
}) {
  const brands = alternatives?.brands ?? [];
  const products = alternatives?.products ?? [];
  if (!brands.length && !products.length) return null;

  const renderItem = (
    b: { name: string; relationTier?: RelationTier; note?: string },
    key: string
  ) => (
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
      {b.note ? <p className="muted">{b.note}</p> : null}
    </li>
  );

  return (
    <div className="alt-cards">
      {brands.length ? (
        <div>
          <h3 className="result-section-title">{t('check.altBrands')}</h3>
          <ul className="alt-list">
            {brands.map((b) => renderItem(b, `b-${b.name}`))}
          </ul>
        </div>
      ) : null}
      {products.length ? (
        <div style={{ marginTop: brands.length ? 12 : 0 }}>
          <h3 className="result-section-title">{t('check.altProducts')}</h3>
          <ul className="alt-list">
            {products.map((b) => renderItem(b, `p-${b.name}`))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
