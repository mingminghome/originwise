/**
 * Search-provider chain (Gemini grounding → Brave → Firecrawl), mocked fetch.
 * Run: npm test
 */

import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import {
  SEARCH_PROVIDERS_BY_ID,
  isSearchEnabled,
  parseSearchProviderOrder,
  runSearchChain,
  type SearchOutput,
  type SearchProvider,
  type SearchProviderId,
} from './search';
import {
  buildSearchQuery,
  enforceCooClaims,
  findJans,
  isValidGtin,
  matchPage,
  stripHtml,
  variantTokens,
} from './search/extract';
import { runCheckOrchestrator, type ProgressEvent } from './orchestrator';
import { extractCooClaimsFromText } from './cooPriority';
import { applyWebCooGate, synthesize } from './synthesize';
import { pageListsMultipleVariants } from './search/extract';

const JAN = '4902508012348'; // checksum-valid GTIN-13 test code
const ENTITY = `Pigeon Sheer PPSU 240ml ${JAN}`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function html(body: string): Response {
  return new Response(`<html><body>${body}</body></html>`, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/** Gemini extraction reply (gemini-3.5-flash-lite generateContent). */
function extractionReply(obj: unknown): Response {
  return json({
    candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }],
  });
}

function fakeProvider(
  id: SearchProviderId,
  out: Partial<SearchOutput>,
  calls: string[]
): SearchProvider {
  return {
    id,
    isConfigured: () => true,
    async search() {
      calls.push(id);
      return {
        ok: false,
        brief: '',
        sources: [],
        ms: 1,
        requests: 1,
        ...out,
      };
    },
  };
}

const QUOTA_BODY = {
  error: {
    status: 'RESOURCE_EXHAUSTED',
    message:
      'You exceeded your current quota, please check your plan and billing details.\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-robotics-er-2-preview',
  },
};

type Route = (url: string, init?: RequestInit) => Promise<Response> | Response;

/** Shared router: Google (Search 429 quota, extraction OK), Brave, pages. */
function mockFetch(routes: {
  brave?: Route;
  firecrawl?: Route;
  pages?: Record<string, string>;
  extraction?: unknown;
  seen?: string[];
}) {
  mock.method(
    globalThis,
    'fetch',
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      routes.seen?.push(url);
      if (url.includes('generativelanguage.googleapis.com')) {
        if (/\/v1beta\/models(\?|$)/.test(url)) {
          return json({
            models: [
              {
                name: 'models/gemini-robotics-er-2-preview',
                supportedGenerationMethods: ['generateContent'],
              },
            ],
          });
        }
        const body = String(init?.body || '');
        const isSearch = url.includes('interactions') || /tools|google_search/.test(body);
        if (isSearch) return json(QUOTA_BODY, 429);
        return extractionReply(routes.extraction ?? { coo: [], notes: [] });
      }
      if (url.startsWith('https://api.search.brave.com/')) {
        return routes.brave ? routes.brave(url, init) : json({}, 500);
      }
      if (url.startsWith('https://api.firecrawl.dev/')) {
        return routes.firecrawl ? routes.firecrawl(url, init) : json({}, 500);
      }
      const page = routes.pages?.[url];
      if (page !== undefined) return html(page);
      return new Response('not found', { status: 404 });
    }
  );
}

