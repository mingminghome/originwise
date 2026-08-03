import { CircleHelp, History, Settings } from 'lucide-react';
import type { TFunction } from '../core/i18n';
import type { TabId } from '../hooks/useAppState';
import { BuyMeAPint } from './BuyMeAPint';

/**
 * Compact icon nav (top-right): History / About / Settings.
 * Replaces the old bottom main menu. Home is Check (brand / default tab).
 * “Buy me a pint” chip when VITE_BUY_ME_A_PINT_URL is set.
 */
export function TopNavIcons({
  tab,
  onChange,
  t,
}: {
  tab: TabId;
  onChange: (t: TabId) => void;
  t: TFunction;
}) {
  const items: Array<{
    id: TabId;
    icon: typeof Settings;
    labelKey: string;
    activeWhen?: TabId[];
  }> = [
    { id: 'history', icon: History, labelKey: 'tabs.history' },
    {
      id: 'about',
      icon: CircleHelp,
      labelKey: 'tabs.about',
      // How-it-works is a sub-page of About
      activeWhen: ['about', 'how'],
    },
    { id: 'settings', icon: Settings, labelKey: 'tabs.settings' },
  ];

  return (
    <div className="top-nav-right">
      <BuyMeAPint t={t} compact />
      <nav className="top-nav-icons" aria-label={t('tabs.navMore')}>
        {items.map(({ id, icon: Icon, labelKey, activeWhen }) => {
          const active = activeWhen
            ? activeWhen.includes(tab)
            : tab === id;
          return (
            <button
              key={id}
              type="button"
              className={active ? 'top-nav-icon is-active' : 'top-nav-icon'}
              onClick={() => onChange(id)}
              aria-label={t(labelKey)}
              title={t(labelKey)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}
