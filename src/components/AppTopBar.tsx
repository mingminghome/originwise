import type { TFunction } from '../core/i18n';
import type { TabId } from '../hooks/useAppState';
import { TopNavIcons } from './TopNavIcons';

/**
 * Shared chrome: OriginWise brand (left) + top-right icons.
 * Same layout on Check / History / About / Settings so edges align.
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
    <div className="app-topbar">
      <button
        type="button"
        className="check-brand"
        onClick={onBrandClick}
      >
        OriginWise
      </button>
      <TopNavIcons tab={tab} onChange={onChange} t={t} />
    </div>
  );
}