describe('search provider helpers', () => {
  it('validates JAN / GTIN check digits and finds JANs in text', () => {
    assert.equal(isValidGtin(JAN), true);
    assert.equal(isValidGtin('4902508012345'), false);
    assert.deepEqual(findJans('Pigeon 4902508012348 240ml'), [JAN]);
    assert.deepEqual(findJans('size 2024 1234567'), []);
    assert.deepEqual(findJans('JAN 4 902508 012348'), [JAN]);
  });

  it('builds a query with entity, JAN and made-in terms', () => {
    const q = buildSearchQuery('Pigeon Sheer', [JAN]);
    assert.ok(q.includes('Pigeon Sheer'));
    assert.ok(q.includes(JAN));
    assert.ok(q.includes('made in'));
    assert.ok(q.includes('生産国'));
    assert.ok(q.includes('原産国'));
  });

  it('strips scripts/styles/tags from HTML', () => {
    const t = stripHtml(
      '<script>var x="Made in China"</script><style>p{}</style><p>原産国：日本&nbsp;&amp; more</p>'
    );
    assert.ok(!t.includes('China'));
    assert.ok(t.includes('原産国：日本'));
    assert.ok(t.includes('& more'));
  });

  it('matches pages by JAN or every variant token only', () => {
    const tokens = variantTokens('Pigeon Sheer PPSU 240ml');
    assert.equal(matchPage(`品番 ${JAN} 原産国 日本`, [JAN], tokens), 'barcode');
    assert.equal(
      matchPage('Pigeon Sheer PPSU 240 ml — Made in Japan', [JAN], tokens),
      'name'
    );
    // Different size → not this variant
    assert.equal(matchPage('Pigeon Sheer PPSU 160ml — Made in China', [JAN], tokens), null);
  });

  it('drops claims whose page did not match or whose quote is not on the page', () => {
    const pages = [
      { url: 'https://a.example/p', title: 'A', text: `Pigeon ${JAN} 原産国：日本` },
      { url: 'https://b.example/p', title: 'B', text: 'Pigeon bottle 160ml Made in China' },
    ];
    const { kept, dropped } = enforceCooClaims(
      [
        { country: '日本', quote: '原産国：日本', page: 1, sourceType: 'retailer' },
        { country: 'China', quote: 'Made in China', page: 2, sourceType: 'retailer' },
        { country: 'Thailand', quote: 'Made in Thailand', page: 1, sourceType: 'retailer' },
      ],
      pages,
      ['barcode', null]
    );
    assert.deepEqual(kept.map((k) => k.country), ['日本']);
    assert.equal(kept[0]?.basis, 'barcode');
    assert.equal(kept[0]?.status, 'confirmed');
    assert.equal(dropped, 2);
  });
});

describe('provider order + enablement', () => {
  it('defaults to gemini,brave,firecrawl and respects SEARCH_PROVIDERS', () => {
    assert.deepEqual(parseSearchProviderOrder({}), ['gemini', 'brave', 'firecrawl']);
    assert.deepEqual(
      parseSearchProviderOrder({ SEARCH_PROVIDERS: 'firecrawl, google ,bogus,brave' }),
      ['firecrawl', 'gemini', 'brave']
    );
    assert.deepEqual(parseSearchProviderOrder({ SEARCH_PROVIDERS: 'nope' }), [
      'gemini',
      'brave',
      'firecrawl',
    ]);
  });

  it('enables web lookup when any listed provider has a key; WEB_LOOKUP=off wins', () => {
    assert.equal(isSearchEnabled({}), false);
    assert.equal(isSearchEnabled({ BRAVE_SEARCH_API_KEY: 'b' }), true);
    assert.equal(isSearchEnabled({ FIRECRAWL_API_KEY: 'f', SEARCH_PROVIDERS: 'gemini' }), false);
    assert.equal(isSearchEnabled({ GEMINI_API_KEY: 'g', WEB_LOOKUP: 'off' }), false);
  });

  it('runs providers in SEARCH_PROVIDERS order and stops at the first with Sources', async () => {
    const calls: string[] = [];
    const providers = {
      gemini: fakeProvider('gemini', { error: 'upstream_quota' }, calls),
      brave: fakeProvider(
        'brave',
        { ok: true, brief: 'b\n\nSources:\n[1] https://b.example', sources: ['https://b.example'] },
        calls
      ),
      firecrawl: fakeProvider('firecrawl', { error: 'upstream_error' }, calls),
    };
    const out = await runSearchChain(
      { entity: 'x', locale: 'en', env: { SEARCH_PROVIDERS: 'firecrawl,brave,gemini' } },
      { providers }
    );
    assert.deepEqual(calls, ['firecrawl', 'brave']);
    assert.equal(out.ok, true);
    assert.equal(out.provider, 'brave');
    assert.equal(out.requests, 2);
  });

  it('treats ok-without-Sources as a miss and moves on', async () => {
    const calls: string[] = [];
    const providers = {
      gemini: fakeProvider('gemini', { ok: true, brief: 'memory only', sources: [] }, calls),
      brave: fakeProvider('brave', { ok: true, brief: 'b', sources: ['https://b.example'] }, calls),
      firecrawl: fakeProvider('firecrawl', {}, calls),
    };
    const out = await runSearchChain({ entity: 'x', locale: 'en', env: {} }, { providers });
    assert.deepEqual(calls, ['gemini', 'brave']);
    assert.equal(out.provider, 'brave');
  });
});

