import { ChevronRight, HelpCircle, Info } from 'lucide-react';
import type { AppState } from '../hooks/useAppState';
import { APP_VERSION } from '../version';

/**
 * Separate Info area (not under Settings): How it works + About.
 */
export function InfoScreen({ state }: { state: AppState }) {
  const { t, setTab } = state;

  return (
    <>
      <header className="app-header">
        <div>
          <h1>{t('info.title')}</h1>
          <p className="subtitle">{t('info.subtitle')}</p>
        </div>
      </header>

      <section className="card settings-menu">
        <button
          type="button"
          className="settings-row"
          onClick={() => setTab('how')}
        >
          <span>
            <HelpCircle size={16} style={{ verticalAlign: -2, marginRight: 8 }} />
            {t('settings.howItWorks')}
          </span>
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          className="settings-row"
          onClick={() => setTab('about')}
        >
          <span>
            <Info size={16} style={{ verticalAlign: -2, marginRight: 8 }} />
            {t('settings.about')}
          </span>
          <ChevronRight size={18} />
        </button>
      </section>

      <p className="muted settings-version">
        {t('settings.version', { v: APP_VERSION })}
      </p>
    </>
  );
}
