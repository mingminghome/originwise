/**
 * Prompt contracts for origin/ownership accuracy (no brand hardcoding).
 * Run: npm test
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCheckPrompt, CHECK_SECTIONS } from './checkQuery';
import type { GeoScope } from './regions';
import type { CheckDimension } from './schema';

const geoScope: GeoScope = 'prc';

function prompt(dimensions: CheckDimension[], text = 'stroller'): string {
  return buildCheckPrompt({
    locale: 'en',
    text,
    geoScope,
    dimensions,
    hasImage: false,
  });
}

describe('origin accuracy prompt contracts', () => {
  it('tells the product section not to copy design HQ into madeIn', () => {
    const p = prompt(['origin', 'manufacturer']);
    assert.match(p, /DESIGN HQ ≠ FACTORY/);
    assert.match(p, /NEVER copy HQ/);
    assert.doesNotMatch(p, /"alternatives"/);
  });

  it('tells parts[] not to invent countries or copy brand HQ when ungrounded', () => {
    const p = prompt(['origin']);
    assert.match(p, /NEVER copy brand HQ/);
    assert.match(p, /Do not invent ANY country on parts/i);
    assert.match(p, /OMIT madeIn and originCountry/i);
  });

  it('tells the company section not to treat distributors as parents', () => {
    const p = prompt(['company_relations']);
    assert.match(p, /PARENT vs LOCAL DISTRIBUTOR/);
    assert.match(p, /NOT parents/);
    assert.match(p, /sharing the same local distributor/i);
    assert.doesNotMatch(p, /"product"/);
  });

  it('includes alternatives only when an alternatives dimension is on', () => {
    const p = prompt(['alt_brands', 'alt_products']);
    assert.match(p, /designed in/i);
    assert.match(p, /NEVER set madeIn \(or originCountry\) to the brand HQ/);
    assert.match(p, /same-name other category/i);
    assert.match(p, /supply-shift/i);
    assert.match(p, /"alternatives"/);
  });

  it('tells the product section not to mix same-name factories or supply-shift rumors', () => {
    const p = prompt(['origin'], 'item');
    assert.match(p, /SAME NAME \/ SUPPLY-SHIFT/);
    assert.match(p, /different category/);
  });

  it('asks verification to flag distributor-as-parent and HQ-copied madeIn', () => {
    const p = prompt(['origin', 'company_relations']);
    assert.match(p, /local distributor/);
    assert.match(p, /designed in/);
    assert.match(p, /"verification"/);
  });
});

describe('check query sections', () => {
  it('picks up a section added to the registry', () => {
    const extra = {
      id: 'extra',
      partial: 'signals' as const,
      field: 'extra',
      when: () => true,
      rules: 'EXTRA_SECTION_MARKER',
      schema: '{"note":"string"}',
    };
    CHECK_SECTIONS.push(extra);
    try {
      const p = prompt(['origin']);
      assert.match(p, /EXTRA_SECTION_MARKER/);
      assert.match(p, /"extra"/);
    } finally {
      CHECK_SECTIONS.pop();
    }
  });
});
