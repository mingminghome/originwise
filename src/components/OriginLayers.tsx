/**
 * Labeled origin layers — presentation only from existing CheckResult fields.
 * Ownership/parents must never be shown as Final COO (madeIn).
 */
import {
  cleanSources,
  sourceLabel,
  splitSourceLine,
} from '../../functions/_lib/sourceLine';
import type { CheckResult } from '../core/types';
import type { TFunction } from '../core/i18n';
import { SectionShare } from './SectionShare';
import { localizeServerText } from '../core/localizeServerText';
import { localizeCountry } from '../core/i18n/countries';
import { ModelRefLabel } from './ModelRef';
import { absorbModelRows, modelOnlyPartCandidate, partsFromModel } from './resultCards.model';

/** Ownership-class chinaRelations types (aligned with server STRONG_REL + minority). */
const OWNERSHIP_REL_TYPES = new Set([
  'ownership',
  'subsidiary',
  'hq',
  'parent_of',
  'owned_by',
  'controlling_shareholder',
  'state_owned_cn',
  'minority_stake',
]);

const UNKNOWN_MADE_IN = /^(unknown|n\/?a|na|none|null|unclear|未知|不明|不詳|不清楚)$/i;

export type OriginCandidateRow = NonNullable<
  NonNullable<CheckResult['product']>['originCandidates']
>[number];

export type BrandOpsLine =
  | { kind: 'brand'; value: string }
  | { kind: 'company'; value: string }
  | { kind: 'hq'; value: string }
  | { kind: 'brandOrigin'; value: string }
  | { kind: 'manufacturer'; value: string; country?: string };

export type OwnershipLine =
  | {
      kind: 'parent';
      name: string;
      country?: string;
      control?: string;
    }
  | {
      kind: 'relation';
      type: string;
      country?: string;
      strength?: string;
      note?: string;
    }
  | {
      kind: 'candidate';
      label: string;
      rating: string;
      confidence: number;
    };

export type PartsLine =
  | { kind: 'components'; value: string }
  | {
      kind: 'candidate';
      label: string;
      rating: string;
      confidence: number;
      source: string;
      /** Only the model named it: 模型參考 + ⓘ, no grade, no %. */
      modelOnly?: boolean;
    }
  | {
      kind: 'part';
      name: string;
      partKind?: string;
      where?: string;
      chinaRelated?: boolean;
      note?: string;
      /** Country came from the model only: 模型參考 + ⓘ after the line. */
      modelOnly?: boolean;
    };

export type OriginLayersModel = {
  brandOps: BrandOpsLine[];
  ownership: OwnershipLine[];
  /** Confirmed final COO label, or null when unconfirmed. */
  finalCoo: string | null;
  parts: PartsLine[];
  /** Model-only / ungrounded parts — countries not Search/OCR confirmed. */
  partsModelOnly: boolean;
  /** Grounding Sources to show with parts when Search-backed. */
  partsSources: string[];
};

function isConfirmedMadeIn(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || UNKNOWN_MADE_IN.test(s)) return null;
  return s;
}

function isOwnershipCandidate(c: OriginCandidateRow): boolean {
  return String(c.source) === 'ownership';
}

function normLabel(s: string): string {
  return s.trim().toLowerCase();
}

/** True when a label is the product display name / SKU title, not a company. */
function isProductDisplayName(
  candidate: string,
  result: CheckResult,
  product: CheckResult['product']
): boolean {
  const key = normLabel(candidate);
  if (!key) return true;
  const productName = product?.name?.trim();
  if (productName && normLabel(productName) === key) return true;
  const title = result.title?.trim();
  if (title && normLabel(title) === key) return true;
  return false;
}

/**
 * Company line: real company / manufacturer / brand only.
 * Never use product.name or check title (model-as-company fallbacks).
 */
function pickCompanyLabel(result: CheckResult): string | null {
  const p = result.product;
  const c = result.company;
  const candidates = [c?.name, c?.legalName, p?.manufacturer, p?.brand];
  for (const raw of candidates) {
    const value = raw?.trim();
    if (!value) continue;
    if (isProductDisplayName(value, result, p)) continue;
    return value;
  }
  return null;
}

/**
 * Partition existing result fields into labeled origin layers.
 * Does not invent COO — Final COO is madeIn only (or unconfirmed).
 */
/**
 * Which quota notice the web row calls for (exported for unit tests).
 * 402 prepaid credits empty → aiCreditsUsedUp (no daily reset);
 * 429 daily free cap → searchQuotaUsedUp.
 */
