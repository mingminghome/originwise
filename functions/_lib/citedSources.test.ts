/**
 * (h) AI-cited made-in pages: at most 2, each checked before it counts.
 * Mocked fetches only (no live lookups).
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import {
  CITED_FETCH_MS,
  FIRECRAWL_SCRAPE_ENDPOINT,
  MAX_CITED_SOURCES,
  citedFetcher,
  isPublicHttpUrl,
  normalizeUrl,
  verifyCitedSources,
} from './citedSources';
import { CHECK_SECTIONS, readMadeInSources, readQueryPartials } from './checkQuery';
import { PRODUCT_FACT_RULES } from './prompts';
import { runCheckOrchestrator } from './orchestrator';
import type { WebCooClaim } from './schema';

const ENTITY = 'Cybex Melio';
const html = (body: string, status = 200) =>
  new Response(`<html><body>${body}</body></html>`, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Route table for globalThis.fetch; records every URL asked for. */
function routes(table: Record<string, () => Response | Promise<Response>>) {
  const asked: string[] = [];
  mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    asked.push(url);
    if (init?.signal?.aborted) throw new Error('aborted');
    const r = table[url];
    if (!r) throw new TypeError('fetch failed'); // DNS failure: an invented host
    return r();
  });
  return asked;
}

const plain = citedFetcher('brave', {});
const check = (cited: Array<{ url: string; title?: string; quote?: string }>, opts: Partial<{
  searchUrls: string[];
  searchCoo: WebCooClaim[];
  country: string;
}> = {}) =>
  verifyCitedSources({
    entity: ENTITY,
    country: opts.country ?? 'China',
    cited,
    searchUrls: opts.searchUrls ?? [],
    searchCoo: opts.searchCoo ?? [],
    fetchPage: plain,
  });

afterEach(() => mock.restoreAll());

