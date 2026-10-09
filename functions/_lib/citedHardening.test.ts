/**
 * Cited-source hardening (sections A1, A2(i), A2(ii)).
 * - A2(i): a homepage, listing root or search page never counts, on the cited
 *   path (before any fetch, and on the landing URL) and on the search-page gate.
 * - A2(ii): a made-in line counts for this model only when it sits under this
 *   model (its sentence, else the nearest model heading above it; running
 *   text, related / compatible / accessory lists are not headings).
 * - S3/S4 (#37 review): no-path cites take no check slot; a path is a locale
 *   only when it is a real locale code.
 * - A1: the prompt asks for the product page; a Gemini grounding redirect
 *   from the Sources is fetched and judged on its landing page, within budget.
 * Mocked fetches only (no live lookups).
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { MAX_CITED_SOURCES, citedFetcher, verifyCitedSources } from './citedSources';
import { notProductPageUrl, isGroundingRedirect } from './pageUrl';
import { PRODUCT_FACT_RULES } from './prompts';
import { LIST_ENDS_AT_ANY_SECTION, findJans, gateClaims, quoteInModelScope, regexCooClaims, webCooFromKept } from './search/extract';
import type { FetchedPage } from './search/types';
import type { WebCooClaim } from './schema';
import { synthesize } from './synthesize';
import { buildMadeInView } from '../../src/components/resultCards.model';
import type { CheckResult } from '../../src/core/types';

const E = 'Cybex Melio';
const MELIO_OK = 'Cybex Melio 嬰兒推車\n規格\nMade in China';
const pg = (url: string, text: string, title = '', finalUrl?: string): FetchedPage => ({ url, title, text, ...(finalUrl ? { finalUrl } : {}) });
const RX = (n: string) => `https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ-${n}`;

afterEach(() => mock.restoreAll());

async function check(
  cited: Array<{ url: string; quote?: string }>,
  page: (u: string) => FetchedPage | null | Promise<FetchedPage | null> = (u) => pg(u, MELIO_OK, 'Cybex Melio', u),
  o: { searchUrls?: string[]; searchPages?: FetchedPage[] } = {}
) {
  const fetched: string[] = [];
  const out = await verifyCitedSources({
    entity: E,
    country: 'China',
    cited,
    searchUrls: o.searchUrls ?? [],
    searchPages: o.searchPages ?? [],
    droppedUrls: [],
    excludedUrls: [],
    searchCoo: [],
    fetchPage: async (u) => {
      fetched.push(u);
      return page(u);
    },
  });
  return { ...out, fetched };
}

function card(madeIn: string | undefined, webCoo: WebCooClaim[], sources: string[]): CheckResult {
  const r = synthesize({
    jobId: 'r23',
    geoScope: 'prc',
    locale: 'zh-Hant',
    webEnriched: true,
    webBrief: 'x',
    sources,
    partials: { product: { name: 'Cybex Melio 嬰兒推車', brand: 'Cybex', ...(madeIn ? { madeIn } : {}), confidence: 0.9 } },
    webCoo,
  } as Parameters<typeof synthesize>[0]);
  return { ...r, sources, meta: { ...r.meta, searchCoo: webCoo } } as unknown as CheckResult;
}

function searchRun(url: string, title: string, text: string, finalUrl?: string) {
  const pages = [pg(url, `${title}\n${text}`, title, finalUrl)];
  const g = gateClaims(E, findJans(E, undefined), pages, regexCooClaims(pages));
  const coo = webCooFromKept(g.kept, pages);
  const v = buildMadeInView(card('China', coo, [`${title} — ${url}`]));
  return { kept: g.kept.length, v };
}
const pct = (v: ReturnType<typeof buildMadeInView>) => Math.round((v.confidence ?? 0) * 100);

/** Route table for globalThis.fetch; records every URL asked for. */
function routes(table: Record<string, () => Response>) {
  const asked: string[] = [];
  mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    const u = String(input);
    asked.push(u);
    const r = table[u];
    if (!r) throw new TypeError('fetch failed');
    return r();
  });
  return asked;
}
const html = (body: string) => () =>
  new Response(`<html><body>${body}</body></html>`, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
const redirect = (to: string) => () => new Response(null, { status: 302, headers: { Location: to } });

const NO_PATH = [
  'https://kidobebe.com', 'https://www.babesta.com', 'https://kidobebe.com/', 'https://kidobebe.com/?utm_source=ai',
  'https://kidobebe.com/#specs', 'https://kidobebe.com/zh-tw/', 'https://kidobebe.com/en-gb/', 'https://kidobebe.com/en-gb',
  'https://www.cybex-online.com/en/us/', 'https://kidobebe.com/index.html', 'https://kidobebe.com/index.php',
  'https://kidobebe.com/zh-tw/index.html', 'https://kidobebe.com/home', 'https://kidobebe.com/home.html',
  'https://kidobebe.com/?lang=zh', 'https://kidobebe.com/?hl=zh-TW&currency=HKD', 'https://kidobebe.com/#/products/cybex-melio',
  'https://kidobebe.com./', 'https://WWW.KIDOBEBE.COM/', 'http://kidobebe.com', 'https://m.kidobebe.com/',
  'https://kidobebe.com/ZH-TW/', 'https://kidobebe.com/Index.HTML', 'https://kidobebe.com/HOME',
  'https://kidobebe.com/zh-tw/en/', 'https://kidobebe.com/zh_TW/', 'https://kidobebe.com/zh-hant-tw/',
  'https://kidobebe.com/collections', 'https://kidobebe.com/collections/all', 'https://kidobebe.com/products',
  'https://kidobebe.com/products/', 'https://kidobebe.com/?s=melio', 'https://kidobebe.com/catalogsearch/result/?q=melio',
  'https://kidobebe.com/search', 'https://kidobebe.com/search?q=melio', 'https://kidobebe.com/zh-tw/search?q=melio',
  // S4: real locale codes only (language, optional script / region; /en/us/ and /us/en/).
  'https://kidobebe.com/en', 'https://kidobebe.com/zh-hk', 'https://kidobebe.com/es-419/', 'https://kidobebe.com/zh-Hant-TW',
  'https://kidobebe.com/ja/', 'https://kidobebe.com/pt_BR', 'https://kidobebe.com/us/en/', 'https://kidobebe.com/ps-af/',
  // B1 (r24): a path made only of a market (region) code is a locale.
  'https://kidobebe.com/us/', 'https://kidobebe.com/us', 'https://www.apple.com/jp/', 'https://kidobebe.com/cn/',
  'https://kidobebe.com/hk/', 'https://kidobebe.com/au/', 'https://kidobebe.com/in/', 'https://kidobebe.com/my/',
  'https://kidobebe.com/my', 'https://kidobebe.com/sg/', 'https://kidobebe.com/hk/en/', 'https://kidobebe.com/en/tv',
];
const PRODUCT_PAGES = [
  'https://kidobebe.com/products/cybex-melio', 'https://kidobebe.com/zh-tw/products/cybex-melio',
  'https://kidobebe.com/home/cybex-melio', 'https://shop.example.com/index.php?route=product/product&product_id=42',
  'https://shop.example.jp/item?id=123', 'https://kidobebe.com/?p=123', 'https://kidobebe.com/?page_id=42',
  'https://kidobebe.com/collections/strollers/products/cybex-melio', 'https://m.kidobebe.com/products/cybex-melio',
  // Q1 (Chief, pending): a category with a slug is still fetched today.
  'https://kidobebe.com/collections/strollers',
  // S4: one-segment paths that are not a locale code.
  'https://kidobebe.com/tv', 'https://kidobebe.com/ps', 'https://kidobebe.com/go', 'https://kidobebe.com/ip-650',
  // B1 (r24): region codes that are also page words are still fetched.
  'https://kidobebe.com/io', 'https://kidobebe.com/ai', 'https://kidobebe.com/me',
];

describe('A2(i) homepage / listing / search URLs never count (r23)', () => {
  it('notProductPageUrl: site roots, locale / index / home paths, neutral params, listing roots, search pages', () => {
    for (const u of NO_PATH) assert.equal(notProductPageUrl(u), true, u);
    for (const u of PRODUCT_PAGES) assert.equal(notProductPageUrl(u), false, u);
    assert.equal(notProductPageUrl(RX('x')), false);
    assert.equal(isGroundingRedirect(RX('x')), true);
    assert.equal(isGroundingRedirect('https://kidobebe.com/grounding-api-redirect/x'), false);
  });

  it('a cited no-path URL is unverified with no fetch, even when the page would confirm', async () => {
    for (const u of NO_PATH) {
      const out = await check([{ url: u, quote: 'Made in China' }]);
      assert.deepEqual([out.verified.length, out.unverified.length, out.fetches, out.fetched.length], [0, 1, 0, 0], u);
    }
  });

  it('guards: product pages (and the pending Q1 category slug) are fetched once and verified', async () => {
    for (const u of PRODUCT_PAGES) {
      const out = await check([{ url: u, quote: 'Made in China' }]);
      assert.deepEqual([out.verified.length, out.fetches], [1, 1], u);
    }
  });

  it('S3: homepage / no-path cites are filtered before the check slots: [home, home, product] checks the product', async () => {
    const P = 'https://kidobebe.com/products/cybex-melio';
    const a = await check([{ url: 'https://kidobebe.com/' }, { url: 'https://babesta.com/en/' }, { url: P }].map((c) => ({ ...c, quote: 'Made in China' })));
    assert.deepEqual(a.fetched, [P]);
    assert.equal(a.verified.length, 1);
    assert.ok(a.verified.length + a.unverified.length <= MAX_CITED_SOURCES);
    const b = await check(['https://kidobebe.com/', P, 'https://babesta.com/products/cybex-melio'].map((url) => ({ url, quote: 'Made in China' })));
    assert.equal(b.fetched.length, 2);
    assert.equal(b.verified.length, 2);
    assert.equal(b.unverified.length, 0);
  });

  it('a cited root that is also a search hit with confirming text → unverified, no fetch', async () => {
    const out = await check([{ url: 'https://kidobebe.com/', quote: 'Made in China' }], undefined, {
      searchUrls: ['https://kidobebe.com/'],
      searchPages: [pg('https://kidobebe.com/', MELIO_OK)],
    });
    assert.deepEqual([out.verified.length, out.unverified.length, out.fetches], [0, 1, 0]);
  });

  it('a deep cited URL that lands on the homepage (plain fetch finalUrl) → unverified, 1 fetch', async () => {
    const out = await check([{ url: 'https://kidobebe.com/products/old-melio', quote: 'Made in China' }], (u) =>
      pg(u, MELIO_OK, 'Cybex Melio', 'https://kidobebe.com/')
    );
    assert.deepEqual([out.verified.length, out.fetches], [0, 1]);
  });

  it('Firecrawl: the landing URL (metadata.url) is returned, so a homepage redirect is unverified', async () => {
    const url = 'https://kidobebe.com/products/old-melio';
    const reply = (landed: string) => () =>
      new Response(
        JSON.stringify({ success: true, data: { markdown: 'Cybex Melio\nMade in China', metadata: { title: 'Kido Bebe', statusCode: 200, sourceURL: url, url: landed } } }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    const fc = citedFetcher('firecrawl', { FIRECRAWL_API_KEY: 'test-key' });
    const run = () =>
      verifyCitedSources({ entity: E, country: 'China', cited: [{ url, quote: 'Made in China' }], searchUrls: [], searchCoo: [], fetchPage: fc });
    routes({ 'https://api.firecrawl.dev/v1/scrape': reply('https://kidobebe.com/') });
    assert.equal((await fc(url))?.finalUrl, 'https://kidobebe.com/');
    const home = await run();
    assert.deepEqual([home.verified.length, home.fetches], [0, 1]);
    mock.restoreAll();
    routes({ 'https://api.firecrawl.dev/v1/scrape': reply(url) });
    assert.equal((await fc(url))?.finalUrl, undefined);
    const deep = await run();
    assert.deepEqual([deep.verified.length, deep.fetches], [1, 1]);
  });

  it('B1: a market-root cite (/us/) with a Melio made-in line → unverified, 0 fetches; 未確認 on the search path', async () => {
    const text = 'Kido Bebe\nNew arrivals\nCybex Melio\nLightweight stroller\nMade in China';
    const out = await check([{ url: 'https://kidobebe.com/us/', quote: 'Made in China' }], (u) => pg(u, text, 'Kido Bebe', u));
    assert.deepEqual([out.verified.length, out.unverified.length, out.fetches], [0, 1, 0]);
    const r = searchRun('https://kidobebe.com/us/', 'Kido Bebe', text);
    assert.equal(r.kept, 0);
    assert.notEqual(r.v.state, 'confirmed');
  });

  it('search-page gate: a homepage hit (url or Gemini landing URL) keeps no claim → 未確認; a product page still counts', () => {
    const home = searchRun('https://kidobebe.com/', 'Kido Bebe', 'New in: Cybex Melio\nMade in China');
    assert.equal(home.kept, 0);
    assert.notEqual(home.v.state, 'confirmed');
    const gem = searchRun(RX('home'), 'Kido Bebe', 'New in: Cybex Melio\nMade in China', 'https://kidobebe.com/');
    assert.equal(gem.kept, 0);
    // Its design wording is still 附加資訊 (never made-in), as before.
    const g = gateClaims(E, [], [{ url: 'https://a.example.com/', title: 'x', text: 'Cybex Melio 嬰兒推車\nEngineered in Germany\nMade in China' }], [
      { country: 'China', quote: 'Made in China', page: 1, sourceType: 'manufacturer' },
    ]);
    assert.deepEqual(g.kept, []);
    assert.deepEqual(g.design.map((d) => d.country), ['Germany']);
    const deep = searchRun('https://kidobebe.com/products/cybex-melio', 'Cybex Melio 嬰兒推車', 'Made in China');
    assert.equal(deep.kept, 1);
    assert.equal(deep.v.state, 'confirmed');
    assert.equal(pct(deep.v), 75);
  });
});

const MT = 'Cybex Melio 嬰兒推車 - momo購物網';
const OTHER_MODEL = [
  'Cybex Callisto vs Clek Foonf\nThe Callisto is designed in Germany and made in China.\nYou may also like: Cybex Melio',
  'Cybex Melio\nCybex Callisto review\nThe Callisto is designed in Germany and made in China.',
  'Menu: Strollers | Cybex Melio | Cybex Balios\nCybex Callisto\nMade in China',
];
const UNDER_MELIO = [
  'Cybex Melio\nThe Melio is lightweight and made in China.',
  'Cybex Melio stroller. Weighing 5.9 kg, it is designed in Germany and made in China.',
  'Cybex Melio\nSpecifications\nWeight: 5.9 kg\nCountry of origin: China\nReviews',
  'Cybex Melio\nMade in China\nRelated: Cybex Callisto',
  'Cybex Melio vs Cybex Callisto\nThe Callisto is made in China.\nThe Melio is made in China too.',
  // Q2 (Ming, pending): a brand-wide line on the exact Melio page counts today.
  'Cybex Melio stroller\nWeight 5.9 kg\nAll Cybex strollers are made in China.',
];

describe('A2(ii) a made-in line counts only under this model (r23)', () => {
  it('quoteInModelScope', () => {
    for (const t of OTHER_MODEL) assert.equal(quoteInModelScope(t, E, 'made in China'), false, t);
    for (const t of UNDER_MELIO) assert.equal(quoteInModelScope(t, E, /origin/.test(t) ? 'Country of origin: China' : 'made in China'), true, t);
    // No model name above the line, or the quote is not on the page: no change.
    assert.equal(quoteInModelScope('Made in China\nCybex Melio', E, 'Made in China'), true);
    assert.equal(quoteInModelScope('Cybex Callisto\nMade in China', E, '產地：中國'), true);
    // Country, company and edition words after the brand are not other models.
    assert.equal(quoteInModelScope('Cybex Melio\nCybex Germany GmbH\nCybex Platinum\nMade in China', E, 'Made in China'), true);
    // Field labels after the brand are not other models ("Designed by CYBEX COO: CN").
    for (const l of ['COO: CN', 'Origin: CN', 'Country of Origin: CN', 'Made in China'])
      assert.equal(quoteInModelScope(`CYBEX Melio\nDesigned by CYBEX ${l}`, E, l), true, l);
  });

  it('S1: running-text mentions, related / compatible / accessory lists and common nouns are not headings', () => {
    const filler = (n: number) => Array.from({ length: n }, (_, i) => `Customer review ${i}: great stroller, 5 stars.`).join('\n');
    const ok = [
      'Cybex Melio Stroller\nCompatible car seats: Cybex Aton B2, Cybex Cloud T\nSpecifications\nMade in China',
      'Cybex Melio Stroller\n$399\nYou may also like\nCybex Libelle\nCybex Eezy S Twist+ 2\nCybex Cloud T\nSpecifications\nWeight 5.9kg\nMade in China',
      `Cybex Melio Stroller\n${filler(10)}\nReview: I upgraded from the Cybex Balios S and this is lighter.\n${filler(10)}\nSpecifications\nMade in China`,
      'Cybex Melio Stroller\nIncludes: Melio Cot (sold separately)\nSpecifications\nMade in China',
      'Cybex Melio Stroller\nMelio Raincover sold separately\nSpecifications\nMade in China',
      'Cybex Melio\nCompatible with Cybex Cloud T car seat\nSoft as a cloud.\nSpecifications\nMade in China',
      'Cybex Melio Stroller\nBrands \n Cybex \n SilverCross \n Stokke\nSpecifications\nMade in China',
      'Cybex Melio\nPairs well with the Cybex Lemo chair\nSpecifications\nMade in China',
      `Cybex Melio Stroller – Kido Bebe\n${filler(35)}\nSpecifications\nMade in China`,
      'CYBEX MELIO\nMade in China', 'Cybex Melio® Stroller\nMade in China', 'Cybex Melio 2024\nMade in China',
      '賽比克斯 Cybex Melio 嬰兒推車\nMade in China', 'ＣＹＢＥＸ　ＭＥＬＩＯ\nMade in China',
      'Cybex Melio\nAccessories: Melio Travel Bag\nMade in China',
    ];
    for (const t of ok) assert.equal(quoteInModelScope(t, E, 'Made in China'), true, t);
    const no = [
      '# Cybex Melio\nLight stroller\n## Cybex Callisto\nMade in China',
      'Cybex Melio\n===========\nLight stroller\nCybex Callisto\n--------------\nMade in China',
      '**Cybex Melio**\nLight stroller\n**Cybex Callisto**\nMade in China',
      'Cybex Melio\nCybex Callisto\nThe Callisto is made in China.',
      // A list line between another model's heading and the claim is skipped, not a reset.
      '## Cybex Callisto\nCompatible car seats: Cybex Aton B2\nMade in China\nYou may also like: Cybex Melio',
    ];
    for (const t of no) assert.equal(quoteInModelScope(t, E, 'Made in China'), false, t);
  });

  it('r24 B2: a made-in line inside a related / compatible / you-may-also-like list never backs this model', () => {
    for (const t of [
      'Cybex Melio\nWeight 5.9 kg\nYou may also like\nCybex Callisto\nMade in China\n$299',
      'Cybex Melio\nCompatible car seats:\nCybex Cloud T\n## Cybex Callisto\nMade in China',
      'Cybex Melio\nRelated products\nCybex Callisto Stroller\nMade in China',
    ])
      assert.equal(quoteInModelScope(t, E, 'Made in China'), false, t);
    // A section heading ends the list: the Melio specs count again; a one-line list covers only its line.
    assert.equal(quoteInModelScope('Cybex Melio\nAccessories: Melio Travel Bag\nMade in China', E, 'Made in China'), true);
    assert.equal(quoteInModelScope('Cybex Melio\nRelated products\nCybex Callisto\nSpecifications\nMade in China', E, 'Made in China'), true);
  });

  it('r24 B3 / S8 / S9: short-label, non-Latin, ®/™/** and "X by Brand" headings; running text stays verified', () => {
    const no = [
      '賽比克斯 Cybex Melio 嬰兒推車\n輕便\n賽比克斯 Cybex Callisto 嬰兒推車\n產地：中國',
      // "賽比克斯 Callisto" counts when the page names Cybex Callisto (bare names never branded are D4).
      'Cybex Melio\nAlso see Cybex Callisto in store, 2 colours.\n輕便推車\n賽比克斯 Callisto\nMade in China',
      ...['德國 Cybex Callisto', 'The Cybex Callisto', 'New! Cybex Callisto', 'Model: Cybex Callisto',
        'Cybex® Callisto', '**Cybex** **Callisto**', 'Callisto by Cybex', '<h2>Cybex Callisto</h2>', '<strong>Cybex Callisto</strong>']
        .map((h) => `Cybex Melio\nLight stroller\n${h}\nMade in China`),
      // S8: a lowercase other-model name in the "the <word> is made in" position.
      'Cybex Melio\nCybex Callisto\nthe callisto is made in China.',
    ];
    for (const t of no) {
      const q = /產地/.test(t) ? '產地：中國' : 'made in China';
      assert.equal(quoteInModelScope(t, E, q), false, t);
    }
    for (const t of [
      'Cybex Melio\nPairs well with the Cybex Lemo chair\nSpecifications\nMade in China',
      'Cybex Melio\nReview: I upgraded from the Cybex Balios S and this is lighter.\nSpecifications\nMade in China',
      'Cybex Melio\nThe Cybex Callisto folds flat for travel.\nSpecifications\nMade in China',
      'Cybex Melio\nDistributed by Cybex Germany\nMade in China',
      'Cybex Melio\nthe stroller is made in China.',
    ])
      assert.equal(quoteInModelScope(t, E, /stroller is/.test(t) ? 'made in China' : 'Made in China'), true, t);
  });

  it('r25 structural rule: any other model named in the claim line or its block → out of scope', () => {
    const no: Array<[string, string?]> = [
      // B4: title suffixes, colours, price, long lead-ins
      ['賽比克斯 Cybex Melio 嬰兒推車\n輕便\n賽比克斯 Cybex Callisto 嬰兒推車｜momo購物網\n產地：中國', '產地：中國'],
      ['賽比克斯 Cybex Melio 嬰兒推車\n輕便\n賽比克斯 Cybex Callisto 嬰兒推車 | PChome 24h購物\n規格\n產地：中國', '產地：中國'],
      ['賽比克斯 Cybex Melio 嬰兒推車\n輕便\n賽比克斯 Cybex Callisto 嬰兒推車 黑色、灰色\n產地：中國', '產地：中國'],
      ['Cybex Melio\nLight stroller\n$299 Cybex Callisto, 5.9 kg\nMade in China'],
      ['Cybex Melio\nLight stroller\nMeet the all-new Cybex Callisto\nMade in China'],
      ['Cybex Melio\nLight stroller\nIntroducing the new Cybex Callisto\nSpecifications\nMade in China'],
      ['Cybex Melio\nLight stroller\nOur pick: the Cybex Callisto\nMade in China'],
      // B5 / B6: the brand's local name learned from the page
      ['Cybex 賽比克斯 Melio 嬰兒推車\n輕便\nCybex 賽比克斯 Callisto 嬰兒推車\n產地：中國', '產地：中國'],
      ['賽比克斯(Cybex) Melio 嬰兒推車\n輕便\n賽比克斯（Cybex）Callisto 嬰兒推車\n產地：中國', '產地：中國'],
      ['Cybex Melio\n輕便\nCybex/賽比克斯 Callisto 嬰兒推車\n產地：中國', '產地：中國'],
      ['賽比克斯 Cybex Melio 嬰兒推車\n輕便\n賽比克斯 Callisto 嬰兒推車\n產地：中國', '產地：中國'],
      ['賽比克斯 Cybex Melio 嬰兒推車\n輕便\n賽比克斯Callisto：中國製造', '中國製造'],
      // B7: lists of other products cover the lines below
      ['Cybex Melio\nLight\nYou may also like: Cybex Callisto\nMade in China'],
      ['賽比克斯 Cybex Melio 嬰兒推車\n輕便\n熱銷推薦\n賽比克斯 Cybex Callisto 嬰兒推車｜黑色\n產地：中國', '產地：中國'],
      ['Cybex Melio\nLight\nPeople also bought\n$299 Cybex Callisto, 5.9 kg\nMade in China'],
      // B8: "<Word> by <brand>" anywhere on a line
      ['Cybex Melio\nLight.\nThe Callisto by Cybex is made in China.'],
      ['Cybex Melio\nLight.\nAlso consider the Callisto by Cybex\nMade in China'],
      // S8: lower-case subject forms (page names Cybex Callisto)
      ['Cybex Melio\nShop: Cybex Callisto, Cybex Libelle\nLight.\nthe callisto stroller is made in china', 'made in china'],
      ['Cybex Melio\nShop: Cybex Callisto, Cybex Libelle\nLight.\nour callisto is made in china', 'made in china'],
      // S9: raw tags
      ['Cybex Melio\nLight\n<p><strong>Cybex Callisto</strong></p>\nMade in China'],
      ['Cybex Melio\nLight\n<li>Cybex Callisto</li>\nMade in China'],
      // Ruling: a list of other products runs until a section or a real heading (a blank / spec line does not end it).
      ['Cybex Melio\nLight\nYou may also like: Cybex Callisto\n\nMade in China'],
      ['Cybex Melio\nLight\nRelated products\nCybex Callisto\nWeight 6.0 kg\nMade in China'],
      // S11 over-caution (accepted by ruling)
      ['Cybex Melio\nYou may also like\nCybex Libelle\nCybex Eezy S\n\nWeight 5.9 kg\nMade in China'],
      // r26 B10: the learned local brand name + a CJK-only other model name
      ['賽比克斯 Cybex Melio 嬰兒推車\n輕便\n賽比克斯 卡利斯托 嬰兒推車\n產地：中國', '產地：中國'],
      ['賽比克斯 Cybex Melio 嬰兒推車\n輕便\n賽比克斯卡利斯托｜產地：中國', '產地：中國'],
      // r26 S14: lower-case / full-width headings
      ['Cybex Melio\nLight stroller\ncybex callisto\nMade in China'],
      ['Cybex Melio\nLight stroller\nｃｙｂｅｘ　ｃａｌｌｉｓｔｏ\nMade in China'],
      // S10 (accepted over-caution): running text naming another model in the block
      ['Cybex Melio\nPairs well with the Cybex Lemo chair\nMade in China'],
    ];
    for (const [t, q] of no) assert.equal(quoteInModelScope(t, E, q ?? 'Made in China'), false, t);
    const ok: Array<[string, string?]> = [
      // brand / company / line / region / official words are not models
      // (r30 store ruling: the unpaired 賽比克斯官方旗艦店 line moved to the paired form below)
      ['Cybex Melio\nSold by CYBEX Germany\nCybex GmbH, Bayreuth\nCybex Gold line, Cybex Platinum collection\nMade in China'],
      ['賽比克斯 Cybex Melio 嬰兒推車\nSold by CYBEX Germany\nCybex GmbH, Bayreuth\nCybex Gold line, Cybex Platinum collection\n賽比克斯官方旗艦店\nMade in China'],
      ['賽比克斯 Cybex Melio 嬰兒推車\n賽比克斯官方\n產地：中國', '產地：中國'],
      ['Cybex Melio\nDesigned by Cybex\nManufactured by Cybex GmbH\nMade in China'],
      ['Cybex Melio\nStrollers by Cybex\nCot by Cybex\nMade in China'],
      // r26 B10 guard: generic CJK words after the local brand name
      ['賽比克斯 Cybex Melio 嬰兒推車\n賽比克斯 嬰兒推車\n賽比克斯官方旗艦店\n賽比克斯 輕便嬰兒推車\n產地：中國', '產地：中國'],
      // r26 S12: site / topic words after the brand are not models; S14 guard: lower-case running text
      ['Cybex Melio\nCybex Car Seats\nRead the Cybex Car Seat guide.\nCybex Warranty\nCybex Registration\nCybex Parents love it\nCybex Design\nCybex Newsletter\nCybex Blog\nSpecifications\nMade in China'],
      // r32 (Chief): Bayreuth moved to the place list; "Cybex Bayreuth" is not a place position, so that line is now over-caution (rows A2ii-g35b).
      ['Cybex Melio\ncybex has great strollers\nSpecifications\nMade in China'],
      // family names of this model (Q3, FAMILY_NAMES_ARE_OURS)
      ['Cybex Melio\nAlso in Cybex Melio Carbon and Cybex Melio Street\nMade in China'],
      // S11: this product's own lists end at a blank line, a spec line or a section; inline own lists are line scoped
      ['Cybex Melio\nAccessories:\n- Melio Footmuff\n- Rain cover\nWeight 5.9 kg\nMade in China'],
      ['Cybex Melio\nIn the box\nMelio stroller\nRain cover\nWeight 5.9 kg\nMade in China'],
      ['Cybex Melio\nYou may also like\nCybex Callisto\n## Reviews\nGreat.\nMade in China'],
      // a section between another model's mention and the claim starts a new block
      ['Cybex Melio\nPairs well with the Cybex Lemo chair\nSpecifications\nMade in China'],
      ['Cybex Melio\nCompatible with Cybex Cloud T\nSpecifications\nthe cloud cover is made in china', 'made in china'],
    ];
    for (const [t, q] of ok) assert.equal(quoteInModelScope(t, E, q ?? 'Made in China'), true, t);
  });

  it('r27 R1 / R2 / R3 / O1–O3: words after the brand, CJK titles, emoji / period headings, own CJK name', () => {
    const M = 'Cybex Melio';
    const TW = '賽比克斯 Cybex Melio 嬰兒推車\n輕便';
    const no: Array<[string, string]> = [
      ['Cybex Melio\nLight\nCybex Car Seat Sirona Z\nMade in China', 'Made in China'],
      ['Cybex Melio\nLight\nCybex Gift Set Callisto\nMade in China', 'Made in China'],
      ['Cybex Melio\nLight\nCybex Love Callisto\nMade in China', 'Made in China'],
      ['Cybex Melio\nLight\nCybex Platinum Priam\nMade in China', 'Made in China'],
      ['Cybex Melio\nLight\nCybex Gold Callisto\nMade in China', 'Made in China'],
      ['Cybex Melio\nLight\nCybex Kids Callisto\nMade in China', 'Made in China'],
      ['Cybex Melio\nLight\nCybex Seats: Sirona Z\nMade in China', 'Made in China'],
      ['Cybex Melio\nLight\nCybex Sale Callisto -20%\nMade in China', 'Made in China'],
      [`${TW}\n賽比克斯・卡利斯托 嬰兒推車\n產地：中國`, '產地：中國'],
      [`${TW}\n賽比克斯 輕便推車 卡利斯托\n產地：中國`, '產地：中國'],
      [`${TW}\nCybex 卡利斯托 嬰兒推車\n產地：中國`, '產地：中國'],
      [`${TW}\n卡利斯托 嬰兒推車\n產地：中國`, '產地：中國'],
      ['Cybex Melio 嬰兒推車\n賽比克斯 卡利斯托 嬰兒推車\n產地：中國', '產地：中國'],
      ['Cybex Melio\nLight\n🔥 cybex callisto\nMade in China', 'Made in China'],
      ['Cybex Melio\nLight\ncybex callisto.\nMade in China', 'Made in China'],
      // r28: 美利歐 is not a sourced Melio name (removed); an own / generic CJK word does not stop reading the line.
      [`${TW}\n賽比克斯 美利歐 嬰兒推車\n產地：中國`, '產地：中國'],
      [`${TW}\n賽比克斯 美利歐 Callisto 嬰兒推車\n產地：中國`, '產地：中國'],
      [`${TW}\n賽比克斯 輕量 Callisto 嬰兒推車\n產地：中國`, '產地：中國'],
      ['サイベックス Cybex Melio ベビーカー\n軽量\nサイベックス メリオ Callisto ベビーカー\n原産国：中国', '原産国：中国'],
    ];
    for (const [t, q] of no) assert.equal(quoteInModelScope(t, M, q), false, t);
    const ok: Array<[string, string]> = [
      ['Cybex Melio\nLight\nCybex Car Seats\nMade in China', 'Made in China'],
      ['Cybex Melio\nLight\nCybex Gold\nMade in China', 'Made in China'],
      ['Cybex Melio\nLight\nCybex Platinum Melio\nMade in China', 'Made in China'],
      ['Cybex Melio\nLight\nCybex Gold Melio Carbon\nMade in China', 'Made in China'],
      [`${TW}\n賽比克斯 德國品牌\n賽比克斯 年度熱銷\n產地：中國`, '產地：中國'],
      ['Cybex Melio\nLight\nYou may also like\nCybex Callisto\n\nCybex Melio\nMade in China', 'Made in China'],
    ];
    for (const [t, q] of ok) assert.equal(quoteInModelScope(t, M, q), true, t);
  });

  it('Chief ruling: a list under a markdown heading closes only at a heading of the same or higher level', () => {
    const M = 'Cybex Melio';
    assert.equal(LIST_ENDS_AT_ANY_SECTION, false);
    // Nested sub-heading / bold section under "## You may also like" stays in the list.
    assert.equal(quoteInModelScope('Cybex Melio\nLight\n## You may also like\nCybex Callisto\n### Details\nMade in China', M, 'Made in China'), false);
    assert.equal(quoteInModelScope('Cybex Melio\nLight\n## You may also like\nCybex Callisto\n**Specifications**\nMade in China', M, 'Made in China'), false);
    // Same or higher level closes it; a non-heading label still closes at any section.
    assert.equal(quoteInModelScope('Cybex Melio\nYou may also like\nCybex Callisto\n\n## Specifications\nMade in China', M, 'Made in China'), true);
    assert.equal(quoteInModelScope('Cybex Melio\nLight\n## You may also like\nCybex Callisto\n## Specifications\nMade in China', M, 'Made in China'), true);
    assert.equal(quoteInModelScope('Cybex Melio\nYou may also like\nCybex Callisto\n規格\n產地：中國', M, '產地：中國'), true);
    // メリオ (sourced, cybex-japan / DADWAY) is this model.
    assert.equal(quoteInModelScope('サイベックス Cybex Melio ベビーカー\n軽量\nサイベックス メリオ ベビーカー\n原産国：中国', M, '原産国：中国'), true);
  });

  it('Chief allowlist (r29): menus are checked, text after the quote is checked, origin phrases and field labels go through the allowlist', () => {
    const M = 'Cybex Melio';
    const Q = '產地：中國';
    const MC = 'Made in China';
    const no: Array<[string, string]> = [
      // M1: a menu below this model's mention is never skipped
      ['Cybex Melio\nLight\nCallisto\nPriam\nBalios S\nMios\nCoya\nLibelle\nSpecifications\nMade in China', MC],
      ['Cybex Melio\nLight\nHome\nShop\nStrollers\nCallisto\nCar Seats\nSale\nSpecifications\nMade in China', MC],
      ['Cybex Melio\n首頁\n推車\n卡利斯托\n汽座\n配件\n特價\n規格\n產地：中國', Q],
      ['Cybex Melio\n卡利斯托 提籃\n普里姆 推車\n巴利歐斯 汽座\n米歐斯 推車\n柯雅 推車\n莉貝兒 推車\n規格\n產地：中國', Q],
      // M2: text after the quote on the claim line
      ['Cybex Melio\nLight\nMade in China (Callisto)', MC],
      ['Cybex Melio\nLight\nMade in China for Cybex e-Priam', MC],
      ['Cybex Melio\nLight\n產地：中國 卡利斯托專用', Q],
      ['賽比克斯 Cybex Melio 嬰兒推車\n輕便\n產地：中國 卡利斯托', Q],
      // M3: X設計 / X製 / X產地 with X not a place; name-label values; spec labels and values
      ['Cybex Melio\nLight\n卡利斯托產地：中國\nMade in China', MC],
      ['Cybex Melio\nLight\n卡利斯托產地：中國', '卡利斯托產地：中國'],
      ['Cybex Melio\n卡利斯托設計\n產地：中國', Q],
      ['Cybex Melio\n卡利斯托製\n產地：中國', Q],
      ['Cybex Melio\n系列：卡利斯托 產地：中國', Q],
      ['Cybex Melio\n適用：卡利斯托 產地：中國', Q],
      ['Cybex Melio\nLight\nSeries: Callisto; Made in China', MC],
      ['Cybex Melio\nLight\nLine: Callisto, Made in China', MC],
      ['Cybex Melio\nDesigned by Callisto Studio\nMade in China', MC],
      ['Cybex Melio\n重量：卡利斯托 5.9kg\n產地：中國', Q],
      ['Cybex Melio\n尺寸（卡利斯托）：L820\n產地：中國', Q],
      ['Cybex Melio\nWeight (Callisto): 5.9kg\nMade in China', MC],
      ['Cybex Melio\n適用年齢：Priam 用\n產地：中國', Q],
      ['Cybex Melio\n普里姆 5.9kg\n產地：中國', Q],
      // a colour-only word in the name slot right after the brand
      ['賽比克斯 Cybex Melio 嬰兒推車\n賽比克斯 黑金 嬰兒推車\n產地：中國', Q],
      ['賽比克斯 Cybex Melio 嬰兒推車\n可搭配 Cybex Aton 提籃使用\n產地：中國', Q],
      // names next to the place / qualifier vocabulary (r34)
      ['Cybex Melio\nMade in China, Callisto, CA', MC],
      ['Cybex Melio\nMade in China / Callisto', MC],
      ['Cybex Melio\nCallisto, made in China', MC],
      ['Cybex Melio\n卡利斯托，產地：中國', Q],
      ['Cybex Melio\nMADE IN CHINA FOR CALLISTO', 'MADE IN CHINA'],
      ['Cybex Melio\nMADE IN CHINA NOT A TOY (CALLISTO)', 'MADE IN CHINA'],
      ['Cybex Melio\nSold by Callisto Baby Store\nMade in China', MC],
      ['Cybex Melio\n產地：中國（卡利斯托）', Q],
      // r30 Chief rulings: designer phrase, store names, place suffixes
      ['Cybex Melio\nDesigned by Callisto in Germany\nMade in China', MC],
      ['Cybex Melio\nMade in China. Designed by Callisto in Germany', MC],
      ['賽比克斯 Cybex Melio 嬰兒推車\n由卡利斯托於德國設計\n產地：中國', Q],
      ['賽比克斯 Cybex Melio 嬰兒推車\n卡利斯托德國 嬰兒推車\n產地：中國', Q],
      ['Cybex Melio\nSold by Callisto Official Store\nMade in China', MC],
      ['賽比克斯 Cybex Melio 嬰兒推車\n卡利斯托官方旗艦店\n產地：中國', Q],
      ['Cybex Melio\nCallisto Official Store\nMade in China', MC],
      ['Cybex Melio\nCallisto Store\nMade in China', MC],
      ['賽比克斯 Cybex Melio 嬰兒推車\n卡利斯托專賣店\n產地：中國', Q],
      ['Cybex Melio\nSold by CYBEX Germany\n賽比克斯官方旗艦店\nMade in China', MC],
      ['賽比克斯 Cybex Melio 嬰兒推車\n產地：中國 卡利斯托州', Q],
      ['賽比克斯 Cybex Melio 嬰兒推車\n產地：中國 卡利斯托市', Q],
      ['Cybex Melio\nMade in China, Priam City', MC],
      ['Cybex Melio\nMade in China, Callisto Province', MC],
      ['Cybex Melio\nDesigned by Priam Team in Germany\nMade in China', MC],
      ['Cybex Melio\nEngineered by Callisto in Germany\nMade in China', MC],
      ['Cybex Melio\nPriam Store\nMade in China', MC],
      ['Cybex Melio\nCallisto Shop\nMade in China', MC],
      ['賽比克斯 Cybex Melio 嬰兒推車\n產地：中國 卡利斯托省', Q],
      ['賽比克斯 Cybex Melio 嬰兒推車\n產地：中國 普里姆市', Q],
      ['賽比克斯 Cybex Melio 嬰兒推車\n產地：中國 卡利斯托縣', Q],
      ['賽比克斯 Cybex Melio 嬰兒推車\n尺寸：S2 820\n產地：中國', Q],
      ['Cybex Melio\nDimensions: Callisto2 820\nMade in China', MC],
      ['賽比克斯 Cybex Melio 嬰兒推車\n尺寸：A3947\n產地：中國', Q],
      ['Cybex Melio\nRE-AX-02A\nMade in China', MC],
      ['Cybex Melio\nC246D\nMade in China', MC],
      ['Cybex Melio\nShenzhen\nMade in China', MC],
      ['Cybex Melio\nCot S\nMade in China', MC],
      ['Cybex Melio\nCybex Cot S\nMade in China', MC],
      ['Cybex Melio\nCot S by Cybex\nMade in China', MC],
      ['Cybex Melio\nCybex Stroller X\nMade in China', MC],
      ['Cybex Melio\nBayreuth\nMade in China', MC],
      ['Cybex Melio\nMade in China, in Callisto', MC],
      ['Cybex Melio\nMade in China, in Priam', MC],
      ['Cybex Melio\nMade in China in Callisto', MC],
      ['Cybex Melio\nAssembled in Callisto\nMade in China', MC],
      ['賽比克斯 Cybex Melio 嬰兒推車\n產地：中國 於卡利斯托', Q],
      ['Cybex Melio\nMade in China, Target', MC],
      ['Cybex Melio\nTarget Store\nMade in China', MC],
      ['Cybex Melio\nIKEA\nMade in China', MC],
      ['賽比克斯 Cybex Melio 嬰兒推車\n蝦皮\n產地：中國', Q],
    ];
    for (const [t, q] of no) assert.equal(quoteInModelScope(t, M, q), false, t);
    // r32 B1: a listed place on its own line is checked like any other word (a model named after a place).
    assert.equal(quoteInModelScope('Hyundai Kona\nTucson\nMade in South Korea', 'Hyundai Kona', 'Made in South Korea'), false);
    assert.equal(quoteInModelScope('Chevrolet Silverado\nColorado\nMade in USA', 'Chevrolet Silverado', 'Made in USA'), false);
    assert.equal(quoteInModelScope('Hyundai Kona\nMade in South Korea, in Seoul', 'Hyundai Kona', 'Made in South Korea'), false);
    const ok: Array<[string, string]> = [
      // a menu that ends above this model's mention or heading
      ['Cybex Callisto\nCybex Priam\nCybex Balios S\nCybex Mios\nCybex Coya\nCybex Libelle\nCybex Melio\nSpecifications\nMade in China', MC],
      ['Cybex Melio\nCybex Callisto\nCybex Priam\nCybex Balios S\nCybex Mios\nCybex Coya\nCybex Libelle\n## Cybex Melio\nMade in China', MC],
      // safe tails
      ['Cybex Melio\n輕便\n產地：中國製造', Q],
      ['Cybex Melio\nLight\nMade in China – Cybex Melio', MC],
      ['Cybex Melio\nLight\nMade in China, 5.9 kg, Moon Black', MC],
      ['Cybex Melio\n輕便\n產地：中國 重量：5.9 kg', Q],
      // spec labels, colours, preorder brackets, the queried model's own momo title, section labels
      ['【Cybex】Melio 2026 碳纖維超輕量全功能推車\n商品規格\n重量：5.9kg\n產地：中國', Q],
      ['Cybex Melio\n【奶茶米、巧克力-預購10月初】【沙丘灰-預購10月中】\n### 商品重量：5.9kg（不含新生兒背墊／肩護套）\n### 展開尺寸：L820–910 × W490 × H965–1070 mm\n### BSMI 認證碼：(N)C1 4208026\n### 產地：中國', '產地：中國'],
      ['Cybex Melio\n焦糖黃墨石黑奶茶米巧克力布朗尼沙丘灰\n產地：中國', Q],
      ['サイベックス Cybex Melio\n参考年齢 生後1ヵ月〜3歳頃まで\n世界的に安全性を高く評価されているサイベックスのチャイルドシート。\n【製品重量】 5.9kg（付属品除く）\n原産国：中国', '原産国：中国'],
      ['Cybex Melio Kinderwagen\nProduktdetails\nMade in Vietnam', 'Made in Vietnam'],
      ['Cybex Melio\n設計：人體工學 產地：中國', Q],
      // places, qualifiers and notes after the country; label fields above (r34)
      ['Cybex Melio\n產地：中國（廣東）', Q],
      ['Cybex Melio\n產地：中國 寄出地：香港', Q],
      ['Cybex Melio\nMade in China / Fabriqué en Chine / Hecho en China', MC],
      ['Cybex Melio\nMade in USA, Atlanta, GA', 'Made in USA'],
      ['Cybex Melio\nMade in Korea (South)', 'Made in Korea'],
      ['Cybex Melio\n品牌所在地：德國\n產地：中國', Q],
      ['Cybex Melio\nCannot be returned. Made in China', MC],
      ['Cybex Melio\nMADE IN CHINA NOT A TOY', 'MADE IN CHINA'],
      // r30: the queried brand as designer, the brand's / a listed retailer's store, listed places with a suffix
      ['Cybex Melio\n產地：美國，喬治亞州', '產地：美國'],
      ['Cybex Melio\nMade in China, 德州', MC],
      ['Cybex Melio\nDesigned by Cybex in Germany\nMade in China', MC],
      ['賽比克斯 Cybex Melio 嬰兒推車\n由賽比克斯於德國設計\n產地：中國', Q],
      ['Cybex Melio\nCybex Official Store\nMade in China', MC],
      ['Cybex Melio\nSold by Kido Bebe Official Store\nMade in China', MC],
      ['賽比克斯 Cybex Melio 嬰兒推車\n安琪兒官方旗艦店\n產地：中國', Q],
      ['賽比克斯 Cybex Melio 嬰兒推車\n產地：中國 江蘇省蘇州市', Q],
      ['Cybex Melio\nMade in China, Guangdong Province', MC],
      ['Cybex Melio\nMade in USA, New York State', 'Made in USA'],
      ['Cybex Melio\nDesigned by Cybex GmbH in Germany\nMade in China', MC],
      ['賽比克斯 Cybex Melio 嬰兒推車\n賽比克斯德國設計\n產地：中國', Q],
      ['Cybex Melio\nKido Bebe Official Store\nMade in China', MC],
      ['Cybex Melio\nJohn Lewis\nMade in China', MC],
      ['Cybex Melio\nMade in China, in Guangdong', MC],
      ['Cybex Melio\nMade in China, in Shenzhen', MC],
      ['Cybex Melio\nSold by Amazon\nMade in China', MC],
      ['Cybex Melio\nMade in China / Fabriqué en Chine / Hecho en China', MC],
      ['賽比克斯 Cybex Melio 嬰兒推車\nmomo購物網\n產地：中國', Q],
      ['賽比克斯 Cybex Melio 嬰兒推車\nPChome 24h購物\n產地：中國', Q],
      ['賽比克斯 Cybex Melio 嬰兒推車\n麗兒采家 官方旗艦店\n產地：中國', Q],
      ['賽比克斯 Cybex Melio 嬰兒推車\n產地：中國 江門市', Q],
      ['賽比克斯 Cybex Melio 嬰兒推車\n產地：中國 昆山市', Q],
      ['賽比克斯 Cybex Melio 嬰兒推車\n產地：中國 浙江省寧波市', Q],
      ['賽比克斯 Cybex Melio 嬰兒推車\n尺寸：L820 x W480\n產地：中國', Q],
    ];
    for (const [t, q] of ok) assert.equal(quoteInModelScope(t, M, q), true, t);
    // r30: an Apple query keeps "Designed by Apple in California" (the queried brand is the designer).
    assert.equal(quoteInModelScope('Apple iPhone 15\nDesigned by Apple in California. Assembled in China', 'Apple iPhone 15', 'Assembled in China'), true);
    assert.equal(quoteInModelScope('Apple iPhone 15\nDesigned by Callisto in California. Assembled in China', 'Apple iPhone 15', 'Assembled in China'), false);
  });

  it('structural place, brand-line and sentence rules: bypasses unverified, grammar still verifies', () => {
    const M = 'Cybex Melio';
    const MC = 'Made in China';
    // B1: a place off the claim line is dropped only as a whole place phrase or a company address.
    for (const t of [
      'Hyundai Kona\n(Tucson)\nMade in South Korea',
      'Hyundai Kona\n, Tucson\nMade in South Korea',
      'Hyundai Kona\nCompare: Kona, Tucson\nMade in South Korea',
      'Hyundai Kona\nAlso from Tucson\nMade in South Korea',
      'Hyundai Kona\nAvailable in Tucson\nMade in South Korea',
      'Chevrolet Silverado\n(Colorado)\nMade in USA',
    ])
      assert.equal(quoteInModelScope(t, t.startsWith('Hyundai') ? 'Hyundai Kona' : 'Chevrolet Silverado', t.includes('Korea') ? 'Made in South Korea' : 'Made in USA'), false, t);
    // A listed place next to the brand on the page is not a place on the claim line.
    assert.equal(
      quoteInModelScope('Hyundai Kona\nHyundai Tucson\nMade in South Korea (Tucson)', 'Hyundai Kona', 'Made in South Korea'),
      false
    );
    assert.equal(
      quoteInModelScope('Chevrolet Silverado\nChevrolet Colorado\nMade in USA (Colorado)', 'Chevrolet Silverado', 'Made in USA'),
      false
    );
    // B2: case, joining and a full second word. No per-product string list.
    for (const t of [
      'Cybex Melio\nCompatible with the Cybex Cot S.\nMade in China',
      'Cybex Melio\ncybex cot s\nMade in China',
      'Cybex Melio\nCYBEX COT S\nMade in China',
      'Cybex Melio\nCotS\nMade in China',
      'Cybex Melio\nCot-S\nMade in China',
      'Cybex Melio\nCybex Cot\nMade in China',
      'Cybex Melio\nCybex Carry Cot\nMade in China',
      'Cybex Melio\nCybex Lite Cot\nMade in China',
      'Cybex Melio\nCybex Platinum Lux Carry Cot\nMade in China',
      'Cybex Melio\nPlatinum Lux Carry Cot\nMade in China',
      'Cybex Melio\nType: Cot S\nMade in China',
    ])
      assert.equal(quoteInModelScope(t, M, MC), false, t);
    // B3: a heading or a title-case line does not skip its first word.
    for (const t of [
      'Cybex Melio\nCallisto Stroller Moon Black\nMade in China',
      'Cybex Melio\nCallisto Lightweight Travel Stroller\nMade in China',
      'Cybex Melio\nPriam Lux Carry Cot\nMade in China',
      'Cybex Melio\nPriam Frame and Seat\nMade in China',
      'Cybex Melio\n## Callisto Lux Carry Cot\nMade in China',
    ])
      assert.equal(quoteInModelScope(t, M, MC), false, t);
    // Kulmbach is a place, same as Bayreuth: a bare line or the brand beside it does not verify.
    assert.equal(quoteInModelScope('Cybex Melio\nKulmbach\nMade in China', M, MC), false);
    assert.equal(quoteInModelScope('Cybex Melio\nCybex Kulmbach\nMade in China', M, MC), false);
    // Still a place phrase, a company line, a spec label, or prose.
    for (const t of [
      'Cybex Melio\nin Shenzhen\nMade in China',
      'Cybex Melio\nin Guangdong, in Shenzhen and in Ningbo, Zhejiang\nMade in China',
      'Cybex Melio\n於深圳\nMade in China',
      'Cybex Melio\nMade in China, in Shenzhen',
      'Cybex Melio\nMade in China, in Kulmbach',
      'Cybex Melio\nDesigned in Kulmbach, Germany\nMade in China',
      'Cybex Melio\nFounded in 1947 in Kulmbach, Germany, made in China',
      'Cybex Melio\nCybex GmbH\nMade in China',
      'Cybex Melio\nCybex GmbH, Bayreuth\nMade in China',
      'Cybex Melio\nDesigned by Cybex\nMade in China',
      'Cybex Melio\nCybex Official Store\nMade in China',
      'Cybex Melio\nCYBEX官方旗舰店\nMade in China',
      '賽比克斯 Cybex Melio 嬰兒推車\n賽比克斯官方旗艦店 Cybex\n產地：中國',
      'Cybex Melio\nStrollers by Cybex\nCot by Cybex\nMade in China',
      'Cybex Melio\nLightweight cot\nMade in China',
      'Cybex Melio\nCot mattress included\nMade in China',
      'Cybex Melio\nSize: S\nMade in China',
      'Cybex Melio\nAge 6M+\nMade in China',
      'Cybex Melio\nMade in USA, 加州',
      'Cybex Melio\n產地：美國 加州',
      'Cybex Melio\nMade in USA, Atlanta, GA',
      'Cybex Melio\n產地：中國（廣東省深圳市）',
      'Cybex Melio stroller. Weighing 5.9 kg, it is designed in Germany and made in China.',
    ]) {
      const q = /產地：美國/.test(t) ? '產地：美國' : /產地：中國/.test(t) ? '產地：中國' : /Made in USA/.test(t) ? 'Made in USA' : /made in China/.test(t) ? 'made in China' : MC;
      assert.equal(quoteInModelScope(t, M, q), true, t);
    }
    // The claim-line place stays a place when the page never writes it next to the brand.
    assert.equal(quoteInModelScope('Hyundai Kona\nMade in South Korea (Tucson)', 'Hyundai Kona', 'Made in South Korea'), true);
  });

  it('Chief allowlist (r28): every name-like token between the model and the claim must be known-safe', () => {
    const M = 'Cybex Melio';
    const TW = '賽比克斯 Cybex Melio 嬰兒推車\n輕便';
    const Q = '產地：中國';
    const no: string[] = [
      'Cybex Melio\n卡利斯托 嬰兒推車\n產地：中國',
      'Cybex Melio\nLight\n卡利斯托\n產地：中國',
      'Cybex Melio\n城市旅行家 推車\n產地：中國',
      `${TW}\n卡利斯托 提籃\n${Q}`,
      `${TW}\n卡利斯托 嬰兒推車 5.9kg\n${Q}`,
      `${TW}\n卡利斯托 嬰兒推車。\n${Q}`,
      `${TW}\n卡利斯托 嬰兒推車 ${Q}`,
      `${TW}\n賽比克斯 輕量 Callisto 嬰兒推車\n${Q}`,
      `${TW}\n型號：卡利斯托 ${Q}`,
    ];
    for (const t of no) assert.equal(quoteInModelScope(t, M, Q), false, t);
    for (const t of ['Cybex Melio\nLight\nCybex e-Priam\nMade in China', 'Cybex Melio\nLight\nCybex Platinum Line – Priam\nMade in China', 'Cybex Melio\nLight\nCybex Platinum, Priam\nMade in China'])
      assert.equal(quoteInModelScope(t, M, 'Made in China'), false, t);
    const ok: string[] = [
      `${TW}\n超輕量 雙向 嬰兒推車\n${Q}`,
      'Cybex Melio\n碳纖維 超輕量 嬰兒推車\n產地：中國',
      `${TW}\n墨石黑 嬰兒推車\n${Q}`,
      `${TW}\n新款 時尚 嬰兒推車\n${Q}`,
      `${TW}\n安琪兒 嬰兒推車\n${Q}`,
      `${TW}\n麗兒采家 推車\n${Q}`,
      `${TW}\n嬰兒推車商品摘要\n${Q}`,
      'Cybex Melio\n設計：人體工學 產地：中國',
      'Cybex Melio\n中国製造\n產地：中國',
    ];
    for (const t of ok) assert.equal(quoteInModelScope(t, M, Q), true, t);
    for (const t of ['Cybex Melio\nCybex Platinum Melio\nMade in China', 'Cybex Melio\nCybex Gold Melio Carbon\nMade in China', 'Cybex Melio stroller. Weighing 5.9 kg, it is designed in Germany and made in China.'])
      assert.equal(quoteInModelScope(t, M, t.endsWith('made in China.') ? 'made in China' : 'Made in China'), true, t);
    // Another product of the brand between the model and the claim.
    assert.equal(quoteInModelScope('TP-Link Tapo C246D\nCompare with TP-Link Archer AX55\nCountry of origin: China', 'TP-Link Tapo C246D', 'Country of origin: China'), false);
    // Sourced aliases: メリオ (Cybex Japan), 母乳実感 (Pigeon SofTouch in Japan).
    assert.equal(quoteInModelScope('Pigeon Softouch 母乳実感 哺乳瓶\n商品詳細\n原産国：中国', 'Pigeon Softouch', '原産国：中国'), true);
  });

  it('cited path: another model’s block → unverified; lines under Melio → verified', async () => {
    for (const t of OTHER_MODEL) {
      const out = await check([{ url: 'https://babesta.com/products/x', quote: 'made in China' }], (u) => pg(u, t, '', u));
      assert.equal(out.verified.length, 0, t);
    }
    for (const t of UNDER_MELIO) {
      const out = await check([{ url: 'https://babesta.com/products/x', quote: 'made in China' }], (u) => pg(u, t, '', u));
      assert.equal(out.verified.length, 1, t);
    }
    // Pins: Melio Carbon claim with a plain Melio mention; the real babesta Callisto line (Foonf made in Canada).
    for (const t of [
      'Cybex Melio Carbon\nMade in China\nYou may also like: Cybex Melio',
      'Cybex Callisto vs. Clek Foonf\nThe Callisto is designed in Germany and made in China while Foonf is designed and made in Canada.',
    ]) {
      const out = await check([{ url: 'https://babesta.com/products/x', quote: 'made in China' }], (u) => pg(u, t, '', u));
      assert.equal(out.verified.length, 0, t);
    }
  });

  it('search-page path: another model’s block → kept 0, 未確認; lines under Melio → 依型號比對 75%', () => {
    for (const t of OTHER_MODEL) {
      const r = searchRun('https://www.momoshop.com.tw/goods/x', MT, t);
      assert.equal(r.kept, 0, t);
      assert.notEqual(r.v.state, 'confirmed', t);
    }
    const rel = searchRun('https://www.momoshop.com.tw/goods/c', 'Cybex Callisto - momo購物網', 'Cybex Callisto\nThe Callisto is made in China.\n你可能也喜歡：Cybex Melio');
    assert.equal(rel.kept, 0);
    for (const t of UNDER_MELIO) {
      const r = searchRun('https://www.momoshop.com.tw/goods/x', MT, t);
      assert.equal(r.kept, 1, t);
      assert.equal(pct(r.v), 75, t);
    }
    // Pin: a Melio Carbon page keeps its likely candidate (never 依型號比對).
    const carbon = searchRun('https://www.momoshop.com.tw/goods/carbon', 'Cybex Melio Carbon - momo購物網', 'Cybex Melio Carbon\nMade in China\n你可能也喜歡：Cybex Melio');
    assert.equal(carbon.kept, 1);
    assert.notEqual(carbon.v.state, 'confirmed');
    assert.ok(carbon.v.candidates.some((c) => c.label === 'China' && c.rating === 'likely'));
  });
});

describe('A1 Gemini grounding redirect cites (r23)', () => {
  it('the prompt asks for the product page and the exact redirect link', () => {
    const p = PRODUCT_FACT_RULES as unknown as string;
    assert.match(p, /product page for THIS model/);
    assert.match(p, /never a site root/);
    assert.match(p, /grounding-api-redirect/);
    assert.match(p, /never rebuild a URL from the domain or title/);
  });

  it('a redirect hit with no text is fetched and judged on its landing page; url = landing', async () => {
    const land = 'https://kidobebe.com/products/cybex-melio-stroller';
    const ok = await check([{ url: RX('k'), quote: 'Made in China' }], (u) => pg(u, MELIO_OK, 'Cybex Melio', land), { searchUrls: [RX('k')] });
    assert.deepEqual([ok.verified.length, ok.fetches], [1, 1]);
    assert.equal(ok.verified[0]!.url, land);
    assert.equal(ok.verified[0]!.cited, 'fetched');
    const home = await check([{ url: RX('h') }], (u) => pg(u, MELIO_OK, 'Cybex Melio', 'https://kidobebe.com/'), { searchUrls: [RX('h')] });
    assert.deepEqual([home.verified.length, home.fetches], [0, 1]);
    const callisto = await check([{ url: RX('c'), quote: 'made in China' }], (u) =>
      pg(u, 'Cybex Callisto\nThe Callisto is designed in Germany and made in China.', '', 'https://babesta.com/products/cybex-callisto'), { searchUrls: [RX('c')] });
    assert.equal(callisto.verified.length, 0);
    const thrown = await check([{ url: RX('t') }], () => { throw new Error('timeout'); }, { searchUrls: [RX('t')] });
    assert.deepEqual([thrown.verified.length, thrown.unverified.length, thrown.fetches], [0, 1, 1]);
    // A redirect with text already kept is checked on that text (no fetch).
    const kept = await check([{ url: RX('s'), quote: 'Made in China' }], undefined, {
      searchUrls: [RX('s')],
      searchPages: [pg(RX('s'), MELIO_OK, 'Cybex Melio', 'https://kidobebe.com/products/cybex-melio')],
    });
    assert.deepEqual([kept.verified.length, kept.fetches], [1, 0]);
  });

  it('real plain fetcher: hops re-checked (private host, 4th hop refused), 1 good hop verified', async () => {
    const plain = citedFetcher('gemini', {});
    const run = (u: string) =>
      verifyCitedSources({ entity: E, country: 'China', cited: [{ url: u, quote: 'Made in China' }], searchUrls: [u], searchCoo: [], fetchPage: plain });
    let asked = routes({ [RX('p')]: redirect('http://127.0.0.1/melio'), 'http://127.0.0.1/melio': html('<h1>Cybex Melio</h1><p>Made in China</p>') });
    assert.equal((await run(RX('p'))).verified.length, 0);
    assert.ok(!asked.some((u) => u.includes('127.0.0.1')));
    mock.restoreAll();
    asked = routes({
      [RX('h')]: redirect('https://a.example.com/1'),
      'https://a.example.com/1': redirect('https://a.example.com/2'),
      'https://a.example.com/2': redirect('https://a.example.com/3'),
      'https://a.example.com/3': redirect('https://kidobebe.com/products/cybex-melio'),
      'https://kidobebe.com/products/cybex-melio': html('<h1>Cybex Melio</h1><p>Made in China</p>'),
    });
    assert.equal((await run(RX('h'))).verified.length, 0);
    assert.ok(!asked.includes('https://kidobebe.com/products/cybex-melio'));
    mock.restoreAll();
    routes({ [RX('ok')]: redirect('https://kidobebe.com/products/cybex-melio'), 'https://kidobebe.com/products/cybex-melio': html('<h1>Cybex Melio 嬰兒推車</h1><p>Made in China</p>') });
    const good = await run(RX('ok'));
    assert.equal(good.verified.length, 1);
    assert.equal(good.verified[0]!.url, 'https://kidobebe.com/products/cybex-melio');
  });

  it('budget: 3 redirect cites → at most MAX_CITED_SOURCES fetches; 2 domains by landing URL → 80%', async () => {
    const lands: Record<string, string> = {
      [RX('1')]: 'https://kidobebe.com/products/cybex-melio',
      [RX('2')]: 'https://www.babesta.com/products/cybex-melio',
      [RX('3')]: 'https://www.galaxus.ch/en/product/cybex-melio',
    };
    const out = await check(Object.keys(lands).map((url) => ({ url, quote: 'Made in China' })), (u) => pg(u, MELIO_OK, 'Cybex Melio', lands[u]), {
      searchUrls: Object.keys(lands),
    });
    assert.equal(out.fetches, MAX_CITED_SOURCES);
    assert.equal(out.fetched.length, MAX_CITED_SOURCES);
    assert.equal(out.verified.length, 2);
    const v = buildMadeInView(card('China', out.verified, out.verified.map((c, i) => `page ${i} — ${c.url}`)));
    assert.equal(v.state, 'confirmed');
    assert.equal(v.basis, 'model');
    assert.equal(pct(v), 80);
  });
});