export function webQuotaNotice(
  result: Pick<CheckResult, 'meta'>
): 'aiCreditsUsedUp' | 'searchQuotaUsedUp' | null {
  const web = result.meta?.agents?.find((a) => a.id === 'web');
  if (web?.error === 'upstream_credits') return 'aiCreditsUsedUp';
  if (web?.error === 'upstream_quota') return 'searchQuotaUsedUp';
  return null;
}

export function buildOriginLayers(result: CheckResult): OriginLayersModel {
  const p = result.product;
  const c = result.company;

  const brandOps: BrandOpsLine[] = [];
  if (p?.brand?.trim()) brandOps.push({ kind: 'brand', value: p.brand.trim() });
  const companyLabel = pickCompanyLabel(result);
  if (companyLabel) {
    if (
      !brandOps.some(
        (b) =>
          b.kind === 'brand' && b.value.toLowerCase() === companyLabel.toLowerCase()
      )
    ) {
      brandOps.push({ kind: 'company', value: companyLabel });
    }
  }
  if (c?.hqCountry?.trim()) {
    brandOps.push({ kind: 'hq', value: c.hqCountry.trim() });
  }
  if (p?.originCountry?.trim()) {
    brandOps.push({ kind: 'brandOrigin', value: p.originCountry.trim() });
  }
  if (p?.manufacturer?.trim()) {
    brandOps.push({
      kind: 'manufacturer',
      value: p.manufacturer.trim(),
      country: p.manufacturerCountry?.trim() || undefined,
    });
  }

  const ownership: OwnershipLine[] = [];
  for (const parent of c?.parents ?? []) {
    const name = parent.name?.trim();
    if (!name) continue;
    ownership.push({
      kind: 'parent',
      name,
      country: parent.country?.trim() || undefined,
      control: parent.control && parent.control !== 'unknown' ? parent.control : undefined,
    });
  }
  for (const rel of c?.chinaRelations ?? []) {
    const type = String(rel.type ?? '').toLowerCase();
    if (!OWNERSHIP_REL_TYPES.has(type)) continue;
    ownership.push({
      kind: 'relation',
      type,
      country: rel.country?.trim() || undefined,
      strength: rel.strength || undefined,
      note: rel.note?.trim() || undefined,
    });
  }
  for (const cand of p?.originCandidates ?? []) {
    if (!isOwnershipCandidate(cand)) continue;
    ownership.push({
      kind: 'candidate',
      label: cand.label,
      rating: cand.rating,
      confidence: cand.confidence,
    });
  }

  const finalCoo = isConfirmedMadeIn(p?.madeIn);

  const parts: PartsLine[] = [];
  const components = isConfirmedMadeIn(p?.componentsOrigin);
  if (components) {
    parts.push({ kind: 'components', value: components });
  }
  // Label-read parts already answer it; queried
  // candidates (e.g. "Japan · likely 55% · parts") would only add noise.
  const skipPartCandidates = result.partsEvidence === 'label';
  for (const cand of skipPartCandidates ? [] : p?.originCandidates ?? []) {
    if (isOwnershipCandidate(cand)) continue;
    // confirmed_coo mirrors Final COO — keep out of parts to avoid “made in” confusion
    if (cand.source === 'confirmed_coo') continue;
    // Manufacturer country only echoes the HQ (older cached results).
    if (cand.source === 'manufacturer') continue;
    parts.push({
      kind: 'candidate',
      label: cand.label,
      rating: cand.rating,
      confidence: cand.confidence,
      source: cand.source,
      modelOnly: modelOnlyPartCandidate(result, cand),
    });
  }
  const partsModel = result.partsEvidence !== 'label' && partsFromModel(result);
  for (const part of p?.parts ?? []) {
    const where = part.madeIn || part.originCountry || undefined;
    parts.push({
      kind: 'part',
      name: part.name,
      partKind: part.kind,
      where,
      chinaRelated: part.chinaRelated,
      note: part.note?.trim() || undefined,
      modelOnly: Boolean(where) && partsModel,
    });
  }
  // Model + web agree on a country → the web row stays (keeps grade / %).
  const partsLines = absorbModelRows(
    parts,
    (l) => l.kind !== 'components' && Boolean(l.modelOnly),
    (l) => (l.kind === 'candidate' ? l.label : l.kind === 'part' ? l.where : undefined)
  );

  // Label-photo (OCR) parts are packaging evidence, not a model guess.
  const partsModelOnly =
    result.knowledgeBasis === 'model_memory' &&
    parts.length > 0 &&
    result.partsEvidence !== 'label';
  const partsSources =
    result.knowledgeBasis === 'web_enriched' && Array.isArray(result.sources)
      ? cleanSources(result.sources, 8)
      : [];

  return { brandOps, ownership, finalCoo, parts: partsLines, partsModelOnly, partsSources };
}

