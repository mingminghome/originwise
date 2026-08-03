/**
 * Unit tests for Gemini Google Search web research helpers.
 * Run: npm test
 */

import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import {
  isWebLookupEnabled,
  mapWebResearchHttpError,
  runWebResearch,
  WEB_SEARCH_MODEL_CHAIN,
  webSearchModelChain,
} from './webResearch';

describe('WEB_SEARCH_MODEL_CHAIN', () => {
  it('starts with gemini-2.5-flash (not flash-lite)', () => {
    assert.equal(WEB_SEARCH_MODEL_CHAIN[0], 'gemini-2.5-flash');
    assert.ok(!WEB_SEARCH_MODEL_CHAIN[0]!.includes('lite'));
  });

  it('includes stable flash fallbacks before lite', () => {
    const flashIdx = WEB_SEARCH_MODEL_CHAIN.indexOf('gemini-2.5-flash');
    const liteIdx = WEB_SEARCH_MODEL_CHAIN.indexOf('gemini-2.5-flash-lite');
    assert.ok(flashIdx >= 0);
    assert.ok(liteIdx > flashIdx);
  });
});

describe('webSearchModelChain', () => {
  it('default / auto uses dedicated chain, not agent free-tier order', () => {
    assert.deepEqual(webSearchModelChain({}), [...WEB_SEARCH_MODEL_CHAIN]);
    assert.deepEqual(webSearchModelChain({ GEMINI_WEB_MODEL: 'auto' }), [
      ...WEB_SEARCH_MODEL_CHAIN,
    ]);
    assert.deepEqual(webSearchModelChain({ GEMINI_WEB_MODEL: 'free' }), [
      ...WEB_SEARCH_MODEL_CHAIN,
    ]);
  });

  it('pins GEMINI_WEB_MODEL first then falls back', () => {
    const chain = webSearchModelChain({
      GEMINI_WEB_MODEL: 'gemini-2.0-flash',
    });
    assert.equal(chain[0], 'gemini-2.0-flash');
    assert.ok(chain.includes('gemini-2.5-flash'));
    // no duplicate preferred id
    assert.equal(chain.filter((m) => m === 'gemini-2.0-flash').length, 1);
  });

  it('strips models/ prefix', () => {
    const chain = webSearchModelChain({
      GEMINI_WEB_MODEL: 'models/gemini-2.5-flash',
    });
    assert.equal(chain[0], 'gemini-2.5-flash');
  });
});

describe('isWebLookupEnabled', () => {
  it('auto on only when Gemini key present', () => {
    assert.equal(isWebLookupEnabled({}), false);
    assert.equal(isWebLookupEnabled({ GEMINI_API_KEY: 'k' }), true);
    assert.equal(
      isWebLookupEnabled({ WEB_LOOKUP: 'auto', GEMINI_API_KEY: 'k' }),
      true
    );
  });

  it('off disables even with key', () => {
    assert.equal(
      isWebLookupEnabled({ WEB_LOOKUP: 'off', GEMINI_API_KEY: 'k' }),
      false
    );
  });
});

describe('mapWebResearchHttpError', () => {
  it('maps 429 and resource exhausted to upstream_quota', () => {
    assert.equal(mapWebResearchHttpError(429, 'Too Many Requests'), 'upstream_quota');
    assert.equal(
      mapWebResearchHttpError(403, 'RESOURCE_EXHAUSTED: quota'),
      'upstream_quota'
    );
    assert.equal(
      mapWebResearchHttpError(400, 'rate limit exceeded'),
      'upstream_quota'
    );
  });

  it('does NOT treat bare "grounding" mention as quota', () => {
    assert.equal(
      mapWebResearchHttpError(400, 'Grounding not available for this model'),
      'upstream_error'
    );
  });

  it('maps unavailable and generic errors', () => {
    assert.equal(mapWebResearchHttpError(503, 'busy'), 'upstream_unavailable');
    assert.equal(mapWebResearchHttpError(500, 'boom'), 'upstream_error');
    assert.equal(
      mapWebResearchHttpError(404, 'model not found'),
      'upstream_error'
    );
  });
});

describe('runWebResearch', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('returns disabled without calling fetch when WEB_LOOKUP=off', async () => {
    let called = false;
    mock.method(globalThis, 'fetch', async () => {
      called = true;
      return new Response('{}');
    });
    const out = await runWebResearch({
      entity: 'Sharp UA-PE30U-WB',
      locale: 'en',
      env: { WEB_LOOKUP: 'off', GEMINI_API_KEY: 'k' },
    });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'disabled');
    assert.equal(called, false);
  });

  it('falls through to gemini-2.5-flash after lite/model error (not abort on grounding text)', async () => {
    const modelsTried: string[] = [];
    mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
      const url = String(input);
      const m = url.match(/models\/([^:]+):generateContent/);
      const model = m?.[1] ?? 'unknown';
      modelsTried.push(model);

      // Fail first model if somehow lite; succeed on 2.5-flash
      if (model === 'gemini-2.5-flash') {
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: 'Made in Poland; brand Japan; Foxconn parent.' }],
                },
                groundingMetadata: {
                  groundingChunks: [
                    { web: { title: 'Sharp', uri: 'https://example.com/sharp' } },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({
          error: { message: 'Grounding not supported on this model' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const out = await runWebResearch({
      entity: 'Sharp UA-PE30U-WB Air Purifier',
      locale: 'en',
      env: { GEMINI_API_KEY: 'test-key' },
    });

    assert.equal(out.ok, true);
    assert.equal(out.model, 'gemini-2.5-flash');
    assert.ok(out.brief.includes('Poland'));
    assert.ok(out.sources.some((s) => s.includes('example.com')));
    // Primary attempt is 2.5-flash
    assert.equal(modelsTried[0], 'gemini-2.5-flash');
  });

  it('tries next model after one quota, stops after two consecutive quotas', async () => {
    const modelsTried: string[] = [];
    mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
      const url = String(input);
      const m = url.match(/models\/([^:]+):generateContent/);
      modelsTried.push(m?.[1] ?? 'unknown');
      return new Response(
        JSON.stringify({ error: { message: 'Resource exhausted' } }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const out = await runWebResearch({
      entity: 'Test Product',
      locale: 'en',
      env: { GEMINI_API_KEY: 'test-key' },
    });

    assert.equal(out.ok, false);
    assert.equal(out.error, 'upstream_quota');
    // Two consecutive quota failures → stop (not entire chain)
    assert.equal(modelsTried.length, 2);
  });

  it('uses pinned GEMINI_WEB_MODEL first', async () => {
    const modelsTried: string[] = [];
    mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
      const url = String(input);
      const m = url.match(/models\/([^:]+):generateContent/);
      modelsTried.push(m?.[1] ?? 'unknown');
      return new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: 'brief from pin' }] } },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const out = await runWebResearch({
      entity: 'Widget',
      locale: 'en',
      env: {
        GEMINI_API_KEY: 'k',
        GEMINI_WEB_MODEL: 'gemini-2.0-flash',
      },
    });

    assert.equal(out.ok, true);
    assert.equal(modelsTried[0], 'gemini-2.0-flash');
    assert.equal(out.model, 'gemini-2.0-flash');
  });
});
