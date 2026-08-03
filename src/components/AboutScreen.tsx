import { ChevronRight, ExternalLink, HelpCircle } from 'lucide-react';
import { PROJECT } from '../core/project';
import { isBuyMeAPintEnabled } from '../core/support/buyMeAPint';
import type { AppState } from '../hooks/useAppState';
import { APP_VERSION } from '../version';
import { BuyMeAPint } from './BuyMeAPint';
import { TopNavIcons } from './TopNavIcons';

/** Top-level About screen (no intermediate Info hub) — BabyWise-aligned. */
export function AboutScreen({ state }: { state: AppState }) {
  const { t, setTab, tab } = state;
  const showPint = isBuyMeAPintEnabled();

  return (
    <>
      <header className="app-header">
        <div>
          <h1>{t('about.title')}</h1>
          <p className="subtitle">
            {t('settings.version', { v: APP_VERSION })}
          </p>
        </div>
        <TopNavIcons tab={tab} onChange={setTab} t={t} />
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

      <section className="card settings-menu">
        <button
          type="button"
          className="settings-row"
          onClick={() => setTab('how')}
        >
          <span>
            <HelpCircle
              size={16}
              style={{ verticalAlign: -2, marginRight: 8 }}
            />
            {t('settings.howItWorks')}
          </span>
          <ChevronRight size={18} />
        </button>
      </section>
    </>
  );
}