function formatBrandOps(line: BrandOpsLine, t: TFunction): string {
  switch (line.kind) {
    case 'brand':
      return `${t('check.brand')}: ${line.value}`;
    case 'company':
      return `${t('check.company')}: ${line.value}`;
    case 'hq':
      return `${t('check.hq')}: ${localizeCountry(t, line.value)}`;
    case 'brandOrigin':
      return `${t('check.brandOrigin')}: ${localizeCountry(t, line.value)}`;
    case 'manufacturer':
      return line.country
        ? `${t('check.manufacturer')}: ${line.value} (${localizeCountry(t, line.country)})`
        : `${t('check.manufacturer')}: ${line.value}`;
  }
}

function formatOwnership(line: OwnershipLine, t: TFunction): string {
  switch (line.kind) {
    case 'parent': {
      const bits = [line.name];
      if (line.country) bits.push(localizeCountry(t, line.country));
      if (line.control) {
        const key = `check.graphEdge.${line.control}`;
        const label = t(key);
        bits.push(label === key ? line.control : label);
      }
      return `${t('check.parents')}: ${bits.join(' · ')}`;
    }
    case 'relation': {
      const typeKey = `check.graphEdge.${line.type}`;
      const typeLabel = t(typeKey);
      const bits = [typeLabel === typeKey ? line.type.replace(/_/g, ' ') : typeLabel];
      if (line.country) bits.push(localizeCountry(t, line.country));
      if (line.strength) bits.push(line.strength);
      if (line.note) bits.push(localizeServerText(t, line.note));
      return bits.join(' · ');
    }
    case 'candidate': {
      const ratingKey = `check.candidateRating.${line.rating}`;
      const rating = t(ratingKey);
      return `${localizeCountry(t, line.label)} · ${rating === ratingKey ? line.rating : rating} · ${Math.round(line.confidence * 100)}% · ${t('check.candidateSource.ownership')}`;
    }
  }
}

function formatParts(line: PartsLine, t: TFunction): string {
  switch (line.kind) {
    case 'components':
      return `${t('check.componentsOrigin')}: ${line.value}`;
    case 'candidate': {
      // Model-only: country only; the 模型參考 label is added by the row.
      if (line.modelOnly) return localizeCountry(t, line.label);
      const ratingKey = `check.candidateRating.${line.rating}`;
      const rating = t(ratingKey);
      const srcKey = `check.candidateSource.${line.source}`;
      const src = t(srcKey);
      return `${localizeCountry(t, line.label)} · ${rating === ratingKey ? line.rating : rating} · ${Math.round(line.confidence * 100)}% · ${src === srcKey ? line.source : src}`;
    }
    case 'part': {
      const bits = [line.name];
      if (line.partKind) {
        const k = `check.partKind.${line.partKind}`;
        const label = t(k);
        bits.push(label === k ? line.partKind : label);
      }
      if (line.where) bits.push(localizeCountry(t, line.where));
      if (line.chinaRelated) bits.push(t('check.graphChinaLinked'));
      if (line.note) bits.push(localizeServerText(t, line.note));
      return bits.join(' · ');
    }
  }
}

type LayerItem = { text: string; modelRef?: boolean };

function partsItem(line: PartsLine, t: TFunction): LayerItem {
  return {
    text: formatParts(line, t),
    modelRef: line.kind !== 'components' && Boolean(line.modelOnly),
  };
}

function LayerRow({
  label,
  hint,
  items,
  empty,
  variant,
  t,
}: {
  label: string;
  hint?: string;
  items: Array<string | LayerItem>;
  empty?: string;
  variant: 'brand' | 'ownership' | 'coo' | 'parts';
  t: TFunction;
}) {
  return (
    <SectionShare label={label} t={t} className={`origin-layer origin-layer--${variant}`}>
      <div className="origin-layer-head">
        <span className="origin-layer-label">{label}</span>
        {hint ? <span className="muted origin-layer-hint">{hint}</span> : null}
      </div>
      {items.length ? (
        <ul className="origin-layer-list">
          {items.map((raw, i) => {
            const item = typeof raw === 'string' ? { text: raw } : raw;
            return item.modelRef ? (
              <li key={`${i}-${item.text}`} className="is-model">
                <span className="origin-model-row">
                  <span>{item.text}</span>
                  <ModelRefLabel t={t} />
                </span>
              </li>
            ) : (
              <li key={`${i}-${item.text}`}>{item.text}</li>
            );
          })}
        </ul>
      ) : empty ? (
        <p className="muted origin-layer-empty">{empty}</p>
      ) : null}
    </SectionShare>
  );
}