describe('runSearchChain (mocked fetch)', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('gemini daily quota (upstream_quota) → Brave used, extracted COO kept for JAN-matched page', async () => {
    const seen: string[] = [];
    let braveToken = '';
    let braveQuery = '';
    mockFetch({
      seen,
      brave: (url, init) => {
        braveToken = new Headers(init?.headers).get('X-Subscription-Token') || '';
        braveQuery = new URL(url).searchParams.get('q') || '';
        return json({
          web: {
            results: [
              { url: 'https://shop.example.jp/sheer', title: 'Pigeon Sheer 240ml' },
              { url: 'https://blog.example.com/review', title: 'Review' },
            ],
          },
        });
      },
      pages: {
        'https://shop.example.jp/sheer': `<h1>Pigeon Sheer PPSU 240ml</h1><table><tr><td>JAN</td><td>${JAN}</td></tr><tr><td>原産国</td><td>原産国：日本</td></tr></table>`,
        'https://blog.example.com/review': '<p>Nice bottle.</p>',
      },
      extraction: {
        coo: [{ country: '日本', quote: '原産国：日本', page: 1, sourceType: 'retailer' }],
        notes: ['Pigeon is a Japanese brand (HQ Tokyo).'],
      },
    });
    const progress: string[] = [];
    const out = await runSearchChain(
      {
        entity: ENTITY,
        locale: 'en',
        env: { GEMINI_API_KEY: 'g', BRAVE_SEARCH_API_KEY: 'brave-key' },
      },
      { onAttempt: (id) => progress.push(id) }
    );
    assert.equal(out.ok, true);
    assert.equal(out.provider, 'brave');
    assert.deepEqual(progress, ['gemini', 'brave']);
    assert.deepEqual(
      out.tried.map((t) => [t.provider, t.ok, t.error]),
      [
        ['gemini', false, 'upstream_quota'],
        ['brave', true, undefined],
      ]
    );
    assert.equal(braveToken, 'brave-key');
    assert.ok(braveQuery.includes(JAN));
    assert.ok(seen.some((u) => u.startsWith('https://api.search.brave.com/res/v1/web/search?')));
    assert.match(out.brief, /COO: 日本 \| source: retailer \| via: shop\.example\.jp \(matched by barcode JAN/);
    assert.deepEqual(out.coo, [
      { country: '日本', basis: 'barcode', status: 'confirmed', url: 'https://shop.example.jp/sheer' },
    ]);
    assert.ok(out.brief.includes('Pigeon is a Japanese brand'));
    assert.ok(out.brief.includes('Sources:'));
    // requests = gemini attempts + 1 Brave search
    assert.ok(out.requests >= 2);
  });

  it('Brave with no key is skipped → Firecrawl (markdown) used', async () => {
    const seen: string[] = [];
    let fcBody: Record<string, unknown> = {};
    let fcAuth = '';
    mockFetch({
      seen,
      firecrawl: (_url, init) => {
        fcBody = JSON.parse(String(init?.body || '{}'));
        fcAuth = new Headers(init?.headers).get('Authorization') || '';
        return json({
          success: true,
          data: [
            {
              url: 'https://maker.example/sheer',
              title: 'Sheer 240ml',
              markdown: `# Pigeon Sheer PPSU 240ml\nJAN: ${JAN}\nMade in Japan`,
            },
          ],
        });
      },
      extraction: {
        coo: [{ country: 'Japan', quote: 'Made in Japan', page: 1, sourceType: 'manufacturer' }],
        notes: [],
      },
    });
    const progress: string[] = [];
    const out = await runSearchChain(
      {
        entity: ENTITY,
        locale: 'en',
        env: { GEMINI_API_KEY: 'g', FIRECRAWL_API_KEY: 'fc-key' },
      },
      { onAttempt: (id) => progress.push(id) }
    );
    assert.deepEqual(progress, ['gemini', 'firecrawl']);
    assert.ok(!seen.some((u) => u.includes('api.search.brave.com')));
    assert.equal(out.ok, true);
    assert.equal(out.provider, 'firecrawl');
    assert.equal(fcAuth, 'Bearer fc-key');
    assert.deepEqual(
      (fcBody.scrapeOptions as { formats?: string[] }).formats,
      ['markdown']
    );
    assert.equal((fcBody.scrapeOptions as { storeInCache?: boolean }).storeInCache, false);
    assert.match(out.brief, /COO: Japan \| source: manufacturer/);
  });

  it('JAN / variant mismatch page → 未確認, no made-in country in the brief', async () => {
    mockFetch({
      brave: () =>
        json({
          web: {
            results: [{ url: 'https://other.example/bottle', title: 'Pigeon bottle 160ml' }],
          },
        }),
      pages: {
        'https://other.example/bottle':
          '<p>Pigeon Sheer PPSU 160ml (JAN 4902508099998)</p><p>Made in China</p>',
      },
      // Model claims China from the wrong page; notes try to smuggle it too.
      extraction: {
        coo: [{ country: 'China', quote: 'Made in China', page: 1, sourceType: 'retailer' }],
        notes: ['This bottle is made in China.', 'Pigeon HQ: Japan.'],
      },
    });
    const out = await runSearchChain({
      entity: ENTITY,
      locale: 'en',
      env: { BRAVE_SEARCH_API_KEY: 'b', GEMINI_API_KEY: 'g', SEARCH_PROVIDERS: 'brave' },
    });
    assert.equal(out.ok, true);
    assert.ok(out.brief.includes('未確認'));
    assert.ok(!/COO: China/.test(out.brief));
    assert.ok(!/made in China/i.test(out.brief.split('Sources:')[0]!));
    assert.ok(out.brief.includes('Pigeon HQ: Japan.'));
    assert.ok(out.brief.includes('Dropped 1 made-in mention'));
  });

  it('falls back to label regex when the extraction model fails, still JAN-gated', async () => {
    mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('generativelanguage.googleapis.com')) return json(QUOTA_BODY, 429);
      if (url.startsWith('https://api.search.brave.com/')) {
        return json({
          web: {
            results: [
              { url: 'https://a.example/1', title: 'match' },
              { url: 'https://b.example/2', title: 'other' },
            ],
          },
        });
      }
      if (url === 'https://a.example/1') return html(`<p>${JAN}</p><p>生産国：タイ</p>`);
      if (url === 'https://b.example/2') return html('<p>Made in China</p>');
      return new Response('', { status: 404 });
    });
    const out = await runSearchChain({
      entity: ENTITY,
      locale: 'ja',
      env: { BRAVE_SEARCH_API_KEY: 'b', GEMINI_API_KEY: 'g', SEARCH_PROVIDERS: 'brave' },
    });
    assert.equal(out.ok, true);
    assert.match(out.brief, /COO: タイ/);
    assert.ok(!/COO: China/.test(out.brief));
  });

  it('all providers fail → keeps gemini error code (upstream_quota) for the quota notice', async () => {
    mockFetch({
      brave: () => json({ message: 'server error' }, 500),
      firecrawl: () => json({ success: false, error: 'Insufficient credits' }, 402),
    });
    const out = await runSearchChain({
      entity: ENTITY,
      locale: 'en',
      env: { GEMINI_API_KEY: 'g', BRAVE_SEARCH_API_KEY: 'b', FIRECRAWL_API_KEY: 'f' },
    });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'upstream_quota');
    assert.equal(out.provider, 'firecrawl');
    assert.deepEqual(
      out.tried.map((t) => [t.provider, t.error]),
      [
        ['gemini', 'upstream_quota'],
        ['brave', 'upstream_unavailable'],
        ['firecrawl', 'upstream_quota'],
      ]
    );
  });

  it('lists every fetched page URL as a source (and in the brief Sources block)', async () => {
    const urls = ['https://a.example/1', 'https://b.example/2', 'https://c.example/3'];
    mockFetch({
      brave: () =>
        json({ web: { results: urls.map((u, i) => ({ url: u, title: `T${i}` })) } }),
      pages: Object.fromEntries(urls.map((u) => [u, '<p>Pigeon Sheer PPSU 240ml</p>'])),
    });
    const out = await runSearchChain({
      entity: ENTITY,
      locale: 'en',
      env: { BRAVE_SEARCH_API_KEY: 'b', SEARCH_PROVIDERS: 'brave' },
    });
    assert.equal(out.ok, true);
    assert.equal(out.sources.length, 3);
    for (const u of urls) {
      assert.ok(out.sources.some((s) => s.includes(u)), u);
      assert.ok(out.brief.includes(u), u);
    }
    // No Gemini key → no extraction model; still 未確認 (no COO statements)
    assert.ok(out.brief.includes('未確認'));
  });

  it('never logs the query text', async () => {
    const logged: string[] = [];
    const methods = ['log', 'info', 'warn', 'error', 'debug'] as const;
    for (const m of methods) {
      mock.method(console, m, (...args: unknown[]) => {
        logged.push(args.map(String).join(' '));
      });
    }
    mockFetch({
      brave: () => json({ web: { results: [{ url: 'https://a.example/1', title: 'a' }] } }),
      pages: { 'https://a.example/1': '<p>x</p>' },
    });
    await runSearchChain({
      entity: 'SecretQueryTerm 240ml',
      locale: 'en',
      env: { BRAVE_SEARCH_API_KEY: 'b', GEMINI_API_KEY: 'g' },
    });
    assert.ok(!logged.some((l) => l.includes('SecretQueryTerm')));
  });

  it('exports the real providers keyed by id', () => {
    assert.deepEqual(Object.keys(SEARCH_PROVIDERS_BY_ID), ['gemini', 'brave', 'firecrawl']);
    assert.equal(SEARCH_PROVIDERS_BY_ID.brave.isConfigured({}), false);
    assert.equal(SEARCH_PROVIDERS_BY_ID.firecrawl.isConfigured({ FIRECRAWL_API_KEY: 'x' }), true);
  });
});

