import {
  Bug,
  ChevronRight,
  Code2,
  ExternalLink,
  HardDrive,
  HelpCircle,
  Scale,
  Search,
  Shield,
  Tag,
} from 'lucide-react';
import { PROJECT } from '../core/project';
import { isBuyMeAPintEnabled } from '../core/support/buyMeAPint';
import type { AppState } from '../hooks/useAppState';
import { APP_VERSION } from '../version';
import { BuyMeAPint } from './BuyMeAPint';
import { InstallAppBanner } from './InstallAppBanner';

type OssLink = {
  href: string;
  label: string;
  Icon: typeof Code2;
};

/** Top-level About screen — multi-card layout. */
export function AboutScreen({ state }: { state: AppState }) {
  const { t, setTab } = state;
  const showPint = isBuyMeAPintEnabled();

  const ossLinks: OssLink[] = [
    { href: PROJECT.repoUrl, label: t('about.linkSource'), Icon: Code2 },
    { href: PROJECT.licenseUrl, label: t('about.linkLicense'), Icon: Scale },
    { href: PROJECT.issuesUrl, label: t('about.linkIssues'), Icon: Bug },
    { href: PROJECT.releasesUrl, label: t('about.linkReleases'), Icon: Tag },
    {
      href: PROJECT.securityUrl,
      label: t('about.linkSecurity'),
      Icon: Shield,
    },
  ];

  return (
    <div className="layout-grid">
      <div className="span-2">
        <InstallAppBanner t={t} />
        <header className="app-page-head">
          <h1>{t('about.title')}</h1>
          <p className="subtitle">{t('about.tagline')}</p>
        </header>
      </div>

      <section className="card span-2">
        <div className="about-hero">
          <div className="about-hero-icon" aria-hidden>
            <Search size={28} />
          </div>
          <div>
            <h2 className="section-title" style={{ marginBottom: 4 }}>
              {t('appName')}
            </h2>
            <p className="muted">{t('about.intro')}</p>
            <div className="about-meta-row">
              <span className="about-chip">
                {t('settings.version', { v: APP_VERSION })}
              </span>
              <span className="about-chip about-chip-mit">
                {t('about.licenseShort')}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="card span-2 settings-menu">
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

      <section className="card span-2">
        <h2 className="section-title">
          <Scale size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
          {t('about.openSourceTitle')}
        </h2>
        <p className="muted">{t('about.openSourceBody')}</p>
        <p className="about-copyright muted">
          {t('about.copyrightLine', {
            year: String(PROJECT.copyrightYear),
            name: PROJECT.copyrightHolder,
          })}
        </p>
        <p className="muted about-license-note">{t('about.licenseAsIs')}</p>
        <p className="about-repo-url">
          <a href={PROJECT.repoUrl} target="_blank" rel="noopener noreferrer">
            {PROJECT.repoLabel}
          </a>
        </p>
        <ul className="about-oss-links">
          {ossLinks.map(({ href, label, Icon }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="about-oss-link"
              >
                <span className="about-oss-link-left">
                  <Icon size={16} aria-hidden />
                  {label}
                </span>
                <ExternalLink size={14} className="muted" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="card span-2">
        <h2 className="section-title">
          <Shield size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
          {t('about.privacyTitle')}
        </h2>
        <p className="muted">{t('about.privacyLead')}</p>
        <ul className="about-list muted">
          <li>{t('about.privacyBullet1')}</li>
          <li>{t('about.privacyBullet2')}</li>
          <li>{t('about.privacyBullet3')}</li>
          <li>{t('about.privacyBullet4')}</li>
          <li>{t('about.privacyBullet5')}</li>
        </ul>
        <p className="about-legal-links muted">
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer">
            {t('about.privacyPolicyLink')}
          </a>
          <span aria-hidden> · </span>
          <a href="/terms.html" target="_blank" rel="noopener noreferrer">
            {t('about.termsLink')}
          </a>
        </p>
      </section>

      <section className="card span-2">
        <h2 className="section-title">
          <HardDrive size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
          {t('about.designTitle')}
        </h2>
        <p className="muted">{t('about.designLead')}</p>

        <div className="about-design-block">
          <h3 className="about-h3">
            <HardDrive size={14} /> {t('about.designLocalTitle')}
          </h3>
          <p className="muted">{t('about.designLocalBody')}</p>
        </div>

        <div className="about-design-block">
          <h3 className="about-h3">{t('about.designWhyTitle')}</h3>
          <ul className="about-list muted">
            <li>{t('about.designWhy1')}</li>
            <li>{t('about.designWhy2')}</li>
            <li>{t('about.designWhy3')}</li>
          </ul>
        </div>
      </section>

      <section className="card span-2">
        <h2 className="section-title">{t('about.disclaimerTitle')}</h2>
        <p className="muted">{t('about.disclaimerBody')}</p>
      </section>

      <section className="card span-2 about-credits">
        <p className="about-credits-line">
          {t('about.createdBy')}{' '}
          <a href={PROJECT.repoUrl} target="_blank" rel="noopener noreferrer">
            {PROJECT.copyrightHolder}
          </a>
        </p>
        <p className="muted" style={{ marginTop: 6, fontSize: '0.82rem' }}>
          {t('about.contributionsWelcome')}
        </p>
        {showPint ? (
          <div className="about-pint">
            <p className="muted about-pint-label">{t('support.thanks')}</p>
            <BuyMeAPint t={t} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
