/**
 * 依型號比對 (exact-model match) and the bounded made-in follow-up query.
 * Rule (Ming, item g): the AI answer counts as one source and the web
 * verifies it. AI answer + 1 exact-model page → confirmed ('ai_web');
 * 2+ exact-model pages on different domains → confirmed ('web'), even
 * against the AI answer (which then stays a candidate row); AI answer alone →
 * model reference (#32); exact-model pages that disagree → 未確認 + candidates;
 * barcode / package label outrank all of it.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MADE_IN_FOLLOWUP_TERMS,
  MAX_MERGED_PAGES,
  buildMadeInQuery,
  buildSearchQuery,
  exactModelPage,
  excludedPages,
  gateClaims,
  mergePages,
  modelMentions,
  modelTokens,
  needsMadeInFollowup,
  regexCooClaims,
  settleExactConflict,
  siteOf,
} from './search/extract';
import type { FetchedPage } from './search/types';
import type { WebCooClaim } from './schema';
import {
  MODEL_AI_WEB_CONFIDENCE,
  MODEL_MATCH_CONFIDENCE,
  applyWebCooGate,
  synthesize,
} from './synthesize';

const ENTITY = 'Cybex Melio 嬰兒推車';
const page = (url: string, text: string): FetchedPage => ({ url, title: '', text });
const gate = (pages: FetchedPage[], entity = ENTITY) =>
  gateClaims(entity, [], pages, regexCooClaims(pages)).kept;

const MOMO = page('https://www.momoshop.com.tw/goods/1', 'Cybex Melio 嬰兒推車 輕量 產地：中國');
const MAMI = page('https://mamilove.com.tw/p/2', 'CYBEX MELIO stroller, 5.9 kg. Made in China');
const MOMO_2 = page('https://m.momoshop.com.tw/goods/3', 'cybex-melio 推車 產地：中國');
const CARBON = page('https://shop.example.de/carbon', 'Cybex Melio Carbon stroller. Made in China');
const GERMANY = page('https://other.example.de/melio', 'Cybex Melio stroller. Made in Germany');

describe('exact-model matching (brand + model, variant-safe)', () => {
  it('brand + model words from the query; case, spacing and hyphens normalised', () => {
    assert.deepEqual(modelTokens(ENTITY), ['cybex', 'melio']);
    assert.ok(exactModelPage('CYBEX  MELIO', ENTITY));
    assert.ok(exactModelPage('cybex-melio', ENTITY));
    assert.ok(exactModelPage('Cybex Melio 嬰兒推車', ENTITY));
  });

  it('Melio and Melio Carbon are different models; a page naming both is not exact', () => {
    assert.deepEqual(modelMentions('Cybex Melio Carbon', ENTITY), { exact: 0, variant: 1, variants: ['Carbon'] });
    assert.equal(exactModelPage('Cybex Melio Carbon', ENTITY), false);
    assert.equal(exactModelPage('Cybex Melio and Cybex Melio Carbon', ENTITY), false);
    assert.equal(exactModelPage('Cybex Melio 2', ENTITY), false);
    // A model of another brand is not this model.
    assert.equal(exactModelPage('Joie Melio', ENTITY), false);
  });

  // Tester / Ming (11:57): both directions; descriptive, category words, years allowed.
  const MELIO = 'Cybex Melio';
  for (const t of [
    'Cybex Melio 輕量嬰兒推車',
    'CYBEX MELIO 推車 規格',
    'Cybex Melio ベビーカー',
    'Cybex Melio stroller review',
    'Cybex Melio (2024)',
    'Cybex Melio 2024',
    'CYBEX MELIO stroller',
    'Cybex Melio pushchair price',
    'Cybex Melio Kinderwagen Test',
    'Cybex Melio – specs, buy online',
    'Cybex Melio™ 嬰兒推車',
    'Cybex Melio\nHergestellt in China',
  ]) {
    it(`counts as exact Melio: ${JSON.stringify(t)}`, () => {
      assert.equal(exactModelPage(t, MELIO), true, JSON.stringify(modelMentions(t, MELIO)));
    });
  }
  for (const t of [
    'Cybex Melio Carbon',
    'Cybex Melio Eezy',
    'Cybex Melio V2',
    'Cybex Melio (Carbon)',
    'Cybex Melio Mk2',
    'Cybex Melio Gen 3',
    'Cybex Melio S',
    'Cybex Melio Pro',
    'Cybex Melio Plus',
    'Cybex Melio Lux',
    'Cybex Melio Air',
    'Cybex Melio Street',
    'CYBEX MELIO CARBON',
    'cybex-melio-carbon',
    'Cybex Melio®Carbon',
    'Cybex Melio 2',
  ]) {
    it(`does NOT count as exact Melio: ${JSON.stringify(t)}`, () => {
      assert.equal(exactModelPage(t, MELIO), false, JSON.stringify(modelMentions(t, MELIO)));
    });
  }
  // Tester (12:46): shop titles put the colour after the model.
  for (const t of [
    'Cybex Melio Moon Black',
    'Cybex Melio Deep Black',
    'Cybex Melio Mirage Grey',
    'Cybex Melio Magic Black',
    'Cybex Melio Space Grey',
    'Cybex Melio Seashell Beige',
    'Cybex Melio Navy',
    'Cybex Melio Black',
    'CYBEX MELIO MOON BLACK',
    'Cybex Melio Moon Black 嬰兒推車 2024',
    'Cybex Melio Sky Blue stroller',
  ]) {
    it(`colour phrase after the model is descriptive, still exact Melio: ${JSON.stringify(t)}`, () => {
      assert.equal(exactModelPage(t, MELIO), true, JSON.stringify(modelMentions(t, MELIO)));
    });
  }
  for (const t of [
    'Cybex Melio Carbon Moon Black',
    'Cybex Melio Carbon Deep Black',
    'Cybex Melio Eezy Black',
    'Cybex Melio V2 Moon Black',
    'Cybex Melio NC Black',
    'Cybex Melio Pro Grey',
    'Cybex Melio Lux Navy',
    'Cybex Melio S Black',
    'CYBEX MELIO CARBON MOON BLACK',
    'Cybex Melio Street Silver',
  ]) {
    it(`a variant stays a variant even with a colour after it: ${JSON.stringify(t)}`, () => {
      assert.equal(exactModelPage(t, MELIO), false, JSON.stringify(modelMentions(t, MELIO)));
    });
  }
  it('a colour page counts in the gate; the Carbon colour page is still excluded as Melio Carbon', () => {
    const moon = page('https://www.momoshop.com.tw/goods/9', 'Cybex Melio Moon Black 輕量嬰兒推車\n產地：中國');
    const carbon = page('https://shop.example.jp/c', 'Cybex Melio Carbon Moon Black ベビーカー\n原産国：中国');
    const g = gateClaims('Cybex Melio', [], [moon, carbon], regexCooClaims([moon, carbon]));
    assert.deepEqual(g.kept.map((k) => [k.page, k.exactModel]), [[1, true]]);
    assert.deepEqual(g.excluded.map((e) => e.model), ['Melio Carbon']);
  });

  it("'Liberty 4 NC' is not 'Liberty 4'; 'Liberty 4' itself and with a category word is", () => {
    assert.equal(exactModelPage('Anker Liberty 4 NC', 'Anker Liberty 4'), false);
    assert.equal(exactModelPage('Soundcore Liberty 4 NC earbuds', 'Soundcore Liberty 4'), false);
    assert.equal(exactModelPage('Anker Liberty 4 earbuds review', 'Anker Liberty 4'), true);
    assert.equal(exactModelPage('Anker Liberty 4（2023）藍牙耳機', 'Anker Liberty 4'), true);
  });
  it('the excluded row names the other variant as written (Melio Carbon, Melio V2, Liberty 4 NC)', () => {
    assert.deepEqual(modelMentions('Cybex Melio (Carbon)', MELIO).variants, ['Carbon']);
    assert.deepEqual(modelMentions('Cybex Melio V2', MELIO).variants, ['V2']);
    assert.deepEqual(modelMentions('Anker Liberty 4 NC', 'Anker Liberty 4').variants, ['NC']);
  });

  it('domains: subdomains and second-level suffixes are one site', () => {
    assert.equal(siteOf('https://www.momoshop.com.tw/x'), 'momoshop.com.tw');
    assert.equal(siteOf('https://m.momoshop.com.tw/x'), 'momoshop.com.tw');
    assert.equal(siteOf('https://shop.aeon.co.jp/x'), 'aeon.co.jp');
    assert.equal(siteOf('https://mamilove.com.tw/x'), 'mamilove.com.tw');
  });
});

describe('page gate: 2 domains promote, 1 page flags', () => {
  it('two exact-model pages on different domains agreeing → confirmed, basis model', () => {
    const kept = gate([MOMO, MAMI]);
    assert.equal(kept.length, 2);
    assert.ok(kept.every((k) => k.status === 'confirmed' && k.basis === 'model' && k.exactModel));
  });

  it('a single exact-model page → likely, flagged exactModel (for the AI-answer rule)', () => {
    const kept = gate([MOMO]);
    assert.deepEqual(
      kept.map((k) => [k.status, k.basis, k.exactModel]),
      [['likely', 'name', true]]
    );
  });

  it('two pages on the same domain count once → likely', () => {
    const kept = gate([MOMO, MOMO_2]);
    assert.ok(kept.every((k) => k.status === 'likely'));
  });

  it('the near-miss page is reported as excluded, named for the card (Melio Carbon)', () => {
    const pages = [MOMO, CARBON];
    const out = gateClaims(ENTITY, [], pages, regexCooClaims(pages));
    assert.deepEqual(out.excluded, [{ page: 2, model: 'Melio Carbon', country: 'China' }]);
    assert.deepEqual(excludedPages(out.excluded, pages), [
      { url: CARBON.url, model: 'Melio Carbon', country: 'China' },
    ]);
    // A page about the exact model is never excluded.
    assert.deepEqual(gateClaims(ENTITY, [], [MOMO], regexCooClaims([MOMO])).excluded, []);
  });

  it('variant mismatch (Melio Carbon) does not count toward the exact model, nor as a likely page', () => {
    const kept = gate([MOMO, CARBON]);
    assert.ok(kept.every((k) => k.status === 'likely'));
    assert.equal(kept.find((k) => k.page === 2), undefined);
    assert.deepEqual(gate([CARBON]), []);
  });

  it('exact-model pages naming different countries → nothing confirmed; both flagged (conflict visible)', () => {
    const kept = gate([MOMO, MAMI, GERMANY]);
    assert.ok(kept.every((k) => k.status === 'likely'));
    assert.deepEqual(new Set(kept.filter((k) => k.exactModel).map((k) => k.page)), new Set([1, 2, 3]));
  });

  it('a barcode-confirmed page outranks a model match: nothing is promoted', () => {
    const jan = '4058511234567';
    const barcode = page('https://shop.example.jp/jan', `Cybex Melio JAN ${jan} 原産国：ベトナム`);
    const pages = [barcode, MOMO, MAMI];
    const kept = gateClaims(`${ENTITY} ${jan}`, [jan], pages, regexCooClaims(pages)).kept;
    assert.deepEqual(
      kept.filter((k) => k.status === 'confirmed').map((k) => k.basis),
      ['barcode']
    );
  });
});

const exactLikely = (country: string, url: string): WebCooClaim => ({
  country,
  basis: 'name',
  status: 'likely',
  url,
  exactModel: true,
});
const byModel = (country: string, url: string): WebCooClaim => ({
  country,
  basis: 'model',
  status: 'confirmed',
  url,
  exactModel: true,
});

describe('made-in gate: the AI answer is one source, the web verifies it', () => {
  it('(1) AI answer X + one exact-model page X → confirmed 依型號比對 (ai_web)', () => {
    const g = applyWebCooGate({ name: 'Cybex Melio', madeIn: 'China' }, [
      exactLikely('中國', 'https://momoshop.com.tw/1'),
    ]);
    assert.equal(g.product?.madeIn, 'China');
    assert.equal(g.madeInBasis, 'model');
    assert.equal(g.madeInSupport, 'ai_web');
    // The page backs the made-in now: a source, not a candidate.
    assert.deepEqual(g.likely, []);
  });

  it('(1) a loose (not exact-model) page does not verify the AI answer', () => {
    const g = applyWebCooGate({ name: 'Cybex Melio', madeIn: 'China' }, [
      { country: '中國', basis: 'name', status: 'likely', url: 'https://x.example/1' },
    ]);
    assert.equal(g.product?.madeIn, undefined);
    assert.equal(g.madeInBasis, undefined);
    assert.deepEqual(g.likely, ['中國']);
  });

  it('(2) two exact-model domains confirm with the AI silent', () => {
    const g = applyWebCooGate({ name: 'Cybex Melio' }, [
      byModel('中國', 'https://momoshop.com.tw/1'),
      byModel('China', 'https://mamilove.com.tw/2'),
    ]);
    assert.equal(g.product?.madeIn, '中國');
    assert.equal(g.madeInBasis, 'model');
    assert.equal(g.madeInSupport, 'web');
  });

  it('(2) two exact-model domains outvote the AI answer; the AI answer stays a candidate row', () => {
    const r = synthesize({
      jobId: 'mm2',
      geoScope: 'prc',
      webEnriched: true,
      webBrief: 'x',
      partials: { product: { name: 'Cybex Melio', brand: 'Cybex', madeIn: 'Czech Republic', confidence: 0.7 } },
      webCoo: [byModel('中國', 'https://momoshop.com.tw/1'), byModel('China', 'https://mamilove.com.tw/2')],
    });
    assert.equal(r.product?.madeInBasis, 'model');
    assert.equal(r.product?.madeInSupport, 'web');
    assert.match(r.product?.madeIn ?? '', /中國|China/);
    const ai = r.product?.originCandidates?.find((c) => c.source === 'model_memory');
    assert.equal(ai?.label, 'Czech Republic');
    assert.notEqual(ai?.rating, 'confirmed');
  });

  it('(3) AI answer alone (no web page) → not confirmed; model reference as today (#32)', () => {
    const r = synthesize({
      jobId: 'mm3',
      geoScope: 'prc',
      webEnriched: true,
      webBrief: 'x',
      partials: { product: { name: 'Cybex Melio', madeIn: 'China', confidence: 0.7 } },
      webCoo: [],
    });
    assert.equal(r.product?.madeIn, undefined);
    assert.equal(r.product?.madeInBasis, undefined);
    assert.ok(r.product?.originCandidates?.some((c) => c.source === 'model_memory' && c.label === 'China'));
    assert.ok(!r.product?.originCandidates?.some((c) => c.rating === 'confirmed'));
  });

  it('(4) exact-model pages disagree → 未確認, both countries stay candidates', () => {
    const g = applyWebCooGate({ name: 'Cybex Melio', madeIn: 'China' }, [
      exactLikely('中國', 'https://momoshop.com.tw/1'),
      exactLikely('Germany', 'https://other.example.de/2'),
    ]);
    assert.equal(g.product?.madeIn, undefined);
    assert.equal(g.madeInBasis, undefined);
    assert.deepEqual(g.likely, ['中國', 'Germany']);
  });

  it('(5) barcode outranks: a barcode page for another country beats AI + page and 2 domains', () => {
    const web = [
      exactLikely('中國', 'https://momoshop.com.tw/1'),
      byModel('中國', 'https://mamilove.com.tw/2'),
    ];
    // AI silent: the barcode page's country, not the model match's.
    const g = applyWebCooGate({ name: 'Cybex Melio' }, [
      { country: 'ベトナム', basis: 'barcode', status: 'confirmed', url: 'https://jan.example.jp/1' },
      ...web,
    ]);
    assert.equal(g.product?.madeIn, 'ベトナム');
    assert.equal(g.madeInBasis, 'barcode');
    assert.equal(g.madeInSupport, undefined);
    // AI answer contradicted by the barcode page: never confirmed by the model pages.
    const g2 = applyWebCooGate({ name: 'Cybex Melio', madeIn: 'China' }, [
      { country: 'ベトナム', basis: 'barcode', status: 'confirmed', url: 'https://jan.example.jp/1' },
      ...web,
    ]);
    assert.notEqual(g2.madeInBasis, 'model');
    assert.notEqual(g2.product?.madeIn, 'China');
    // Same country everywhere: the basis shown is the barcode.
    const g3 = applyWebCooGate({ name: 'Cybex Melio', madeIn: 'China' }, [
      { country: '中國', basis: 'barcode', status: 'confirmed', url: 'https://jan.example.jp/1' },
      ...web,
    ]);
    assert.equal(g3.madeInBasis, 'barcode');
  });

  it('(5) the package label outranks a model match for the AI answer', () => {
    const g = applyWebCooGate(
      { name: 'Cybex Melio', madeIn: 'China' },
      [byModel('中國', 'https://momoshop.com.tw/1'), byModel('中國', 'https://mamilove.com.tw/2')],
      'Made in China'
    );
    assert.equal(g.madeInBasis, 'label');
  });

  it('confidence: barcode > 2 domains > AI answer + 1 page', () => {
    const conf = (webCoo: WebCooClaim[]) =>
      synthesize({
        jobId: 'c',
        geoScope: 'prc',
        webEnriched: true,
        webBrief: 'x',
        partials: { product: { name: 'Cybex Melio', madeIn: 'China', confidence: 0.95 } },
        webCoo,
      }).product?.originCandidates?.find((c) => c.rating === 'confirmed')?.confidence ?? 0;
    const barcode = conf([{ country: '中國', basis: 'barcode', status: 'confirmed', url: 'https://j.example/1' }]);
    const web2 = conf([byModel('中國', 'https://momoshop.com.tw/1'), byModel('中國', 'https://mamilove.com.tw/2')]);
    const aiWeb = conf([exactLikely('中國', 'https://momoshop.com.tw/1')]);
    assert.ok(barcode > web2 && web2 > aiWeb && aiWeb > 0, `${barcode} ${web2} ${aiWeb}`);
    assert.equal(web2, MODEL_MATCH_CONFIDENCE);
    assert.equal(aiWeb, MODEL_AI_WEB_CONFIDENCE);
  });

  it('a model-match confirmation feeds the China tier like a barcode one', () => {
    const r = synthesize({
      jobId: 'cn',
      geoScope: 'prc',
      webEnriched: true,
      webBrief: 'x',
      partials: { product: { name: 'Cybex Melio', madeIn: 'China', confidence: 0.9 } },
      webCoo: [exactLikely('中國', 'https://momoshop.com.tw/1')],
    });
    assert.equal(r.product?.madeInBasis, 'model');
    assert.notEqual(r.tier, 'none');
  });
});

describe('disagreement over ALL exact-model evidence (Tester #35 blocker 2)', () => {
  const DE = page('https://de.example.de/melio', 'Cybex Melio Kinderwagen\nMade in Germany');
  // Exact-model page with China, dropped by the page gate (lists several sizes).
  const CN_MULTI = page('https://shop.example.jp/melio-sizes', 'Cybex Melio ベビーカー 原産国：中国 60ml 120ml 240ml');
  const CITED_CN: WebCooClaim = {
    country: 'China', basis: 'name', status: 'likely', url: 'https://other.example.org/melio', exactModel: true, cited: 'fetched',
  };

  it('a dropped exact-model claim still counts for disagreement: the kept page is flagged, the dropped line comes along as evidence only', () => {
    const kept = gate([DE, CN_MULTI], 'Cybex Melio');
    const de = kept.find((k) => k.country === 'Germany');
    const cn = kept.find((k) => /China|中国/.test(k.country));
    assert.equal(de?.exactModel, true);
    assert.equal(cn?.evidenceOnly, true);
    assert.equal(cn?.exactModel, true);
  });

  it('Tester: AI China + fetched cited China page, while an exact page says Germany (China was dropped) → 未確認, not 中國 75%', () => {
    const pages = [DE, CN_MULTI];
    const kept = gateClaims('Cybex Melio', [], pages, regexCooClaims(pages)).kept;
    const coo: WebCooClaim[] = settleExactConflict([
      ...kept.map((k) => ({
        country: k.country, basis: k.basis, status: k.status, url: pages[k.page - 1]!.url,
        ...(k.exactModel ? { exactModel: true } : {}), ...(k.evidenceOnly ? { evidenceOnly: true } : {}),
      })),
      CITED_CN,
    ]);
    const g = applyWebCooGate({ madeIn: 'China' }, coo);
    assert.equal(g.product?.madeIn, undefined);
    assert.equal(g.madeInBasis, undefined);
    assert.equal(g.madeInSupport, undefined);
    assert.ok(g.likely.includes('Germany'));
  });

  it('Tester probe g4: exact search page Germany + fetched cited China → 未確認 (the AI cannot confirm past it)', () => {
    const g = applyWebCooGate({ madeIn: 'China' }, [
      { country: 'Germany', basis: 'name', status: 'likely', exactModel: true, url: 'https://de.example.de/melio' },
      CITED_CN,
    ]);
    assert.equal(g.product?.madeIn, undefined);
    assert.equal(g.madeInSupport, undefined);
  });

  it('two domains agreeing on China + a verified cited page for Germany → the 2-domain match is undone: 未確認', () => {
    const coo = settleExactConflict([
      { country: 'China', basis: 'model', status: 'confirmed', exactModel: true, url: 'https://www.momoshop.com.tw/goods/1' },
      { country: 'China', basis: 'model', status: 'confirmed', exactModel: true, url: 'https://mamilove.com.tw/p/2' },
      { ...CITED_CN, country: 'Germany', url: 'https://de.example.de/x' },
    ]);
    assert.ok(coo.every((c) => c.basis !== 'model'));
    const g = applyWebCooGate({ madeIn: 'Germany' }, coo);
    assert.equal(g.product?.madeIn, undefined);
    assert.equal(g.madeInBasis, undefined);
  });

  it('evidence-only lines never count toward a made-in; barcode still outranks', () => {
    const only = applyWebCooGate({ madeIn: 'China' }, [
      { country: 'China', basis: 'name', status: 'likely', exactModel: true, evidenceOnly: true, url: 'https://a.example.com/x' },
    ]);
    assert.equal(only.product?.madeIn, undefined);
    const bc = applyWebCooGate({ madeIn: 'Japan' }, [
      { country: 'Japan', basis: 'barcode', status: 'confirmed', url: 'https://a.jp/x' },
      { country: 'Germany', basis: 'name', status: 'likely', exactModel: true, url: 'https://de.example.de/melio' },
      CITED_CN,
    ]);
    assert.equal(bc.product?.madeIn, 'Japan');
    assert.equal(bc.madeInBasis, 'barcode');
  });
});

describe('bounded made-in follow-up query', () => {
  it('first query keeps the barcode; follow-up is the model + wider made-in wording (no barcode)', () => {
    assert.match(buildSearchQuery('Cybex Melio', ['4058511234567']), /4058511234567/);
    const q = buildMadeInQuery('Cybex Melio 嬰兒推車');
    assert.ok(q.startsWith('Cybex Melio 嬰兒推車 '));
    for (const term of ['"made in"', '"country of origin"', '產地', '製造地', '原產地', '生産国']) {
      assert.ok(MADE_IN_FOLLOWUP_TERMS.includes(term as (typeof MADE_IN_FOLLOWUP_TERMS)[number]), term);
      assert.ok(q.includes(term), term);
    }
  });

  it('runs only when the first pages give < 2 usable made-in pages and nothing confirmed', () => {
    assert.equal(needsMadeInFollowup(ENTITY, undefined, [page('https://a.example/1', 'Cybex Melio review')]), true);
    assert.equal(needsMadeInFollowup(ENTITY, undefined, [MOMO]), true);
    assert.equal(needsMadeInFollowup(ENTITY, undefined, [MOMO, MAMI]), false);
    assert.equal(needsMadeInFollowup(ENTITY, undefined, []), false);
  });

  it('merge: first pages first, same URL once (query / trailing slash / case), capped', () => {
    const a = page('https://a.example/p', 'A');
    const merged = mergePages(
      [a, page('https://b.example/p', 'B')],
      [page('https://A.example/p/?ref=x', 'A again'), page('https://c.example/p', 'C')]
    );
    assert.deepEqual(merged.map((p) => p.text), ['A', 'B', 'C']);
    const many = Array.from({ length: 30 }, (_, i) => page(`https://s${i}.example/`, String(i)));
    assert.equal(mergePages(many.slice(0, 10), many.slice(10)).length, MAX_MERGED_PAGES);
  });
});
