/**
 * 模型參考（未經多重確認） + ⓘ: the one label a model-only country carries.
 * Shared by the 製造地 candidate list and the 產地分層 / 零件 rows, so the
 * wording, tooltip and capture behaviour (ⓘ removed from saved images) stay
 * identical. A model-only row never shows a likelihood grade or a %.
 */
import type { TFunction } from '../core/i18n';
import { InfoTip } from './InfoTip';

export function ModelRefLabel({ t }: { t: TFunction }) {
  return (
    <>
      <span className="rc-cand-label" data-testid="model-ref" title={t('check.rc.modelRefHelp')}>
        {t('check.rc.modelRef')}
      </span>
      <InfoTip label={t('check.rc.moreInfo')} text={t('check.rc.modelRefHelp')} />
    </>
  );
}
