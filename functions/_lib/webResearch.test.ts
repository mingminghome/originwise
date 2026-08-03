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
  it('prefers Default Search pool models first (robotics ER)', () => {
    assert.equal(WEB_SEARCH_MODEL_CHAIN[0], 'gemini-robotics-er-2-preview');
    assert.ok(
      WEB_SEARCH_MODEL_CHAIN.includes('gemini-robotics-er-1.6-preview')
    );
  });

  it('keeps Flash and legacy 2.5 after Default-pool models', () => {
    const robotics = WEB_SEARCH_MODEL_CHAIN.indexOf(
      'gemini-robotics-er-2-preview'
    );
    const flash = WEB_SEARCH_MODEL_CHAIN.indexOf('gemini-3.5-flash-lite');
    const legacy = WEB_SEARCH_MODEL_CHAIN.indexOf('gemini-2.5-flash');
    assert.ok(robotics >= 0);
    assert.ok(flash > robotics);
    assert.ok(legacy > flash);
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
      GEMINI_WEB_MODEL: 'gemini-3.6-flash',
    });
    assert.equal(chain[0], 'gemini-3.6-flash');
    assert.ok(chain.includes('gemini-3.5-flash-lite'));
    assert.equal(chain.filter((m) => m === 'gemini-3.6-flash').length, 1);
  });

  it('strips models/ prefix', () => {
    const chain = webSearchModelChain({
      GEMINI_WEB_MODEL: 'models/gemini-3.5-flash',
    });
    assert.equal(chain[0], 'gemini-3.5-flash');
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
  it('maps new-user retired models to model_unavailable', () => {
    assert.equal(
      mapWebResearchHttpError(
        404,
        'This model models/gemini-2.5-flash is no longer available to new users.'
      ),
      'model_unavailable'
    );
  });

  it('maps free-tier limit:0 and search 429 to search_grounding_unavailable', () => {
    assert.equal(
      mapWebResearchHttpError(
        429,
        'Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.0-flash'
      ),
      'search_grounding_unavailable'
    );
    assert.equal(
      mapWebResearchHttpError(
        429,
        'You exceeded your current quota, please check your plan and billing details.'
      ),
      'search_grounding_unavailable'
    );
  });

  it('does NOT treat bare model-tool errors as quota', () => {
    assert.equal(
      mapWebResearchHttpError(400, 'Grounding not available for this model'),
      'upstream_error'
    );
  });

  it('maps unavailable', () => {
    assert.equal(mapWebResearchHttpError(503, 'busy'), 'upstream_unavailable');
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

  it('skips model_unavailable and succeeds on next model', async () => {
    const modelsTried: string[] = [];
    mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
      const url = String(input);
      const m = url.match(/models\/([^:]+):generateContent/);
      const model = m?.[1] ?? 'unknown';
      modelsTried.push(model);

      if (model === 'gemini-robotics-er-2-preview') {
        return new Response(
          JSON.stringify({
            error: {
              message:
                'This model models/gemini-robotics-er-2-preview is no longer available.',
              status: 'NOT_FOUND',
            },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (model === 'gemini-robotics-er-1.6-preview') {
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    { text: 'Made in Poland; brand Japan; Foxconn parent.' },
                  ],
                },
                groundingMetadata: {
                  groundingChunks: [
                    {
                      web: {
                        title: 'Sharp',
                        uri: 'https://example.com/sharp',
                      },
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: { message: 'fail' } }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const out = await runWebResearch({
      entity: 'Sharp UA-PE30U-WB Air Purifier',
      locale: 'en',
      env: { GEMINI_API_KEY: 'test-key' },
    });

    assert.equal(out.ok, true);
    assert.equal(out.model, 'gemini-robotics-er-1.6-preview');
    assert.ok(out.brief.includes('Poland'));
    assert.deepEqual(modelsTried.slice(0, 2), [
      'gemini-robotics-er-2-preview',
      'gemini-robotics-er-1.6-preview',
    ]);
  });

  it('stops after two search_grounding_unavailable and reports that code', async () => {
    const modelsTried: string[] = [];
    mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
      const url = String(input);
      const m = url.match(/models\/([^:]+):generateContent/);
      modelsTried.push(m?.[1] ?? 'unknown');
      return new Response(
        JSON.stringify({
          error: {
            message:
              'You exceeded your current quota, please check your plan and billing details.',
            status: 'RESOURCE_EXHAUSTED',
          },
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const out = await runWebResearch({
      entity: 'Test Product',
      locale: 'en',
      env: { GEMINI_API_KEY: 'test-key' },
    });

    assert.equal(out.ok, false);
    assert.equal(out.error, 'search_grounding_unavailable');
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
        GEMINI_WEB_MODEL: 'gemini-3.6-flash',
      },
    });

    assert.equal(out.ok, true);
    assert.equal(modelsTried[0], 'gemini-3.6-flash');
    assert.equal(out.model, 'gemini-3.6-flash');
  });
});
