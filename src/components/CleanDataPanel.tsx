import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { TFunction } from '../core/i18n';
import type { DataCategory } from '../core/types';
import { StyledRadioGroup } from './ui/StyledRadioGroup';

type Summary = {
  checkCount: number;
  hasCustomSettings: boolean;
  hasDisclaimer: boolean;
  keyCount: number;
};

type Props = {
  t: TFunction;
  summary: Summary;
  onClean: (category: DataCategory) => void;
  onCleaned?: (category: DataCategory) => void;
};

const OPTIONS: Array<{ id: DataCategory; labelKey: string }> = [
  { id: 'all', labelKey: 'settings.cleanAll' },
  { id: 'checkHistory', labelKey: 'settings.cleanHistory' },
  { id: 'settings', labelKey: 'settings.cleanSettings' },
];

export function CleanDataPanel({ t, summary, onClean, onCleaned }: Props) {
  const [category, setCategory] = useState<DataCategory>('all');
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleClean = () => {
    onClean(category);
    setConfirming(false);
    const msg =
      category === 'all'
        ? t('settings.cleanDoneAll')
        : category === 'checkHistory'
          ? t('settings.cleanDoneHistory')
          : t('settings.cleanDoneSettings');
    setResult(msg);
    onCleaned?.(category);
    window.setTimeout(() => setResult(null), 3500);
  };

  return (
    <div className="clean-panel">
      <h3>
        <Trash2 size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
        {t('settings.cleanData')}
      </h3>
      <p className="muted">{t('settings.cleanDataHint')}</p>

      <div className="card-soft" style={{ marginTop: '0.75rem' }}>
        <div className="muted" style={{ fontWeight: 700, marginBottom: 6 }}>
          {t('settings.dataSummary')}
        </div>
        {summary.keyCount === 0 ? (
          <p className="muted">{t('settings.dataNone')}</p>
        ) : (
          <ul className="muted" style={{ margin: 0, paddingLeft: '1.1rem' }}>
            <li>{t('settings.dataHistory', { n: summary.checkCount })}</li>
            <li>
              {t('settings.dataSettings')}:{' '}
              {summary.hasCustomSettings
                ? t('common.present')
                : t('common.missing')}
            </li>
            <li>
              {t('settings.dataDisclaimer')}:{' '}
              {summary.hasDisclaimer
                ? t('common.present')
                : t('common.missing')}
            </li>
          </ul>
        )}
      </div>

      <div className="clean-options" style={{ marginTop: '0.75rem' }}>
        <StyledRadioGroup
          name="clean-category"
          aria-label={t('settings.cleanData')}
          value={category}
          onChange={(v) => {
            setCategory(v as DataCategory);
            setConfirming(false);
          }}
          options={OPTIONS.map((opt) => ({
            value: opt.id,
            label: t(opt.labelKey),
          }))}
        />
      </div>

      {!confirming ? (
        <button
          type="button"
          className="btn btn-danger btn-block"
          style={{ marginTop: '0.85rem' }}
          onClick={() => setConfirming(true)}
        >
          {t('common.delete')}
        </button>
      ) : (
        <div className="stack" style={{ marginTop: '0.85rem', gap: '0.5rem' }}>
          <p className="muted">{t('settings.cleanConfirm')}</p>
          <button
            type="button"
            className="btn btn-danger btn-block"
            onClick={handleClean}
          >
            {t('settings.cleanConfirmBtn')}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={() => setConfirming(false)}
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {result ? (
        <p className="muted" role="status" style={{ marginTop: '0.75rem' }}>
          {result}
        </p>
      ) : null}
    </div>
  );
}
