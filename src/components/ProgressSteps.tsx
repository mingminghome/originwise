import { Check, Circle, Loader2, SkipForward, X } from 'lucide-react';
import type { ProgressStep } from '../core/ai/client';
import type { TFunction } from '../core/i18n';

const ORDER = [
  'start',
  'cache',
  'identify',
  'monolith',
  'dual_core',
  'product',
  'company',
  'verify',
  'alternatives',
  'synthesize',
] as const;

function stepLabel(step: string, t: TFunction): string {
  const key = `check.steps.${step}`;
  const label = t(key);
  return label === key ? step : label;
}

export function ProgressSteps({
  steps,
  t,
}: {
  steps: ProgressStep[];
  t: TFunction;
}) {
  const byId = new Map(steps.map((s) => [s.step, s]));
  const seen = ORDER.filter((id) => byId.has(id));
  const extras = steps
    .map((s) => s.step)
    .filter((id) => !ORDER.includes(id as (typeof ORDER)[number]));
  const list = [...seen, ...extras];

  if (!list.length) {
    return (
      <div className="card-soft" role="status" aria-live="polite">
        <p className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Loader2 size={16} className="spin" />
          {t('check.progressHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="card-soft progress-steps" role="status" aria-live="polite">
      <p className="muted" style={{ fontWeight: 700, marginBottom: 8 }}>
        {t('check.progressHint')}
      </p>
      <ul className="progress-steps-list">
        {list.map((id) => {
          const s = byId.get(id);
          const status = s?.status ?? 'running';
          return (
            <li key={id} className={`progress-step progress-step--${status}`}>
              <span className="progress-step-icon" aria-hidden>
                {status === 'running' ? (
                  <Loader2 size={14} className="spin" />
                ) : status === 'done' ? (
                  <Check size={14} />
                ) : status === 'skipped' ? (
                  <SkipForward size={14} />
                ) : status === 'error' ? (
                  <X size={14} />
                ) : (
                  <Circle size={14} />
                )}
              </span>
              <span>{stepLabel(id, t)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
