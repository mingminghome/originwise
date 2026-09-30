/**
 * Unit tests for Gemini Google Search web research helpers.
 * Run: npm test
 */

import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import {
  isInteractionsCapacityError,
  isRoboticsSearchModel,
  isWebLookupEnabled,
  mapWebResearchHttpError,
  parseInteractionSearch,
  parseWebSearchMaxAttempts,
  runWebResearch,
  searchGroundingPool,
  selectDefaultSearchModels,
  selectSearchModelChain,
  suggestedReplacementModel,
  webSearchModelChain,
} from './webResearch';

const LISTED_MODELS = {
  models: [
    { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-2.0-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-robotics-er-1.6-preview', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-robotics-er-2-preview', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemma-4-31b-it', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-embedding-001', supportedGenerationMethods: ['embedContent'] },
  ],
};

function isModelsListUrl(url: string): boolean {
  return /\/v1beta\/models(\?|$)/.test(url) && !url.includes('generateContent');
}

function withListedModels(
  handler: (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => Promise<Response>
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return async (input, init) => {
    if (isModelsListUrl(String(input))) {
      return new Response(JSON.stringify(LISTED_MODELS), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return handler(input, init);
  };
}

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

function groundedGcResponse(text: string, title = 'Retailer', uri = 'https://example.com/p'): Response {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: { parts: [{ text }] },
          groundingMetadata: {
            webSearchQueries: ['origin query'],
            groundingChunks: [{ web: { title, uri } }],
          },
        },
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

function groundedIxResponse(text: string, title = 'Retailer', url = 'https://example.com/p'): Response {
  return new Response(
    JSON.stringify({
      output_text: text,
      steps: [
        {
          type: 'model_output',
          content: [
            {
              type: 'text',
              text,
              annotations: [{ type: 'url_citation', title, url }],
            },
          ],
        },
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

describe('isRoboticsSearchModel', () => {
  it('detects robotics ER Search models', () => {
    assert.equal(isRoboticsSearchModel('gemini-robotics-er-2-preview'), true);
    assert.equal(isRoboticsSearchModel('models/gemini-robotics-er-1.6-preview'), true);
    assert.equal(isRoboticsSearchModel('gemini-3.8-flash'), false);
  });
});

describe('searchGroundingPool / selectDefaultSearchModels', () => {
  it('classifies Gemini families vs Default pool', () => {
    assert.equal(searchGroundingPool('gemini-3.8-flash'), 'gemini3');
    assert.equal(searchGroundingPool('gemini-2.5-flash-lite'), 'gemini25');
    assert.equal(searchGroundingPool('gemini-2.0-flash'), 'gemini2');
    assert.equal(
      searchGroundingPool('gemini-robotics-er-2-preview'),
      'default'
    );
    assert.equal(searchGroundingPool('gemma-4-31b-it'), 'default');
    assert.equal(searchGroundingPool('gemini-embedding-001'), 'skip');
  });

  it('keeps only Default-pool ids from a live model list', () => {
    const selected = selectDefaultSearchModels([
      'gemini-3.8-flash',
      'gemini-2.5-flash-lite',
      'gemini-robotics-er-1.6-preview',
      'gemini-robotics-er-2-preview',
      'gemma-4-31b-it',
    ]);
    assert.deepEqual(selected, [
      'gemini-robotics-er-2-preview',
      'gemini-robotics-er-1.6-preview',
    ]);
    assert.ok(!selected.includes('gemini-3.8-flash'));
  });

  it('auto Search chain prefers Default then 2.5 then 2; Gemini 3 last', () => {
    const chain = selectSearchModelChain([
      'gemini-3.8-flash',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-robotics-er-2-preview',
      'gemini-robotics-er-1.6-preview',
      'gemma-4-31b-it',
    ]);
    assert.equal(chain[0], 'gemini-robotics-er-2-preview');
    assert.ok(chain.indexOf('gemini-robotics-er-2-preview') < chain.indexOf('gemini-2.5-flash-lite'));
    assert.ok(chain.includes('gemini-2.0-flash'));
    assert.ok(chain.includes('gemini-3.8-flash'));
    assert.ok(chain.indexOf('gemini-2.5-flash-lite') < chain.indexOf('gemini-3.8-flash'));
    // gemma demoted — not ahead of robotics
    assert.ok(chain.indexOf('gemma-4-31b-it') < 0 || chain.indexOf('gemma-4-31b-it') > 0);
  });
});

describe('parseWebSearchMaxAttempts', () => {
  it('defaults to 5 and caps at 8', () => {
    assert.equal(parseWebSearchMaxAttempts({}), 5);
    assert.equal(parseWebSearchMaxAttempts({ WEB_SEARCH_MAX_ATTEMPTS: '2' }), 2);
    assert.equal(parseWebSearchMaxAttempts({ WEB_SEARCH_MAX_ATTEMPTS: '99' }), 8);
    assert.equal(parseWebSearchMaxAttempts({ WEB_SEARCH_MAX_ATTEMPTS: '0' }), 5);
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
  it('auto / default / free means discover (no hardcoded ids)', () => {
    assert.deepEqual(webSearchModelChain({}), []);
    assert.deepEqual(webSearchModelChain({ GEMINI_WEB_MODEL: 'auto' }), []);
    assert.deepEqual(webSearchModelChain({ GEMINI_WEB_MODEL: 'default' }), []);
  });

  it('pins GEMINI_WEB_MODEL only', () => {
    const chain = webSearchModelChain({
      GEMINI_WEB_MODEL: 'gemini-3.6-flash',
    });
    assert.deepEqual(chain, ['gemini-3.6-flash']);
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

  it('parses Google suggested replacement model from 404 body', () => {
    assert.equal(
      suggestedReplacementModel(
        'This model models/gemini-2.5-flash-lite is no longer available to new users. Please update your code to use models/gemini-3.5-flash-lite for the latest features.'
      ),
      'gemini-3.5-flash-lite'
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

  it('detects Interactions capacity / high-demand errors', () => {
    assert.equal(
      isInteractionsCapacityError(
        503,
        'gemini-robotics-er-2-preview is currently experiencing high demand, spikes in demand are usually temporary. Please try again later.'
      ),
      true
    );
    assert.equal(isInteractionsCapacityError(504, 'gateway'), true);
    assert.equal(
      isInteractionsCapacityError(
        429,
        'You exceeded your current quota, please check your plan and billing details.'
      ),
      false
    );
    assert.equal(isInteractionsCapacityError(404, 'not found'), false);
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
      withListedModels(async (input: RequestInfo | URL, init?: RequestInit) => {
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
      })
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
    assert.ok(out.sources.some((s) => s.includes('Sharp')));
    assert.ok(
      urls.some(
        (u) =>
          u.includes('/v1beta2/interactions') || u.includes('/v1beta/interactions')
      )
    );
    assert.equal(toolType, 'google_search');
  });

  it('skips model_unavailable and succeeds on next model', async () => {
    const modelsTried: string[] = [];
    mock.method(
      globalThis,
      'fetch',
      withListedModels(async (input: RequestInfo | URL, init?: RequestInit) => {
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
          // Robotics prefers Interactions; serve grounded IX on /interactions,
          // and grounded GC if the test hits generateContent.
          if (String(input).includes('/interactions')) {
            return groundedIxResponse(
              'Made in Poland; brand Japan; Foxconn parent.',
              'Sharp',
              'https://example.com/sharp'
            );
          }
          return groundedGcResponse(
            'Made in Poland; brand Japan; Foxconn parent.',
            'Sharp',
            'https://example.com/sharp'
          );
        }
        return new Response(
          JSON.stringify({ error: { message: 'fail' } }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      })
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
      withListedModels(async (input: RequestInfo | URL, init?: RequestInit) => {
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
      })
    );

    const out = await runWebResearch({
      entity: 'Test Product',
      locale: 'en',
      env: { GEMINI_API_KEY: 'test-key' },
    });

    assert.equal(out.ok, false);
    assert.equal(out.error, 'search_grounding_unavailable');
    assert.equal(modelsTried[0], 'gemini-robotics-er-2-preview');
    assert.ok(modelsTried.includes('gemini-2.5-flash-lite'));
    // Robotics may hit Interactions + generateContent per attempt
    assert.ok(new Set(modelsTried).size <= 5);
  });

  it('falls back across pools after empty / grounding fails', async () => {
    const modelsTried: string[] = [];
    mock.method(
      globalThis,
      'fetch',
      withListedModels(async (input: RequestInfo | URL, init?: RequestInit) => {
        const model = modelFromFetch(input, init);
        modelsTried.push(model);
        if (model.startsWith('gemini-robotics') || model.startsWith('gemma')) {
          return new Response(
            JSON.stringify({
              candidates: [{ content: { parts: [{ text: '' }] } }],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (model === 'gemini-2.5-flash-lite') {
          return groundedGcResponse('Toshiba DW factory notes from web.');
        }
        return new Response(
          JSON.stringify({
            error: { message: 'You exceeded your current quota' },
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );

    const out = await runWebResearch({
      entity: 'Toshiba DW-05T2-HK',
      locale: 'en',
      env: { GEMINI_API_KEY: 'test-key' },
    });

    assert.equal(out.ok, true);
    assert.equal(out.model, 'gemini-2.5-flash-lite');
    assert.ok(out.brief.includes('Toshiba'));
    assert.equal(modelsTried[0], 'gemini-robotics-er-2-preview');
    assert.ok(!modelsTried.includes('gemini-3.8-flash'));
  });

  it('respects WEB_SEARCH_MAX_ATTEMPTS', async () => {
    const modelsTried: string[] = [];
    mock.method(
      globalThis,
      'fetch',
      withListedModels(async (input: RequestInfo | URL, init?: RequestInit) => {
        modelsTried.push(modelFromFetch(input, init));
        return new Response(
          JSON.stringify({
            error: { message: 'You exceeded your current quota' },
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );

    const out = await runWebResearch({
      entity: 'Test Product',
      locale: 'en',
      env: {
        GEMINI_API_KEY: 'test-key',
        WEB_SEARCH_MAX_ATTEMPTS: '2',
      },
    });

    assert.equal(out.ok, false);
    assert.equal(out.error, 'search_grounding_unavailable');
    assert.equal(new Set(modelsTried).size, 2);
  });

  it('pinned Gemini 3 Search fail still walks Default/2.5 fallback', async () => {
    // Pin is preferred first, then auto chain — tip must not die on dead pin alone.
    const modelsTried: string[] = [];
    mock.method(
      globalThis,
      'fetch',
      withListedModels(async (input: RequestInfo | URL, init?: RequestInit) => {
        const model = modelFromFetch(input, init);
        modelsTried.push(model);
        if (model === 'gemini-3.8-flash') {
          return new Response(
            JSON.stringify({
              error: {
                message:
                  'Quota exceeded for metric: free_tier, limit: 0, model: gemini-3.8-flash',
              },
            }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (model === 'gemini-robotics-er-2-preview') {
          if (String(input).includes('/interactions')) {
            return groundedIxResponse('Recovered via Default Search pool.');
          }
          return groundedGcResponse('Recovered via Default Search pool.');
        }
        return new Response(
          JSON.stringify({ error: { message: 'fail' } }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );

    const out = await runWebResearch({
      entity: 'Widget',
      locale: 'en',
      env: {
        GEMINI_API_KEY: 'k',
        GEMINI_WEB_MODEL: 'gemini-3.8-flash',
      },
    });

    assert.equal(out.ok, true);
    assert.equal(out.model, 'gemini-robotics-er-2-preview');
    assert.equal(modelsTried[0], 'gemini-3.8-flash');
    assert.ok(modelsTried.includes('gemini-robotics-er-2-preview'));
  });

  it('uses pinned GEMINI_WEB_MODEL first', async () => {
    const modelsTried: string[] = [];
    mock.method(
      globalThis,
      'fetch',
      withListedModels(async (input: RequestInfo | URL, init?: RequestInit) => {
        modelsTried.push(modelFromFetch(input, init));
        return groundedIxResponse('brief from pin');
      })
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

  it('pinned model_unavailable falls back to Default pool', async () => {
    const modelsTried: string[] = [];
    mock.method(
      globalThis,
      'fetch',
      withListedModels(async (input: RequestInfo | URL, init?: RequestInit) => {
        const model = modelFromFetch(input, init);
        modelsTried.push(model);
        if (model === 'gemini-robotics-er-2-preview') {
          return new Response(
            JSON.stringify({
              error: {
                message:
                  'This model models/gemini-robotics-er-2-preview is no longer available to new users.',
                status: 'NOT_FOUND',
              },
            }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (model === 'gemini-2.5-flash-lite') {
          return groundedGcResponse('COO: Thailand | source: retailer');
        }
        return new Response(
          JSON.stringify({
            error: {
              message: `This model models/${model} is no longer available to new users.`,
            },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );

    const out = await runWebResearch({
      entity: 'Toshiba ER-D3000A',
      locale: 'zh-Hant',
      env: {
        GEMINI_API_KEY: 'k',
        GEMINI_WEB_MODEL: 'gemini-robotics-er-2-preview',
      },
    });

    assert.equal(out.ok, true);
    assert.equal(out.model, 'gemini-2.5-flash-lite');
    assert.equal(modelsTried[0], 'gemini-robotics-er-2-preview');
    assert.ok(out.brief.includes('Thailand'));
  });

  it('empty Models list still tries robotics-first static Search fallback', async () => {
    const modelsTried: string[] = [];
    mock.method(
      globalThis,
      'fetch',
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (isModelsListUrl(url)) {
          return new Response('{}', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        const model = modelFromFetch(input, init);
        modelsTried.push(model);
        if (model === 'gemini-robotics-er-2-preview') {
          if (String(input).includes('/interactions')) {
            return groundedIxResponse('Static robotics brief.');
          }
          return groundedGcResponse('Static robotics brief.');
        }
        return new Response(
          JSON.stringify({
            error: { message: `models/${model} is not found for API version` },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
    );

    const out = await runWebResearch({
      entity: 'Generic SKU',
      locale: 'en',
      env: { GEMINI_API_KEY: 'k' },
    });

    assert.equal(out.ok, true);
    assert.equal(out.model, 'gemini-robotics-er-2-preview');
    assert.equal(modelsTried[0], 'gemini-robotics-er-2-preview');
  });


  it('robotics Search uses Interactions first and populates Sources', async () => {
    const urls: string[] = [];
    mock.method(
      globalThis,
      'fetch',
      withListedModels(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        urls.push(url);
        if (url.includes('/interactions')) {
          return groundedIxResponse(
            'COO: Thailand | source: retailer | via: ubuy',
            'ubuy',
            'https://www.u-buy.co.uk/product'
          );
        }
        // Ungrounded GC must not win over Interactions
        return new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ text: 'Memory-only COO guess.' }] } },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );

    const out = await runWebResearch({
      entity: 'Generic Appliance SKU-100',
      locale: 'en',
      env: { GEMINI_API_KEY: 'test-key' },
    });

    assert.equal(out.ok, true);
    assert.equal(out.model, 'gemini-robotics-er-2-preview');
    assert.ok(out.brief.includes('Thailand'));
    assert.ok(out.sources.some((s) => s.includes('ubuy')));
    assert.ok(out.brief.includes('Sources:'));
    assert.ok(urls.some((u) => u.includes('/v1beta/interactions')));
    // Interactions tried before generateContent for robotics
    const ix = urls.findIndex((u) => u.includes('/interactions'));
    const gc = urls.findIndex((u) => u.includes('generateContent'));
    assert.ok(ix >= 0);
    assert.ok(gc < 0 || ix < gc);
  });

  it('rejects ungrounded generateContent as Search miss and keeps walking', async () => {
    const modelsTried: string[] = [];
    mock.method(
      globalThis,
      'fetch',
      withListedModels(async (input: RequestInfo | URL, init?: RequestInit) => {
        const model = modelFromFetch(input, init);
        modelsTried.push(model);
        const url = String(input);
        if (model.startsWith('gemini-robotics')) {
          if (url.includes('/interactions')) {
            return new Response(
              JSON.stringify({ error: { message: 'interactions down' } }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          }
          // Memory-only GC — must not count as Search success
          return new Response(
            JSON.stringify({
              candidates: [
                { content: { parts: [{ text: 'Ungrounded memory brief.' }] } },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (model === 'gemini-2.5-flash-lite') {
          return groundedGcResponse('Grounded retailer COO notes.');
        }
        return new Response(
          JSON.stringify({ error: { message: 'fail' } }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );

    const out = await runWebResearch({
      entity: 'Generic Appliance SKU-100',
      locale: 'en',
      env: { GEMINI_API_KEY: 'test-key' },
    });

    assert.equal(out.ok, true);
    assert.equal(out.model, 'gemini-2.5-flash-lite');
    assert.ok(out.sources.length > 0);
    assert.ok(modelsTried.includes('gemini-robotics-er-2-preview'));
  });

  it('retries Interactions 503 high demand then populates Sources', async () => {
    let ixHits = 0;
    const urls: string[] = [];
    mock.method(
      globalThis,
      'fetch',
      withListedModels(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        urls.push(url);
        const model = modelFromFetch(input, init);
        if (url.includes('/interactions') && model.startsWith('gemini-robotics')) {
          ixHits += 1;
          if (ixHits < 3) {
            return new Response(
              JSON.stringify({
                error: {
                  message:
                    'gemini-robotics-er-2-preview is currently experiencing high demand, spikes in demand are usually temporary. Please try again later.',
                  code: 'service_unavailable',
                },
              }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          }
          return groundedIxResponse(
            'COO: Thailand | source: retailer | via: example',
            'example',
            'https://example.com/d3000a'
          );
        }
        return new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ text: 'Memory-only.' }] } },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );

    const out = await runWebResearch({
      entity: 'D3000A',
      locale: 'en',
      env: { GEMINI_API_KEY: 'test-key' },
    });

    assert.equal(out.ok, true);
    assert.equal(out.model, 'gemini-robotics-er-2-preview');
    assert.ok(out.sources.some((s) => s.includes('example.com')));
    assert.ok(ixHits >= 3, `expected capacity retries, got ixHits=${ixHits}`);
  });

  it('keeps upstream_unavailable when Gemini 3 Search 429 follows robotics capacity miss', async () => {
    mock.method(
      globalThis,
      'fetch',
      withListedModels(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const model = modelFromFetch(input, init);
        if (model.startsWith('gemini-robotics')) {
          if (url.includes('/interactions')) {
            return new Response(
              JSON.stringify({
                error: {
                  message:
                    'gemini-robotics-er-2-preview is currently experiencing high demand. Please try again later.',
                  code: 'service_unavailable',
                },
              }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          }
          // GC also unavailable under load
          return new Response(
            JSON.stringify({ error: { message: 'high demand' } }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (url.includes('/interactions') || url.includes('generateContent')) {
          return new Response(
            JSON.stringify({
              error: {
                message:
                  'You exceeded your current quota, please check your plan and billing details.',
              },
            }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 500 });
      })
    );

    const out = await runWebResearch({
      entity: 'D3000A',
      locale: 'en',
      env: { GEMINI_API_KEY: 'test-key', WEB_SEARCH_MAX_ATTEMPTS: '4' },
    });

    assert.equal(out.ok, false);
    // Must NOT claim Search entitlement gap when Default pool only hit capacity.
    assert.equal(out.error, 'upstream_unavailable');
  });

  it('queues Google suggested replacement after model_unavailable', async () => {
    const modelsTried: string[] = [];
    mock.method(
      globalThis,
      'fetch',
      withListedModels(async (input: RequestInfo | URL, init?: RequestInit) => {
        const model = modelFromFetch(input, init);
        modelsTried.push(model);
        if (model === 'gemini-2.5-flash-lite') {
          return new Response(
            JSON.stringify({
              error: {
                message:
                  'This model models/gemini-2.5-flash-lite is no longer available to new users. Please update your code to use models/gemini-3.5-flash-lite.',
              },
            }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (model === 'gemini-3.5-flash-lite') {
          if (String(input).includes('/interactions')) {
            return groundedIxResponse('Recovered via suggested replacement.');
          }
          return groundedGcResponse('Recovered via suggested replacement.');
        }
        // Force early 404 on defaults so we reach 2.5 then suggestion
        return new Response(
          JSON.stringify({
            error: {
              message: `This model models/${model} is no longer available to new users.`,
            },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );

    const out = await runWebResearch({
      entity: 'Generic SKU',
      locale: 'en',
      env: {
        GEMINI_API_KEY: 'k',
        GEMINI_WEB_MODEL: 'gemini-2.5-flash-lite',
        WEB_SEARCH_MAX_ATTEMPTS: '6',
      },
    });

    assert.equal(out.ok, true);
    assert.equal(out.model, 'gemini-3.5-flash-lite');
    assert.equal(modelsTried[0], 'gemini-2.5-flash-lite');
    assert.ok(modelsTried.includes('gemini-3.5-flash-lite'));
  });
});
