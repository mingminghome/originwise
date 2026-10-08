import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { flattenCssColor, sanitizeShareStem, sectionCaptureSize, sectionImageFilename, sectionShareCapture, sectionSharePaddedSize, sectionSharePadBackground, SECTION_SHARE_MIN_CSS_HEIGHT, FLATTEN_ONTO_DARK, FLATTEN_ONTO_LIGHT } from './sectionImage';

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

  it('forces dark theme on the capture PNG only', () => {
    assert.equal(sectionShareCapture.theme, 'dark');
    assert.equal(
      flattenCssColor('rgba(15, 118, 110, 0.08)', FLATTEN_ONTO_DARK),
      'rgb(21, 30, 29)'
    );
  });

  it('pads short captures to Threads-friendly min height without stretching', () => {
    assert.equal(SECTION_SHARE_MIN_CSS_HEIGHT, 290);
    assert.equal(sectionShareCapture.minCssHeight, 290);
    // 390×2 → 780 wide; 290×2 → 580 tall (Tester hand-pad target).
    assert.equal(sectionShareCapture.phoneCssPx * sectionShareCapture.pixelRatio, 780);
    assert.equal(SECTION_SHARE_MIN_CSS_HEIGHT * sectionShareCapture.pixelRatio, 580);

    const short = sectionSharePaddedSize({ width: 390, height: 118 });
    assert.deepEqual(short, {
      width: 390,
      height: 290,
      padTop: 86,
      padBottom: 86,
    });

    const tall = sectionSharePaddedSize({ width: 390, height: 358 });
    assert.deepEqual(tall, {
      width: 390,
      height: 358,
      padTop: 0,
      padBottom: 0,
    });

    // Odd leftover goes to bottom so content stays vertically centered.
    const odd = sectionSharePaddedSize({ width: 390, height: 117 });
    assert.equal(odd.height, 290);
    assert.equal(odd.padTop + odd.padBottom + 117, 290);
    assert.equal(odd.padTop, Math.floor((290 - 117) / 2));
    assert.equal(odd.padBottom, 290 - 117 - odd.padTop);
  });

  it('pads with neutral page flatten, not card tint', () => {
    assert.equal(sectionSharePadBackground('dark'), 'rgb(22, 22, 22)');
    assert.equal(sectionSharePadBackground('light'), 'rgb(255, 255, 255)');
    assert.equal(sectionSharePadBackground(), 'rgb(22, 22, 22)'); // capture theme dark
    // Same tuples used by opaque flatten helpers.
    assert.deepEqual(FLATTEN_ONTO_DARK, [22, 22, 22]);
    assert.deepEqual(FLATTEN_ONTO_LIGHT, [255, 255, 255]);
  });
});

describe('capture excludes on-screen UI (ⓘ tips, open tooltips)', () => {
  it('removes data-section-share="ui" and role="tooltip" nodes', async () => {
    const { stripCaptureUi, CAPTURE_UI_SELECTOR } = await import('./sectionImage');
    const removed: string[] = [];
    const node = (id: string) => ({ remove: () => removed.push(id) });
    let asked = '';
    stripCaptureUi({
      querySelectorAll(sel: string) {
        asked = sel;
        return [node('share'), node('info'), node('tip')];
      },
    });
    assert.equal(asked, CAPTURE_UI_SELECTOR);
    assert.match(CAPTURE_UI_SELECTOR, /data-section-share="ui"/);
    assert.match(CAPTURE_UI_SELECTOR, /role="tooltip"/);
    assert.deepEqual(removed, ['share', 'info', 'tip']);
  });
});

describe('capture keeps exact font sizes (#33 Sheer row-2 band)', () => {
  it('copies the computed font shorthand last, after the rounded font-size', async () => {
    const { captureStyleProperties } = await import('./sectionImage');
    const props = captureStyleProperties(['color', 'font-size', 'height', 'font', 'line-height']);
    assert.equal(props.at(-1), 'font');
    assert.equal(props.filter((p) => p === 'font').length, 1);
    // font-size stays as the fallback when Chrome cannot serialize `font`.
    assert.ok(props.indexOf('font-size') > -1 && props.indexOf('font-size') < props.indexOf('font'));
    assert.ok(props.includes('height'));
  });
});
