/**
 * China-first result cards (Ming's 3-state layout, China card on top).
 *
 * - ChinaCard: 與中國的關係 — the ONLY place a China verdict appears
 *   (chip, relation tier, confidence, tier reasons).
 * - MadeInCard: 製造地 — country, basis, confidence, sources. No China verdict.
 *   「較可能」 always sits next to 「（非確認）」.
 * - LayersCard: 產地分層 rows with a status tag.
 * - Fold: collapsible section, closed by default.
 */
import type { ReactNode } from 'react';
import type { CheckResult } from '../core/types';
import { localeOfT, type TFunction } from '../core/i18n';
import { localizeCountry } from '../core/i18n/countries';
import { formatTierReason } from '../core/i18n/tierReasons';
import {
  buildChinaLinks,
  chinaCardReasons,
  companyView,
  displayTier,
  isChinaCountry,
  pickOwner,
} from './ChinaLink';
import {
  buildLayerRows,
  buildMadeInView,
  cleanValue,
  type LayerTag,
} from './resultCards.model';
import { SectionShare } from './SectionShare';
import { TierBadge } from './TierBadge';

function pct(n?: number): number | null {
  return typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function ChinaCard({ result, t }: { result: CheckResult; t: TFunction }) {
  const { chip, hqFolded } = buildChinaLinks(result);
  const shown = displayTier(result);
  const conf = pct(shown.confidence);
  const scope = result.geoScope === 'greater_china' ? 'greater_china' : 'prc';
  const c = result.company;
  // Folded answer (company "Goodbaby International / Cybex", HQ China, brand
  // origin Germany): that China HQ is the parent's, so the brand's own HQ is
  // shown as unconfirmed and the China HQ sits on the parent row.
  const hq = hqFolded ? '' : cleanValue(c?.hqCountry);
  const company = c?.name?.trim() || result.product?.brand?.trim() || '';
  const parents = (c?.parents ?? []).filter((x) => x.name?.trim());
  const picked = pickOwner(result);
  const fallback = parents[0];
  const owner = picked
    ? picked
    : fallback
      ? { name: fallback.name.trim(), country: cleanValue(fallback.country), control: fallback.control }
      : undefined;
  const reasons = chinaCardReasons(result.tierReasons, { hqFolded });
  const brandOrigin = cleanValue(result.product?.originCountry);
  const title = t('check.chinaLink.title');

  const rows: Array<{ key: string; label: string; value: string; china: boolean; detail?: string }> = [
    {
      key: 'hq',
      label: t('check.chinaLink.hq'),
      value: hq ? localizeCountry(t, hq) : t('check.chinaLink.unconfirmed'),
      china: Boolean(hq) && isChinaCountry(hq, scope),
      detail: hqFolded
        ? [company, t('check.chinaLink.hqParentNote')].filter(Boolean).join(' · ')
        : company || undefined,
    },
  ];
  if (owner) {
    const oc = cleanValue(owner.country);
    const control =
      owner.control && owner.control !== 'unknown' ? t(`check.graphEdge.${owner.control}`) : '';
    rows.push({
      key: 'owner',
      label: t('check.chinaLink.owner'),
      value: owner.name.trim(),
      china: Boolean(oc) && isChinaCountry(oc, scope),
      detail: [oc ? localizeCountry(t, oc) : '', control.startsWith('check.') ? '' : control]
        .filter(Boolean)
        .join(' · ') || undefined,
    });
  }
  rows.push({
    key: 'brandOrigin',
    label: t('check.chinaLink.brandOrigin'),
    value: brandOrigin ? localizeCountry(t, brandOrigin) : t('check.chinaLink.unconfirmed'),
    china: Boolean(brandOrigin) && isChinaCountry(brandOrigin, scope),
  });

  return (
    <SectionShare label={title} t={t} className="rc-card rc-china">
      <div data-testid="china-card">
        <p className="rc-eyebrow">{title}</p>
        <div className="rc-verdict">
          {chip ? (
            <span className={`rc-chip rc-chip--solid rc-china-chip is-${chip}`} data-testid="china-chip">
              {t(`check.chinaLink.${chip}`)}
            </span>
          ) : null}
          <TierBadge tier={shown.tier} label={t(`tier.${shown.tier}`)} size="lg" />
          {conf != null ? (
            <span className="rc-chip">{t('check.confidence', { n: conf })}</span>
          ) : null}
        </div>
        <dl className="rc-rows">
          {rows.map((r) => (
            <div key={r.key} className="rc-row">
              <dt className="rc-row-label">{r.label}</dt>
              <dd className={`rc-row-value${r.china ? ' is-china' : ''}`}>
                <span>{r.value}</span>
                {r.detail ? <span className="rc-row-detail">{r.detail}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
        {reasons.shown.length || reasons.madeInHidden ? (
          <ul className="rc-reasons" aria-label={t('check.reasons')}>
            {reasons.shown.map((r) => (
              <li key={r}>{formatTierReason(r, t, companyView(result))}</li>
            ))}
            {reasons.madeInHidden ? (
              <li key="made-in-below" className="rc-reasons-pointer">
                {t('check.chinaLink.madeInBelow')}
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </SectionShare>
  );
}

export function MadeInCard({ result, t }: { result: CheckResult; t: TFunction }) {
  const view = buildMadeInView(result);
  const title = t('check.chinaLink.madeIn');
  const conf = pct(view.confidence);
  const country = view.country ? localizeCountry(t, view.country) : '';

  return (
    <SectionShare label={title} t={t} className={`rc-card rc-madein is-${view.state}`}>
      <div data-testid="madein-card" data-state={view.state}>
        <p className="rc-eyebrow">{title}</p>
        {view.state === 'confirmed' ? (
          <p className="rc-headline">{country}</p>
        ) : view.state === 'likely' ? (
          <p className="rc-headline is-likely" data-testid="madein-likely">
            <span className="rc-headline-likely">{t('check.candidateRating.likely')}</span>{' '}
            <span className="rc-headline-country">
              {country}
              {t('check.rc.notConfirmed')}
            </span>
          </p>
        ) : (
          <p className="rc-headline is-unconfirmed">{t('check.chinaLink.unconfirmed')}</p>
        )}

        <div className="rc-chips">
          {view.basis ? (
            <span className="rc-chip rc-chip--solid">{t(`check.matchBasis.${view.basis}`)}</span>
          ) : null}
          {conf != null && view.state !== 'unconfirmed' ? (
            <span className="rc-chip">{t('check.confidence', { n: conf })}</span>
          ) : null}
          {view.sourceCount > 0 && view.state !== 'unconfirmed' ? (
            <span className="rc-chip">{t('check.rc.sourceCount', { n: view.sourceCount })}</span>
          ) : null}
          {view.noBarcodePage && view.state !== 'confirmed' ? (
            <span className="rc-chip">{t('check.rc.noBarcodePage')}</span>
          ) : null}
        </div>

        {view.state !== 'unconfirmed' && (view.source || view.basis === 'label') ? (
          <p className="rc-source">
            {view.basis === 'label' ? (
              t('check.rc.labelSource')
            ) : view.source ? (
              <>
                {view.source.url ? (
                  <a href={view.source.url} target="_blank" rel="noreferrer" title={view.source.url}>
                    {t('check.rc.sourceFirst', { label: view.source.label })}
                  </a>
                ) : (
                  t('check.rc.sourceFirst', { label: view.source.label })
                )}
                {view.source.country
                  ? ` · ${t('check.rc.sourceCountry', { country: localizeCountry(t, view.source.country) })}`
                  : null}
              </>
            ) : null}
          </p>
        ) : null}

        {view.state === 'unconfirmed' ? (
          <div className="rc-candidates">
            <p className="rc-sub">{t('check.rc.candidatesTitle')}</p>
            {view.candidates.length ? (
              <ul>
                {view.candidates.map((c) => (
                  <li key={`${c.label}-${c.source}`}>
                    <span>{localizeCountry(t, c.label)}</span>
                    <span className="rc-cand-meta">
                      {t(`check.candidateRating.${c.rating}`)} · {t(`check.candidateSource.${c.source}`)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rc-empty">{t('check.rc.noCandidates')}</p>
            )}
          </div>
        ) : null}

        {view.state === 'likely' ? (
          <p className="rc-note" data-testid="madein-likely-note">
            {t('check.rc.likelyNote')}
          </p>
        ) : null}
      </div>
    </SectionShare>
  );
}

const TAG_KEY: Record<LayerTag, string> = {
  confirmed: 'check.rc.tagConfirmed',
  likely: 'check.rc.tagLikely',
  mentioned: 'check.rc.tagMentioned',
  unconfirmed: 'check.rc.tagUnconfirmed',
};

const LAYER_LABEL: Record<string, string> = {
  brandOrigin: 'check.chinaLink.brandOrigin',
  hq: 'check.chinaLink.hq',
  parts: 'check.chinaLink.parts',
  parent: 'check.rc.parent',
};

export function LayersCard({ result, t }: { result: CheckResult; t: TFunction }) {
  const rows = buildLayerRows(result);
  const title = t('check.originLayersTitle');
  return (
    <SectionShare label={title} t={t} className="rc-card rc-layers">
      <div data-testid="layers-card">
        <p className="rc-title">{title}</p>
        <dl className="rc-rows">
          {rows.map((r) => {
            const country = r.country ? localizeCountry(t, r.country) : '';
            const value = [r.value, country].filter(Boolean).join(' · ') || '—';
            return (
              <div key={r.key} className="rc-row rc-layer-row">
                <dt className="rc-row-label">{t(LAYER_LABEL[r.key])}</dt>
                <dd className="rc-row-value">{value}</dd>
                <span className={`rc-tag is-${r.tag}`}>{t(TAG_KEY[r.tag])}</span>
              </div>
            );
          })}
        </dl>
      </div>
    </SectionShare>
  );
}

export function Fold({
  title,
  count,
  t,
  children,
  testId,
}: {
  title: string;
  count?: number;
  t: TFunction;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <details className="rc-fold" data-testid={testId}>
      <summary>
        <span className="rc-fold-title">
          {title}
          {typeof count === 'number'
            ? localeOfT(t) === 'zh-Hant'
              ? `（${count}）`
              : ` (${count})`
            : null}
        </span>
        <span className="rc-fold-toggle">
          <span className="rc-fold-open">{t('check.rc.expand')} ▾</span>
          <span className="rc-fold-close">{t('check.rc.collapse')} ▴</span>
        </span>
      </summary>
      <div className="rc-fold-body">{children}</div>
    </details>
  );
}
