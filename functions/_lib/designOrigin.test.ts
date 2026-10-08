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

describe('brand / HQ phrases stop at the first country and never eat a made-in clause', () => {
  const CASES: Array<[string, string, string]> = [
    ['Founded in 1947 in Bayreuth, Germany, made in China', 'China', 'CN'],
    ['Based in Germany, manufactured in Germany', 'Germany', 'OTHER'],
    ['Headquartered in Germany; assembled in China', 'China', 'CN'],
  ];
  for (const [text, country, region] of CASES) {
    it(`${JSON.stringify(text)} keeps its made-in claim (${country})`, () => {
      // The made-in clause survives the strip, word for word.
      const madeClause = text.split(/[,;]\s*/).pop()!;
      assert.ok(stripDesignPhrases(text).includes(madeClause), stripDesignPhrases(text));
      assert.deepEqual(extractCooClaimsFromText(text).map((c) => [c.label, c.region]), [[country, region]]);
      assert.notEqual(extractCooClaimsFromText(text)[0]!.source, 'ownership');
      assert.deepEqual(regexCooClaims([page('https://a.example.com/', `Cybex Melio\n${text}`)]).map((c) => c.country), [country]);
      // The brand / HQ part is info, ending at its first country.
      const d = designMentions(text);
      assert.deepEqual(d.map((x) => [x.country, x.kind]), [['Germany', 'brand']]);
      assert.match(d[0]!.phrase, /Germany$/);
    });
  }
  it('through the gate: the Bayreuth page counts China; Germany is brand info only', () => {
    const pages = [page('https://a.example.com/melio', 'Cybex Melio 嬰兒推車\nFounded in 1947 in Bayreuth, Germany, made in China')];
    const g = gateClaims(MELIO, [], pages, regexCooClaims(pages));
    assert.deepEqual(g.kept.map((k) => k.country), ['China']);
    assert.deepEqual(g.design.map((x) => [x.country, x.kind]), [['Germany', 'brand']]);
  });
});

describe('2-letter codes never map in notes or free text ("IT company" is not Italy)', () => {
  for (const note of ['Cybex works with an IT company in Shanghai', 'it is designed for city life', 'IT', 'it', 'DE / IT design team']) {
    it(`note ${JSON.stringify(note)} → no Italy / Germany candidate`, () => {
      const rows = __test.collectOriginCandidates({ name: 'X', notes: [note] }, { webEnriched: true });
      assert.ok(!rows.some((r) => r.label === 'Italy' || r.label === 'Germany'), JSON.stringify(rows));
    });
  }
  it('free-text made-in lines need a country name: "Made in IT" / "made in my kitchen" are no claim', () => {
    for (const t of ['Made in IT', 'MADE IN IT', 'made in it', 'made in my kitchen', 'Assembled in IT']) {
      assert.deepEqual(extractCooClaimsFromText(t), [], t);
      assert.deepEqual(regexCooClaims([page('https://a.example.com/', `Cybex Melio\n${t}`)]), [], t);
    }
  });
  it('full names still map: Italy, 意大利, 義大利', () => {
    for (const n of ['Final assembly is in Italy', '最終組裝在意大利', '最終組裝在義大利']) {
      const rows = __test.collectOriginCandidates({ name: 'X', notes: [n] }, { webEnriched: true });
      assert.ok(rows.some((r) => r.label === 'Italy'), `${n} ${JSON.stringify(rows)}`);
    }
    assert.deepEqual(extractCooClaimsFromText('Made in Italy').map((c) => c.label), ['Italy']);
  });
  it('componentsOrigin lists keep upper-case codes, never IT and never lower-case words', () => {
    const labels = (o: string) => __test.collectOriginCandidates({ name: 'X', componentsOrigin: o }, {}).map((r) => r.label);
    assert.deepEqual(labels('Often CN / TH / VN (unconfirmed)'), ['China', 'Thailand', 'Vietnam']);
    assert.deepEqual(labels('IT parts from CN'), ['China']);
    assert.deepEqual(labels('it is mostly made in china'), ['China']);
  });
});