describe('AI-cited made-in pages: checked before they count', () => {
  it('a cited URL that matches a search result (after normalising) counts, with no fetch', async () => {
    const asked = routes({});
    const out = await check(
      [{ url: 'http://WWW.momoshop.com.tw/goods/1/?utm_source=ai#spec', title: 'momo' }],
      { searchUrls: ['https://momoshop.com.tw/goods/1'] }
    );
    assert.deepEqual(out.verified, [
      { country: 'China', basis: 'name', status: 'likely', url: 'https://momoshop.com.tw/goods/1', exactModel: true, cited: 'search' },
    ]);
    assert.deepEqual(out.unverified, []);
    assert.equal(out.fetches, 0);
    assert.deepEqual(asked, []);
  });

  it('a cited URL the search did not return is fetched; loads + exact model + country → counts', async () => {
    const url = 'https://mamilove.com.tw/product/2';
    const asked = routes({ [url]: () => html('<h1>CYBEX MELIO 輕量推車</h1><p>產地：中國</p>') });
    const out = await check([{ url, title: 'Mamilove', quote: '產地：中國' }]);
    assert.equal(out.fetches, 1);
    assert.deepEqual(asked, [url]);
    assert.deepEqual(out.verified.map((v) => [v.url, v.cited, v.exactModel]), [[url, 'fetched', true]]);
    assert.deepEqual(out.unverified, []);
  });

  it('the model\'s own quote can carry the country when no made-in line is read', async () => {
    const url = 'https://shop.example.de/melio';
    routes({ [url]: () => html('<h1>Cybex Melio</h1><p>Hergestellt in China (laut Hersteller).</p>') });
    const out = await check([{ url, quote: 'Hergestellt in China' }]);
    assert.equal(out.verified.length, 1);
  });

  it('a 404 and an invented URL fail the check: listed as unverified, never counted', async () => {
    const gone = 'https://www.babyshop.example/melio-404';
    const invented = 'https://cybex-melio-factory-china.example/made-in';
    routes({ [gone]: () => html('Not found', 404) });
    const out = await check([
      { url: gone, title: 'Babyshop' },
      { url: invented, title: 'Cybex factory' },
    ]);
    assert.deepEqual(out.verified, []);
    assert.deepEqual(out.unverified.map((u) => u.url), [gone, invented]);
    assert.equal(out.fetches, 2);
  });

  it('a page that loads but does not name the exact model fails (other model; Melio Carbon near-miss)', async () => {
    const other = 'https://www.momoshop.com.tw/goods/joie';
    const carbon = 'https://shop.example.jp/melio-carbon';
    routes({
      [other]: () => html('<h1>Joie Litetrax 嬰兒推車</h1><p>產地：中國</p>'),
      [carbon]: () => html('<h1>Cybex Melio Carbon</h1><p>原産国：中国</p>'),
    });
    const out = await check([{ url: other }, { url: carbon }]);
    assert.deepEqual(out.verified, []);
    assert.equal(out.unverified.length, 2);
  });

  it('a page naming the exact model with another made-in country fails', async () => {
    const url = 'https://other.example.de/melio';
    routes({ [url]: () => html('<h1>Cybex Melio</h1><p>Made in Germany</p>') });
    const out = await check([{ url, quote: 'Made in China' }]);
    assert.deepEqual(out.verified, []);
    assert.equal(out.unverified.length, 1);
  });

  it('a search page whose made-in line names another country does not count', async () => {
    routes({});
    const url = 'https://momoshop.com.tw/goods/1';
    const out = await check([{ url }], {
      searchUrls: [url],
      searchCoo: [{ country: 'Germany', basis: 'name', status: 'likely', url }],
    });
    assert.deepEqual(out.verified, []);
    assert.deepEqual(out.unverified.map((u) => u.url), [url]);
  });

  it(`at most ${MAX_CITED_SOURCES} checked; links matching a search result go first; worst case ${MAX_CITED_SOURCES} fetches`, async () => {
    assert.equal(MAX_CITED_SOURCES, 2);
    const a = 'https://a.example.com/melio';
    const b = 'https://b.example.com/melio';
    const s = 'https://momoshop.com.tw/goods/1';
    const asked = routes({
      [a]: () => html('<p>Cybex Melio 產地：中國</p>'),
      [b]: () => html('<p>Cybex Melio 產地：中國</p>'),
    });
    const out = await check([{ url: a }, { url: b }, { url: s }], { searchUrls: [s] });
    // The search match is checked first (no fetch), then one fetch; the third link is never fetched.
    assert.deepEqual(asked, [a]);
    assert.equal(out.fetches, 1);
    assert.deepEqual(out.verified.map((v) => v.cited), ['search', 'fetched']);
    const none = routes({ [a]: () => html('x'), [b]: () => html('x') });
    const worst = await check([{ url: a }, { url: b }, { url: 'https://c.example.com/x' }]);
    assert.equal(worst.fetches, 2);
    assert.equal(none.length, 2);
  });

  it('no made-in answer from the AI: the links back nothing (listed, not fetched)', async () => {
    const asked = routes({});
    const out = await check([{ url: 'https://a.example.com/x' }], { country: 'unknown' });
    assert.equal(out.fetches, 0);
    assert.deepEqual(asked, []);
    assert.equal(out.unverified.length, 1);
  });

  it('private / non-web hosts are never fetched', async () => {
    const asked = routes({});
    for (const u of ['http://localhost/x', 'http://10.0.0.1/x', 'http://intranet/x', 'http://nas.local/x', 'file:///etc/hosts']) {
      assert.equal(isPublicHttpUrl(u), false, u);
    }
    const out = await check([{ url: 'http://192.168.1.1/melio' }]);
    assert.equal(out.fetches, 0);
    assert.deepEqual(asked, []);
    assert.equal(out.unverified.length, 1);
  });

  it('Firecrawl runs fetch through Firecrawl scrape (1 call per link, short timeout); a 404 status fails', async () => {
    const ok = 'https://mamilove.com.tw/product/2';
    const gone = 'https://mamilove.com.tw/product/404';
    const bodies: Array<Record<string, unknown>> = [];
    mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      assert.equal(String(input), FIRECRAWL_SCRAPE_ENDPOINT);
      assert.equal((init!.headers as Record<string, string>).Authorization, 'Bearer fc');
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      bodies.push(body);
      return body.url === ok
        ? json({ success: true, data: { markdown: '# CYBEX MELIO\n產地：中國', metadata: { title: 'Mamilove', statusCode: 200 } } })
        : json({ success: true, data: { markdown: 'Page not found', metadata: { statusCode: 404 } } });
    });
    const out = await verifyCitedSources({
      entity: ENTITY,
      country: 'China',
      cited: [{ url: ok }, { url: gone }],
      searchUrls: [],
      searchCoo: [],
      fetchPage: citedFetcher('firecrawl', { FIRECRAWL_API_KEY: 'fc' }),
    });
    assert.equal(bodies.length, 2);
    assert.ok(bodies.every((b) => b.storeInCache === false && Number(b.timeout) < CITED_FETCH_MS));
    assert.deepEqual(out.verified.map((v) => v.url), [ok]);
    assert.deepEqual(out.unverified.map((u) => u.url), [gone]);
  });

  it('URL normalising: scheme, www, case of host, fragment, tracking params, trailing slash', () => {
    assert.equal(
      normalizeUrl('http://WWW.Shop.example/p/1/?utm_medium=x&id=3&fbclid=y#top'),
      normalizeUrl('https://shop.example/p/1?id=3')
    );
    assert.notEqual(normalizeUrl('https://shop.example/p/1?id=3'), normalizeUrl('https://shop.example/p/1?id=4'));
  });
});

