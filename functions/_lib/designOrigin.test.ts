/**
 * Design / brand wording is never made-in evidence (Cybex "Engineered in
 * Germany", "Designed by Apple in California, Assembled in China").
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { designMentions, quoteBacksCountry, stripDesignPhrases } from './designOrigin';
import { extractCooClaimsFromText } from './cooPriority';
import { notesNameMadeIn, notesNameOnlyAsDesign } from './noteText';
import { citedPageConfirms } from './citedSources';
import { PRODUCT_FACT_RULES } from './prompts';
import { gateClaims, regexCooClaims, type CooClaim } from './search/extract';
import type { FetchedPage } from './search/types';
import { __test, synthesize } from './synthesize';

const page = (url: string, text: string): FetchedPage => ({ url, title: '', text });
const MELIO = 'Cybex Melio';

describe('design / brand phrases', () => {
  const DESIGN: Array<[string, string, 'design' | 'brand']> = [
    ['Engineered in Germany', 'Germany', 'design'],
    ['Designed in Germany', 'Germany', 'design'],
    ['Designed by Apple in California', 'United States', 'design'],
    ['Developed in Sweden', 'Sweden', 'design'],
    ['German engineering', 'Germany', 'design'],
    ['German-engineered frame', 'Germany', 'design'],
    ['Design from Denmark', 'Denmark', 'design'],
    ['Conceived in Switzerland', 'Switzerland', 'design'],
    ['R&D in Germany', 'Germany', 'design'],
    ['設計於德國', 'Germany', 'design'],
    ['德國設計', 'Germany', 'design'],
    ['研發於德國', 'Germany', 'design'],
    ['德國工程', 'Germany', 'design'],
    ['ドイツ設計', 'Germany', 'design'],
    ['Cybex is a German brand', 'Germany', 'brand'],
    ['德國品牌 Cybex', 'Germany', 'brand'],
    ['品牌源自德國（設計與研發中心）', 'Germany', 'brand'],
  ];
  for (const [text, country, kind] of DESIGN) {
    it(`${JSON.stringify(text)} → ${kind} info ${country}, never a made-in`, () => {
      assert.deepEqual(
        designMentions(text).map((d) => [d.country, d.kind]),
        [[country, kind]]
      );
      assert.deepEqual(extractCooClaimsFromText(text), []);
      assert.deepEqual(regexCooClaims([page('https://a.example.com/', `Cybex Melio\n${text}`)]), []);
    });
  }

  for (const text of ['Made in China', 'Manufactured in China', 'Assembled in China', 'Country of origin: China', '產地：中國', '製造地：中國']) {
    it(`made-in wording stays made-in: ${JSON.stringify(text)}`, () => {
      assert.equal(stripDesignPhrases(text), text);
      assert.deepEqual(designMentions(text), []);
    });
  }

  it('mixed sentence: only the made-in part counts ("Designed in Germany, made in China")', () => {
    const t = 'Designed in Germany, made in China';
    assert.deepEqual(extractCooClaimsFromText(t).map((c) => c.region), ['CN']);
    assert.deepEqual(regexCooClaims([page('https://a.example.com/', `Cybex Melio\n${t}`)]).map((c) => c.country), ['China']);
    assert.deepEqual(designMentions(t).map((d) => d.country), ['Germany']);
    for (const s of ['Designed in Germany and made in China', '德國設計，中國製造', '設計於德國，產地：中國', 'German engineering, Made in China']) {
      assert.deepEqual(extractCooClaimsFromText(s).map((c) => c.region), ['CN'], s);
      assert.ok(!stripDesignPhrases(s).match(/germany|德國|ドイツ/i), s);
    }
    // "Designed and made in Japan" is a made-in line.
    assert.deepEqual(extractCooClaimsFromText('Designed and made in Japan').map((c) => c.label), ['Japan']);
    assert.deepEqual(designMentions('Designed and made in Japan'), []);
  });

  it('Apple: "Designed by Apple in California, Assembled in China" counts China only', () => {
    const t = 'Designed by Apple in California. Assembled in China';
    assert.deepEqual(extractCooClaimsFromText(t).map((c) => c.region), ['CN']);
    assert.deepEqual(designMentions(t).map((d) => [d.country, d.kind]), [['United States', 'design']]);
    // Model-extracted claims on the page: a US claim quoting the design part is dropped, China stays.
    const entity = 'Apple iPhone 15';
    const pages = [page('https://www.apple.com/iphone-15/specs/', `Apple iPhone 15 specs\nDesigned by Apple in California, Assembled in China`)];
    const claims: CooClaim[] = [
      { country: 'United States', quote: 'Designed by Apple in California', page: 1, sourceType: 'manufacturer' },
      { country: 'United States', quote: 'Designed by Apple in California, Assembled in China', page: 1, sourceType: 'manufacturer' },
      { country: 'China', quote: 'Designed by Apple in California, Assembled in China', page: 1, sourceType: 'manufacturer' },
    ];
    assert.deepEqual(regexCooClaims(pages).map((c) => c.country), ['China']);
    const g = gateClaims(entity, [], pages, claims);
    assert.deepEqual(g.kept.map((k) => k.country), ['China']);
    assert.deepEqual(g.design.map((d) => d.country), ['United States']);
  });

  it('a model quote that is only design wording never counts', () => {
    assert.equal(quoteBacksCountry('Engineered in Germany', 'Germany'), false);
    const pages = [page('https://a.example.com/', 'Cybex Melio 嬰兒推車\nEngineered in Germany')];
    const g = gateClaims(MELIO, [], pages, [{ country: 'Germany', quote: 'Engineered in Germany', page: 1, sourceType: 'manufacturer' }]);
    assert.deepEqual(g.kept, []);
    assert.deepEqual(g.design.map((d) => [d.country, d.kind]), [['Germany', 'design']]);
    assert.equal(quoteBacksCountry('Designed in Germany, made in China', 'Germany'), false);
    assert.equal(quoteBacksCountry('Designed in Germany, made in China', 'China'), true);
    assert.equal(quoteBacksCountry('Designed in Germany, made in China', '中國'), true);
  });

  it('AI-cited page: an "Engineered in Germany" quote is not a made-in', () => {
    const p = page('https://www.cybex-online.com/melio', 'Cybex Melio stroller\nEngineered in Germany');
    assert.equal(citedPageConfirms(p, MELIO, 'Germany', 'Engineered in Germany'), false);
    const mixed = page('https://shop.example.com/melio', 'Cybex Melio stroller\nDesigned in Germany, made in China');
    assert.equal(citedPageConfirms(mixed, MELIO, 'Germany', 'Designed in Germany'), false);
    assert.equal(citedPageConfirms(mixed, MELIO, 'China', 'made in China'), true);
  });
});

describe('notes: design / brand wording is not a candidate', () => {
  const CYBEX_NOTE = '品牌源自德國（設計與研發中心），但實體產品之最終製造與組裝地為中國大陸。';
  it('the live Cybex note gives no 德國 candidate (it was 德國 · 有提及)', () => {
    const rows = __test.collectOriginCandidates({ name: 'Cybex Melio', notes: [CYBEX_NOTE] }, { webEnriched: true });
    assert.ok(!rows.some((r) => r.label === 'Germany'), JSON.stringify(rows));
    assert.ok(rows.some((r) => r.label === 'China'), JSON.stringify(rows));
    assert.equal(notesNameOnlyAsDesign([CYBEX_NOTE], 'Germany'), true);
    assert.equal(notesNameOnlyAsDesign([CYBEX_NOTE], 'China'), false);
    assert.equal(notesNameMadeIn(['Designed in Germany and made in China'], 'Germany'), false);
    assert.equal(notesNameMadeIn(['Designed in Germany and made in China'], 'China'), true);
  });
  it('the note becomes design / brand info instead', () => {
    const rows = __test.collectDesignInfo({ name: 'Cybex Melio', notes: [CYBEX_NOTE] }, undefined);
    assert.deepEqual(rows.map((r) => [r.country, r.kind]), [['Germany', 'brand']]);
  });
});

describe('designedIn (the model reports design separately)', () => {
  it('the prompt asks for designedIn apart from madeIn', () => {
    assert.match(PRODUCT_FACT_RULES, /designedIn/);
    assert.match(PRODUCT_FACT_RULES, /never made-in evidence/i);
    assert.match(PRODUCT_FACT_RULES, /Designed in Germany, made in China/);
  });
  it('designedIn is 附加資訊; a madeIn that copies it is dropped', () => {
    const r = synthesize({
      jobId: 'd', geoScope: 'prc', locale: 'zh-Hant', webEnriched: true, webBrief: 'x', sources: [], webCoo: [],
      partials: { product: { name: 'Cybex Melio', brand: 'Cybex', designedIn: 'Germany', madeIn: 'Germany', confidence: 0.8 } },
    });
    assert.equal(r.product?.madeIn, undefined);
    assert.ok(!(r.product?.originCandidates ?? []).some((c) => c.label === 'Germany'), JSON.stringify(r.product?.originCandidates));
    assert.deepEqual(r.product?.designInfo?.map((d) => [d.country, d.kind]), [['Germany', 'design']]);
  });
  it('a design country equal to the confirmed made-in is left out', () => {
    const rows = __test.collectDesignInfo({ name: 'X', madeIn: 'Germany', designedIn: 'Germany' }, [
      { country: 'Germany', kind: 'design', url: 'https://a.example.com/' },
    ]);
    assert.deepEqual(rows, []);
  });
});
