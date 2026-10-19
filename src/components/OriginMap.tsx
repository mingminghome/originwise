import type { RegionCode } from '../core/types';
import type { TFunction } from '../core/i18n';

const ALL: RegionCode[] = ['CN', 'HK', 'TW', 'MO', 'OTHER'];

export function OriginMap({
  regions,
  t,
}: {
  regions?: RegionCode[];
  t: TFunction;
}) {
  const set = new Set(regions ?? []);
  if (!set.size) return null;

  return (
    <div className="origin-map">
      <h3 className="result-section-title">{t('check.regionsTitle')}</h3>
      <div className="chip-row">
        {ALL.filter((r) => set.has(r)).map((r) => (
          <span
            key={r}
            className={`chip region-chip region-chip--${r.toLowerCase()}`}
          >
            {t(`check.region.${r}`)}
          </span>
        ))}
      </div>
      {set.has('TW') ? (
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: 6 }}>
          {t('check.twNote')}
        </p>
      ) : null}
    </div>
  );
}
