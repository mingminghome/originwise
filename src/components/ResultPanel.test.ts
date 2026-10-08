/**
 * ResultPanel render checks on the real Cybex payload: 中資控股 chip,
 * no made-in / manufacturer lines in the China section, query headline.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createT } from '../core/i18n';
import type { CheckResult } from '../core/types';
import { ResultPanel } from './ResultPanel';

(globalThis as { React?: unknown }).React = React;

const CYBEX = JSON.parse(
  readFileSync(new URL('./fixtures/cybex-melio-live.json', import.meta.url), 'utf8')
) as { query: string; result: CheckResult };

function render(query?: string, result: CheckResult = CYBEX.result): string {
  return renderToStaticMarkup(
    React.createElement(ResultPanel, { result, query, t: createT('zh-Hant') })
  );
}

describe('ResultPanel (real Cybex payload, zh-Hant)', () => {
  it('chip says 中資控股, never 中國公司', () => {
    const html = render(CYBEX.query);
    assert.ok(html.includes('中資控股'));
    assert.ok(!html.includes('中國公司'));
  });

  it('no manufacturer / product-origin reason lines; points to the 製造地 card', () => {
    const html = render(CYBEX.query);
    assert.ok(!html.includes('製造商地點'), 'manufacturer line shown');
    assert.ok(!html.includes('產品來源標示為'), 'origin line shown');
    assert.ok(html.includes('製造地只在下方'));
  });

  it('總部 is not a confirmed China HQ for the brand; parent note shown', () => {
    const html = render(CYBEX.query);
    assert.ok(html.includes('回答中的中國總部屬於母公司'));
    assert.doesNotMatch(html, /公司總部位於[：:]?\s*中國/, 'brand HQ claimed as China');
  });

  it('headline is the query spelling; model name as 辨識為', () => {
    const misspelt: CheckResult = {
      ...CYBEX.result,
      title: 'Cybex Mello 嬰兒推車',
      product: { ...CYBEX.result.product, name: 'Cybex Mello 嬰兒推車' },
    };
    const html = render('Cybex Melio', misspelt);
    assert.match(html, /<h2[^>]*>Cybex Melio<\/h2>/);
    assert.ok(html.includes('辨識為：Cybex Mello 嬰兒推車'));
  });

  it('photo-only (no query) keeps the model title', () => {
    const html = render(undefined);
    assert.match(html, /<h2[^>]*>Cybex Melio 嬰兒推車<\/h2>/);
    assert.ok(!html.includes('辨識為'));
  });
});
