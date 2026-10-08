import type { CheckResult } from '../core/types';
import type { TFunction } from '../core/i18n';
import {
  cleanSources,
  sourceLabel,
  splitSourceLine,
} from '../../functions/_lib/sourceLine';
import { AlternativeCards } from './AlternativeCards';
import { buildOriginLayers, OriginLayers, webQuotaNotice } from './OriginLayers';
import { OriginMap } from './OriginMap';
import { RelationGraph } from './RelationGraph';
import { ChinaCard, Fold, LayersCard, MadeInCard } from './ResultCards';
import { cleanNotes } from './resultCards.model';
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

/**
 * Footnote under the AI pool. The default copy explains Gemini's Google
 * Search grounding quota; when live search actually ran on Brave or
 * Firecrawl it names that service instead.
 */
function agentsHint(
  agents: NonNullable<NonNullable<CheckResult['meta']>['agents']>,
  t: TFunction
): string {
  const web = agents.find((a) => a.id === 'web' && a.ok !== false);
  const via = web?.provider && web.provider !== 'gemini' ? searchProviderLabel(web.provider, t) : null;
  return via ? t('check.agentsHintVia', { provider: via }) : t('check.agentsHint');
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
      <p className="muted agents-pool-hint">{agentsHint(agents, t)}</p>
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
  const notes = cleanNotes(result);
  const searchName = searchProviderLabel(result.meta?.searchProvider, t);
  const title = resultTitle(result, query);
  const searchRequests = result.meta?.searchRequests;
  const sources = Array.isArray(result.sources) ? cleanSources(result.sources, 12) : [];
  const layers = buildOriginLayers(result);
  const originDetailCount =
    notes.length + layers.ownership.length + layers.parts.length;
  const altCount =
    (result.alternatives?.brands?.length ?? 0) + (result.alternatives?.products?.length ?? 0);
  const caveats = result.caveats ?? [];
  const notice = webQuotaNotice(result);
  const hasEntity = Boolean(result.product || result.company);

  return (
    <div className="ask-result result-cards" role="status">
      <header className="rc-head">
        <h2 className="ask-result-title">{title.title}</h2>
        {title.modelName ? (
          <p className="muted ask-result-identified" data-testid="identified-as">
            {t('check.identifiedAs', { name: title.modelName })}
          </p>
        ) : null}
        <p className="ask-result-meta muted">
          {[
            provider ? t('check.answeredBy', { name: providerLabel(provider, t) }) : null,
            cached ? t('check.cached') : null,
            result.meta?.degraded ? t('check.degraded') : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </header>

      <ChinaCard result={result} t={t} />

      {notice ? (
        <p
          className="origin-layers-quota"
          role="status"
          data-testid={notice === 'aiCreditsUsedUp' ? 'ai-credits-used-up' : 'search-quota-used-up'}
        >
          {t(`check.${notice}`)}
        </p>
      ) : null}

      {hasEntity ? <MadeInCard result={result} t={t} /> : null}
      {hasEntity ? <LayersCard result={result} t={t} /> : null}

      <div className="rc-folds">
        {originDetailCount ? (
          <Fold title={t('check.productNotes')} count={originDetailCount} t={t} testId="fold-notes">
            {notes.length ? (
              <ul className="tier-reasons-list">
                {notes.map((n) => (
                  <li key={n}>{localizeServerText(t, n)}</li>
                ))}
              </ul>
            ) : null}
            <OriginLayers result={result} t={t} detailOnly />
          </Fold>
        ) : null}

        {caveats.length ? (
          <Fold title={t('check.caveats')} count={caveats.length} t={t} testId="fold-caveats">
            <ul className="tier-reasons-list">
              {caveats.map((c) => (
                <li key={c}>{localizeServerText(t, c)}</li>
              ))}
            </ul>
          </Fold>
        ) : null}

        {sources.length ? (
          <Fold title={t('check.rc.foldSources')} count={sources.length} t={t} testId="fold-sources">
            <ol className="rc-source-list">
              {sources.map((src) => {
                const parts = splitSourceLine(src);
                const label = sourceLabel(parts);
                return (
                  <li key={src}>
                    {parts.url ? (
                      <a href={parts.url} target="_blank" rel="noreferrer" title={parts.url}>
                        {label}
                      </a>
                    ) : (
                      label
                    )}
                  </li>
                );
              })}
            </ol>
          </Fold>
        ) : null}

        {altCount ? (
          <Fold title={t('check.rc.foldAlts')} count={altCount} t={t} testId="fold-alts">
            <AlternativeCards alternatives={result.alternatives} t={t} />
          </Fold>
        ) : null}

        <Fold title={t('check.rc.foldAi')} t={t} testId="fold-ai">
          {searchName && typeof searchRequests === 'number' ? (
            <p className="muted result-search-usage" data-testid="search-usage">
              {t('check.searchUsage', { provider: searchName, n: searchRequests })}
              {result.meta?.searchMatch
                ? ` · ${t(`check.matchBasis.${result.meta.searchMatch}`)}`
                : null}
            </p>
          ) : null}
          {agents.length > 0 ? (
            <>
              <p className="muted result-fold-meta">
                {t('check.agentsTitle')} ·{' '}
                {t('check.agentsSummary', { total: agents.length, ok: okCount, fail: failCount })}
              </p>
              <AgentsPoolCard agents={agents} t={t} />
            </>
          ) : null}
          <OriginMap regions={result.regions} t={t} />
          {result.graph?.nodes?.length ? (
            <details className="result-fold">
              <summary>{t('check.graphTitle')}</summary>
              <RelationGraph graph={result.graph} t={t} embedded />
            </details>
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
        </Fold>
      </div>
      <p className="muted origin-layers-share">{t('check.sectionShareHint')}</p>
    </div>
  );
}
