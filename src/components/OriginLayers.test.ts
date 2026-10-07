/**
 * Origin layers field mapping (presentation-only).
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CheckResult } from '../core/types';
import { buildOriginLayers } from './OriginLayers';

function base(partial: Partial<CheckResult> = {}): CheckResult {
  return {
    schemaVersion: 1,
    relationTier: 'direct',
    title: 'Example',
    summary: 'Summary',
    ...partial,
  };
}

describe('buildOriginLayers', () => {
  it('maps Final COO from madeIn only and keeps ownership separate', () => {
    const model = buildOriginLayers(
      base({
        product: {
          brand: 'Acme',
          madeIn: 'Vietnam',
          originCandidates: [
            {
              label: 'China',
              confidence: 0.4,
              source: 'ownership',
              rating: 'mentioned',
            },
            {
              label: 'Vietnam',
              confidence: 0.9,
              source: 'confirmed_coo',
              rating: 'confirmed',
            },
            {
              label: 'Thailand',
              confidence: 0.35,
              source: 'parts',
              rating: 'possible',
            },
          ],
          parts: [{ name: 'Battery', kind: 'part', madeIn: 'China', chinaRelated: true }],
        },
        company: {
          name: 'Acme Ltd',
          hqCountry: 'USA',
          parents: [{ name: 'Holding CN', country: 'China', control: 'majority' }],
          chinaRelations: [
            { type: 'ownership', country: 'China', strength: 'strong', note: 'Parent' },
            { type: 'manufacturing', country: 'Vietnam', strength: 'moderate' },
          ],
        },
      })
    );

    assert.equal(model.finalCoo, 'Vietnam');
    assert.ok(model.brandOps.some((l) => l.kind === 'brand' && l.value === 'Acme'));
    assert.ok(model.ownership.some((l) => l.kind === 'parent' && l.name === 'Holding CN'));
    assert.ok(model.ownership.some((l) => l.kind === 'relation' && l.type === 'ownership'));
    assert.ok(model.ownership.some((l) => l.kind === 'candidate' && l.label === 'China'));
    // manufacturing relation is not ownership-class
    assert.ok(!model.ownership.some((l) => l.kind === 'relation' && l.type === 'manufacturing'));
    // confirmed_coo not duplicated into parts
    assert.ok(!model.parts.some((l) => l.kind === 'candidate' && l.label === 'Vietnam'));
    assert.ok(model.parts.some((l) => l.kind === 'candidate' && l.label === 'Thailand'));
    assert.ok(model.parts.some((l) => l.kind === 'part' && l.name === 'Battery'));
  });

  it('does not invent Final COO from ownership or unknown madeIn', () => {
    const model = buildOriginLayers(
      base({
        relationTier: 'direct',
        product: {
          madeIn: 'unknown',
          originCandidates: [
            {
              label: 'China',
              confidence: 0.5,
              source: 'ownership',
              rating: 'mentioned',
            },
          ],
        },
        company: {
          parents: [{ name: 'PRC Parent', country: 'China', control: 'wholly' }],
        },
      })
    );
    assert.equal(model.finalCoo, null);
    assert.ok(model.ownership.length >= 1);
  });

  it('does not show product display name as Company (OW-UI-BRAND-LABEL)', () => {
    const model = buildOriginLayers(
      base({
        title: 'Toshiba ER-D3000A',
        product: {
          name: 'Toshiba ER-D3000A',
          brand: 'Toshiba',
          originCountry: 'Japan',
          manufacturer: 'Toshiba Lifestyle Products & Services Corporation',
          manufacturerCountry: 'Japan',
          madeIn: 'Thailand',
        },
        company: {
          // Upstream sometimes copies SKU / product title into company.name
          name: 'Toshiba ER-D3000A',
          hqCountry: 'Japan',
        },
      })
    );

    const companyLines = model.brandOps.filter((l) => l.kind === 'company');
    assert.ok(
      !companyLines.some((l) => /Toshiba ER-D3000A/i.test(l.value)),
      'product display name must not appear as Company'
    );
    // Prefer manufacturer when company.name is the product title
    assert.ok(
      companyLines.some(
        (l) => l.value === 'Toshiba Lifestyle Products & Services Corporation'
      )
    );
    assert.ok(model.brandOps.some((l) => l.kind === 'brand' && l.value === 'Toshiba'));
  });

  it('omits Company when only product-title and brand-duplicate candidates exist', () => {
    const model = buildOriginLayers(
      base({
        title: 'Acme Widget X1',
        product: {
          name: 'Acme Widget X1',
          brand: 'Acme',
        },
        company: {
          name: 'Acme Widget X1',
        },
      })
    );
    // brand already shown; product title rejected → no separate Company line
    assert.ok(!model.brandOps.some((l) => l.kind === 'company'));
    assert.ok(model.brandOps.some((l) => l.kind === 'brand' && l.value === 'Acme'));
  });

  it('flags model-only parts banner when knowledgeBasis is model_memory', () => {
    const model = buildOriginLayers(
      base({
        knowledgeBasis: 'model_memory',
        product: {
          parts: [{ name: 'Nipple', kind: 'part' }],
        },
      })
    );
    assert.equal(model.partsModelOnly, true);
    assert.deepEqual(model.partsSources, []);
  });

  it('exposes Search Sources for parts when web_enriched', () => {
    const model = buildOriginLayers(
      base({
        knowledgeBasis: 'web_enriched',
        sources: ['Amazon JP — https://amazon.co.jp/dp/x'],
        product: {
          parts: [{ name: 'Glass bottle', kind: 'part', madeIn: 'Japan' }],
        },
      })
    );
    assert.equal(model.partsModelOnly, false);
    assert.ok(model.partsSources.some((s) => /amazon\.co\.jp/i.test(s)));
  });

  it('hides the model-only banner when parts come from the label photo', () => {
    const model = buildOriginLayers(
      base({
        knowledgeBasis: 'model_memory',
        partsEvidence: 'label',
        product: {
          parts: [{ name: '乳首', kind: 'part', madeIn: 'China' }],
        },
      })
    );
    assert.equal(model.partsModelOnly, false);
  });
  it('drops queried part candidates when parts come from the label photo', () => {
    const model = buildOriginLayers(
      base({
        knowledgeBasis: 'model_memory',
        partsEvidence: 'label',
        product: {
          originCandidates: [
            { label: 'Japan', confidence: 0.55, source: 'parts', rating: 'likely' },
          ],
          parts: [{ name: '乳首', kind: 'part', madeIn: 'China' }],
        },
      })
    );
    assert.ok(!model.parts.some((l) => l.kind === 'candidate'));
  });
});
