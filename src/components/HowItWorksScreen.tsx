import { Camera, Search, Sparkles } from 'lucide-react';
import type { AppState } from '../hooks/useAppState';
import { TierBadge } from './TierBadge';

/** Simple flow diagram — plain language, not technical. */
function FlowGraph({
  labels,
}: {
  labels: { you: string; ai: string; result: string };
}) {
  const w = 320;
  const h = 168;
  return (
    <svg
      className="how-flow-svg"
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      role="img"
      aria-label={`${labels.you} → ${labels.ai} → ${labels.result}`}
    >
      {/* boxes */}
      <rect x="12" y="48" width="84" height="56" rx="12" className="how-flow-box" />
      <rect x="118" y="48" width="84" height="56" rx="12" className="how-flow-box" />
      <rect x="224" y="48" width="84" height="56" rx="12" className="how-flow-box how-flow-box--accent" />
      {/* arrows */}
      <path d="M98 76 H114" className="how-flow-arrow" markerEnd="url(#how-arrow)" />
      <path d="M204 76 H220" className="how-flow-arrow" markerEnd="url(#how-arrow)" />
      <defs>
        <marker
          id="how-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" className="how-flow-arrow-head" />
        </marker>
      </defs>
      {/* icons as simple circles + text */}
      <text x="54" y="72" textAnchor="middle" className="how-flow-emoji">
        1
      </text>
      <text x="54" y="90" textAnchor="middle" className="how-flow-caption">
        {labels.you}
      </text>
      <text x="160" y="72" textAnchor="middle" className="how-flow-emoji">
        2
      </text>
      <text x="160" y="90" textAnchor="middle" className="how-flow-caption">
        {labels.ai}
      </text>
      <text x="266" y="72" textAnchor="middle" className="how-flow-emoji">
        3
      </text>
      <text x="266" y="90" textAnchor="middle" className="how-flow-caption">
        {labels.result}
      </text>
    </svg>
  );
}

export function HowItWorksScreen({ state }: { state: AppState }) {
  const { t, setTab } = state;

  return (
    <>
      <header className="app-header">
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
        <FlowGraph
          labels={{
            you: t('how.step1Title').slice(0, 12),
            ai: t('how.step2Title').slice(0, 12),
            result: t('how.step3Title').slice(0, 12),
          }}
        />
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
      <button
        type="button"
        className="btn btn-ghost btn-block"
        onClick={() => setTab('settings')}
      >
        {t('common.back')}
      </button>
    </>
  );
}
