/**
 * Unit tests for relationTier decision table + TW country policy.
 * Run: npm test
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeRegion, scopeSet } from './regions';
import { synthesize } from './synthesize';

describe('normalizeRegion / scopeSet', () => {
  it('maps Taiwan variants to TW', () => {
    assert.equal(normalizeRegion('Taiwan'), 'TW');
    assert.equal(normalizeRegion('台灣'), 'TW');
    assert.equal(normalizeRegion('TW'), 'TW');
  });

  it('never puts TW in either China scope set', () => {
    assert.equal(scopeSet('prc').has('TW'), false);
    assert.equal(scopeSet('greater_china').has('TW'), false);
    assert.ok(scopeSet('greater_china').has('HK'));
    assert.ok(scopeSet('greater_china').has('MO'));
    assert.ok(scopeSet('greater_china').has('CN'));
  });
});

describe('synthesize decision table', () => {
  it('madeIn=JP only → none', () => {
    const r = synthesize({
      jobId: 't1',
      geoScope: 'prc',
      companySkipped: true,
      partials: {
        product: { name: 'Snack', madeIn: 'Japan', confidence: 0.8 },
      },
    });
    assert.equal(r.relationTier, 'none');
    assert.ok(r.tierReasons.includes('explicit_non_cn_geo'));
  });

  it('US HQ only → none', () => {
    const r = synthesize({
      jobId: 't2',
      geoScope: 'prc',
      productSkipped: true,
      partials: {
        company: { name: 'Acme', hqCountry: 'USA', confidence: 0.7 },
      },
    });
    assert.equal(r.relationTier, 'none');
  });

  it('JP made-in + CN HQ → direct', () => {
    const r = synthesize({
      jobId: 't3',
      geoScope: 'prc',
      partials: {
        product: { name: 'Widget', madeIn: 'Japan' },
        company: { name: 'Co', hqCountry: 'China' },
      },
    });
    assert.equal(r.relationTier, 'direct');
    assert.ok(r.tierReasons.includes('hq_cn'));
  });

  it('CN ingredient with JP made-in → indirect (component)', () => {
    const r = synthesize({
      jobId: 't-parts',
      geoScope: 'prc',
      companySkipped: true,
      partials: {
        product: {
          name: 'Snack',
          madeIn: 'Japan',
          parts: [
            {
              name: 'soy sauce',
              kind: 'ingredient',
              madeIn: 'China',
              chinaRelated: true,
            },
          ],
        },
      },
    });
    assert.equal(r.relationTier, 'indirect');
    assert.ok(r.tierReasons.includes('component_cn'));
    assert.ok(r.graph.nodes.some((n) => n.kind === 'ingredient'));
  });

  it('empty signals → unknown', () => {
    const r = synthesize({
      jobId: 't4',
      geoScope: 'prc',
      companySkipped: true,
      productSkipped: true,
      partials: {},
    });
    assert.equal(r.relationTier, 'unknown');
  });

  it('madeIn=TW either scope → none (country, never China tier)', () => {
    for (const geoScope of ['prc', 'greater_china'] as const) {
      const r = synthesize({
        jobId: 't5',
        geoScope,
        companySkipped: true,
        partials: {
          product: { name: 'Chip', madeIn: 'Taiwan', brand: 'TSMC-ish' },
        },
      });
      assert.equal(r.relationTier, 'none', `scope ${geoScope}`);
      assert.ok(r.regions.includes('TW'));
      assert.ok(r.tierReasons.includes('taiwan_as_country'));
      assert.ok(
        r.caveats.some((c) => /taiwan/i.test(c)),
        'TW country caveat'
      );
    }
  });

  it('madeIn=HK under greater_china → direct; under prc → none', () => {
    const hi = synthesize({
      jobId: 't6a',
      geoScope: 'greater_china',
      companySkipped: true,
      partials: { product: { name: 'Tea', madeIn: 'Hong Kong' } },
    });
    assert.equal(hi.relationTier, 'direct');

    const lo = synthesize({
      jobId: 't6b',
      geoScope: 'prc',
      companySkipped: true,
      partials: { product: { name: 'Tea', madeIn: 'Hong Kong' } },
    });
    assert.equal(lo.relationTier, 'none');
  });

  it('strong CN + verify conflict → direct with capped confidence', () => {
    const r = synthesize({
      jobId: 't7',
      geoScope: 'prc',
      partials: {
        product: { name: 'Phone', madeIn: 'China', confidence: 0.9 },
        company: { name: 'Co', hqCountry: 'China', confidence: 0.9 },
        verify: {
          consistent: false,
          conflicts: ['origin mismatch'],
          confidence: 0.9,
        },
      },
    });
    assert.equal(r.relationTier, 'direct');
    assert.ok(r.confidence <= 0.45);
  });

  it('CN origin only (no strong mfg/hq) → indirect', () => {
    const r = synthesize({
      jobId: 't8',
      geoScope: 'prc',
      companySkipped: true,
      partials: {
        product: {
          name: 'Tea',
          originCountry: 'China',
          madeIn: 'Japan',
        },
      },
    });
    // madeIn JP is non-cn; origin CN is positive but not strong alone if origin only
    // F_ORIGIN_CN true, F_STRONG_CN false (origin not strong) → indirect via priority 3
    // Wait: madeIn JP is also F_EXPLICIT_NON_CN_GEO but F_CN_POSITIVE true so not none
    assert.equal(r.relationTier, 'indirect');
  });
});

describe('product made-in vs design HQ', () => {
  it('does not treat design-country madeIn as factory evidence', () => {
    const r = synthesize({
      jobId: 'mfg-copy',
      geoScope: 'prc',
      companySkipped: true,
      partials: {
        product: {
          name: 'Stroller',
          originCountry: 'Netherlands',
          madeIn: 'Netherlands',
          notes: ['Dutch design and manufacture.'],
        },
      },
    });
    assert.equal(r.product?.madeIn, undefined);
    assert.notEqual(r.relationTier, 'none');
    assert.ok(r.caveats.some((c) => /brand\/design country/i.test(c)));
  });
});

describe('parent vs distributor sanitizer', () => {
  it('omits market-desk / distributor names from parents and graph', () => {
    const r = synthesize({
      jobId: 'parent-dist',
      geoScope: 'prc',
      partials: {
        product: { name: 'Stroller', brand: 'BrandA', madeIn: 'China' },
        company: {
          name: 'BrandA',
          hqCountry: 'Netherlands',
          parents: [
            { name: 'OtherBrand TW', country: 'Taiwan', control: 'majority' },
            { name: 'Holding Group', country: 'Taiwan', control: 'wholly' },
          ],
        },
      },
    });
    const names = r.company?.parents?.map((p) => p.name) ?? [];
    assert.deepEqual(names, ['Holding Group']);
    assert.equal(
      r.graph.nodes.some((n) => n.label === 'OtherBrand TW'),
      false
    );
    assert.ok(
      r.caveats.some((c) => /distributor/i.test(c)),
      'explains omitted distributor'
    );
  });

  it('keeps a real holding-company parent', () => {
    const r = synthesize({
      jobId: 'parent-keep',
      geoScope: 'prc',
      productSkipped: true,
      partials: {
        company: {
          name: 'BrandA',
          hqCountry: 'Taiwan',
          parents: [
            { name: 'Example Holding Group', country: 'Taiwan', control: 'wholly' },
          ],
        },
      },
    });
    assert.equal(r.company?.parents?.[0]?.name, 'Example Holding Group');
  });
});

describe('alternative sanitizer', () => {
  it('drops peers that copy design HQ into madeIn and deny China', () => {
    const r = synthesize({
      jobId: 'alt-hq-copy',
      geoScope: 'prc',
      companySkipped: true,
      partials: {
        product: {
          name: 'Stroller',
          madeIn: 'China',
          originCountry: 'Netherlands',
        },
        alternatives: {
          products: [
            {
              name: 'Peer EU stroller',
              madeIn: 'Netherlands',
              originCountry: 'Netherlands',
              relationTier: 'none',
              note: 'Dutch design and manufacture, not China production.',
            },
            {
              name: '同款歐系推車',
              madeIn: '荷蘭',
              originCountry: '荷蘭',
              relationTier: 'none',
              note: '荷蘭設計與製造，非中國生產。',
            },
          ],
        },
      },
    });
    assert.equal(r.alternatives?.products?.length ?? 0, 0);
  });

  it('keeps an alternative whose factory country differs from HQ', () => {
    const r = synthesize({
      jobId: 'alt-factory',
      geoScope: 'prc',
      companySkipped: true,
      partials: {
        product: { name: 'Purifier', madeIn: 'China', originCountry: 'Japan' },
        alternatives: {
          products: [
            {
              name: 'Other purifier',
              madeIn: 'Poland',
              originCountry: 'Japan',
              hqCountry: 'Japan',
              relationTier: 'none',
              note: 'UK/EU units often final-assembled at the Ostaszewo plant in Poland.',
            },
          ],
        },
      },
    });
    assert.equal(r.alternatives?.products?.[0]?.name, 'Other purifier');
    assert.equal(r.alternatives?.products?.[0]?.relationTier, 'none');
    assert.equal(r.alternatives?.products?.[0]?.madeIn, 'Poland');
  });

  it('does not treat HQ-only (no madeIn) as Unrelated', () => {
    const r = synthesize({
      jobId: 'alt-hq-only',
      geoScope: 'prc',
      companySkipped: true,
      partials: {
        product: { name: 'Vac', madeIn: 'China' },
        alternatives: {
          brands: [
            {
              name: 'EU brand',
              hqCountry: 'USA',
              relationTier: 'none',
              note: 'American brand.',
            },
          ],
        },
      },
    });
    const b = r.alternatives?.brands?.[0];
    assert.ok(b);
    assert.notEqual(b?.relationTier, 'none');
  });
});

