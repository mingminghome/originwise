import type { TFunction } from '../core/i18n';

export function WelcomeDisclaimer({
  t,
  onAccept,
}: {
  t: TFunction;
  onAccept: () => void;
}) {
  return (
    <div className="welcome-backdrop" role="dialog" aria-modal="true">
      <div className="welcome-sheet">
        <h2 className="welcome-title">{t('welcome.title')}</h2>
        <p className="welcome-lead muted">{t('welcome.body')}</p>
        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ marginTop: '1.25rem' }}
          onClick={onAccept}
        >
          {t('welcome.accept')}
        </button>
      </div>
    </div>
  );
}
