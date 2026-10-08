import type { CheckResult } from '../core/types';
import { ChinaLink, chinaCardReasons, companyView, displayTier } from './ChinaLink';
import type { TFunction } from '../core/i18n';
import { formatTierReason } from '../core/i18n/tierReasons';
import { AlternativeCards } from './AlternativeCards';
import { OriginLayers } from './OriginLayers';
import { OriginMap } from './OriginMap';
import { RelationGraph } from './RelationGraph';
import { TierBadge } from './TierBadge';
import { localizeServerText } from '../core/localizeServerText';
import { resultTitle } from '../core/resultTitle';

function agentLabel(id: string, t: TFunction): string {
  const key = `check.agent.${id}`;
  const label = t(key);
  return label === key ? id : label;
}

const SEARCH_PROVIDER_IDS = new Set(['gemini', 'brave', 'firecrawl']);

/** Display name of the web search service (Google Search / Brave / Firecrawl). */
function searchProviderLabel(p: string | undefined, t: TFunction): string | null {
  if (!p || !SEARCH_PROVIDER_IDS.has(p)) return null;
  return t(`check.searchVia.${p}`);
}

function providerLabel(p: string | undefined, t: TFunction): string {
  if (!p) return t('check.agent.unknownProvider');
  const key = `check.provider.${p}`;
  const label = t(key);
  return label === key ? p : label;
}

/** Map raw agent error codes to short UI labels. */
function agentErrorLabel(code: string | undefined, t: TFunction): string {
  if (!code) return t('check.agentFailUnknown');
  if (code === 'parse_error') return t('check.parseError');
  const key = `check.agentError.${code}`;
  const label = t(key);
  return label === key ? code : label;
}

