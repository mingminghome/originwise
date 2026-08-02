import { Camera, Search, Sparkles } from 'lucide-react';
import type { AppState } from '../hooks/useAppState';
import { TierBadge } from './TierBadge';

/** Full simple flow: you → AI parts → score → result */
function FlowGraph({
  t,
}: {
  t: AppState['t'];
}) {
  const w = 320;
  const h = 280;
  return (
    <svg
      className="how-flow-svg"
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      role="img"
      aria-label={t('how.graphTitle')}
    >
      <defs>
        <marker
          id="how-arrow"
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" className="how-flow-arrow-head" />
        </marker>
      </defs>

      {/* 1. You */}
      <rect x="100" y="8" width="120" height="40" rx="10" className="how-flow-box" />
      <text x="160" y="26" textAnchor="middle" className="how-flow-emoji">
        1
      </text>
      <text x="160" y="40" textAnchor="middle" className="how-flow-caption">
        {t('how.flowYou')}
      </text>

      <path d="M160 48 V58" className="how-flow-arrow" markerEnd="url(#how-arrow)" />

      {/* 2. AI group */}
      <rect
        x="24"
        y="62"
        width="272"
        height="118"
        rx="14"
        className="how-flow-group"
      />
      <text x="160" y="80" textAnchor="middle" className="how-flow-group-label">
        {t('how.flowAi')}
      </text>

      {/* product + company side by side */}
      <rect x="40" y="92" width="100" height="36" rx="8" className="how-flow-box" />
      <text x="90" y="114" textAnchor="middle" className="how-flow-caption">
        {t('how.flowProduct')}
      </text>
      <rect x="180" y="92" width="100" height="36" rx="8" className="how-flow-box" />
      <text x="230" y="114" textAnchor="middle" className="how-flow-caption">
        {t('how.flowCompany')}
      </text>

      <path d="M90 128 V140" className="how-flow-arrow" markerEnd="url(#how-arrow)" />
      <path d="M230 128 V140" className="how-flow-arrow" markerEnd="url(#how-arrow)" />
      <path d="M90 148 H230" className="how-flow-arrow" />

      <rect x="100" y="140" width="120" height="28" rx="8" className="how-flow-box" />
      <text x="160" y="158" textAnchor="middle" className="how-flow-caption">
        {t('how.flowVerify')}
      </text>

      <path d="M160 180 V192" className="how-flow-arrow" markerEnd="url(#how-arrow)" />

      {/* 3. Score */}
      <rect x="100" y="196" width="120" height="32" rx="10" className="how-flow-box" />
      <text x="160" y="216" textAnchor="middle" className="how-flow-caption">
        {t('how.flowScore')}
      </text>

      <path d="M160 228 V240" className="how-flow-arrow" markerEnd="url(#how-arrow)" />

      {/* 4. Result */}
      <rect
        x="88"
        y="244"
        width="144"
        height="28"
        rx="10"
        className="how-flow-box how-flow-box--accent"
      />
      <text x="160" y="262" textAnchor="middle" className="how-flow-caption how-flow-caption--strong">
        {t('how.flowResult')}
      </text>
    </svg>
  );
}

export function HowItWorksScreen({ state }: { state: AppState }) {
  const { t, setTab } = state;

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
          <h1>{t('how.title')}</h1>
          <p className="subtitle">{t('how.subtitle')}</p>
        </div>
      </header>

      <section className="card stack">
        <h2 className="result-section-title">{t('how.aimTitle')}</h2>
        <p>{t('how.aimBody')}</p>
      </section>

      <section className="card stack">
        <h2 className="result-section-title">{t('how.graphTitle')}</h2>
        <p className="muted settings-hint">{t('how.graphHint')}</p>
        <FlowGraph t={t} />
        <ul className="how-flow-legend muted">
          <li>
            <strong>1.</strong> {t('how.step1Body')}
          </li>
          <li>
            <strong>2.</strong> {t('how.flowAiDetail')}
          </li>
          <li>
            <strong>3.</strong> {t('how.flowScoreDetail')}
          </li>
          <li>
            <strong>4.</strong> {t('how.step3Body')}
          </li>
        </ul>
      </section>

      <section className="card stack">
        <h2 className="result-section-title">{t('how.stepsTitle')}</h2>
        <ol className="how-steps">
          <li>
            <span className="how-step-icon" aria-hidden>
              <Search size={16} />
            </span>
            <div>
              <strong>{t('how.step1Title')}</strong>
              <p className="muted">{t('how.step1Body')}</p>
            </div>
          </li>
          <li>
            <span className="how-step-icon" aria-hidden>
              <Sparkles size={16} />
            </span>
            <div>
              <strong>{t('how.step2Title')}</strong>
              <p className="muted">{t('how.step2Body')}</p>
            </div>
          </li>
          <li>
            <span className="how-step-icon" aria-hidden>
              <Camera size={16} />
            </span>
            <div>
              <strong>{t('how.step3Title')}</strong>
              <p className="muted">{t('how.step3Body')}</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="card stack">
        <h2 className="result-section-title">{t('how.badgeTitle')}</h2>
        <ul className="how-badge-list">
          <li>
            <TierBadge tier="none" label={t('tier.none')} size="sm" />
            <span>{t('how.badgeNone')}</span>
          </li>
          <li>
            <TierBadge tier="indirect" label={t('tier.indirect')} size="sm" />
            <span>{t('how.badgeIndirect')}</span>
          </li>
          <li>
            <TierBadge tier="direct" label={t('tier.direct')} size="sm" />
            <span>{t('how.badgeDirect')}</span>
          </li>
          <li>
            <TierBadge tier="unknown" label={t('tier.unknown')} size="sm" />
            <span>{t('how.badgeUnknown')}</span>
          </li>
        </ul>
      </section>

      <section className="card stack">
        <h2 className="result-section-title">{t('how.twTitle')}</h2>
        <p className="muted">{t('how.twBody')}</p>
      </section>

      <section className="card stack">
        <h2 className="result-section-title">{t('how.privacyTitle')}</h2>
        <p className="muted">{t('how.privacyBody')}</p>
      </section>

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={() => setTab('check')}
      >
        {t('how.tryBtn')}
      </button>
    </>
  );
}
