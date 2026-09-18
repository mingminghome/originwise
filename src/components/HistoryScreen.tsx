import { Image as ImageIcon, Trash2 } from 'lucide-react';
import { trackEvent } from '../core/analytics/track';
import { localeTag } from '../core/i18n';
import type { Locale } from '../core/types';
import type { AppState } from '../hooks/useAppState';
import { InstallAppBanner } from './InstallAppBanner';
import { TierBadge } from './TierBadge';

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

export function HistoryScreen({ state }: { state: AppState }) {
  const {
    t,
    settings,
    checkHistory,
    removeCheckHistory,
    setActiveResult,
    setTab,
  } = state;

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
          <ul className="ask-history-list">
            {checkHistory.map((item) => (
              <li key={item.id} className="ask-history-item">
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
                    <TierBadge
                      tier={item.result.relationTier}
                      label={t(`tier.${item.result.relationTier}`)}
                      size="sm"
                    />
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
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
