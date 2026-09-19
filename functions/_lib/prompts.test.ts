/**
 * Prompt contracts for origin/ownership accuracy (no brand hardcoding).
 * Run: npm test
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildAlternativesPrompt,
  buildCompanyPrompt,
  buildProductPrompt,
  buildVerifyPrompt,
} from './prompts';

describe('origin accuracy prompt contracts', () => {
  it('tells the product agent not to copy design HQ into madeIn', () => {
    const p = buildProductPrompt({ locale: 'en', entity: 'stroller' });
    assert.match(p, /DESIGN HQ ≠ FACTORY/);
    assert.match(p, /NEVER copy HQ/);
  });

  it('tells the company agent not to treat distributors as parents', () => {
    const p = buildCompanyPrompt({ locale: 'en', entity: 'stroller' });
    assert.match(p, /PARENT vs LOCAL DISTRIBUTOR/);
    assert.match(p, /NOT parents/);
    assert.match(p, /sharing the same local distributor/i);
  });

  it('tells alternatives not to fake EU manufacture from brand origin', () => {
    const p = buildAlternativesPrompt({
      locale: 'en',
      entity: 'stroller',
      wantBrands: true,
      wantProducts: true,
      contextJson: '{}',
    });
    assert.match(p, /designed in/i);
    assert.match(p, /never copy originCountry\/hqCountry into madeIn/i);
    assert.match(p, /same-name other category/i);
    assert.match(p, /supply-shift/i);
  });

  it('tells the product agent not to mix same-name factories or supply-shift rumors', () => {
    const p = buildProductPrompt({ locale: 'en', entity: 'item' });
    assert.match(p, /SAME NAME \/ SUPPLY-SHIFT/);
    assert.match(p, /different category/);
  });

  it('asks verify to flag distributor-as-parent and HQ-copied madeIn', () => {
    const p = buildVerifyPrompt({
      locale: 'en',
      productJson: '{}',
      companyJson: '{}',
    });
    assert.match(p, /local distributor/);
    assert.match(p, /designed in/);
  });
});
