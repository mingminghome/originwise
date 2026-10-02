/**
 * Hover/focus a result section → outline + Save image / Share (local PNG).
 */
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Download, Share2 } from 'lucide-react';
import type { TFunction } from '../core/i18n';
import {
  captureElementPng,
  downloadBlob,
  sectionImageFilename,
  shareOrDownloadPng,
} from '../core/util/sectionImage';

type Status = 'idle' | 'busy' | 'ok' | 'err';

export function SectionShare({
  label,
  t,
  children,
  className,
}: {
  label: string;
  t: TFunction;
  children: ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('idle');

  const run = useCallback(
    async (mode: 'save' | 'share') => {
      const el = rootRef.current;
      if (!el || status === 'busy') return;
      setStatus('busy');
      try {
        const blob = await captureElementPng(el);
        const filename = sectionImageFilename(label);
        if (mode === 'save') {
          downloadBlob(blob, filename);
        } else {
          await shareOrDownloadPng(blob, filename, label);
        }
        setStatus('ok');
        window.setTimeout(() => setStatus('idle'), 1600);
      } catch {
        setStatus('err');
        window.setTimeout(() => setStatus('idle'), 2200);
      }
    },
    [label, status]
  );

  return (
    <div
      ref={rootRef}
      className={`section-share ${className ?? ''}`.trim()}
      data-testid="section-share"
    >
      <div className="section-share-toolbar" data-section-share="ui">
        <button
          type="button"
          className="section-share-btn"
          disabled={status === 'busy'}
          onClick={() => void run('save')}
          aria-label={t('check.sectionShareSave')}
          title={t('check.sectionShareSave')}
        >
          <Download size={14} aria-hidden />
          <span>{t('check.sectionShareSave')}</span>
        </button>
        <button
          type="button"
          className="section-share-btn"
          disabled={status === 'busy'}
          onClick={() => void run('share')}
          aria-label={t('check.sectionShareShare')}
          title={t('check.sectionShareShare')}
        >
          <Share2 size={14} aria-hidden />
          <span>{t('check.sectionShareShare')}</span>
        </button>
        {status === 'ok' ? (
          <span className="section-share-toast" role="status">
            {t('check.sectionShareSaved')}
          </span>
        ) : null}
        {status === 'err' ? (
          <span className="section-share-toast is-err" role="status">
            {t('check.sectionShareFailed')}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
