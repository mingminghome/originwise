/**
 * Unit tests for Gemini Google Search web research helpers.
 * Run: npm test
 */

import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import {
  isWebLookupEnabled,
  mapWebResearchHttpError,
  parseInteractionSearch,
  runWebResearch,
  WEB_SEARCH_MODEL_CHAIN,
  webSearchModelChain,
} from './webResearch';

function modelFromFetch(input: RequestInfo | URL, init?: RequestInit): string {
  const url = String(input);
  const m = url.match(/models\/([^:]+):generateContent/);
  if (m?.[1]) return m[1];
  if (url.includes('/interactions')) {
    try {
      const body = JSON.parse(String(init?.body || '{}')) as { model?: string };
      return body.model || 'interactions';
    } catch {
      return 'interactions';
    }
  }
  return 'unknown';
}

describe('WEB_SEARCH_MODEL_CHAIN', () => {
  it('prefers Default Search / Gemini 2 pools before Gemini 3 (often 0/0)', () => {
    assert.equal(WEB_SEARCH_MODEL_CHAIN[0], 'gemini-robotics-er-2-preview');
    const robotics = WEB_SEARCH_MODEL_CHAIN.indexOf(
      'gemini-robotics-er-2-preview'
    );
    const gemma = WEB_SEARCH_MODEL_CHAIN.indexOf('gemma-4-31b-it');
    const flash2 = WEB_SEARCH_MODEL_CHAIN.indexOf('gemini-2.0-flash');
    const flash25 = WEB_SEARCH_MODEL_CHAIN.indexOf('gemini-2.5-flash-lite');
    const flash3 = WEB_SEARCH_MODEL_CHAIN.indexOf('gemini-3.8-flash');
    assert.ok(robotics >= 0);
    assert.ok(gemma > robotics);
    assert.ok(flash2 > gemma);
    assert.ok(flash25 > flash2);
    assert.ok(flash3 > flash25);
  });
});

describe('parseInteractionSearch', () => {
  it('reads output_text and url_citation annotations', () => {
    const parsed = parseInteractionSearch({
      output_text: 'Spain won Euro 2024.',
      steps: [
        {
          type: 'model_output',
          content: [
            {
              type: 'text',
              text: 'Spain won Euro 2024.',
              annotations: [
                {
                  type: 'url_citation',
                  title: 'UEFA',
                  url: 'https://uefa.com/euro2024',
                },
              ],
            },
          ],
        },
      ],
    });
    assert.equal(parsed.text, 'Spain won Euro 2024.');
    assert.deepEqual(parsed.sources, ['UEFA — https://uefa.com/euro2024']);
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

  it('uses Interactions API google_search when a Gemini 3 model is pinned', async () => {
    const urls: string[] = [];
    let toolType = '';
    mock.method(
      globalThis,
      'fetch',
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        urls.push(url);
        const body = JSON.parse(String(init?.body || '{}')) as {
          model?: string;
          tools?: Array<{ type?: string }>;
        };
        toolType = body.tools?.[0]?.type || '';
        return new Response(
          JSON.stringify({
            output_text: 'Made in Poland; brand Japan.',
            steps: [
              {
                type: 'model_output',
                content: [
                  {
                    type: 'text',
                    text: 'Made in Poland; brand Japan.',
                    annotations: [
                      {
                        type: 'url_citation',
                        title: 'Sharp',
                        url: 'https://example.com/sharp',
                      },
                    ],
                  },
                ],
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    );

    const out = await runWebResearch({
      entity: 'Sharp UA-PE30U-WB Air Purifier',
      locale: 'en',
      env: {
        GEMINI_API_KEY: 'test-key',
        GEMINI_WEB_MODEL: 'gemini-3.8-flash',
      },
    });

    assert.equal(out.ok, true);
    assert.equal(out.model, 'gemini-3.8-flash');
    assert.ok(out.brief.includes('Poland'));
    assert.ok(out.brief.includes('Sharp'));
    assert.ok(
      urls[0]?.includes('/v1beta2/interactions') ||
        urls[0]?.includes('/v1beta/interactions')
    );
    assert.equal(toolType, 'google_search');
  });

  it('skips model_unavailable and succeeds on next model', async () => {
    const modelsTried: string[] = [];
    mock.method(
      globalThis,
      'fetch',
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const model = modelFromFetch(input, init);
        modelsTried.push(model);

        if (model === 'gemini-robotics-er-2-preview') {
          return new Response(
            JSON.stringify({
              error: {
                message: `This model models/${model} is no longer available.`,
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
      }
    );

    const out = await runWebResearch({
      entity: 'Sharp UA-PE30U-WB Air Purifier',
      locale: 'en',
      env: { GEMINI_API_KEY: 'test-key' },
    });

    assert.equal(out.ok, true);
    assert.equal(out.model, 'gemini-robotics-er-1.6-preview');
    assert.ok(out.brief.includes('Poland'));
    assert.equal(modelsTried[0], 'gemini-robotics-er-2-preview');
  });

  it('tries several Search models before giving up on grounding quota', async () => {
    const modelsTried: string[] = [];
    mock.method(
      globalThis,
      'fetch',
      async (input: RequestInfo | URL, init?: RequestInit) => {
        modelsTried.push(modelFromFetch(input, init));
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
      }
    );

    const out = await runWebResearch({
      entity: 'Test Product',
      locale: 'en',
      env: { GEMINI_API_KEY: 'test-key' },
    });

    assert.equal(out.ok, false);
    assert.equal(out.error, 'search_grounding_unavailable');
    assert.equal(modelsTried[0], 'gemini-robotics-er-2-preview');
    assert.ok(modelsTried.includes('gemini-2.0-flash'));
    assert.ok(modelsTried.includes('gemma-4-31b-it'));
    assert.ok(modelsTried.length >= 4);
  });

  it('uses pinned GEMINI_WEB_MODEL first', async () => {
    const modelsTried: string[] = [];
    mock.method(
      globalThis,
      'fetch',
      async (input: RequestInfo | URL, init?: RequestInit) => {
        modelsTried.push(modelFromFetch(input, init));
        return new Response(
          JSON.stringify({ output_text: 'brief from pin' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    );

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
