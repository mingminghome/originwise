import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { flattenCssColor, sanitizeShareStem, sectionCaptureSize, sectionImageFilename, sectionShareCapture } from './sectionImage';

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

  it('flattens a translucent layer color onto white', () => {
    assert.equal(
      flattenCssColor('rgba(15, 118, 110, 0.08)'),
      'rgb(236, 244, 243)'
    );
  });

  it('uses scroll height when the flex box is squashed', () => {
    assert.deepEqual(
      sectionCaptureSize({
        scrollWidth: 378,
        scrollHeight: 76,
        rectWidth: 378,
        rectHeight: 30,
      }),
      { width: 378, height: 76 }
    );
  });

  it('captures at 2x inside the phone CSS band', () => {
    assert.equal(sectionShareCapture.pixelRatio, 2);
    assert.equal(sectionShareCapture.phoneCssPx, 390);
    // Above the 380px small-phone sheet tweak, below the 420px large-phone tweaks.
    // 520px is the two-column ask grid; 720px is the tablet/desktop sheet breakpoint.
    assert.ok(sectionShareCapture.phoneCssPx > 380);
    assert.ok(sectionShareCapture.phoneCssPx < 420);
  });
});
