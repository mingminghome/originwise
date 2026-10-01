import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isServableCachedResult } from './resultCache';
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
