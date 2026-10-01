/**
 * Labeled origin layers — presentation only from existing CheckResult fields.
 * Ownership/parents must never be shown as Final COO (madeIn).
 */
import type { CheckResult } from '../core/types';
import type { TFunction } from '../core/i18n';

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

const UNKNOWN_MADE_IN = /^(unknown|n\/?a|未知|不明|不詳)$/i;

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
    }
  | {
      kind: 'part';
      name: string;
      partKind?: string;
      where?: string;
      chinaRelated?: boolean;
      note?: string;
    };

export type OriginLayersModel = {
  brandOps: BrandOpsLine[];
  ownership: OwnershipLine[];
  /** Confirmed final COO label, or null when unconfirmed. */
  finalCoo: string | null;
  parts: PartsLine[];
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
  if (p?.componentsOrigin?.trim()) {
    parts.push({ kind: 'components', value: p.componentsOrigin.trim() });
  }
  for (const cand of p?.originCandidates ?? []) {
    if (isOwnershipCandidate(cand)) continue;
    // confirmed_coo mirrors Final COO — keep out of parts to avoid “made in” confusion
    if (cand.source === 'confirmed_coo') continue;
    parts.push({
      kind: 'candidate',
      label: cand.label,
      rating: cand.rating,
      confidence: cand.confidence,
      source: cand.source,
    });
  }
  for (const part of p?.parts ?? []) {
    parts.push({
      kind: 'part',
      name: part.name,
      partKind: part.kind,
      where: part.madeIn || part.originCountry || undefined,
      chinaRelated: part.chinaRelated,
      note: part.note?.trim() || undefined,
    });
  }

  return { brandOps, ownership, finalCoo, parts };
}

function formatBrandOps(line: BrandOpsLine, t: TFunction): string {
  switch (line.kind) {
    case 'brand':
      return `${t('check.brand')}: ${line.value}`;
    case 'company':
      return `${t('check.company')}: ${line.value}`;
    case 'hq':
      return `${t('check.hq')}: ${line.value}`;
    case 'brandOrigin':
      return `${t('check.brandOrigin')}: ${line.value}`;
    case 'manufacturer':
      return line.country
        ? `${t('check.manufacturer')}: ${line.value} (${line.country})`
        : `${t('check.manufacturer')}: ${line.value}`;
  }
}

function formatOwnership(line: OwnershipLine, t: TFunction): string {
  switch (line.kind) {
    case 'parent': {
      const bits = [line.name];
      if (line.country) bits.push(line.country);
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
      if (line.country) bits.push(line.country);
      if (line.strength) bits.push(line.strength);
      if (line.note) bits.push(line.note);
      return bits.join(' · ');
    }
    case 'candidate': {
      const ratingKey = `check.candidateRating.${line.rating}`;
      const rating = t(ratingKey);
      return `${line.label} · ${rating === ratingKey ? line.rating : rating} · ${Math.round(line.confidence * 100)}% · ${t('check.candidateSource.ownership')}`;
    }
  }
}

function formatParts(line: PartsLine, t: TFunction): string {
  switch (line.kind) {
    case 'components':
      return `${t('check.componentsOrigin')}: ${line.value}`;
    case 'candidate': {
      const ratingKey = `check.candidateRating.${line.rating}`;
      const rating = t(ratingKey);
      const srcKey = `check.candidateSource.${line.source}`;
      const src = t(srcKey);
      return `${line.label} · ${rating === ratingKey ? line.rating : rating} · ${Math.round(line.confidence * 100)}% · ${src === srcKey ? line.source : src}`;
    }
    case 'part': {
      const bits = [line.name];
      if (line.partKind) {
        const k = `check.partKind.${line.partKind}`;
        const label = t(k);
        bits.push(label === k ? line.partKind : label);
      }
      if (line.where) bits.push(line.where);
      if (line.chinaRelated) bits.push(t('check.graphChinaLinked'));
      if (line.note) bits.push(line.note);
      return bits.join(' · ');
    }
  }
}

function LayerRow({
  label,
  hint,
  items,
  empty,
  variant,
}: {
  label: string;
  hint?: string;
  items: string[];
  empty?: string;
  variant: 'brand' | 'ownership' | 'coo' | 'parts';
}) {
  return (
    <div className={`origin-layer origin-layer--${variant}`}>
      <div className="origin-layer-head">
        <span className="origin-layer-label">{label}</span>
        {hint ? <span className="muted origin-layer-hint">{hint}</span> : null}
      </div>
      {items.length ? (
        <ul className="origin-layer-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : empty ? (
        <p className="muted origin-layer-empty">{empty}</p>
      ) : null}
    </div>
  );
}

export function OriginLayers({
  result,
  t,
}: {
  result: CheckResult;
  t: TFunction;
}) {
  const model = buildOriginLayers(result);
  const hasProductOrCompany = Boolean(result.product || result.company);
  if (!hasProductOrCompany) return null;

  const brandItems = model.brandOps.map((l) => formatBrandOps(l, t));
  const ownershipItems = model.ownership.map((l) => formatOwnership(l, t));
  const partsItems = model.parts.map((l) => formatParts(l, t));

  return (
    <div className="origin-layers card-soft" data-testid="origin-layers">
      <h3 className="result-section-title">{t('check.originLayersTitle')}</h3>
      <p className="muted origin-layers-intro">{t('check.originLayersIntro')}</p>

      {brandItems.length ? (
        <LayerRow
          label={t('check.layerBrandOps')}
          items={brandItems}
          variant="brand"
        />
      ) : null}

      <LayerRow
        label={t('check.layerOwnership')}
        hint={t('check.layerOwnershipHint')}
        items={ownershipItems}
        empty={t('check.layerOwnershipEmpty')}
        variant="ownership"
      />

      <LayerRow
        label={t('check.layerFinalCoo')}
        items={model.finalCoo ? [model.finalCoo] : []}
        empty={t('check.madeInUnconfirmed')}
        variant="coo"
      />

      {partsItems.length ? (
        <LayerRow
          label={t('check.layerParts')}
          items={partsItems}
          variant="parts"
        />
      ) : null}
    </div>
  );
}