describe('orchestrator web row + meta', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  function mockAll(opts: { braveOk: boolean }) {
    mock.method(
      globalThis,
      'fetch',
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const body = String(init?.body || '');
        if (url.includes('generativelanguage.googleapis.com')) {
          if (/\/v1beta\/models(\?|$)/.test(url)) {
            return json({
              models: [
                {
                  name: 'models/gemini-robotics-er-2-preview',
                  supportedGenerationMethods: ['generateContent'],
                },
              ],
            });
          }
          if (url.includes('interactions') || /google_search/.test(body)) {
            return json(QUOTA_BODY, 429);
          }
          if (body.includes('You extract product-origin facts')) {
            return extractionReply({ coo: [], notes: [] });
          }
          return extractionReply({
            product: { name: 'Pigeon Sheer PPSU 240ml', brand: 'Pigeon', confidence: 0.6 },
          });
        }
        if (url.startsWith('https://api.search.brave.com/')) {
          return opts.braveOk
            ? json({ web: { results: [{ url: 'https://a.example/1', title: 'A' }] } })
            : json({}, 503);
        }
        if (url === 'https://a.example/1') return html('<p>Pigeon Sheer PPSU 240ml</p>');
        return new Response('', { status: 404 });
      }
    );
  }

  it('Brave success: agents web row provider=brave with requests; meta.searchProvider/searchRequests set; progress names each provider', async () => {
    mockAll({ braveOk: true });
    const events: ProgressEvent[] = [];
    const out = await runCheckOrchestrator(
      {
        jobId: 'j1',
        locale: 'en',
        text: 'Pigeon Sheer PPSU 240ml',
        geoScope: 'prc',
        dimensions: ['origin'],
        env: { GEMINI_API_KEY: 'g', BRAVE_SEARCH_API_KEY: 'b' },
      },
      (ev) => events.push(ev)
    );
    assert.equal(out.ok, true);
    if (!out.ok) return;
    const web = out.agents.find((a) => a.id === 'web');
    assert.equal(web?.provider, 'brave');
    assert.equal(web?.ok, true);
    assert.ok((web?.requests ?? 0) >= 2);
    assert.equal(out.result.meta.searchProvider, 'brave');
    assert.equal(out.result.meta.searchRequests, web?.requests);
    assert.equal(out.result.knowledgeBasis, 'web_enriched');
    assert.ok(out.result.sources?.some((s) => s.includes('https://a.example/1')));
    const running = events
      .filter((e) => e.step === 'web' && e.status === 'running')
      .map((e) => e.detail);
    assert.deepEqual(running, ['gemini', 'brave']);
  });

  it('all fail: web row keeps upstream_quota (quota notice) with last provider tried', async () => {
    mockAll({ braveOk: false });
    const out = await runCheckOrchestrator({
      jobId: 'j2',
      locale: 'en',
      text: 'Pigeon Sheer PPSU 240ml',
      geoScope: 'prc',
      dimensions: ['origin'],
      env: { GEMINI_API_KEY: 'g', BRAVE_SEARCH_API_KEY: 'b' },
    });
    assert.equal(out.ok, true);
    if (!out.ok) return;
    const web = out.agents.find((a) => a.id === 'web');
    assert.equal(web?.ok, false);
    assert.equal(web?.error, 'upstream_quota');
    assert.equal(web?.provider, 'brave');
    assert.equal(out.result.meta.searchProvider, 'brave');
    assert.ok(out.result.caveats?.some((c) => /Daily free Google Search quota/.test(c)));
  });
});

