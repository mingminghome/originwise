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
  modelOnlyPartCandidate,
  type DisputeSide,
  type LayerTag,
} from './resultCards.model';
import { ModelRefLabel } from './ModelRef';
import { SectionShare } from './SectionShare';

function pct(n?: number): number | null {
  return typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function ChinaCard({ result, t }: { result: CheckResult; t: TFunction }) {
  const v = buildChinaCard(result);
  const conf = pct(v.confidence);
  const scope = result.geoScope === 'greater_china' ? 'greater_china' : 'prc';
  const company = result.company?.name?.trim() || result.product?.brand?.trim() || '';
  const title = t('check.chinaLink.title');
  const view = companyView(result);

  // Folded answer (company "Goodbaby International / Cybex", HQ China, brand
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
    <SectionShare label={title} t={t} className="rc-card rc-china">
      <div data-testid="china-card">
        <p className="rc-eyebrow">{title}</p>
        <div className="rc-verdict">
          {v.chips.map((chip) => (
            <span key={chip} className={`rc-chip rc-china-chip is-${chip}`} data-testid="china-chip">
              {t(`check.chinaLink.${chip}`)}
            </span>
          ))}
          <span className={`rc-chip rc-tier-chip is-${v.tier}`} data-testid="china-tier">
            {t(`tier.${v.tier}`)}
          </span>
          {conf != null ? (
            <span className="rc-chip" data-testid="china-confidence">
              {t('check.confidence', { n: conf })}
            </span>
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
    </SectionShare>
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
    </>
  );
}

export function MadeInCard({ result, t }: { result: CheckResult; t: TFunction }) {
  const view = buildMadeInView(result);
  const title = t('check.chinaLink.madeIn');
  const conf = pct(view.confidence);
  const country = view.country ? localizeCountry(t, view.country) : '';
  const confirmed = view.state === 'confirmed';
  const sep = t('common.labelSep');

  return (
    <SectionShare label={title} t={t} className={`rc-card rc-madein is-${view.state}`}>
      <div data-testid="madein-card" data-state={view.state}>
        <p className="rc-eyebrow">{title}</p>
        {/* Only a confirmed country reaches the headline; anything else is 未確認. */}
        {confirmed ? (
          <p className="rc-headline">{country}</p>
        ) : (
          <p className="rc-headline is-unconfirmed">{t('check.chinaLink.unconfirmed')}</p>
        )}

        <div className="rc-chips">
          {confirmed && view.basis ? (
            <span className="rc-chip rc-chip--solid">{t(`check.matchBasis.${view.basis}`)}</span>
          ) : null}
          {confirmed && conf != null ? (
            <span className="rc-chip">{t('check.confidence', { n: conf })}</span>
          ) : null}
          {confirmed && view.sourceCount > 0 ? (
            <span className="rc-chip">{t('check.rc.sourceCount', { n: view.sourceCount })}</span>
          ) : null}
          {!confirmed && view.reason ? (
            <span className="rc-chip" data-testid="madein-reason">
              {t(`check.rc.reason.${view.reason}`)}
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

        {view.candidates.length || (!confirmed && !view.dispute?.length) ? (
          // Under a 爭議 line with nothing below it, the empty heading is hidden too.
          <div className="rc-candidates">
            <p className="rc-sub">{t('check.rc.candidatesTitle')}</p>
            {view.candidates.length ? (
              <ul>
                {view.candidates.map((c) => {
                  // Model made-in guess, or a parts row only the model named.
                  const model = modelOnlyPartCandidate(result, c);
                  return (
                    <li key={`${c.label}-${c.source}`} className={model ? 'is-model' : undefined}>
                      {/* Country + model label share one cell; the label may wrap inside it, never apart. */}
                      <span className={`rc-cand-country${model ? ' is-model' : ''}`}>
                        <span className="rc-cand-name">{localizeCountry(t, c.label)}</span>
                        {model ? <ModelRefLabel t={t} /> : null}
                      </span>
                      {/* Model-only guess: 模型參考 only. Pages that disagree: neutral
                          (no grade). One exact-model page: 「1 個型號相符的網頁」, no grade.
                          Otherwise the row's own grade, with no hedge suffix. */}
                      {model || c.neutral ? null : (
                        <span className="rc-cand-meta" data-testid={c.exactPages ? 'cand-exact-one' : undefined}>
                          {c.exactPages
                            ? t('check.rc.oneExactModelPage')
                            : `${t(`check.candidateRating.${c.rating}`)} · ${t(`check.candidateSource.${c.source}`)}`}
                        </span>
                      )}
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
                  );
                })}
              </ul>
            ) : view.dispute?.length ? null : (
              // A 爭議 line already says why there is no answer.
              <p className="rc-empty">{t('check.rc.noCandidates')}</p>
            )}
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
        <p className="rc-title">{title}</p>
        <dl className="rc-rows">
          {rows.map((r) => {
            const country = r.country ? localizeCountry(t, r.country) : '';
            const name = r.names?.length ? r.names.join(listSep) : r.value;
            const value = [name, country].filter(Boolean).join(' · ') || '—';
            return (
              <div key={`${r.key}-${r.country ?? ''}`} className={`rc-row rc-layer-row${r.modelRef ? ' is-model' : ''}`}>
                <dt className="rc-row-label">{t(LAYER_LABEL[r.key])}</dt>
                {r.modelRef ? (
                  // Model-only parts: value + 模型參考 + ⓘ in one cell, no tag/grade.
                  <dd className="rc-row-value rc-layer-model">
                    <span>{value}</span>
                    <ModelRefLabel t={t} />
                  </dd>
                ) : (
                  <>
                    <dd className="rc-row-value">{value}</dd>
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