function AgentsPoolCard({
  agents,
  t,
}: {
  agents: NonNullable<NonNullable<CheckResult['meta']>['agents']>;
  t: TFunction;
}) {
  return (
    <div className="agents-pool-card">
      <ul className="agents-pool-list">
        {agents.map((a, i) => {
          const skipped =
            a.ok === false &&
            (a.error === 'search_grounding_unavailable' ||
              a.error === 'disabled');
          const ok = a.ok !== false;
          return (
            <li
              key={`${a.id}-${a.provider ?? i}`}
              className={
                ok
                  ? 'agent-row agent-row--ok'
                  : skipped
                    ? 'agent-row agent-row--skip'
                    : 'agent-row agent-row--fail'
              }
            >
              <span className="agent-row-status" aria-hidden>
                {ok ? '✓' : skipped ? '–' : '×'}
              </span>
              <div className="agent-row-body">
                <div className="agent-row-title">
                  <strong>{agentLabel(a.id, t)}</strong>
                  <span className="agent-row-provider">
                    {a.id === 'web'
                      ? searchProviderLabel(a.provider, t) ?? providerLabel(a.provider, t)
                      : providerLabel(a.provider, t)}
                  </span>
                </div>
                <p className="muted agent-row-meta">
                  {ok
                    ? t('check.agentOk')
                    : t(skipped ? 'check.agentSkipped' : 'check.agentFail', {
                        err: agentErrorLabel(a.error, t),
                      })}
                  {typeof a.ms === 'number' ? ` · ${a.ms}ms` : null}
                  {a.id === 'web' && typeof a.requests === 'number' && a.requests > 0
                    ? ` · ${t('check.searchUsage', {
                        provider: searchProviderLabel(a.provider, t) ?? a.provider ?? '',
                        n: a.requests,
                      })}`
                    : null}
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
  query,
  t,
}: {
  result: CheckResult;
  provider?: string | null;
  cached?: boolean;
  /** What the user typed; shown as the headline (see resultTitle). */
  query?: string | null;
  t: TFunction;
}) {
  const agents = result.meta?.agents ?? [];
  const skippedAgent = (a: (typeof agents)[number]) =>
    a.ok === false &&
    (a.error === 'search_grounding_unavailable' || a.error === 'disabled');
  const failCount = agents.filter((a) => a.ok === false && !skippedAgent(a)).length;
  const okCount = agents.filter((a) => a.ok !== false).length;
  // Older cached results may still carry echoed schema keys like "(madeIn)".
  const notes =
    result.product?.notes
      ?.map((n) =>
        n
          .replace(
            /\s*[(（]\s*(?:madeIn|manufacturedIn|originCountry|componentsOrigin|manufacturerCountry|hqCountry|chinaRelated)\s*[)）]/g,
            ''
          )
          .trim()
      )
      .filter(Boolean) ?? [];
  const searchName = searchProviderLabel(result.meta?.searchProvider, t);
  const shown = displayTier(result);
  const reasons = chinaCardReasons(result.tierReasons);
  const title = resultTitle(result, query);
  const searchRequests = result.meta?.searchRequests;

  return (
    <div className="ask-result" role="status">
      <header className="result-verdict">
        <div className="ask-result-head">
          <h2 className="ask-result-title">{title.title}</h2>
          {title.modelName ? (
            <p className="muted ask-result-identified" data-testid="identified-as">
              {t('check.identifiedAs', { name: title.modelName })}
            </p>
          ) : null}
          <p className="ask-result-meta muted">
            {[
              provider
                ? t('check.answeredBy', { name: providerLabel(provider, t) })
                : null,
              cached ? t('check.cached') : null,
              result.meta?.degraded ? t('check.degraded') : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="result-tier-hero">
          <p className="result-tier-label muted">{t('check.relationLabel')}</p>
          <TierBadge
            tier={shown.tier}
            label={t(`tier.${shown.tier}`)}
            size="lg"
          />
          {typeof shown.confidence === 'number' ? (
            <span className="muted result-tier-conf">
              {t('check.confidence', {
                n: Math.round(shown.confidence * 100),
              })}
            </span>
          ) : null}
        </div>
      </header>

      <ChinaLink result={result} t={t} />

      {reasons.shown.length || reasons.madeInHidden ? (
        <section className="result-why">
          <h3 className="result-section-title">{t('check.reasons')}</h3>
          <ul className="tier-reasons-list">
            {reasons.shown.map((r) => (
              <li key={r}>{formatTierReason(r, t, companyView(result))}</li>
            ))}
            {reasons.madeInHidden ? (
              <li key="made-in-below">{t('check.chinaLink.madeInBelow')}</li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {result.summary ? (
        <p className="ask-result-summary">{localizeServerText(t, result.summary)}</p>
      ) : null}

      {searchName && typeof searchRequests === 'number' ? (
        <p className="muted result-search-usage" data-testid="search-usage">
          {t('check.searchUsage', { provider: searchName, n: searchRequests })}
          {result.meta?.searchMatch
            ? ` · ${t(`check.matchBasis.${result.meta.searchMatch}`)}`
            : null}
        </p>
      ) : null}

      <OriginLayers result={result} t={t} />

      <AlternativeCards alternatives={result.alternatives} t={t} />

      {notes.length ? (
        <section className="result-notes">
          <h3 className="result-section-title">{t('check.productNotes')}</h3>
          <ul className="tier-reasons-list">
            {notes.map((n) => (
              <li key={n}>{localizeServerText(t, n)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <OriginMap regions={result.regions} t={t} />

      {result.graph?.nodes?.length ? (
        <details className="result-fold">
          <summary>{t('check.graphTitle')}</summary>
          <RelationGraph graph={result.graph} t={t} embedded />
        </details>
      ) : null}

      {agents.length > 0 ? (
        <details className="result-fold" open={failCount > 0}>
          <summary>
            {t('check.agentsTitle')}
            <span className="muted result-fold-meta">
              {t('check.agentsSummary', {
                total: agents.length,
                ok: okCount,
                fail: failCount,
              })}
            </span>
          </summary>
          <AgentsPoolCard agents={agents} t={t} />
        </details>
      ) : null}

      {result.caveats?.length ? (
        <div className="ask-result-caveats">
          <h3 className="ask-result-caveats-title">{t('check.caveats')}</h3>
          <ul>
            {result.caveats.map((c) => (
              <li key={c}>{localizeServerText(t, c)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="muted result-disclaimer">
        {result.knowledgeBasis === 'web_enriched'
          ? searchName && result.meta?.searchProvider !== 'gemini'
            ? t('check.knowledgeWebVia', { provider: searchName })
            : t('check.knowledgeWeb')
          : result.knowledgeBasis === 'model_memory'
            ? t('check.knowledgeModel')
            : result.knowledgeCutoffNote || t('check.disclaimer')}
      </p>
    </div>
  );
}
