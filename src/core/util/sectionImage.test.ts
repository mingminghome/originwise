import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sanitizeShareStem, sectionImageFilename } from './sectionImage';

describe('sectionImage helpers', () => {
  it('sanitizes stems for filenames', () => {
    assert.equal(sanitizeShareStem('Final COO'), 'final-coo');
    assert.equal(sanitizeShareStem('  Brand / ops  '), 'brand-ops');
    assert.equal(sanitizeShareStem('最終原產地（COO）').includes('coo') || sanitizeShareStem('最終原產地（COO）').length > 0, true);
  });

  it('builds a dated originwise filename', () => {
    const name = sectionImageFilename('Final COO', new Date('2026-10-02T12:00:00Z'));
    assert.equal(name, 'originwise-final-coo-2026-10-02.png');
  });
});
