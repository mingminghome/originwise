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