describe('barcode vs name matching rule (Tester / Chief bar)', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('detects multi-variant pages: several barcodes, sizes, or a variant selector', () => {
    assert.equal(pageListsMultipleVariants('Pigeon Sheer PPSU 240ml 生産国：中国'), false);
    assert.equal(
      pageListsMultipleVariants(`JAN ${JAN} / JAN 4902508099998`),
      true
    );
    assert.equal(pageListsMultipleVariants('160ml / 240ml / 330ml'), true);
    assert.equal(pageListsMultipleVariants('240ml と 0.24L'), false); // same capacity
    assert.equal(pageListsMultipleVariants('サイズを選択 してください'), true);
    assert.equal(pageListsMultipleVariants('Select size'), true);
    assert.equal(pageListsMultipleVariants('容量 240ml 重量 90g'), false);
  });

  it('name-only match on a single-variant page → likely candidate, never a COO stamp', async () => {
    mockFetch({
      brave: () =>
        json({ web: { results: [{ url: 'https://shop.example.jp/one', title: 'Sheer 240ml' }] } }),
      pages: {
        // Product name + size match, but no barcode on the page.
        'https://shop.example.jp/one': '<h1>Pigeon Sheer PPSU 240ml</h1><p>生産国：中国</p>',
      },
      extraction: {
        coo: [{ country: '中国', quote: '生産国：中国', page: 1, sourceType: 'retailer' }],
        notes: [],
      },
    });
    const out = await runSearchChain({
      entity: ENTITY,
      locale: 'ja',
      env: { BRAVE_SEARCH_API_KEY: 'b', GEMINI_API_KEY: 'g', SEARCH_PROVIDERS: 'brave' },
    });
    assert.equal(out.ok, true);
    assert.deepEqual(out.coo, [
      { country: '中国', basis: 'name', status: 'likely', url: 'https://shop.example.jp/one' },
    ]);
    assert.ok(out.brief.includes('未確認'));
    assert.match(out.brief, /LIKELY candidate only, NOT confirmed \(matched by product name/);
    assert.ok(!/COO: 中国/.test(out.brief));
    // COO parsers (applyCooPriority) must not read the likely line as a stamp.
    assert.ok(!extractCooClaimsFromText(out.brief).some((c) => c.region === 'CN'));
  });

  it('name-only match on an Amazon JP listing with 3 variants + 生産国 中国 → dropped, 未確認', async () => {
    const amazon = `
      <div id="title">ピジョン 母乳実感 Pigeon Sheer PPSU 240ml</div>
      <div id="variation_size_name"><span>サイズ名:</span>
        <ul><li>160ml</li><li>240ml</li><li>330ml</li></ul></div>
      <table id="productDetails"><tr><th>生産国</th><td>生産国：中国</td></tr></table>`;
    mockFetch({
      brave: () =>
        json({ web: { results: [{ url: 'https://www.amazon.co.jp/dp/B0TEST', title: 'Amazon' }] } }),
      pages: { 'https://www.amazon.co.jp/dp/B0TEST': amazon },
      extraction: {
        coo: [{ country: '中国', quote: '生産国：中国', page: 1, sourceType: 'retailer' }],
        notes: [],
      },
    });
    const out = await runSearchChain({
      entity: ENTITY,
      locale: 'ja',
      env: { BRAVE_SEARCH_API_KEY: 'b', GEMINI_API_KEY: 'g', SEARCH_PROVIDERS: 'brave' },
    });
    assert.equal(out.ok, true);
    assert.deepEqual(out.coo, []);
    assert.ok(out.brief.includes('未確認'));
    assert.ok(out.brief.includes('list several variants'));
    assert.ok(!/LIKELY/.test(out.brief));
    assert.ok(!extractCooClaimsFromText(out.brief).some((c) => c.region === 'CN'));
  });

  it('barcode match on a multi-variant page still confirms (barcode is specific)', async () => {
    mockFetch({
      brave: () =>
        json({ web: { results: [{ url: 'https://shop.example.jp/multi', title: 'Sheer' }] } }),
      pages: {
        'https://shop.example.jp/multi': `<p>Pigeon Sheer 160ml / 240ml</p><p>JAN ${JAN}</p><p>原産国：日本</p>`,
      },
      extraction: {
        coo: [{ country: '日本', quote: '原産国：日本', page: 1, sourceType: 'retailer' }],
        notes: [],
      },
    });
    const out = await runSearchChain({
      entity: ENTITY,
      locale: 'ja',
      env: { BRAVE_SEARCH_API_KEY: 'b', GEMINI_API_KEY: 'g', SEARCH_PROVIDERS: 'brave' },
    });
    assert.equal(out.coo?.[0]?.basis, 'barcode');
    assert.equal(out.coo?.[0]?.status, 'confirmed');
  });

  it('synthesize gate: barcode claim → confirmed made-in with madeInBasis=barcode', () => {
    const r = synthesize({
      jobId: 's1',
      geoScope: 'prc',
      webEnriched: true,
      webBrief: 'x',
      partials: { product: { name: 'Pigeon Sheer', madeIn: 'Japan', confidence: 0.7 } },
      webCoo: [{ country: '日本', basis: 'barcode', status: 'confirmed' }],
    });
    assert.equal(r.product?.madeIn, 'Japan');
    assert.equal(r.product?.madeInBasis, 'barcode');
    assert.ok(r.product?.originCandidates?.some((c) => c.rating === 'confirmed'));
  });

  it('synthesize gate: name-only claim → likely candidate (web_name), no final COO', () => {
    const r = synthesize({
      jobId: 's2',
      geoScope: 'prc',
      webEnriched: true,
      webBrief: 'x',
      // Monolith tried to stamp China from the name-only page.
      partials: { product: { name: 'Pigeon Sheer', madeIn: 'China', confidence: 0.7 } },
      webCoo: [{ country: '中国', basis: 'name', status: 'likely' }],
    });
    assert.equal(r.product?.madeIn, undefined);
    assert.equal(r.product?.madeInBasis, undefined);
    const cand = r.product?.originCandidates?.find((c) => c.source === 'web_name');
    assert.equal(cand?.rating, 'likely');
    assert.ok(!r.product?.originCandidates?.some((c) => c.rating === 'confirmed'));
  });

  it('synthesize gate keeps a label-OCR made-in even without a barcode web claim', () => {
    const g = applyWebCooGate(
      { name: 'x', madeIn: 'Japan' },
      [],
      'Made in Japan (package label)'
    );
    assert.equal(g.product?.madeIn, 'Japan');
  });

  it('orchestrator exposes basis: meta.searchMatch / meta.searchCoo; name-only never becomes madeIn', async () => {
    mock.method(
      globalThis,
      'fetch',
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const body = String(init?.body || '');
        if (url.includes('generativelanguage.googleapis.com')) {
          if (/\/v1beta\/models(\?|$)/.test(url)) return json({ models: [] });
          if (url.includes('interactions') || /google_search/.test(body)) {
            return json(QUOTA_BODY, 429);
          }
          if (body.includes('You extract product-origin facts')) {
            return extractionReply({
              coo: [{ country: '中国', quote: '生産国：中国', page: 1, sourceType: 'retailer' }],
              notes: [],
            });
          }
          return extractionReply({
            product: { name: 'Pigeon Sheer PPSU 240ml', brand: 'Pigeon', madeIn: 'China', confidence: 0.7 },
          });
        }
        if (url.startsWith('https://api.search.brave.com/')) {
          return json({ web: { results: [{ url: 'https://a.example/1', title: 'A' }] } });
        }
        if (url === 'https://a.example/1') {
          return html('<p>Pigeon Sheer PPSU 240ml</p><p>生産国：中国</p>');
        }
        return new Response('', { status: 404 });
      }
    );
    const out = await runCheckOrchestrator({
      jobId: 'j3',
      locale: 'ja',
      text: 'Pigeon Sheer PPSU 240ml',
      geoScope: 'prc',
      dimensions: ['origin'],
      env: { GEMINI_API_KEY: 'g', BRAVE_SEARCH_API_KEY: 'b' },
    });
    assert.equal(out.ok, true);
    if (!out.ok) return;
    assert.equal(out.result.meta.searchProvider, 'brave');
    assert.equal(out.result.meta.searchMatch, 'name');
    assert.deepEqual(out.result.meta.searchCoo, [
      { country: '中国', basis: 'name', status: 'likely', url: 'https://a.example/1' },
    ]);
    assert.equal(out.result.product?.madeIn, undefined);
    assert.ok(
      out.result.product?.originCandidates?.some(
        (c) => c.source === 'web_name' && c.rating === 'likely'
      )
    );
  });
});
