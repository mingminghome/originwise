import { useMemo, useState } from 'react';
import { Image as ImageIcon, Search, Trash2 } from 'lucide-react';
import { trackEvent } from '../core/analytics/track';
import { localeTag } from '../core/i18n';
import { scoreTone } from '../core/scoreTone';
import type { CheckHistoryItem, Locale } from '../core/types';
import type { AppState } from '../hooks/useAppState';
import { InstallAppBanner } from './InstallAppBanner';
import { TierBadge } from './TierBadge';

type HistorySort = 'newest' | 'oldest' | 'scoreHigh' | 'scoreLow' | 'name';

function formatWhen(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  try {
    return d.toLocaleString(localeTag(locale), {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

function scoreOf(item: CheckHistoryItem): number | undefined {
  const n = item.result.overall?.score;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

function sortHistory(items: CheckHistoryItem[], sort: HistorySort, locale: Locale): CheckHistoryItem[] {
  const next = [...items];
  const byTime = (a: CheckHistoryItem, b: CheckHistoryItem) =>
    new Date(a.at).getTime() - new Date(b.at).getTime();
  if (sort === 'oldest') return next.sort(byTime);
  if (sort === 'newest') return next.sort((a, b) => byTime(b, a));
  if (sort === 'name') {
    return next.sort((a, b) => a.query.localeCompare(b.query, localeTag(locale)));
  }
  const missing = sort === 'scoreHigh' ? -1 : Number.POSITIVE_INFINITY;
  return next.sort((a, b) => {
    const as = scoreOf(a) ?? missing;
    const bs = scoreOf(b) ?? missing;
    if (as !== bs) return sort === 'scoreHigh' ? bs - as : as - bs;
    return byTime(b, a);
  });
}

export function HistoryScreen({ state }: { state: AppState }) {
  const {
    t,
    settings,
    checkHistory,
    removeCheckHistory,
    cleanData,
    setActiveResult,
    setTab,
  } = state;
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<HistorySort>('newest');
  const [confirmClear, setConfirmClear] = useState(false);

  const visible = useMemo(() => {
    const needle = query.normalize('NFKC').trim().toLowerCase();
    const matched = needle
      ? checkHistory.filter((item) => {
          const title = item.result.title || '';
          return `${item.query}\n${title}`.normalize('NFKC').toLowerCase().includes(needle);
        })
      : checkHistory;
    return sortHistory(matched, sort, settings.locale);
  }, [checkHistory, query, sort, settings.locale]);

  return (
    <div className="layout-grid">
      <div className="span-2">
        <InstallAppBanner t={t} />
        <header className="app-page-head">
          <h1>{t('history.title')}</h1>
          <p className="subtitle">{t('history.subtitle')}</p>
        </header>
      </div>

      {checkHistory.length === 0 ? (
        <section className="card span-2">
          <p className="muted">{t('history.empty')}</p>
        </section>
      ) : (
        <section className="card ask-history-card span-2">
          <div className="ask-history-toolbar" role="toolbar" aria-label={t('history.title')}>
            <label className="ask-history-search">
              <Search size={15} aria-hidden />
              <span className="sr-only">{t('history.search')}</span>
              <input
                type="search"
                value={query}
                placeholder={t('history.searchPlaceholder')}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label className="ask-history-sort">
              <span className="sr-only">{t('history.sort')}</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as HistorySort)}
              >
                <option value="newest">{t('history.sortNewest')}</option>
                <option value="oldest">{t('history.sortOldest')}</option>
                <option value="scoreHigh">{t('history.sortScoreHigh')}</option>
                <option value="scoreLow">{t('history.sortScoreLow')}</option>
                <option value="name">{t('history.sortName')}</option>
              </select>
            </label>
            {confirmClear ? (
              <span className="ask-history-confirm">
                <span>{t('history.removeAllConfirm')}</span>
                <button
                  type="button"
                  className="graph-tool-btn ask-history-clear"
                  onClick={() => {
                    cleanData('checkHistory');
                    setConfirmClear(false);
                    setQuery('');
                  }}
                >
                  {t('history.removeAll')}
                </button>
                <button
                  type="button"
                  className="graph-tool-btn"
                  onClick={() => setConfirmClear(false)}
                >
                  {t('common.cancel')}
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="graph-tool-btn ask-history-clear"
                onClick={() => setConfirmClear(true)}
              >
                <Trash2 size={15} aria-hidden />
                {t('history.removeAll')}
              </button>
            )}
          </div>
          {visible.length === 0 ? (
            <p className="muted">{t('history.noMatches')}</p>
          ) : null}
          <ul className="ask-history-list">
            {visible.map((item) => {
              const tier = item.result.relationTier;
              const overall = item.result.overall;
              return (
                <li
                  key={item.id}
                  className={
                    overall
                      ? `ask-history-item is-${scoreTone(overall.score)}`
                      : `ask-history-item is-${tier}`
                  }
                >
                  <button
                    type="button"
                    className="ask-history-main"
                    onClick={() => {
                      trackEvent({
                        event: 'history_open_result',
                        relation_tier: item.result.relationTier,
                        has_photo: item.hadImage,
                      });
                      setActiveResult(item);
                      setTab('check');
                    }}
                  >
                    <span className="ask-history-query">
                      {item.hadImage ? (
                        <ImageIcon size={14} style={{ marginRight: 4 }} />
                      ) : null}
                      {item.query}
                    </span>
                    <span className="ask-history-meta muted">
                      {formatWhen(item.at, settings.locale)}
                      {item.hadImage ? ` · ${t('history.withPhoto')}` : ''}
                    </span>
                    <span className="ask-history-tier">
                      {overall ? (
                        <span className="ask-history-score" data-testid="history-score">
                          <span className={`ask-history-score-num is-${scoreTone(overall.score)}`}>
                            {overall.score}/100
                          </span>
                          <span className="ask-history-score-label">{t('check.overall.score')}</span>
                        </span>
                      ) : (
                        <TierBadge
                          tier={tier}
                          label={t(`tier.${tier}`)}
                          size="sm"
                        />
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="ask-history-delete"
                    aria-label={t('history.remove')}
                    onClick={() => removeCheckHistory(item.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
