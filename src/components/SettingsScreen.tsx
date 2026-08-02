import { ChevronRight, HelpCircle, Info } from 'lucide-react';
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

export function SettingsScreen({ state }: { state: AppState }) {
  const { settings, updateSettings, t, cleanData, dataSummary, setTab } =
    state;

  const patch = (partial: Partial<typeof settings>) => {
    updateSettings({ ...settings, ...partial });
  };

  const toggleDim = (dim: CheckDimension, on: boolean) => {
    const set = new Set(settings.defaultDimensions);
    if (on) set.add(dim);
    else set.delete(dim);
    // Keep at least one core dimension
    if (set.size === 0) {
      set.add('origin');
    }
    patch({ defaultDimensions: ALL_DIMENSIONS.filter((d) => set.has(d)) });
  };

  return (
    <>
      <header className="app-header">
        <div>
          <h1>{t('settings.title')}</h1>
          <p className="subtitle">{t('settings.subtitle')}</p>
        </div>
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

        <div className="field">
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

        <div className="field">
          <label>{t('settings.geoScope')}</label>
          <p className="muted" style={{ fontSize: '0.82rem' }}>
            {t('settings.geoScopeHint')}
          </p>
          <StyledRadioGroup
            name="geoScope"
            value={settings.geoScope}
            onChange={(v) => patch({ geoScope: v as GeoScope })}
            options={[
              { value: 'prc', label: t('settings.geoScopePrc') },
              { value: 'greater_china', label: t('settings.geoScopeGreater') },
            ]}
          />
        </div>

        <div className="field">
          <label>{t('settings.dimensions')}</label>
          <p className="muted" style={{ fontSize: '0.82rem' }}>
            {t('settings.dimensionsHint')}
          </p>
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

      <section className="card stack" style={{ gap: 0 }}>
        <button
          type="button"
          className="settings-row"
          onClick={() => setTab('how')}
        >
          <span>
            <HelpCircle size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
            {t('settings.howItWorks')}
          </span>
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          className="settings-row"
          onClick={() => setTab('about')}
        >
          <span>
            <Info size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
            {t('settings.about')}
          </span>
          <ChevronRight size={18} />
        </button>
        <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
          {t('settings.version', { v: APP_VERSION })}
        </p>
      </section>

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
