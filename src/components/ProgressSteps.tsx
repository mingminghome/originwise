import { Check, Circle, Loader2, SkipForward, X } from 'lucide-react';
import type { ProgressStep } from '../core/ai/client';
import type { TFunction } from '../core/i18n';

const ORDER = [
  'start',
  'cache',
  'identify',
  'web',
  'monolith',
  'dual_core',
  'product',
  'company',
  'verify',
  'alternatives',
  'synthesize',
] as const;

const SEARCH_PROVIDERS = new Set(['gemini', 'brave', 'firecrawl']);

/** Search provider id from a web step detail ("brave" or "brave:upstream_quota"). */
function webStepProvider(detail: string | undefined): string | undefined {
  const id = (detail || '').split(':')[0]?.trim().toLowerCase();
  return id && SEARCH_PROVIDERS.has(id) ? id : undefined;
}

function stepLabel(step: string, t: TFunction, detail?: string): string {
  // Name the search service at the moment the lookup is sent to it.
  if (step === 'web') {
    const provider = webStepProvider(detail);
    if (provider) {
      return t('check.webStepVia', { name: t(`check.searchVia.${provider}`) });
    }
  }
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
              <span>{stepLabel(id, t, s?.detail)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
