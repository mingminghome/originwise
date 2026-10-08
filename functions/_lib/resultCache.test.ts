import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cacheEntryBody, isServableCachedResult } from './resultCache';
import type { CheckResult } from './schema';

function base(partial: Partial<CheckResult> & { product?: CheckResult['product']; meta?: CheckResult['meta'] }): CheckResult {
  return {
    schemaVersion: 1,
    relationTier: 'direct',
    title: 'Toshiba ER-D3000A',
    summary: 'test',
    confidence: 0.8,
    tierReasons: [],
    caveats: [],
    regions: [],
    geoScope: 'CN_HK_TW_MO',
    disclaimerKey: 'demo',
    knowledgeBasis: 'model_memory',
    graph: { nodes: [], edges: [] },
    product: { name: 'Toshiba ER-D3000A', ...(partial.product ?? {}) },
    meta: { jobId: 'test', ...(partial.meta ?? {}) },
    ...partial,
  } as CheckResult;
}

describe('isServableCachedResult', () => {
  it('serves confirmed madeIn even if web failed', () => {
    const ok = isServableCachedResult(
      base({
        knowledgeBasis: 'web_enriched',
        product: { name: 'X', madeIn: 'Thailand' },
        meta: {
          jobId: 't',
          agents: [{ id: 'web', ok: false, provider: 'gemini' }],
        },
      })
    );
    assert.equal(ok, true);
  });

  it('serves Chinese confirmed madeIn', () => {
    assert.equal(
      isServableCachedResult(
        base({ product: { name: 'X', madeIn: '泰國' } })
      ),
      true
    );
  });

  it('rejects unconfirmed madeIn when web failed (stale 快取 / 未確認)', () => {
    const ok = isServableCachedResult(
      base({
        knowledgeBasis: 'model_memory',
        product: { name: 'X', madeIn: 'unknown' },
        meta: {
          jobId: 't',
          agents: [
            { id: 'web', ok: false, provider: 'gemini', error: 'quota' },
            { id: 'product', ok: true, provider: 'gemini' },
          ],
        },
      })
    );
    assert.equal(ok, false);
  });

  it('rejects empty madeIn when web failed', () => {
    assert.equal(
      isServableCachedResult(
        base({
          product: { name: 'X' },
          meta: {
            jobId: 't',
            agents: [{ id: 'web', ok: false }],
          },
        })
      ),
      false
    );
  });

  it('serves unconfirmed madeIn when web succeeded (honest unknown)', () => {
    assert.equal(
      isServableCachedResult(
        base({
          knowledgeBasis: 'web_enriched',
          product: { name: 'X', madeIn: '未知' },
          meta: {
            jobId: 't',
            agents: [{ id: 'web', ok: true, provider: 'gemini' }],
          },
        })
      ),
      true
    );
  });

  it('serves unconfirmed when no web agent row (legacy cache)', () => {
    assert.equal(
      isServableCachedResult(
        base({
          product: { name: 'X', madeIn: 'unknown' },
          meta: { jobId: 't', agents: [{ id: 'product', ok: true }] },
        })
      ),
      true
    );
  });
});

describe('cacheEntryBody', () => {
  it('stores no job ID or IP in the cached copy', () => {
    const r = base({
      product: { name: 'X', madeIn: '泰國' },
      meta: {
        jobId: 'job-abc123',
        cached: true,
        cachedAt: '2026-01-01T00:00:00.000Z',
        searchProvider: 'firecrawl',
        ipHash: 'iphash-xyz',
      } as CheckResult['meta'],
    });
    (r as unknown as Record<string, unknown>).jobId = 'job-abc123';
    const body = cacheEntryBody(r, '2026-10-08T09:00:00.000Z');
    assert.equal(body.includes('job-abc123'), false);
    assert.equal(body.includes('iphash-xyz'), false);
    assert.equal(/"jobId"|"ipHash"/.test(body), false);
    const parsed = JSON.parse(body);
    assert.equal(parsed.cachedAt, '2026-10-08T09:00:00.000Z');
    assert.equal(parsed.result.meta.searchProvider, 'firecrawl');
    assert.equal(parsed.result.meta.cached, undefined);
    assert.equal(parsed.result.product.madeIn, '泰國');
  });

  it('keeps a stored entry servable', () => {
    const r = base({ product: { name: 'X', madeIn: '泰國' } });
    const parsed = JSON.parse(cacheEntryBody(r, 'now'));
    assert.equal(isServableCachedResult(parsed.result), true);
  });
});
