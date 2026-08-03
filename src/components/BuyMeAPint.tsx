import { Beer } from 'lucide-react';
import { PROJECT } from '../core/project';
import type { TFunction } from '../core/i18n';

/**
 * ComboWise-style “Buy me a pint” support link.
 * `compact` = top-bar chip; full = About footer with official BMC button image.
 */
export function BuyMeAPint({
  t,
  compact = false,
}: {
  t: TFunction;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <a
        className="buy-pint-chip"
        href={PROJECT.buyMeAPintUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('support.buyMeAPint')}
        title={t('support.buyMeAPint')}
      >
        <Beer size={16} strokeWidth={2.2} aria-hidden />
        <span className="buy-pint-chip-text">{t('support.pintShort')}</span>
      </a>
    );
  }

  return (
    <a
      href={PROJECT.buyMeAPintUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('support.buyMeAPint')}
      className="buy-pint-full"
    >
      <img
        src={PROJECT.buyMeAPintImg}
        alt={t('support.buyMeAPint')}
        height={40}
        loading="lazy"
      />
    </a>
  );
}
