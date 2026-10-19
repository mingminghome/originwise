/**
 * China-first result cards (Ming's 3-state layout, China card on top).
 *
 * - ChinaCard: 與中國的關係 — the ONLY place a China verdict appears
 *   (chip, relation tier, confidence, tier reasons).
 * - MadeInCard: 製造地 — a confirmed country with basis, confidence, sources;
 *   anything not confirmed is 未確認 with candidate countries (and their
 *   sources) underneath. No China verdict.
 * - LayersCard: 產地分層 rows with a status tag.
 * - Fold: collapsible section, closed by default.
 */
import type { ReactNode } from 'react';
import type { CheckResult } from '../core/types';
import { localeOfT, type TFunction } from '../core/i18n';
import { localizeCountry } from '../core/i18n/countries';
import { formatTierReason } from '../core/i18n/tierReasons';
import { buildChinaCard, companyView, isChinaCountry } from './ChinaLink';
import {
  buildLayerRows,
  buildMadeInView,
  cleanValue,
  type DisputeSide,
  type LayerTag,
} from './resultCards.model';
import { noteWithinEvidence } from '../core/evidence';
import { InfoTip } from './InfoTip';
import { ModelRefLabel } from './ModelRef';
import { SectionShare } from './SectionShare';

function pct(n?: number): number | null {
  return typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** Under the score card the details stay, without a second share image. */
function CardFrame({
  plain,
  label,
  t,
  className,
  children,
}: {
  plain?: boolean;
  label: string;
  t: TFunction;
  className: string;
  children: ReactNode;
}) {
  if (plain) return <div className={className}>{children}</div>;
  return (
    <SectionShare label={label} t={t} className={className}>
      {children}
    </SectionShare>
  );
}

export function ChinaCard({
  result,
  t,
  plain = false,
}: {
  result: CheckResult;
  t: TFunction;
  plain?: boolean;
}) {
  const v = buildChinaCard(result);
  const conf = pct(v.confidence);
  const scope = result.geoScope === 'greater_china' ? 'greater_china' : 'prc';
  const company = result.company?.name?.trim() || result.product?.brand?.trim() || '';
  const title = t('check.chinaLink.title');
  const view = companyView(result);

  // Folded answer (company "Parentco International / Acme", HQ China, brand
  // origin Germany): that China HQ is the parent's, so the brand's own HQ is
  // shown as unconfirmed and the China HQ sits on the parent row.
  const rows: Array<{ key: string; label: string; value: string; china: boolean; detail?: string }> = [
    {
      key: 'hq',
      label: t('check.chinaLink.hq'),
      value: v.hq ? localizeCountry(t, v.hq) : t('check.chinaLink.unconfirmed'),
      china: Boolean(v.hq) && isChinaCountry(v.hq, scope),
      detail: v.hqFolded
        ? [company, t('check.chinaLink.hqParentNote')].filter(Boolean).join(' · ')
        : company || undefined,
    },
  ];
  if (v.owner) {
    const oc = cleanValue(v.owner.country);
    const stake =
      v.stake.kind === 'stated'
        ? t(`check.graphEdge.${v.stake.control}`)
        : v.stake.kind === 'neutral'
          ? t('check.chinaLink.controlling')
          : '';
    rows.push({
      key: 'owner',
      label: t('check.chinaLink.owner'),
      value: v.owner.name,
      china: Boolean(oc) && isChinaCountry(oc, scope),
      detail: [oc ? localizeCountry(t, oc) : '', stake].filter(Boolean).join(' · ') || undefined,
    });
  }
  rows.push({
    key: 'brandOrigin',
    label: t('check.chinaLink.brandOrigin'),
    value: v.brandOrigin ? localizeCountry(t, v.brandOrigin) : t('check.chinaLink.unconfirmed'),
    china: Boolean(v.brandOrigin) && isChinaCountry(v.brandOrigin, scope),
  });
  const manufacturer = result.product?.manufacturer?.trim();
  if (manufacturer) {
    const where = result.product?.manufacturerCountry?.trim();
    rows.push({
      key: 'manufacturer',
      label: t('check.manufacturer'),
      value: manufacturer,
      china: Boolean(where) && isChinaCountry(where, scope),
      detail: where ? localizeCountry(t, where) : undefined,
    });
  }
  let ops = 0;
  for (const rel of result.company?.chinaRelations ?? []) {
    const type = String(rel.type ?? '').toLowerCase();
    if (type !== 'manufacturing' && type !== 'supply') continue;
    const country = rel.country?.trim();
    const note = rel.note?.trim();
    rows.push({
      key: `ops-${type}-${ops}`,
      label: t(type === 'supply' ? 'check.chinaLink.supply' : 'check.chinaLink.factory'),
      value: country ? localizeCountry(t, country) : t('check.chinaLink.unconfirmed'),
      china: Boolean(country) && isChinaCountry(country, scope),
      detail: note && noteWithinEvidence(result, note) ? note : undefined,
    });
    ops += 1;
  }
  const factoryChina = rows.some((r) => r.key.startsWith('ops-') && r.china);
  const tier = (v.tier === 'none' || v.tier === 'unknown') && factoryChina ? 'indirect' : v.tier;

  const lines: Array<{ key: string; text: string; pointer?: boolean }> = [];
  for (const r of v.reasons) {
    const line =
      r.kind === 'parent'
        ? { key: 'parent', text: t('check.chinaLink.reasonParent') }
        : r.kind === 'brandOrigin'
          ? { key: 'brandOrigin', text: t('check.chinaLink.reasonBrandOrigin', { place: localizeCountry(t, r.country) }) }
          : r.kind === 'madeIn'
            ? {
                key: 'madeIn',
                text: t(
                  r.basis === 'label'
                    ? 'check.chinaLink.madeInLineLabel'
                    : r.basis === 'model'
                      ? 'check.chinaLink.madeInLineModel'
                      : 'check.chinaLink.madeInLineBarcode',
                  { place: localizeCountry(t, r.country) }
                ),
              }
            : r.kind === 'pointer'
              ? { key: 'pointer', text: t('check.chinaLink.madeInBelow'), pointer: true }
              : { key: r.code, text: formatTierReason(r.code, t, view) };
    // One bullet per fact: identical wording is shown once.
    if (!lines.some((l) => l.text === line.text)) lines.push(line);
  }

  return (
    <CardFrame plain={plain} label={title} t={t} className={`rc-card rc-china is-${tier}`}>
      <div data-testid="china-card">
        <div className="rc-eyebrow">
          <span>{title}</span>
          <InfoTip label={t('check.rc.moreInfo')} text={t('check.rc.tip.tier')} />
        </div>
        <p
          className={`rc-headline${tier === 'unknown' || tier === 'indirect' ? ' is-unconfirmed' : ''}`}
          data-testid="china-tier"
        >
          {t(`tier.${tier}`)}
        </p>
        {v.chips.length || conf != null ? (
          <div className="rc-chips">
            {v.chips.map((chip) => (
              <span key={chip} className="rc-tip" title={t('check.rc.tip.tier')}>
                <span className={`rc-chip rc-china-chip is-${chip}`} data-testid="china-chip">
                  {t(`check.chinaLink.${chip}`)}
                </span>
              </span>
            ))}
            {conf != null ? (
              <span className="rc-tip" title={t('check.rc.tip.confidence')}>
                <span className="rc-chip" data-testid="china-confidence">
                  {t('check.confidenceRelation', { n: conf })}
                </span>
              </span>
            ) : null}
          </div>
        ) : null}
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
        {lines.length ? (
          <ul className="rc-reasons" aria-label={t('check.reasons')}>
            {lines.map((l) => (
              <li key={l.key} className={l.pointer ? 'rc-reasons-pointer' : undefined}>
                {l.text}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="rc-footnote" data-testid="china-footnote">
          {t('check.chinaLink.footnote')}
        </p>
      </div>
    </CardFrame>
  );
}

type SourceRowLike = {
  label: string;
  url?: string;
  host?: string;
  pathHint?: string;
  country?: string;
};

/** "來源 2：" (or any prefix) as plain text; only the page title is the link. */
export function sourcePrefix(t: TFunction, n: number): { before: string; after: string } {
  const MARK = '\u0001';
  const [before = '', after = ''] = t('check.rc.sourceNth', { n, label: MARK }).split(MARK);
  return { before, after };
}

/** "來源：" for a 附加資訊 link, as plain text outside the link. */
function infoSourcePrefix(t: TFunction): { before: string; after: string } {
  const MARK = '\u0001';
  const [before = '', after = ''] = t('check.rc.infoSource', { label: MARK }).split(MARK);
  return { before, after };
}

/** One 爭議 side: 「中國（1 個型號相符的網頁）」「中國（包裝標示）」「中國（包裝標示、1 個型號相符的網頁）」. */
function disputeSide(t: TFunction, d: DisputeSide): string {
  const country = localizeCountry(t, d.country);
  if (d.label) {
    // Matching-model pages are worded as on a page-only side (「1 個型號相符的網頁」).
    if (!d.pages) return t('check.rc.disputeSideLabel', { country });
    if (!d.exactPages) return t('check.rc.disputeSideLabelPages', { country, n: d.pages });
    if (d.exactPages >= d.pages) return t('check.rc.disputeSideLabelExact', { country, n: d.exactPages });
    return t('check.rc.disputeSideLabelMixed', { country, n: d.pages, e: d.exactPages });
  }
  if (!d.exactPages) return t('check.rc.disputeSidePages', { country, n: d.pages });
  if (d.exactPages >= d.pages) return t('check.rc.disputeSideExact', { country, n: d.exactPages });
  return t('check.rc.disputeSideMixed', { country, n: d.pages, e: d.exactPages });
}

/**
 * One source row: prefix text, then the title (the only underlined, clickable
 * part), then host / path hint / 生產國. Shared by every 製造地 row variant.
 */
function SourceLine({
  t,
  prefix,
  suffix,
  src,
  plain,
}: {
  t: TFunction;
  prefix?: string;
  suffix?: string;
  src: SourceRowLike;
  /** Not a page (the AI answer): no link. */
  plain?: boolean;
}) {
  return (
    <>
      {prefix ? <span className="rc-source-prefix">{prefix}</span> : null}
      {src.url && !plain ? (
        <a href={src.url} target="_blank" rel="noreferrer nofollow" title={src.url} className="rc-source-title">
          {src.label}
        </a>
      ) : (
        <span className="rc-source-title">{src.label}</span>
      )}
      {suffix ? suffix : null}
      {src.host || src.pathHint || src.country ? (
        <span className="rc-source-meta">
          {src.host || src.pathHint ? (
            <>
              {' · '}
              <span className="rc-source-host">
                {src.host ?? ''}
                {src.pathHint ?? ''}
              </span>
            </>
          ) : null}
          {src.country ? (
            <>
              {' · '}
              <span className="rc-source-country">
                {t('check.rc.sourceCountry', { country: localizeCountry(t, src.country) })}
              </span>
            </>
          ) : null}
        </span>
      ) : null}
    </>
  );
}

export function MadeInCard({
  result,
  t,
  plain = false,
}: {
  result: CheckResult;
  t: TFunction;
  plain?: boolean;
}) {
  const view = buildMadeInView(result);
  const title = t('check.chinaLink.madeIn');
  const conf = pct(view.confidence);
  const country = view.country ? localizeCountry(t, view.country) : '';
  const confirmed = view.state === 'confirmed';
  const sep = t('common.labelSep');

  return (
    <CardFrame plain={plain} label={title} t={t} className={`rc-card rc-madein is-${view.state}`}>
      <div data-testid="madein-card" data-state={view.state}>
        <div className="rc-eyebrow">
          <span title={t('check.rc.tip.madeIn')}>{title}</span>
        </div>
        {/* Confirmed country, or 「大多產自」 when parts lead. Else 未確認. */}
        {confirmed ? (
          <p className="rc-headline">{country}</p>
        ) : view.mostly ? (
          <p className="rc-headline is-unconfirmed" title={t('check.rc.mostlyHelp')}>
            {t('check.rc.mostly', { country: localizeCountry(t, view.mostly) })}
          </p>
        ) : (
          <p className="rc-headline is-unconfirmed">{t('check.chinaLink.unconfirmed')}</p>
        )}

        <div className="rc-chips">
          {confirmed && view.basis ? (
            <span className="rc-tip" title={t('check.rc.tip.confirmed')}>
              <span className="rc-chip rc-chip--solid">{t(`check.matchBasis.${view.basis}`)}</span>
            </span>
          ) : null}
          {confirmed && conf != null ? (
            <span className="rc-tip" title={t('check.rc.tip.confidence')}>
              <span className="rc-chip">{t('check.confidence', { n: conf })}</span>
            </span>
          ) : null}
          {confirmed && view.sourceCount > 0 ? (
            <span className="rc-tip" title={t('check.rc.tip.vote')}>
              <span className="rc-chip">{t('check.rc.sourceCount', { n: view.sourceCount })}</span>
            </span>
          ) : null}
          {!confirmed && view.reason ? (
            <span className="rc-tip" title={t('check.rc.tip.unconfirmed')}>
              <span className="rc-chip" data-testid="madein-reason">
                {t(`check.rc.reason.${view.reason}`)}
              </span>
            </span>
          ) : null}
        </div>

        {!confirmed && view.dispute?.length ? (
          // 網頁說法不一: both sides with their page counts; each side's pages are
          // its candidate's source rows below (ungraded).
          <p className="rc-dispute" data-testid="madein-dispute">
            {t('check.rc.dispute', {
              sides: view.dispute.map((d) => disputeSide(t, d)).join(t('check.rc.disputeSep')),
            })}
          </p>
        ) : null}

        {confirmed && view.basis === 'label' ? (
          <p className="rc-source">{t('check.rc.labelSource')}</p>
        ) : null}
        {confirmed && view.sourceRows.length ? (
          // One row per counted source: the chip number is sourceRows.length.
          <ol className="rc-sources" data-testid="madein-sources">
            {view.sourceRows.map((src, i) => {
              const { before, after } = sourcePrefix(t, i + 1);
              return (
                <li key={src.ai ? 'ai-answer' : (src.url ?? src.label)} className="rc-source">
                  <SourceLine
                    t={t}
                    prefix={before}
                    suffix={after}
                    src={src.ai ? { ...src, label: t('check.rc.sourceAiAnswer') } : src}
                    plain={src.ai}
                  />
                </li>
              );
            })}
          </ol>
        ) : null}

        {view.citedRows.length || view.excludedRows.length ? (
          // Shown, never counted: AI-cited links that failed the check, and
          // pages about another model of that name.
          <ul className="rc-sources rc-sources--unverified" data-testid="madein-not-counted">
            {view.citedRows.map((src) => (
              <li key={`cited-${src.url ?? src.label}`} className="rc-source is-unverified">
                <SourceLine t={t} prefix={`${t('check.rc.citedUnverified')}${sep}`} src={src} />
              </li>
            ))}
            {view.excludedRows.map((src) => (
              <li key={`excl-${src.url ?? src.label}`} className="rc-source is-unverified is-excluded">
                <SourceLine
                  t={t}
                  prefix={`${t('check.rc.excludedOtherModel', { model: src.model })}${sep}`}
                  src={src}
                />
              </li>
            ))}
          </ul>
        ) : null}

        {!confirmed && view.votes.length ? (
          // Germany (1/5): how many of the consulted sources named each country.
          <div className="rc-votes" data-testid="madein-votes">
            <ul>
              {view.votes.map((v) => (
                <li key={v.country} className={isChinaCountry(v.country) ? 'is-china' : undefined}>
                  <span className="rc-cand-country">
                    <span className="rc-tip" title={t('check.rc.tip.vote')}>
                      <span className="rc-cand-name">
                        {t('check.rc.vote', {
                          country: localizeCountry(t, v.country),
                          n: v.n,
                          total: v.total,
                        })}
                      </span>
                    </span>
                  </span>
                  {v.sources.length ? (
                    <ol className="rc-cand-sources">
                      {v.sources.map((src, i) => {
                        const { before, after } = sourcePrefix(t, i + 1);
                        return (
                          <li key={src.ai ? 'ai-answer' : (src.url ?? src.label)} className="rc-source">
                            <SourceLine
                              t={t}
                              prefix={before}
                              suffix={after}
                              src={src.ai ? { ...src, label: t('check.rc.sourceAiAnswer') } : src}
                              plain={src.ai}
                            />
                          </li>
                        );
                      })}
                    </ol>
                  ) : null}
                </li>
              ))}
            </ul>
            {view.silent > 0 ? (
              <p className="rc-empty">{t('check.rc.sourcesSilent', { n: view.silent })}</p>
            ) : null}
          </div>
        ) : null}

        {view.unconfirmedTier.length ? (
          // The main list holds only the confirmed country. Every other
          // candidate stays here, with the source vote (Germany 1/5) above.
          <div className="rc-candidates rc-candidates--weak" data-testid="madein-weak">
            <p className="rc-sub">{t('check.rc.weakTitle')}</p>
            <ul>
              {view.unconfirmedTier.map((c) => (
                <li key={`weak-${c.label}-${c.source}`} className="is-model">
                  <span className={`rc-cand-country is-model${isChinaCountry(c.label) ? ' is-china' : ''}`}>
                    <span className="rc-cand-name">{localizeCountry(t, c.label)}</span>
                  </span>
                  <span className="rc-cand-meta" data-testid={c.exactPages ? 'cand-exact-one' : undefined}>
                    {/* A 爭議 side: no % and no source word (its pages are listed
                        below and counted in the 爭議 line). */}
                    {[
                      c.confidence !== undefined ? `${Math.round(c.confidence * 100)}%` : null,
                      c.neutral ? null : c.exactPages ? t('check.rc.oneExactModelPage') : t(`check.candidateSource.${c.source}`),
                      t('check.rc.tagUnconfirmed'),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {c.sources?.length ? (
                    <ol className="rc-cand-sources">
                      {c.sources.map((src, i) => {
                        const { before, after } = sourcePrefix(t, i + 1);
                        return (
                          <li key={src.url ?? src.label} className="rc-source">
                            <SourceLine t={t} prefix={before} suffix={after} src={{ ...src, country: undefined }} />
                          </li>
                        );
                      })}
                    </ol>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : !confirmed && !view.votes.length && !view.dispute?.length ? (
          <div className="rc-candidates">
            <p className="rc-empty">
              {view.sourceTotal > 0
                ? t('check.rc.noMadeInStated', { total: view.sourceTotal })
                : t('check.rc.noCandidates')}
            </p>
          </div>
        ) : null}

        {view.designRows.length ? (
          // Design / brand wording: extra info, never a made-in or a candidate.
          <ul className="rc-design" data-testid="madein-design">
            {view.designRows.map((d) => {
              const { before, after } = infoSourcePrefix(t);
              return (
                <li key={d.country} className="rc-design-row">
                  <span className="rc-design-text">
                    {t(d.kind === 'brand' ? 'check.rc.brandInfo' : 'check.rc.designInfo', {
                      country: localizeCountry(t, d.country),
                    })}
                  </span>
                  {d.kind === 'brand' ? (
                    // Brand row: 確認 only with a quote read on a fetched page or the label.
                    <span
                      className="rc-tip"
                      title={t(d.verified ? 'check.rc.tip.confirmed' : 'check.rc.tip.mentioned')}
                    >
                    <span className={`rc-tag is-${d.verified ? 'confirmed' : 'mentioned'}`} data-testid="brand-tag">
                      {t(d.verified ? 'check.rc.tagConfirmed' : 'check.rc.tagMentioned')}
                    </span>
                    </span>
                  ) : null}
                  {d.source ? (
                    <span className="rc-source rc-design-source">
                      <SourceLine t={t} prefix={before} suffix={after} src={d.source} />
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </CardFrame>
  );
}

const TAG_KEY: Record<LayerTag, string> = {
  confirmed: 'check.rc.tagConfirmed',
  likely: 'check.rc.tagLikely',
  mentioned: 'check.rc.tagMentioned',
  unconfirmed: 'check.rc.tagUnconfirmed',
};

const TAG_TIP: Record<LayerTag, string> = {
  confirmed: 'check.rc.tip.confirmed',
  likely: 'check.rc.tip.likely',
  mentioned: 'check.rc.tip.mentioned',
  unconfirmed: 'check.rc.tip.unconfirmed',
};

const LAYER_LABEL: Record<string, string> = {
  brandOrigin: 'check.chinaLink.brandOrigin',
  hq: 'check.chinaLink.hq',
  manufacturer: 'check.manufacturer',
  parts: 'check.chinaLink.parts',
  parent: 'check.rc.parent',
};

export function LayersCard({ result, t }: { result: CheckResult; t: TFunction }) {
  const rows = buildLayerRows(result);
  const title = t('check.originLayersTitle');
  const listSep = localeOfT(t) === 'zh-Hant' ? '、' : ', ';
  return (
    <SectionShare label={title} t={t} className="rc-card rc-layers">
      <div data-testid="layers-card">
        <div className="rc-title">
          <span>{title}</span>
          <InfoTip label={t('check.rc.moreInfo')} text={t('check.rc.tip.layers')} />
        </div>
        <dl className="rc-rows">
          {rows.map((r) => {
            const country = r.country ? localizeCountry(t, r.country) : '';
            const name = r.names?.length ? r.names.join(listSep) : r.value;
            const value = [name, country].filter(Boolean).join(' · ') || '—';
            const china = Boolean(r.country && isChinaCountry(r.country));
            return (
              <div key={`${r.key}-${r.country ?? ''}`} className={`rc-row rc-layer-row${r.modelRef ? ' is-model' : ''}`}>
                <dt className="rc-row-label">{t(LAYER_LABEL[r.key])}</dt>
                {r.modelRef ? (
                  // Model-only parts: value + 模型參考 + ⓘ in one cell, no tag/grade.
                  <dd className={`rc-row-value rc-layer-model${china ? ' is-china' : ''}`}>
                    <span>{value}</span>
                    <ModelRefLabel t={t} />
                  </dd>
                ) : (
                  <>
                    <dd className={`rc-row-value${china ? ' is-china' : ''}`}>{value}</dd>
                    <span className="rc-tip" title={t(TAG_TIP[r.tag])}>
                    <span className={`rc-tag is-${r.tag}`}>
                      {r.grade ? (
                        // Parts: the part country's own grade + %, same as 零件候選.
                        <>
                          {t(`check.candidateRating.${r.grade.rating}`)}
                          {` · ${Math.round(r.grade.confidence * 100)}%`}
                        </>
                      ) : (
                        <>
                          {t(TAG_KEY[r.tag])}
                        </>
                      )}
                    </span>
                    </span>
                  </>
                )}
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
          {typeof count === 'number' ? <span className="rc-count">{count}</span> : null}
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
