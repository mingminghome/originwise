import type { CheckResult, RelationTier } from '../core/types';
import type { TFunction } from '../core/i18n';
import { TierBadge } from './TierBadge';

type AltItem = {
  name: string;
  relationTier?: RelationTier;
  note?: string;
  madeIn?: string;
  originCountry?: string;
  hqCountry?: string;
};

const CN_HINT =
  /\b(china|prc|mainland\s*china|people'?s\s*republic|made\s*in\s*cn|manufactured\s*in\s*china|中國|中国|中國大陸|中国大陆)\b/i;

const DESIGN_MFG_STEREOTYPE =
  /設計.{0,12}(與|和|及).{0,8}(製造|生產|制造|生产)|designed.{0,24}manufactur|design(?:ed)?.{0,16}(?:and|&).{0,12}(?:made|manufactur|produced)/i;

const DENY_CN_MFG =
  /非中國(?:生產|製造|產製)|非中国(?:生产|制造)|not made in china|not manufactured in china/i;

/**
 * Client-side safety net: never show Direct / made-in-China items under
 * "lower China-involvement" (covers old cached history entries too).
 */
export function isLowerChinaCandidate(b: AltItem): boolean {
  if (b.relationTier === 'direct') return false;
  if (b.madeIn && CN_HINT.test(b.madeIn)) return false;
  if (b.originCountry && CN_HINT.test(b.originCountry) && !b.madeIn) return false;
  if (b.note && CN_HINT.test(b.note) && (!b.madeIn || CN_HINT.test(b.madeIn))) {
    return false;
  }
  const note = b.note || '';
  if (
    b.relationTier === 'none' &&
    (DESIGN_MFG_STEREOTYPE.test(note) || DENY_CN_MFG.test(note))
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
        <p className="muted alt-geo">
          {[
            b.madeIn ? `${t('check.madeIn')}: ${b.madeIn}` : null,
            b.originCountry ? `${t('check.origin')}: ${b.originCountry}` : null,
            b.hqCountry ? `${t('check.hq')}: ${b.hqCountry}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}
      {b.note ? <p className="muted">{b.note}</p> : null}
    </li>
  );

  return (
    <div className="alt-cards">
      <p className="muted alt-disclaimer">{t('check.altDisclaimer')}</p>
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
