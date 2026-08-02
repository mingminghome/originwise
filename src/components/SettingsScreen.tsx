import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Languages,
  Search,
  Trash2,
} from 'lucide-react';
import {
  ALL_DIMENSIONS,
  type CheckDimension,
  type GeoScope,
  type Locale,
  type ThemeMode,
} from '../core/types';
import type { AppState } from '../hooks/useAppState';
import { APP_VERSION } from '../version';
import { CleanDataPanel } from './CleanDataPanel';
import { StyledCheckbox } from './ui/StyledCheckbox';
import { StyledRadioGroup } from './ui/StyledRadioGroup';

const DIM_LABEL: Record<CheckDimension, string> = {
  origin: 'settings.dimOrigin',
  manufacturer: 'settings.dimManufacturer',
  company_relations: 'settings.dimCompany',
  alt_brands: 'settings.dimAltBrands',
  alt_products: 'settings.dimAltProducts',
};

type Panel = 'home' | 'display' | 'check' | 'data';

/**
 * Settings hub: short menu + one panel at a time (avoids a long scroll).
 */
export function SettingsScreen({ state }: { state: AppState }) {
  const { settings, updateSettings, t, cleanData, dataSummary, setTab } =
    state;
  const [panel, setPanel] = useState<Panel>('home');

  const patch = (partial: Partial<typeof settings>) => {
    updateSettings({ ...settings, ...partial });
  };

  const toggleDim = (dim: CheckDimension, on: boolean) => {
    const set = new Set(settings.defaultDimensions);
    if (on) set.add(dim);
    else set.delete(dim);
    if (set.size === 0) set.add('origin');
    patch({ defaultDimensions: ALL_DIMENSIONS.filter((d) => set.has(d)) });
  };

  if (panel === 'display') {
    return (
      <>
        <header className="app-header settings-subhead">
          <button
            type="button"
            className="settings-back"
            onClick={() => setPanel('home')}
          >
            <ChevronLeft size={20} />
            {t('common.back')}
          </button>
          <h1>{t('settings.panelDisplay')}</h1>
        </header>
        <section className="card stack">
          <div className="field">
            <label>{t('settings.language')}</label>
            <StyledRadioGroup
              name="locale"
              value={settings.locale}
              onChange={(v) => patch({ locale: v as Locale })}
              options={[
                { value: 'en', label: 'English' },
                { value: 'zh-Hant', label: '繁體中文' },
              ]}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>{t('settings.theme')}</label>
            <StyledRadioGroup
              name="theme"
              value={settings.theme}
              onChange={(v) => patch({ theme: v as ThemeMode })}
              options={[
                { value: 'system', label: t('settings.themeSystem') },
                { value: 'light', label: t('settings.themeLight') },
                { value: 'dark', label: t('settings.themeDark') },
              ]}
            />
          </div>
        </section>
      </>
    );
  }

  if (panel === 'check') {
    return (
      <>
        <header className="app-header settings-subhead">
          <button
            type="button"
            className="settings-back"
            onClick={() => setPanel('home')}
          >
            <ChevronLeft size={20} />
            {t('common.back')}
          </button>
          <h1>{t('settings.panelCheck')}</h1>
        </header>
        <section className="card stack">
          <div className="field">
            <label>{t('settings.geoScope')}</label>
            <p className="muted settings-hint">{t('settings.geoScopeHint')}</p>
            <StyledRadioGroup
              name="geoScope"
              value={settings.geoScope}
              onChange={(v) => patch({ geoScope: v as GeoScope })}
              options={[
                { value: 'prc', label: t('settings.geoScopePrc') },
                {
                  value: 'greater_china',
                  label: t('settings.geoScopeGreater'),
                },
              ]}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>{t('settings.dimensions')}</label>
            <p className="muted settings-hint">{t('settings.dimensionsHint')}</p>
            <div className="stack" style={{ gap: '0.45rem', marginTop: 6 }}>
              {ALL_DIMENSIONS.map((dim) => (
                <StyledCheckbox
                  key={dim}
                  checked={settings.defaultDimensions.includes(dim)}
                  onChange={(on) => toggleDim(dim, on)}
                  label={t(DIM_LABEL[dim])}
                />
              ))}
            </div>
          </div>
        </section>
      </>
    );
  }

  if (panel === 'data') {
    return (
      <>
        <header className="app-header settings-subhead">
          <button
            type="button"
            className="settings-back"
            onClick={() => setPanel('home')}
          >
            <ChevronLeft size={20} />
            {t('common.back')}
          </button>
          <h1>{t('settings.panelData')}</h1>
        </header>
        <section className="card">
          <CleanDataPanel
            t={t}
            summary={dataSummary}
            onClean={cleanData}
            onCleaned={(cat) => {
              if (cat === 'all') setTab('check');
            }}
          />
        </section>
      </>
    );
  }

  // Home menu — short, no long scroll
  return (
    <>
      <header className="app-header">
        <div>
          <h1>{t('settings.title')}</h1>
          <p className="subtitle">{t('settings.subtitle')}</p>
        </div>
      </header>

      <section className="card settings-menu">
        <button
          type="button"
          className="settings-row"
          onClick={() => setPanel('display')}
        >
          <span>
            <Languages size={16} style={{ verticalAlign: -2, marginRight: 8 }} />
            {t('settings.panelDisplay')}
          </span>
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          className="settings-row"
          onClick={() => setPanel('check')}
        >
          <span>
            <Search size={16} style={{ verticalAlign: -2, marginRight: 8 }} />
            {t('settings.panelCheck')}
          </span>
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          className="settings-row"
          onClick={() => setPanel('data')}
        >
          <span>
            <Trash2 size={16} style={{ verticalAlign: -2, marginRight: 8 }} />
            {t('settings.panelData')}
          </span>
          <ChevronRight size={18} />
        </button>
      </section>

      <p className="muted settings-version">
        {t('settings.version', { v: APP_VERSION })}
      </p>
    </>
  );
}
