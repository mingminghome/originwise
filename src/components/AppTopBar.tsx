import { Globe2 } from 'lucide-react';
import type { TFunction } from '../core/i18n';
import type { TabId } from '../hooks/useAppState';
import { TopNavIcons } from './TopNavIcons';

/**
 * Floating chrome (SourceWise-style): brand left + pint + icon cluster right.
 * Sits over content with glass blur — not a solid page frame strip.
 */
export function AppTopBar({
  t,
  tab,
  onChange,
  onBrandClick,
}: {
  t: TFunction;
  tab: TabId;
  onChange: (t: TabId) => void;
  onBrandClick: () => void;
}) {
  return (
    <header className="top-bar">
      <button
        type="button"
        className="top-brand"
        onClick={onBrandClick}
        aria-label={t('appName')}
      >
        <Globe2 size={18} strokeWidth={2.2} aria-hidden />
        <span>{t('appName')}</span>
      </button>
      <div className="top-end">
        <TopNavIcons tab={tab} onChange={onChange} t={t} />
      </div>
    </header>
  );
}
