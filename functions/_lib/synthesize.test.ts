/**
 * Unit tests for relationTier decision table + TW country policy.
 * Run: npm test
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeRegion, scopeSet } from './regions';
import { synthesize, webFailCaveat } from './synthesize';

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

  it('EU assembly + China textiles/parts → indirect, not direct', () => {
    const r = synthesize({
      jobId: 't-stokke-shape',
      geoScope: 'prc',
      partials: {
        product: {
          name: 'Stroller',
          brand: 'Brand',
          madeIn: 'Netherlands',
          originCountry: 'Norway',
          manufacturer: 'Brand AS',
          manufacturerCountry: 'Norway',
          componentsOrigin:
            'Europe, China, Taiwan, India, Pakistan, and Turkey',
          parts: [
            {
              name: 'Aluminum chassis',
              kind: 'part',
              madeIn: 'Europe',
            },
            {
              name: 'Textiles',
              kind: 'part',
              madeIn: 'China, India, Pakistan, and Turkey',
              chinaRelated: true,
            },
          ],
        },
        company: {
          name: 'Brand AS',
          hqCountry: 'Norway',
          parents: [
            { name: 'HoldCo EU', country: 'Belgium', control: 'majority' },
            { name: 'HoldCo KR', country: 'South Korea', control: 'wholly' },
          ],
          chinaRelations: [
            {
              type: 'manufacturing',
              country: 'China',
              strength: 'strong',
              note: 'Textiles and some plastics sourced in China',
            },
          ],
        },
      },
    });
    assert.equal(r.relationTier, 'indirect');
    assert.ok(r.tierReasons.includes('component_cn'));
    assert.equal(r.tierReasons.includes('ownership_strong_cn'), false);
    assert.equal(r.tierReasons.includes('made_in_cn'), false);
    assert.equal(r.tierReasons.includes('hq_cn'), false);
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
  it('drops a same-name brand alt that invents Vietnam / 不依賴中國製造', () => {
    const r = synthesize({
      jobId: 'alt-homonym-vn',
      geoScope: 'prc',
      queryText: 'nuna mixx',
      companySkipped: true,
      partials: {
        product: {
          name: 'Nuna Mixx',
          brand: 'Nuna',
          madeIn: 'China',
          originCountry: 'Netherlands',
        },
        alternatives: {
          brands: [
            {
              name: 'Nuna',
              madeIn: '越南',
              hqCountry: '荷蘭',
              relationTier: 'none',
              note: '總部設於荷蘭，嬰幼兒推車與汽座主要產地為越南，不依賴中國製造。',
            },
            {
              name: 'Lookalike brand',
              madeIn: '越南',
              hqCountry: '荷蘭',
              relationTier: 'none',
              note: '總部設於荷蘭，嬰幼兒推車與汽座主要產地為越南，不依賴中國製造。',
            },
          ],
        },
      },
    });
    assert.equal(r.alternatives?.brands?.length ?? 0, 0);
  });

  it('drops a sibling-style alt that claims Taiwan / 非中國廠區 without a named plant', () => {
    const r = synthesize({
      jobId: 'alt-tw-rumor',
      geoScope: 'prc',
      companySkipped: true,
      partials: {
        product: { name: 'Stroller', madeIn: 'China', originCountry: 'Netherlands' },
        alternatives: {
          brands: [
            {
              name: 'UK-market stroller brand (local agent)',
              madeIn: '台灣',
              hqCountry: '英國',
              relationTier: 'indirect',
              note: '英國品牌，部分高階款式或特定零組件生產線轉移至台灣或非中國廠區，具備較低之中國供應鏈佔比。',
            },
          ],
        },
      },
    });
    assert.equal(r.alternatives?.brands?.length ?? 0, 0);
  });

  it('drops peers that copy design HQ into madeIn even if the note says 工廠產地', () => {
    const r = synthesize({
      jobId: 'alt-hq-copy-factory-word',
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
              name: 'US-designed stroller',
              madeIn: '美國',
              originCountry: '美國',
              relationTier: 'none',
              note: '美國品牌與設計，工廠產地與供應鏈主要集中於北美及非中國地區，無中國大陸控股。',
            },
          ],
        },
      },
    });
    assert.equal(r.alternatives?.products?.length ?? 0, 0);
  });

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


describe('madeIn unknown sanitize', () => {
  it('clears madeIn=unknown and summarizes Final COO unconfirmed', () => {
    const r = synthesize({
      jobId: 'unk-1',
      geoScope: 'prc',
      companySkipped: true,
      partials: {
        product: {
          name: 'Washer',
          brand: 'Toshiba Lifestyle',
          madeIn: 'unknown',
          originCountry: 'Japan',
          componentsOrigin: 'Often CN / TH / VN (unconfirmed)',
          confidence: 0.5,
        },
      },
    });
    assert.equal(r.product?.madeIn, undefined);
    assert.match(r.summary, /Final COO unconfirmed/);
    assert.doesNotMatch(r.summary, /Made in: unknown/i);
    assert.match(String(r.product?.componentsOrigin), /CN/);
    assert.ok(
      (r.caveats ?? []).some((c) => /Final COO unconfirmed/i.test(c))
    );
    const labels = (r.product?.originCandidates ?? []).map((c) => c.label);
    assert.ok(labels.includes('China'), labels.join(','));
    assert.ok(labels.includes('Thailand'), labels.join(','));
    assert.ok(labels.includes('Vietnam'), labels.join(','));
    assert.ok(
      (r.product?.originCandidates ?? []).every((c) => c.rating !== 'confirmed')
    );
    assert.match(r.summary, /Candidates:/);
  });

  it('clears 未知 / n\/a placeholders', () => {
    for (const label of ['未知', 'n/a', 'N/A', '不明']) {
      const r = synthesize({
        jobId: `unk-${label}`,
        geoScope: 'prc',
        companySkipped: true,
        partials: {
          product: { name: 'Item', madeIn: label, confidence: 0.4 },
        },
      });
      assert.equal(r.product?.madeIn, undefined, label);
      assert.doesNotMatch(r.summary, /Made in:/i);
    }
  });

  it('keeps confirmed China made-in', () => {
    const r = synthesize({
      jobId: 'unk-cn',
      geoScope: 'prc',
      companySkipped: true,
      partials: {
        product: {
          name: 'DJI Mini 4 Pro',
          madeIn: 'China',
          confidence: 0.9,
        },
      },
    });
    assert.equal(r.product?.madeIn, 'China');
    assert.match(r.summary, /Made in: China/);
    const conf = r.product?.originCandidates?.find((c) => c.label === 'China');
    assert.equal(conf?.rating, 'confirmed');
    assert.equal(conf?.source, 'confirmed_coo');
  });

  it('adds model-memory made-in caveat when web not enriched', () => {
    const r = synthesize({
      jobId: 'unk-web',
      geoScope: 'prc',
      companySkipped: true,
      webEnriched: false,
      partials: {
        product: { name: 'X', madeIn: 'Vietnam', confidence: 0.7 },
      },
    });
    assert.ok(
      (r.caveats ?? []).some((c) => /No live web research/i.test(c))
    );
  });
});

describe('webFailCaveat', () => {
  it('classifies timeout vs grounding vs empty', () => {
    assert.match(webFailCaveat('upstream_unavailable'), /timed out/i);
    assert.match(webFailCaveat('search_grounding_unavailable'), /Search grounding/i);
    assert.match(webFailCaveat('empty_response'), /empty reply/i);
    assert.match(webFailCaveat(undefined), /No live web research/i);
  });
});
