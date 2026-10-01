/**
 * Origin layers field mapping (presentation-only).
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CheckResult } from '../core/types';
import { buildOriginLayers } from './OriginLayers';

function base(partial: Partial<CheckResult> = {}): CheckResult {
  return {
    schemaVersion: 1,
    relationTier: 'direct',
    title: 'Example',
    summary: 'Summary',
    ...partial,
  };
}

describe('buildOriginLayers', () => {
  it('maps Final COO from madeIn only and keeps ownership separate', () => {
    const model = buildOriginLayers(
      base({
        product: {
          brand: 'Acme',
          madeIn: 'Vietnam',
          originCandidates: [
            {
              label: 'China',
              confidence: 0.4,
              source: 'ownership',
              rating: 'mentioned',
            },
            {
              label: 'Vietnam',
              confidence: 0.9,
              source: 'confirmed_coo',
              rating: 'confirmed',
            },
            {
              label: 'Thailand',
              confidence: 0.35,
              source: 'parts',
              rating: 'possible',
            },
          ],
          parts: [{ name: 'Battery', kind: 'part', madeIn: 'China', chinaRelated: true }],
        },
        company: {
          name: 'Acme Ltd',
          hqCountry: 'USA',
          parents: [{ name: 'Holding CN', country: 'China', control: 'majority' }],
          chinaRelations: [
            { type: 'ownership', country: 'China', strength: 'strong', note: 'Parent' },
            { type: 'manufacturing', country: 'Vietnam', strength: 'moderate' },
          ],
        },
      })
    );

    assert.equal(model.finalCoo, 'Vietnam');
    assert.ok(model.brandOps.some((l) => l.kind === 'brand' && l.value === 'Acme'));
    assert.ok(model.ownership.some((l) => l.kind === 'parent' && l.name === 'Holding CN'));
    assert.ok(model.ownership.some((l) => l.kind === 'relation' && l.type === 'ownership'));
    assert.ok(model.ownership.some((l) => l.kind === 'candidate' && l.label === 'China'));
    // manufacturing relation is not ownership-class
    assert.ok(!model.ownership.some((l) => l.kind === 'relation' && l.type === 'manufacturing'));
    // confirmed_coo not duplicated into parts
    assert.ok(!model.parts.some((l) => l.kind === 'candidate' && l.label === 'Vietnam'));
    assert.ok(model.parts.some((l) => l.kind === 'candidate' && l.label === 'Thailand'));
    assert.ok(model.parts.some((l) => l.kind === 'part' && l.name === 'Battery'));
  });

  it('does not invent Final COO from ownership or unknown madeIn', () => {
    const model = buildOriginLayers(
      base({
        relationTier: 'direct',
        product: {
          madeIn: 'unknown',
          originCandidates: [
            {
              label: 'China',
              confidence: 0.5,
              source: 'ownership',
              rating: 'mentioned',
            },
          ],
        },
        company: {
          parents: [{ name: 'PRC Parent', country: 'China', control: 'wholly' }],
        },
      })
    );
    assert.equal(model.finalCoo, null);
    assert.ok(model.ownership.length >= 1);
  });
});
