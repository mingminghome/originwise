import { Beer } from 'lucide-react';
import { trackEvent } from '../core/analytics/track';
import type { TFunction } from '../core/i18n';
import { resolveBuyMeAPint } from '../core/support/buyMeAPint';

/**
 * Optional “Buy me a pint” support link (env: VITE_BUY_ME_A_PINT_URL).
 * Hidden when unset. `compact` = top-bar chip; full = About footer button.
 */
export function BuyMeAPint({
  t,
  compact = false,
}: {
  t: TFunction;
  compact?: boolean;
}) {
  const cfg = resolveBuyMeAPint();
  if (!cfg) return null;

  if (compact) {
    return (
      <a
        className="buy-pint-chip"
        href={cfg.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('support.buyMeAPint')}
        title={t('support.buyMeAPint')}
        onClick={() =>
          trackEvent({ event: 'support_click', placement: 'chip' })
        }
      >
        <Beer size={16} strokeWidth={2.2} aria-hidden />
        <span className="buy-pint-chip-text">{t('support.pintShort')}</span>
      </a>
    );
  }

  if (cfg.img) {
    return (
      <a
        href={cfg.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('support.buyMeAPint')}
        className="buy-pint-full"
        onClick={() =>
          trackEvent({ event: 'support_click', placement: 'full' })
        }
      >
        <img
          src={cfg.img}
          alt={t('support.buyMeAPint')}
          height={40}
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a
      href={cfg.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('support.buyMeAPint')}
      className="buy-pint-chip buy-pint-full-text"
      onClick={() =>
        trackEvent({ event: 'support_click', placement: 'full' })
      }
    >
      <Beer size={16} strokeWidth={2.2} aria-hidden />
      <span>{t('support.buyMeAPint')}</span>
    </a>
  );
}
