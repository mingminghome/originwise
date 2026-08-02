import type { CheckResult } from '../core/types';
import type { TFunction } from '../core/i18n';
import { formatTierReason } from '../core/i18n/tierReasons';
import { AlternativeCards } from './AlternativeCards';
import { OriginMap } from './OriginMap';
import { RelationGraph } from './RelationGraph';
import { TierBadge } from './TierBadge';

export function ResultPanel({
  result,
  provider,
  cached,
  t,
}: {
  result: CheckResult;
  provider?: string | null;
  cached?: boolean;
  t: TFunction;
}) {
  return (
    <div className="ask-result" role="status">
      <div className="ask-result-head">
        <h2 className="ask-result-title">{result.title}</h2>
        <div className="ask-result-meta muted">
          {provider ? t('check.answeredBy', { name: provider }) : null}
          {result.meta?.agents && result.meta.agents.length > 1 ? (
            <>
              {' · '}
              {t('check.agentsUsed', { n: result.meta.agents.length })}
              {': '}
              {result.meta.agents
                .filter((a) => a.ok !== false)
                .map((a) => `${a.id}${a.provider ? `@${a.provider}` : ''}`)
                .join(', ')}
            </>
          ) : null}
          {cached ? ` · ${t('check.cached')}` : null}
          {result.meta?.degraded ? ` · ${t('check.degraded')}` : null}
        </div>
      </div>

      {/* Hero: colored tier is the only chromatic accent on results */}
      <div className="result-tier-hero">
        <p className="result-tier-label muted">{t('check.relationLabel')}</p>
        <TierBadge
          tier={result.relationTier}
          label={t(`tier.${result.relationTier}`)}
          size="lg"
        />
        {typeof result.confidence === 'number' ? (
          <span className="muted result-tier-conf">
            {t('check.confidence', {
              n: Math.round(result.confidence * 100),
            })}
          </span>
        ) : null}
      </div>

      <p className="ask-result-summary">{result.summary}</p>

      <OriginMap regions={result.regions} t={t} />

      {(result.product || result.company) && (
        <div className="result-facts" style={{ marginTop: '0.85rem' }}>
          {result.product ? (
            <div className="card-soft">
              <h3 className="result-section-title">{t('check.productFacts')}</h3>
              <ul className="muted fact-list">
                {result.product.brand ? (
                  <li>
                    {t('check.brand')}: {result.product.brand}
                  </li>
                ) : null}
                {result.product.madeIn ? (
                  <li>
                    {t('check.madeIn')}: {result.product.madeIn}
                  </li>
                ) : null}
                {result.product.originCountry ? (
                  <li>
                    {t('check.origin')}: {result.product.originCountry}
                  </li>
                ) : null}
                {result.product.manufacturer ? (
                  <li>
                    {t('check.manufacturer')}: {result.product.manufacturer}
                    {result.product.manufacturerCountry
                      ? ` (${result.product.manufacturerCountry})`
                      : ''}
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
          {result.company ? (
            <div className="card-soft" style={{ marginTop: 8 }}>
              <h3 className="result-section-title">{t('check.companyFacts')}</h3>
              <ul className="muted fact-list">
                {result.company.name ? (
                  <li>
                    {t('check.company')}: {result.company.name}
                  </li>
                ) : null}
                {result.company.hqCountry ? (
                  <li>
                    {t('check.hq')}: {result.company.hqCountry}
                  </li>
                ) : null}
                {result.company.parents?.length ? (
                  <li>
                    {t('check.parents')}:{' '}
                    {result.company.parents.map((p) => p.name).join(', ')}
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {result.graph?.nodes?.length ? (
        <div style={{ marginTop: '0.85rem' }}>
          <RelationGraph graph={result.graph} t={t} />
        </div>
      ) : null}

      {result.tierReasons?.length ? (
        <div style={{ marginTop: '0.75rem' }}>
          <h3 className="result-section-title">{t('check.reasons')}</h3>
          <ul className="tier-reasons-list">
            {result.tierReasons.map((r) => (
              <li key={r}>{formatTierReason(r, t, result)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div style={{ marginTop: '0.85rem' }}>
        <AlternativeCards alternatives={result.alternatives} t={t} />
      </div>

      {result.caveats?.length ? (
        <div className="ask-result-caveats" style={{ marginTop: '0.75rem' }}>
          <h3 className="ask-result-caveats-title">{t('check.caveats')}</h3>
          <ul>
            {result.caveats.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="muted" style={{ marginTop: '0.85rem', fontSize: '0.8rem' }}>
        {result.knowledgeCutoffNote || t('check.disclaimer')}
      </p>
    </div>
  );
}
