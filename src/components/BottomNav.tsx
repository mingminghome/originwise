import { History, Search, Settings } from 'lucide-react';
import type { TFunction } from '../core/i18n';
import type { TabId } from '../hooks/useAppState';

const items: Array<{ id: TabId; icon: typeof Search; labelKey: string }> = [
  { id: 'check', icon: Search, labelKey: 'tabs.check' },
  { id: 'history', icon: History, labelKey: 'tabs.history' },
  { id: 'settings', icon: Settings, labelKey: 'tabs.settings' },
];

export function BottomNav({
  tab,
  onChange,
  t,
}: {
  tab: TabId;
  onChange: (t: TabId) => void;
  t: TFunction;
}) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {items.map(({ id, icon: Icon, labelKey }) => {
        const active =
          tab === id ||
          (id === 'settings' && (tab === 'about' || tab === 'how'));
        return (
          <button
            key={id}
            type="button"
            className={active ? 'active' : undefined}
            onClick={() => onChange(id)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 2} />
            {t(labelKey)}
          </button>
        );
      })}
    </nav>
  );
}
