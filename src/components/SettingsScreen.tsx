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
import { InstallAppBanner } from './InstallAppBanner';
import { StyledCheckbox } from './ui/StyledCheckbox';

const DIM_LABEL: Record<CheckDimension, string> = {
  origin: 'settings.dimOrigin',
  manufacturer: 'settings.dimManufacturer',
  company_relations: 'settings.dimCompany',
  alt_brands: 'settings.dimAltBrands',
  alt_products: 'settings.dimAltProducts',
};

/**
 * Flat Settings: all preferences as cards, no nested hub.
 */
export function SettingsScreen({ state }: { state: AppState }) {
  const {
    settings,
    updateSettings,
    t,
    cleanData,
    dataSummary,
    setTab,
  } = state;

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

  return (
    <div className="layout-grid">
      <div className="span-2">
        <InstallAppBanner t={t} />
        <header className="app-page-head">
          <h1>{t('settings.title')}</h1>
          <p className="subtitle">{t('settings.subtitle')}</p>
        </header>
      </div>

      <section className="card">
        <h2 className="section-title">{t('settings.language')}</h2>
        <div className="chip-row">
          {(
            [
              ['en', 'English'],
              ['zh-Hant', '繁體中文'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`chip ${settings.locale === id ? 'active' : ''}`}
              onClick={() => patch({ locale: id as Locale })}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">{t('settings.theme')}</h2>
        <div className="chip-row">
          {(
            [
              ['system', 'settings.themeSystem'],
              ['light', 'settings.themeLight'],
              ['dark', 'settings.themeDark'],
            ] as const
          ).map(([id, key]) => (
            <button
              key={id}
              type="button"
              className={`chip ${settings.theme === id ? 'active' : ''}`}
              onClick={() => patch({ theme: id as ThemeMode })}
            >
              {t(key)}
            </button>
          ))}
        </div>
      </section>

      <section className="card span-2">
        <h2 className="section-title">{t('settings.geoScope')}</h2>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 10 }}>
          {t('settings.geoScopeHint')}
        </p>
        <div className="chip-row">
          {(
            [
              ['prc', 'settings.geoScopePrc'],
              ['greater_china', 'settings.geoScopeGreater'],
            ] as const
          ).map(([id, key]) => (
            <button
              key={id}
              type="button"
              className={`chip ${settings.geoScope === id ? 'active' : ''}`}
              onClick={() => patch({ geoScope: id as GeoScope })}
            >
              {t(key)}
            </button>
          ))}
        </div>
      </section>

      <section className="card span-2">
        <h2 className="section-title">{t('settings.dimensions')}</h2>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 10 }}>
          {t('settings.dimensionsHint')}
        </p>
        <div className="stack" style={{ gap: '0.45rem' }}>
          {ALL_DIMENSIONS.map((dim) => (
            <StyledCheckbox
              key={dim}
              checked={settings.defaultDimensions.includes(dim)}
              onChange={(on) => toggleDim(dim, on)}
              label={t(DIM_LABEL[dim])}
            />
          ))}
        </div>
      </section>

      <div className="span-2">
        <CleanDataPanel
          t={t}
          summary={dataSummary}
          onClean={cleanData}
          onCleaned={(cat) => {
            if (cat === 'all') setTab('check');
          }}
        />
      </div>

      <p className="muted settings-version span-2">
        {t('settings.version', { v: APP_VERSION })}
      </p>
    </div>
  );
}