describe('prompt, schema and parser: at most 2 cited sources', () => {
  it('the product schema asks for madeInSources with url, title and quote; the rules say at most 2', () => {
    const product = CHECK_SECTIONS.find((s) => s.id === 'product')!;
    assert.match(product.schema, /"madeInSources":\[\{"url":"string","title":"string","quote":"string"\}\]/);
    assert.match(PRODUCT_FACT_RULES, /madeInSources = at most 2 pages/);
    assert.match(PRODUCT_FACT_RULES, /Never invent, guess or rebuild a URL/);
  });

  it('parser keeps http(s) entries with a host, drops junk and duplicates, clips to 2', () => {
    const got = readMadeInSources([
      { url: 'https://a.example.com/x', title: ' A ', quote: '產地：中國' },
      { url: 'javascript:alert(1)' },
      'https://b.example.com/y',
      { url: 'http://www.a.example.com/x/' },
      { url: 'https://b.example.com/y', title: 'B' },
      { url: 'https://c.example.com/z' },
    ]);
    assert.deepEqual(got, [
      { url: 'https://a.example.com/x', title: 'A', quote: '產地：中國' },
      { url: 'https://b.example.com/y', title: 'B' },
    ]);
    assert.deepEqual(readMadeInSources('nope'), []);
    const parts = readQueryPartials(
      { product: { name: 'Cybex Melio', madeIn: 'China', madeInSources: [{ url: 'ftp://x' }] } },
      CHECK_SECTIONS.filter((s) => s.id === 'product')
    );
    assert.equal('madeInSources' in (parts.product ?? {}), false);
  });
});

describe('orchestrator: cited pages end to end (mocked)', () => {
  it('fetched + verified cited page confirms with the AI answer; an invented link is listed as unverified', async () => {
    const loose = 'https://blog.example.com/strollers';
    const cited = 'https://mamilove.com.tw/product/2';
    const invented = 'https://melio-made-in-china.example/proof';
    const asked: string[] = [];
    mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = String(init?.body || '');
      asked.push(url);
      if (url.includes('generativelanguage.googleapis.com')) {
        if (/\/v1beta\/models(\?|$)/.test(url)) return json({ models: [] });
        if (url.includes('interactions') || /google_search/.test(body)) return json({ error: { code: 429 } }, 429);
        if (body.includes('You extract product-origin facts')) {
          return json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ coo: [], notes: [] }) }] } }] });
        }
        return json({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      product: {
                        name: 'Cybex Melio',
                        brand: 'Cybex',
                        madeIn: 'China',
                        madeInSources: [
                          { url: cited, title: 'Mamilove Cybex Melio', quote: '產地：中國' },
                          { url: invented, title: 'Proof', quote: 'Made in China' },
                          { url: 'https://third.example.com/never', title: 'Third' },
                        ],
                        confidence: 0.8,
                      },
                    }),
                  },
                ],
              },
            },
          ],
        });
      }
      if (url.startsWith('https://api.search.brave.com/')) {
        return json({ web: { results: [{ url: loose, title: 'Stroller round-up' }] } });
      }
      if (url === loose) return html('<p>Best strollers of the year</p>');
      if (url === cited) return html('<h1>CYBEX MELIO 輕量推車</h1><p>產地：中國</p>');
      throw new TypeError('fetch failed');
    });
    const out = await runCheckOrchestrator({
      jobId: 'cited',
      locale: 'zh-Hant',
      text: 'Cybex Melio',
      geoScope: 'prc',
      dimensions: ['origin'],
      env: { GEMINI_API_KEY: 'g', BRAVE_SEARCH_API_KEY: 'b', SEARCH_PROVIDERS: 'brave' },
    });
    assert.equal(out.ok, true);
    if (!out.ok) return;
    const r = out.result;
    assert.equal(r.product?.madeIn, 'China');
    assert.equal(r.product?.madeInBasis, 'model');
    assert.equal(r.product?.madeInSupport, 'ai_web');
    assert.ok(r.meta.searchCoo?.some((c) => c.url === cited && c.cited === 'fetched' && c.exactModel));
    assert.deepEqual(r.meta.citedUnverified?.map((c) => c.url), [invented]);
    assert.equal(r.meta.citedFetches, 2);
    // The third link is past the cap of 2: never fetched.
    assert.ok(!asked.includes('https://third.example.com/never'));
    assert.ok(r.sources?.some((s) => s.includes(cited)));
    assert.equal('madeInSources' in (r.product ?? {}), false);
  });
});
