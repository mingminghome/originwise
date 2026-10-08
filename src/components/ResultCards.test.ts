/**
 * China-first layout: made-in states, layer tags, and the "China verdict
 * only in the China card" rule (server-rendered markup).
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import * as React from 'react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createT } from '../core/i18n';
import type { CheckResult } from '../core/types';
import { ChinaCard, MadeInCard } from './ResultCards';
import { ResultPanel } from './ResultPanel';
import { buildLayerRows, buildMadeInView } from './resultCards.model';

// tsx compiles .tsx with the classic JSX runtime here (root tsconfig has no
// jsx option), so the components need React in scope when rendered.
(globalThis as { React?: typeof React }).React = React;

const zh = createT('zh-Hant');

function base(partial: Partial<CheckResult> = {}): CheckResult {
  return {
    schemaVersion: 1,
    relationTier: 'unknown',
    title: 'Example',
    summary: '',
    knowledgeBasis: 'web_enriched',
    ...partial,
  };
}

const confirmed = base({
  relationTier: 'direct',
  confidence: 0.9,
  tierReasons: ['made_in_cn'],
  sources: ['Sheer 240ml — https://shop.example.jp/p/4902508277471'],
  product: {
    name: 'Sheer 240ml',
    madeIn: '中國',
    madeInBasis: 'barcode',
    originCandidates: [{ label: 'China', confidence: 0.95, source: 'confirmed_coo', rating: 'confirmed' }],
  },
  company: { name: 'Pigeon', hqCountry: 'Japan' },
  meta: {
    searchMatch: 'barcode',
    searchCoo: [{ country: '中国', basis: 'barcode', status: 'confirmed', url: 'https://shop.example.jp/p/4902508277471' }],
  },
});

const unconfirmed = base({
  relationTier: 'direct',
  confidence: 0.6,
  tierReasons: ['hq_cn'],
  product: {
    name: 'Tapo C200',
    originCandidates: [
      { label: 'China', confidence: 0.5, source: 'manufacturer', rating: 'possible' },
      { label: 'Vietnam', confidence: 0.4, source: 'parts', rating: 'possible' },
    ],
  },
  company: { name: 'TP-Link', hqCountry: 'China' },
});

const likely = base({
  relationTier: 'unknown',
  confidence: 0.55,
  sources: ['Example page — https://retailer.example.jp/item/1'],
  product: {
    name: 'Example bottle 160ml',
    originCandidates: [{ label: 'Thailand', confidence: 0.55, source: 'web_name', rating: 'likely' }],
  },
  company: { name: 'Example', hqCountry: 'Japan' },
  meta: {
    searchMatch: 'name',
    searchCoo: [{ country: 'タイ', basis: 'name', status: 'likely', url: 'https://retailer.example.jp/item/1' }],
  },
});

describe('buildMadeInView', () => {
  it('A: confirmed made-in with barcode basis and first source', () => {
    const v = buildMadeInView(confirmed);
    assert.equal(v.state, 'confirmed');
    assert.equal(v.country, '中國');
    assert.equal(v.basis, 'barcode');
    assert.equal(v.confidence, 0.95);
    assert.equal(v.source?.label, 'Sheer 240ml');
    assert.equal(v.source?.country, '中国');
  });

  it('A: label basis from the package photo', () => {
    const v = buildMadeInView(
      base({ product: { madeIn: 'Japan', madeInBasis: 'label' } })
    );
    assert.equal(v.state, 'confirmed');
    assert.equal(v.basis, 'label');
  });

  it('B: unconfirmed lists candidates but never HQ / manufacturer echoes', () => {
    const v = buildMadeInView(unconfirmed);
    assert.equal(v.state, 'unconfirmed');
    assert.deepEqual(v.candidates.map((c) => c.label), ['Vietnam']);
    assert.equal(v.noBarcodePage, true);
  });

  it('C: name-only match is "likely", never confirmed', () => {
    const v = buildMadeInView(likely);
    assert.equal(v.state, 'likely');
    assert.equal(v.country, 'Thailand');
    assert.equal(v.basis, 'name');
  });
});

describe('buildLayerRows', () => {
  it('tags web company facts 確認, missing parts 未確認, controlling parent row', () => {
    const rows = buildLayerRows(
      base({
        product: { originCountry: 'Germany' },
        company: {
          hqCountry: 'Germany',
          parents: [{ name: 'Goodbaby', country: 'China', control: 'majority' }],
        },
      })
    );
    assert.deepEqual(
      rows.map((r) => [r.key, r.tag]),
      [
        ['brandOrigin', 'confirmed'],
        ['hq', 'confirmed'],
        ['parts', 'unconfirmed'],
        ['parent', 'confirmed'],
      ]
    );
  });

  it('model-memory facts are only 有提及; label parts are 確認', () => {
    const rows = buildLayerRows(
      base({
        knowledgeBasis: 'model_memory',
        partsEvidence: 'label',
        product: { originCountry: 'Japan', parts: [{ name: '奶嘴', madeIn: 'China' }] },
      })
    );
    assert.equal(rows.find((r) => r.key === 'brandOrigin')?.tag, 'mentioned');
    assert.equal(rows.find((r) => r.key === 'parts')?.tag, 'confirmed');
    assert.equal(rows.find((r) => r.key === 'hq')?.tag, 'unconfirmed');
  });
});

const html = (el: ReturnType<typeof createElement>) => renderToStaticMarkup(el);

describe('made-in card markup', () => {
  it('C: 較可能 sits right next to 泰國（非確認） plus the do-not-treat-as-confirmed note', () => {
    const out = html(createElement(MadeInCard, { result: likely, t: zh }));
    assert.match(out, /較可能<\/span> <span class="rc-headline-country">泰國（非確認）<\/span>/);
    assert.ok(out.includes('僅依品名比對，尚未確認製造地，請勿當作已確認。'));
  });

  it('never carries a China verdict (no tier badge, chip or China-relation wording)', () => {
    for (const r of [confirmed, unconfirmed, likely]) {
      const out = html(createElement(MadeInCard, { result: r, t: zh }));
      assert.doesNotMatch(out, /tier-badge|中國公司|中資控股|與中國的關聯|間接|不明/, r.title);
    }
  });
});

describe('China card', () => {
  it('shows 中國公司 + 直接 for a China HQ even when the server said 50%', () => {
    const out = html(
      createElement(ChinaCard, {
        result: { ...unconfirmed, confidence: 0.5, relationTier: 'indirect' },
        t: zh,
      })
    );
    assert.ok(out.includes('中國公司'));
    assert.ok(out.includes('直接'));
    assert.ok(out.includes('信心 75%'));
    assert.ok(out.includes('中國'));
  });

  it('Cybex-style German HQ + Chinese majority parent → 中資控股', () => {
    const out = html(
      createElement(ChinaCard, {
        result: base({
          relationTier: 'direct',
          company: {
            name: 'Cybex GmbH',
            hqCountry: 'Germany',
            parents: [{ name: 'Goodbaby', country: 'China', control: 'majority' }],
          },
        }),
        t: zh,
      })
    );
    assert.ok(out.includes('中資控股'));
    assert.ok(!out.includes('中國公司'));
    assert.ok(out.includes('德國'));
  });
});

describe('ResultPanel order', () => {
  it('China card → 製造地 → 產地分層 → folds (closed)', () => {
    const out = html(createElement(ResultPanel, { result: confirmed, t: zh }));
    const iChina = out.indexOf('data-testid="china-card"');
    const iMade = out.indexOf('data-testid="madein-card"');
    const iLayers = out.indexOf('data-testid="layers-card"');
    const iFold = out.indexOf('class="rc-fold"');
    assert.ok(iChina > 0 && iChina < iMade && iMade < iLayers && iLayers < iFold);
    assert.doesNotMatch(out, /<details class="rc-fold"[^>]*open/);
    // Exactly one tier badge on the page (in the China card).
    assert.equal(out.split('class="tier-badge ').length - 1, 1);
  });
});

describe('China card: folded parent HQ (real Cybex payload)', () => {
  const CYBEX = JSON.parse(
    readFileSync(new URL('./fixtures/cybex-melio-live.json', import.meta.url), 'utf8')
  ) as { query: string; result: CheckResult };

  it('中資控股, not 中國公司; 總部 未確認 with the parent note; parent row 中國', () => {
    const out = renderToStaticMarkup(createElement(ChinaCard, { result: CYBEX.result, t: zh }));
    assert.ok(out.includes('中資控股'));
    assert.ok(!out.includes('中國公司'));
    assert.match(out, /總部<\/dt><dd class="rc-row-value"><span>未確認<\/span>/);
    assert.ok(out.includes('回答中的中國總部屬於母公司'));
    assert.match(out, /is-china"><span>Goodbaby International Holdings/);
  });

  it('no manufacturer / product-origin lines; pointer to the 製造地 card instead', () => {
    const out = renderToStaticMarkup(createElement(ChinaCard, { result: CYBEX.result, t: zh }));
    assert.ok(!out.includes('製造商地點'));
    assert.ok(!out.includes('產品來源標示為'));
    assert.ok(out.includes('製造地只在下方「製造地」卡依條碼或包裝標示判斷。'));
    assert.doesNotMatch(out, /公司總部位於[：:]?\s*中國/);
  });

  it('產地分層: 總部 未確認 when folded, parent row carries 中國', () => {
    const rows = buildLayerRows(CYBEX.result);
    assert.equal(rows.find((r) => r.key === 'hq')?.tag, 'unconfirmed');
    const parent = rows.find((r) => r.key === 'parent');
    assert.match(parent?.value ?? '', /^Goodbaby/);
    assert.equal(parent?.country, '中國');
  });

  it('ResultPanel headline is the query; model name as 辨識為 when it differs', () => {
    const misspelt: CheckResult = {
      ...CYBEX.result,
      title: 'Cybex Mello 嬰兒推車',
      product: { ...CYBEX.result.product, name: 'Cybex Mello 嬰兒推車' },
    };
    const out = renderToStaticMarkup(
      createElement(ResultPanel, { result: misspelt, query: 'Cybex Melio', t: zh })
    );
    assert.match(out, /<h2 class="ask-result-title">Cybex Melio<\/h2>/);
    assert.ok(out.includes('辨識為：Cybex Mello 嬰兒推車'));
  });
});

describe('China card: brand-own China HQ stays 中國公司', () => {
  it('Tapo (origin 中國, HQ 中國)', () => {
    const r = base({
      relationTier: 'direct',
      confidence: 0.6,
      tierReasons: ['origin_cn', 'hq_cn'],
      product: { brand: 'TP-Link', originCountry: '中國' },
      company: { name: 'TP-Link', hqCountry: '中國' },
    });
    const out = renderToStaticMarkup(createElement(ChinaCard, { result: r, t: zh }));
    assert.ok(out.includes('中國公司'));
    assert.ok(!out.includes('產品來源標示為'));
  });
});
