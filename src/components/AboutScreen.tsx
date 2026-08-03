import { ExternalLink } from 'lucide-react';
import { PROJECT } from '../core/project';
import { isBuyMeAPintEnabled } from '../core/support/buyMeAPint';
import type { AppState } from '../hooks/useAppState';
import { APP_VERSION } from '../version';
import { BuyMeAPint } from './BuyMeAPint';

export function AboutScreen({ state }: { state: AppState }) {
  const { t, setTab } = state;
  const showPint = isBuyMeAPintEnabled();
  return (
    <>
      <header className="app-header settings-subhead">
        <button
          type="button"
          className="settings-back"
          onClick={() => setTab('info')}
        >
          {t('common.back')}
        </button>
        <div>
          <h1>{t('about.title')}</h1>
          <p className="subtitle">
            {t('settings.version', { v: APP_VERSION })}
          </p>
        </div>
      </header>

      <section className="card stack">
        <p>{t('about.body')}</p>
        <p className="muted">{t('about.privacy')}</p>
        <p className="muted">
          © {PROJECT.copyrightYear} {PROJECT.copyrightHolder} ·{' '}
          {t('about.license')}
        </p>
        <div className="stack" style={{ gap: '0.5rem' }}>
          <a className="btn btn-ghost" href="/privacy.html">
            Privacy
          </a>
          <a className="btn btn-ghost" href="/terms.html">
            Terms
          </a>
          <a
            className="btn btn-ghost"
            href={PROJECT.repoUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={16} />
            {PROJECT.repoLabel}
          </a>
        </div>
        {showPint ? (
          <div className="about-pint">
            <p className="muted about-pint-label">{t('support.thanks')}</p>
            <BuyMeAPint t={t} />
          </div>
        ) : null}
      </section>
    </>
  );
}
