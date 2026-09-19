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
  /不依賴中國|不依赖中国|非中國(?:生產|製造|產製|廠區|厂区|地區|地区)|非中国(?:生产|制造|厂区|地区)|not made in china|not manufactured in china|does not rely on china/i;

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
  if (b.madeIn && CN_HINT.test(b.madeIn)) return false;
  if (b.originCountry && CN_HINT.test(b.originCountry) && !b.madeIn) return false;
  if (b.note && CN_HINT.test(b.note) && (!b.madeIn || CN_HINT.test(b.madeIn))) {
    return false;
  }
  const note = b.note || '';
  const tier = b.relationTier;
  if (
    (tier === 'none' || tier === 'indirect') &&
    (DESIGN_MFG_STEREOTYPE.test(note) || DENY_CN_MFG.test(note))
  ) {
    return false;
  }
  // Brand/design country copied into madeIn is not factory evidence.
  if (
    (tier === 'none' || tier === 'indirect') &&
    b.madeIn &&
    (sameGeoLabel(b.madeIn, b.originCountry) || sameGeoLabel(b.madeIn, b.hqCountry))
  ) {
    return false;
  }
  if (/代理|distributor/i.test(b.name)) return false;
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