export function OriginLayers({
  result,
  t,
  detailOnly = false,
}: {
  result: CheckResult;
  t: TFunction;
  /**
   * Inside the 產地說明 fold: ownership + parts only. Made-in and brand/HQ
   * already have their own cards above.
   */
  detailOnly?: boolean;
}) {
  const model = buildOriginLayers(result);
  const hasProductOrCompany = Boolean(result.product || result.company);
  if (!hasProductOrCompany) return null;

  const brandItems = model.brandOps.map((l) => formatBrandOps(l, t));
  const ownershipItems = model.ownership.map((l) => formatOwnership(l, t));
  const partsItems = model.parts.map((l) => partsItem(l, t));
  const notice = webQuotaNotice(result);
  const searchQuotaUsedUp = notice === 'searchQuotaUsedUp';
  const aiCreditsUsedUp = notice === 'aiCreditsUsedUp';

  if (detailOnly) {
    // No China verdict here: part rows show their country only.
    const detailParts = model.parts.map((l) =>
      partsItem(l.kind === 'part' ? { ...l, chinaRelated: false } : l, t)
    );
    return (
      <div className="origin-layers origin-layers--detail" data-testid="origin-layers">
        <div className="origin-layers-grid">
          {ownershipItems.length ? (
            <LayerRow
              label={t('check.layerOwnership')}
              items={ownershipItems}
              variant="ownership"
              t={t}
            />
          ) : null}
          {detailParts.length ? (
            <div className="origin-layer-parts-wrap">
              {model.partsModelOnly ? (
                <p className="muted origin-parts-banner" data-testid="parts-model-only-banner">
                  {t('check.partsModelOnlyBanner')}
                </p>
              ) : null}
              <LayerRow label={t('check.layerParts')} items={detailParts} variant="parts" t={t} />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="origin-layers card-soft" data-testid="origin-layers">
      <h3 className="result-section-title">{t('check.originLayersTitle')}</h3>
      <p className="muted origin-layers-intro">{t('check.originLayersIntro')}</p>
      {aiCreditsUsedUp ? (
        <p className="origin-layers-quota" role="status" data-testid="ai-credits-used-up">
          {t('check.aiCreditsUsedUp')}
        </p>
      ) : null}
      {searchQuotaUsedUp ? (
        <p className="origin-layers-quota" role="status" data-testid="search-quota-used-up">
          {t('check.searchQuotaUsedUp')}
        </p>
      ) : null}
      <div className="origin-layers-grid">
        <LayerRow
          label={t('check.layerFinalCoo')}
          items={
            model.finalCoo
              ? [
                  result.product?.madeInBasis === 'barcode' ||
                  result.product?.madeInBasis === 'label'
                    ? `${localizeCountry(t, model.finalCoo)} · ${t(`check.matchBasis.${result.product.madeInBasis}`)}`
                    : localizeCountry(t, model.finalCoo),
                ]
              : []
          }
          empty={t('check.madeInUnconfirmed')}
          variant="coo"
          t={t}
        />

        {brandItems.length ? (
          <LayerRow
            label={t('check.layerBrandOps')}
            items={brandItems}
            variant="brand"
            t={t}
          />
        ) : null}

        <LayerRow
          label={t('check.layerOwnership')}
          hint={t('check.layerOwnershipHint')}
          items={ownershipItems}
          empty={t('check.layerOwnershipEmpty')}
          variant="ownership"
          t={t}
        />

        {partsItems.length ? (
          <div className="origin-layer-parts-wrap">
            {model.partsModelOnly ? (
              <p
                className="muted origin-parts-banner"
                data-testid="parts-model-only-banner"
              >
                {t('check.partsModelOnlyBanner')}
              </p>
            ) : null}
            <LayerRow
              label={t('check.layerParts')}
              items={partsItems}
              variant="parts"
              t={t}
            />
            {model.partsSources.length ? (
              <div
                className="origin-parts-sources"
                data-testid="parts-sources"
              >
                <span className="muted origin-parts-sources-label">
                  {t('check.partsSourcesLabel')}
                </span>
                <ul>
                  {model.partsSources.map((src) => {
                    const parts = splitSourceLine(src);
                    const label = sourceLabel(parts);
                    return (
                      <li key={src}>
                        {parts.url ? (
                          <a
                            href={parts.url}
                            target="_blank"
                            rel="noreferrer"
                            title={parts.url}
                          >
                            {label}
                          </a>
                        ) : (
                          label
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <p className="muted origin-layers-share">{t('check.sectionShareHint')}</p>
    </div>
  );
}
