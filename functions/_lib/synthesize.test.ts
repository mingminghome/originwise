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
      ocrText: 'Made in Japan',
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
      webEnriched: true,
      webBrief:
        'Textiles / fabric sourced from China, India, Pakistan, and Turkey. Aluminum chassis made in Europe.\n\nSources:\n[1] https://example.com/stroller-bom',
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
      webEnriched: true,
      webBrief:
        'Ingredient soy sauce Made in China.\n\nSources:\n[1] https://example.com/snack',
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
        ocrText: 'Made in Taiwan',
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
      ocrText: 'Made in Hong Kong',
      partials: { product: { name: 'Tea', madeIn: 'Hong Kong' } },
    });
    assert.equal(hi.relationTier, 'direct');

    const lo = synthesize({
      jobId: 't6b',
      geoScope: 'prc',
      companySkipped: true,
      ocrText: 'Made in Hong Kong',
      partials: { product: { name: 'Tea', madeIn: 'Hong Kong' } },
    });
    assert.equal(lo.relationTier, 'none');
  });

  it('strong CN made-in only + verify conflict → direct with capped confidence', () => {
    const r = synthesize({
      jobId: 't7',
      geoScope: 'prc',
      ocrText: 'Made in China',
      partials: {
        product: { name: 'Phone', madeIn: 'China', confidence: 0.9 },
        company: { name: 'Co', hqCountry: 'Japan', confidence: 0.9 },
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

  it('China HQ + verify conflict → direct, confidence kept at the company floor', () => {
    const r = synthesize({
      jobId: 't7b',
      geoScope: 'prc',
      ocrText: 'Made in China',
      webEnriched: true,
      sources: ['Co — https://example.com/about'],
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
    assert.equal(r.confidence, 0.75);
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
      ocrText: 'Made in China',
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
    assert.match(webFailCaveat(undefined), /part countries/i);
  });
});

describe('parts COO sanitize (ungrounded HQ strip + Search cross-check)', () => {
  it('strips ungrounded HQ-echo part countries (Softouch nipple→Japan class)', () => {
    const r = synthesize({
      jobId: 'parts-hq-echo',
      geoScope: 'prc',
      companySkipped: true,
      webEnriched: false,
      partials: {
        product: {
          name: 'Pigeon Softouch glass 240ml',
          brand: 'Pigeon',
          originCountry: 'Japan',
          madeIn: undefined,
          confidence: 0.6,
          parts: [
            {
              name: '玻璃瓶身',
              kind: 'part',
              madeIn: '日本',
              note: '確切產地需視實際包裝標示',
            },
            {
              name: '奶嘴',
              kind: 'part',
              madeIn: '日本',
              note: '確切產地需視實際包裝標示',
            },
          ],
        },
        company: { name: 'Pigeon', hqCountry: 'Japan' },
      },
    });
    const parts = r.product?.parts ?? [];
    assert.equal(parts.length, 2);
    for (const p of parts) {
      assert.equal(p.madeIn, undefined, p.name);
      assert.equal(p.originCountry, undefined, p.name);
      assert.match(String(p.note), /no Search\/OCR/i);
    }
    assert.equal(r.knowledgeBasis, 'model_memory');
    assert.ok((r.caveats ?? []).some((c) => /part countries/i.test(c)));
    // Final COO sanitize unchanged — still unconfirmed
    assert.equal(r.product?.madeIn, undefined);
  });

  it('keeps grounded Search part countries when cross-check passes + Sources', () => {
    const brief = [
      'JP Softouch glass bottle label: びん：日本製、乳首・キャップ：中国／タイ製.',
      'Glass body Made in Japan; nipple and cap China/Thailand.',
      '',
      'Sources:',
      '[1] Amazon JP Softouch — https://amazon.co.jp/dp/B01CCLDEM0',
      '[2] Rakuten — https://item.rakuten.co.jp/example/u561577/',
    ].join('\n');
    const r = synthesize({
      jobId: 'parts-grounded',
      geoScope: 'prc',
      companySkipped: true,
      webEnriched: true,
      webBrief: brief,
      sources: [
        'Amazon JP Softouch — https://amazon.co.jp/dp/B01CCLDEM0',
        'Rakuten — https://item.rakuten.co.jp/example/u561577/',
      ],
      partials: {
        product: {
          name: 'Pigeon Softouch glass 240ml',
          brand: 'Pigeon',
          originCountry: 'Japan',
          parts: [
            { name: '玻璃瓶身', kind: 'part', madeIn: '日本' },
            { name: '乳首', kind: 'part', madeIn: '中国', chinaRelated: true },
            { name: 'キャップ', kind: 'part', madeIn: 'タイ' },
          ],
        },
        company: { name: 'Pigeon', hqCountry: 'Japan' },
      },
    });
    const byName = Object.fromEntries(
      (r.product?.parts ?? []).map((p) => [p.name, p])
    );
    assert.ok(byName['玻璃瓶身']?.madeIn);
    assert.match(String(byName['玻璃瓶身']?.madeIn), /日本|Japan/i);
    assert.ok(byName['乳首']?.madeIn);
    assert.match(String(byName['乳首']?.madeIn), /中国|China/i);
    assert.ok(byName['キャップ']?.madeIn);
    assert.match(String(byName['キャップ']?.madeIn), /タイ|Thailand|泰國/i);
    assert.ok(r.sources?.length);
    assert.ok(r.sources?.some((s) => /amazon\.co\.jp/i.test(s)));
    assert.equal(r.knowledgeBasis, 'web_enriched');
  });

  it('does not weaken final COO HQ-strip when parts are present', () => {
    const r = synthesize({
      jobId: 'parts-final-coo',
      geoScope: 'prc',
      companySkipped: true,
      webEnriched: false,
      partials: {
        product: {
          name: 'Widget',
          brand: 'Acme',
          originCountry: 'Japan',
          madeIn: 'Japan',
          parts: [{ name: 'Shell', kind: 'part', madeIn: 'Japan' }],
        },
        company: { name: 'Acme', hqCountry: 'Japan' },
      },
    });
    assert.equal(r.product?.madeIn, undefined);
    assert.ok(
      (r.product?.notes ?? []).some((n) => /Made-in omitted/i.test(n))
    );
    assert.equal(r.product?.parts?.[0]?.madeIn, undefined);
  });
  it('marks label-OCR parts as label evidence and drops the candidates line', () => {
    const r = synthesize({
      jobId: 'parts-label-ocr',
      geoScope: 'prc',
      companySkipped: true,
      webEnriched: false,
      ocrText:
        '乳首・キャップ・フード：ピジョン(株)中国工場製\nびんの生産・組み立て：日本',
      partials: {
        product: {
          name: 'Pigeon Softouch glass 240ml',
          brand: 'Pigeon',
          originCountry: 'Japan',
          parts: [
            { name: 'びん', kind: 'part', madeIn: '日本' },
            { name: '乳首', kind: 'part', madeIn: '中国', chinaRelated: true },
          ],
        },
        company: { name: 'Pigeon', hqCountry: 'Japan' },
      },
    });
    assert.equal(r.partsEvidence, 'label');
    assert.ok((r.caveats ?? []).some((c) => /package label photo/i.test(c)));
    assert.ok(!(r.caveats ?? []).some((c) => /model knowledge only/i.test(c)));
    assert.ok(!/Candidates:/.test(r.summary ?? ''));
  });

  it('marks parts as model evidence with no label or Search', () => {
    const r = synthesize({
      jobId: 'parts-model-only',
      geoScope: 'prc',
      companySkipped: true,
      webEnriched: false,
      partials: {
        product: {
          name: 'Pigeon Sheer PPSU 240ml',
          brand: 'Pigeon',
          parts: [{ name: '瓶身', kind: 'part' }],
        },
      },
    });
    assert.equal(r.partsEvidence, 'model');
  });
});

describe('placeholder values and HQ echo (Sheer live leftovers)', () => {
  const r = synthesize({
    jobId: 'sheer-leftovers',
    geoScope: 'prc',
    companySkipped: true,
    partials: {
      product: {
        name: 'Sheer PPSU 240ml',
        madeIn: 'China',
        originCountry: 'Japan',
        manufacturerCountry: 'Japan',
        componentsOrigin: 'unknown',
        notes: ['Final assembly country (madeIn) per retailer page.'],
      },
    },
  });
  it('omits a components line of "unknown" from summary and payload', () => {
    assert.ok(!/Components\/global line/.test(r.summary ?? ''), r.summary);
    assert.equal(r.product?.componentsOrigin, undefined);
  });
  it('drops the manufacturer candidate once made-in is confirmed', () => {
    const srcs = (r.product?.originCandidates ?? []).map((c) => c.source);
    assert.ok(!srcs.includes('manufacturer'), JSON.stringify(srcs));
  });
  it('strips echoed schema keys from notes', () => {
    assert.ok(!(r.product?.notes ?? []).some((n) => n.includes('(madeIn)')));
  });
});

describe('HQ / manufacturer country is never a made-in candidate', () => {
  it('name-only, unconfirmed: no manufacturer candidate, no Japan in Candidates', () => {
    const r = synthesize({
      jobId: 'hq-echo-unconfirmed',
      geoScope: 'prc',
      companySkipped: true,
      partials: {
        product: {
          name: '母乳実感 哺乳びん',
          brand: 'Pigeon',
          originCountry: 'Japan',
          manufacturerCountry: 'Japan',
        },
      },
    });
    const srcs = (r.product?.originCandidates ?? []).map((c) => c.source);
    assert.ok(!srcs.includes('manufacturer'), JSON.stringify(srcs));
    assert.ok(!/Candidates:.*manufacturer/.test(r.summary ?? ''), r.summary);
  });
});

describe('China HQ / China-controlling parent → direct with strong confidence', () => {
  it('China HQ alone (made-in unconfirmed, weak product confidence) → direct ≥ 0.75', () => {
    const r = synthesize({
      jobId: 'cn-hq',
      geoScope: 'prc',
      webEnriched: true,
      sources: ['About us — https://example.com/about'],
      partials: {
        product: { name: 'Tapo C200', brand: 'Tapo', confidence: 0.5 },
        company: { name: 'TP-Link', hqCountry: 'China', confidence: 0.85 },
      },
    });
    assert.equal(r.relationTier, 'direct');
    assert.ok(r.tierReasons.includes('hq_cn'));
    assert.ok(r.confidence >= 0.75, String(r.confidence));
    assert.equal(r.confidence, 0.85);
  });

  it('majority China parent with a German HQ → direct ≥ 0.75', () => {
    const r = synthesize({
      jobId: 'cn-parent',
      geoScope: 'prc',
      webEnriched: true,
      sources: ['About us — https://example.com/about'],
      partials: {
        product: { name: 'Cybex Melio', brand: 'Cybex', confidence: 0.45 },
        company: {
          name: 'Cybex GmbH',
          hqCountry: 'Germany',
          parents: [{ name: 'Goodbaby International', country: 'China', control: 'majority' }],
          confidence: 0.8,
        },
      },
    });
    assert.equal(r.relationTier, 'direct');
    assert.ok(r.tierReasons.includes('parent_majority_cn'));
    assert.ok(r.confidence >= 0.75);
  });

  it('China HQ with no company confidence still gets the floor', () => {
    const r = synthesize({
      jobId: 'cn-hq-noconf',
      geoScope: 'prc',
      webEnriched: true,
      sources: ['About us — https://example.com/about'],
      partials: {
        product: { name: 'Anker charger', confidence: 0.4 },
        company: { name: 'Anker Innovations', hqCountry: 'China' },
      },
    });
    assert.equal(r.relationTier, 'direct');
    assert.ok(r.confidence >= 0.75);
  });

  it('Taiwan HQ is never a China link', () => {
    const r = synthesize({
      jobId: 'tw-hq',
      geoScope: 'greater_china',
      partials: {
        product: { name: 'Router', confidence: 0.6 },
        company: { name: 'ASUS', hqCountry: 'Taiwan', confidence: 0.9 },
      },
    });
    assert.notEqual(r.relationTier, 'direct');
    assert.ok(!r.tierReasons.includes('hq_cn'));
  });
});

describe('fairness: what may feed the tier and the confidence', () => {
  it('company floor needs a sourced company row: model memory alone gets none', () => {
    const r = synthesize({
      jobId: 'floor-model',
      geoScope: 'prc',
      partials: {
        product: { name: 'Tapo C200', confidence: 0.5 },
        company: { name: 'TP-Link', hqCountry: 'China', confidence: 0.6 },
      },
    });
    assert.equal(r.relationTier, 'direct');
    assert.equal(r.confidence, 0.5);
    const web = synthesize({
      jobId: 'floor-web-nosrc',
      geoScope: 'prc',
      webEnriched: true,
      sources: [],
      partials: {
        product: { name: 'Tapo C200', confidence: 0.5 },
        company: { name: 'TP-Link', hqCountry: 'China', confidence: 0.6 },
      },
    });
    assert.ok(web.confidence < 0.75, String(web.confidence));
  });

  it('unnamed / stake-less China relations never raise the tier', () => {
    const r = synthesize({
      jobId: 'rel-only',
      geoScope: 'prc',
      partials: {
        product: { name: 'Bottle', confidence: 0.8 },
        company: {
          name: 'Pigeon',
          hqCountry: 'Japan',
          confidence: 0.8,
          chinaRelations: [
            { type: 'ownership', note: 'strong China ties', country: 'China', strength: 'strong' },
            { type: 'manufacturing', note: 'some SKUs made in China', country: 'China', strength: 'strong' },
          ],
        },
      },
    });
    assert.ok(!r.tierReasons.includes('ownership_strong_cn'));
    assert.ok(!r.tierReasons.includes('ownership_weak_cn'));
    assert.notEqual(r.relationTier, 'direct');
    assert.notEqual(r.relationTier, 'indirect');
  });

  it('named China parent: majority → one reason (parent_majority_cn); minority → ownership_weak_cn', () => {
    const maj = synthesize({
      jobId: 'own-maj',
      geoScope: 'prc',
      partials: {
        company: {
          name: 'Co',
          hqCountry: 'Germany',
          parents: [{ name: 'Big CN Group', country: 'China', control: 'wholly' }],
          chinaRelations: [{ type: 'ownership', country: 'China', strength: 'strong' }],
        },
      },
    });
    assert.ok(maj.tierReasons.includes('parent_majority_cn'));
    assert.ok(!maj.tierReasons.includes('ownership_strong_cn'));
    const min = synthesize({
      jobId: 'own-min',
      geoScope: 'prc',
      partials: {
        company: {
          name: 'Co',
          hqCountry: 'Germany',
          parents: [{ name: 'Tencent', country: 'China', control: 'minority' }],
        },
      },
    });
    assert.ok(min.tierReasons.includes('ownership_weak_cn'));
    assert.equal(min.relationTier, 'indirect');
    const unnamed = synthesize({
      jobId: 'own-unnamed',
      geoScope: 'prc',
      partials: {
        company: { name: 'Co', hqCountry: 'Germany', parents: [{ name: ' ', country: 'China', control: 'majority' }] },
      },
    });
    assert.ok(!unnamed.tierReasons.includes('parent_majority_cn'));
  });

  it('model-only China made-in + empty web search: candidate row only, tier unchanged', () => {
    const base = {
      geoScope: 'prc' as const,
      webEnriched: true,
      webCoo: [],
      sources: [],
    };
    const company = { name: 'Pigeon', hqCountry: 'Japan', confidence: 0.8 };
    const withModel = synthesize({
      ...base,
      jobId: 'model-mi',
      partials: {
        product: { name: 'Sheer 240ml', madeIn: 'China', notes: ['Some SKUs are made in China'], confidence: 0.8 },
        company,
      },
    });
    const without = synthesize({
      ...base,
      jobId: 'model-mi-none',
      partials: { product: { name: 'Sheer 240ml', confidence: 0.8 }, company },
    });
    assert.equal(withModel.product?.madeIn, undefined);
    assert.ok(!withModel.tierReasons.includes('made_in_cn'));
    assert.equal(withModel.relationTier, without.relationTier);
    assert.equal(withModel.confidence, without.confidence);
    const rows = (withModel.product?.originCandidates ?? []).filter((c) => c.label === 'China');
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.rating, 'possible');
  });

  it('model-only made-in, no web at all (model memory): same rule', () => {
    const r = synthesize({
      jobId: 'model-mi-mem',
      geoScope: 'prc',
      partials: {
        product: { name: 'Gadget', madeIn: 'China', parts: [{ name: 'battery', madeIn: 'China' }], confidence: 0.8 },
        company: { name: 'Acme', hqCountry: 'Japan', confidence: 0.8 },
      },
    });
    assert.equal(r.product?.madeIn, undefined);
    assert.ok(!r.tierReasons.includes('made_in_cn'));
  });

  it('model made-in that only repeats the HQ country is dropped (#28)', () => {
    const r = synthesize({
      jobId: 'model-mi-echo',
      geoScope: 'prc',
      partials: {
        product: { name: 'Bottle', madeIn: 'Japan', confidence: 0.8 },
        company: { name: 'Pigeon', hqCountry: 'Japan', confidence: 0.8 },
      },
    });
    assert.ok(!(r.product?.originCandidates ?? []).some((c) => c.label === 'Japan'));
  });

  it('label-confirmed made-in still counts (basis label)', () => {
    const r = synthesize({
      jobId: 'label-mi',
      geoScope: 'prc',
      ocrText: '中国製 Made in China',
      partials: {
        product: { name: 'Sheer 240ml', madeIn: 'China', confidence: 0.9 },
        company: { name: 'Pigeon', hqCountry: 'Japan', confidence: 0.9 },
      },
    });
    assert.equal(r.product?.madeIn, 'China');
    assert.equal(r.product?.madeInBasis, 'label');
    assert.equal(r.relationTier, 'direct');
  });
});
