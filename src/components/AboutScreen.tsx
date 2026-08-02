import { ExternalLink } from 'lucide-react';
import { PROJECT } from '../core/project';
import type { AppState } from '../hooks/useAppState';
import { APP_VERSION } from '../version';

export function AboutScreen({ state }: { state: AppState }) {
  const { t, setTab } = state;
  return (
    <>
      <header className="app-header">
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
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => setTab('settings')}
        >
          {t('common.back')}
        </button>
      </section>
    </>
  );
}
