import type { CheckResult } from '../core/types';
import type { TFunction } from '../core/i18n';
import { formatTierReason } from '../core/i18n/tierReasons';
import { AlternativeCards } from './AlternativeCards';
import { OriginMap } from './OriginMap';
import { RelationGraph } from './RelationGraph';
import { TierBadge } from './TierBadge';

function agentLabel(id: string, t: TFunction): string {
  const key = `check.agent.${id}`;
  const label = t(key);
  return label === key ? id : label;
}

function providerLabel(p: string | undefined, t: TFunction): string {
  if (!p) return t('check.agent.unknownProvider');
  const key = `check.provider.${p}`;
  const label = t(key);
  return label === key ? p : label;
}

function AgentsPoolCard({
  agents,
  provider,
  cached,
  degraded,
  t,
}: {
  agents: NonNullable<NonNullable<CheckResult['meta']>['agents']>;
  provider?: string | null;
  cached?: boolean;
  degraded?: boolean;
  t: TFunction;
}) {
  const okCount = agents.filter((a) => a.ok !== false).length;
  const failCount = agents.length - okCount;

  return (
    <div className="agents-pool-card card-soft">
      <div className="agents-pool-head">
        <h3 className="result-section-title">{t('check.agentsTitle')}</h3>
        <p className="muted agents-pool-summary">
          {t('check.agentsSummary', {
            total: agents.length,
            ok: okCount,
            fail: failCount,
          })}
          {provider
            ? ` · ${t('check.answeredBy', { name: providerLabel(provider, t) })}`
            : null}
          {cached ? ` · ${t('check.cached')}` : null}
          {degraded ? ` · ${t('check.degraded')}` : null}
        </p>
      </div>
      <ul className="agents-pool-list">
        {agents.map((a, i) => {
          const ok = a.ok !== false;
          return (
            <li
              key={`${a.id}-${a.provider ?? i}`}
              className={ok ? 'agent-row agent-row--ok' : 'agent-row agent-row--fail'}
            >
              <span className="agent-row-status" aria-hidden>
                {ok ? '✓' : '×'}
              </span>
              <div className="agent-row-body">
                <div className="agent-row-title">
                  <strong>{agentLabel(a.id, t)}</strong>
                  <span className="agent-row-provider">
                    {providerLabel(a.provider, t)}
                  </span>
                </div>
                <p className="muted agent-row-meta">
                  {ok
                    ? t('check.agentOk')
                    : t('check.agentFail', {
                        err: a.error || t('check.agentFailUnknown'),
                      })}
                  {typeof a.ms === 'number' ? ` · ${a.ms}ms` : null}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="muted agents-pool-hint">{t('check.agentsHint')}</p>
    </div>
  );
}

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
  const agents = result.meta?.agents ?? [];

  return (
    <div className="ask-result" role="status">
      <div className="ask-result-head">
        <h2 className="ask-result-title">{result.title}</h2>
        <div className="ask-result-meta muted">
          {provider
            ? t('check.answeredBy', {
                name: providerLabel(provider, t),
              })
            : null}
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

      {agents.length > 0 ? (
        <div style={{ marginTop: '0.85rem' }}>
          <AgentsPoolCard
            agents={agents}
            provider={provider}
            cached={cached}
            degraded={result.meta?.degraded}
            t={t}
          />
        </div>
      ) : null}

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
                    {t('check.brandOrigin')}: {result.product.originCountry}
                  </li>
                ) : null}
                {result.product.componentsOrigin ? (
                  <li>
                    {t('check.componentsOrigin')}:{' '}
                    {result.product.componentsOrigin}
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
                {result.product.notes?.length ? (
                  <li className="fact-notes">
                    {t('check.productNotes')}:{' '}
                    {result.product.notes.join(' · ')}
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
