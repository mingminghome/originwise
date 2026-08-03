import { Image as ImageIcon, Trash2 } from 'lucide-react';
import type { AppState } from '../hooks/useAppState';
import { AppTopBar } from './AppTopBar';
import { InstallAppBanner } from './InstallAppBanner';
import { TierBadge } from './TierBadge';

function formatWhen(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  try {
    return d.toLocaleString(locale === 'zh-Hant' ? 'zh-Hant' : 'en', {
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
    tab,
  } = state;

  return (
    <>
      <AppTopBar
        t={t}
        tab={tab}
        onChange={setTab}
        onBrandClick={() => setTab('check')}
      />
      <InstallAppBanner t={t} />
      <header className="app-page-head">
        <h1>{t('history.title')}</h1>
        <p className="subtitle">{t('history.subtitle')}</p>
      </header>

      {checkHistory.length === 0 ? (
        <section className="card">
          <p className="muted">{t('history.empty')}</p>
        </section>
      ) : (
        <section className="card ask-history-card">
          <ul className="ask-history-list">
            {checkHistory.map((item) => (
              <li key={item.id} className="ask-history-item">
                <button
                  type="button"
                  className="ask-history-main"
                  onClick={() => {
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
    </>
  );
}
