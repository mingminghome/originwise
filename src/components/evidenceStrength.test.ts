/**
 * One card rule: nothing reads stronger than its evidence (src/core/evidence.ts).
 * Must-rows from Tester's live responses (11 Oct 2026):
 * live_f1 JL Classic Cotbed (Poland 0.6 web_name), live_f2 Milano (no
 * candidates), live_f3 Cybex Melio (China 0.65 parts; retailer-確認 caveat,
 * strong China links, unsourced 中國 brand row), live_cotbed_parts
 * (Europe 0.5 parts, China 0.38 notes, UK design).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createT } from '../core/i18n';
import type { CheckResult } from '../core/types';
import { claimsConfirmation, hasVerifiedQuote, namesBrandCountry, noteWithinEvidence } from '../core/evidence';
import { ResultPanel } from './ResultPanel';
import { MadeInCard } from './ResultCards';
import { buildLayerRows, buildMadeInView } from './resultCards.model';

(globalThis as { React?: unknown }).React = React;
const zh = createT('zh-Hant');
const en = createT('en');
const load = (f: string) =>
  (JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8')) as { result: CheckResult }).result;
const text = (el: React.ReactElement) =>
  renderToStaticMarkup(el).replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&').replace(/\n+/g, '\n');
const card = (r: CheckResult, t = zh) => text(React.createElement(MadeInCard, { result: r, t }));
const panel = (r: CheckResult, t = zh) => text(React.createElement(ResultPanel, { result: r, t }));

const F1 = load('live_f1.json');
const F2 = load('live_f2.json');
const F3 = load('live_f3.json');
const PARTS = load('live_cotbed_parts.json');

describe('evidence helpers', () => {
  it('hedges are not claims', () => {
    assert.equal(claimsConfirmation('成品最終產地未確認（網路來源僅列出候選產地波蘭）'), false);
    assert.equal(claimsConfirmation('Final COO unconfirmed — not a stamped made-in label.'), false);
    assert.equal(claimsConfirmation('網頁研究未能明確確認此確切商品編號的完成品產地 (COO: 未確認)。'), false);
    assert.equal(claimsConfirmation('could not be verified against a page'), false);
    assert.equal(claimsConfirmation('經零售通路規格表確認實體最終產地為中國。'), true);
    assert.equal(claimsConfirmation('Verified on the retailer spec sheet.'), true);
  });
  it('brand-country labels', () => {
    assert.ok(namesBrandCountry('台灣品牌'));
    assert.ok(namesBrandCountry('法國品牌，輕量推車'));
    assert.ok(namesBrandCountry('A French brand'));
    assert.ok(!namesBrandCountry('替代品牌'));
  });
  it('none of the live fixtures holds a verified quote', () => {
    for (const r of [F1, F2, F3, PARTS]) assert.equal(hasVerifiedQuote(r), false);
  });
});

describe('weak tier: every candidate, % and source, under 模型參考（未經確認）', () => {
  it('live_cotbed_parts: Europe 50% parts and China 38% notes are listed', () => {
    const v = buildMadeInView(PARTS);
    const all = [...v.candidates.map((c) => c.label), ...(v.weakCandidates ?? []).map((c) => c.label)];
    assert.ok(all.includes('Europe') && all.includes('China'), JSON.stringify(v));
  });
  it('a candidate the graded list drops shows in the weak tier with % and source', () => {
    const r: CheckResult = {
      ...F2,
      product: {
        ...F2.product,
        originCandidates: [
          { label: 'Poland', confidence: 0.5, source: 'model_memory', rating: 'possible' },
          { label: 'China', confidence: 0.38, source: 'notes', rating: 'mentioned' },
        ],
        manufacturerCountry: 'Poland',
      },
      company: { ...F2.company, hqCountry: 'Poland' },
    } as CheckResult;
    const v = buildMadeInView(r);
    assert.ok(v.weakCandidates?.some((c) => c.label === 'Poland' && c.confidence === 0.5 && c.source === 'model_memory'), JSON.stringify(v));
    const t = card(r);
    assert.ok(t.includes('模型參考（未經確認）'), t);
    assert.ok(t.includes('50% · 來源：模型知識 · 未確認') || /50%.*未確認/.test(t), t);
    assert.ok(!t.includes(zh('check.rc.noCandidates')), t);
    const te = card(r, en);
    assert.ok(te.includes('Model reference (unconfirmed)'), te);
  });
  it('live_f2 Milano: truly empty → 「沒有查到可信的產地候選」 still shows', () => {
    const t = card(F2);
    assert.ok(t.includes(zh('check.rc.noCandidates')), t);
    assert.ok(!t.includes('模型參考（未經確認）'), t);
  });
  it('nothing in the weak tier reads as confirmed', () => {
    for (const r of [F1, F2, F3, PARTS]) {
      const html = renderToStaticMarkup(React.createElement(MadeInCard, { result: r, t: zh }));
      const m = html.match(/data-testid="madein-weak"[\s\S]*?<\/ul>/);
      if (m) assert.ok(!/確認(?!）)/.test(m[0].replace(/未(經)?確認/g, '')), m[0]);
    }
  });
  it('a design country never becomes a weak made-in candidate', () => {
    const r = {
      ...F2,
      product: {
        ...F2.product,
        notes: ['Brand design is based in Germany.'],
        originCandidates: [{ label: 'Germany', confidence: 0.38, source: 'notes', rating: 'mentioned' }],
        designInfo: [{ country: 'Germany', kind: 'design' }],
      },
    } as CheckResult;
    const v = buildMadeInView(r);
    assert.ok(!(v.weakCandidates ?? []).some((c) => c.label === 'Germany'), JSON.stringify(v));
    assert.ok(!v.candidates.some((c) => c.label === 'Germany'));
    assert.ok(v.designRows.some((d) => d.country === 'Germany'));
  });
  it('live_f1 JL: Poland stays a candidate, never confirmed', () => {
    const v = buildMadeInView(F1);
    assert.equal(v.state, 'unconfirmed');
    assert.ok(v.candidates.some((c) => c.label === 'Poland'));
  });
  it('live_f3 Melio: China 65% parts is listed, unconfirmed', () => {
    const v = buildMadeInView(F3);
    assert.equal(v.state, 'unconfirmed');
    assert.ok(v.candidates.some((c) => c.label === 'China'));
  });
});

describe('no 確認 / strong without a verified quote (live_f3 Melio)', () => {
  it('manufacturer and company rows are never 確認', () => {
    for (const r of [F1, F3]) assert.ok(!buildLayerRows(r).some((x) => x.tag === 'confirmed'), JSON.stringify(buildLayerRows(r)));
  });
  it('the 「經零售通路規格表確認…」 caveat is not shown', () => {
    const t = panel(F3);
    assert.ok(!t.includes('經零售通路規格表確認'), t);
    assert.ok(!noteWithinEvidence(F3, F3.caveats![0]!));
  });
  it('China links do not read 強關聯', () => {
    const t = panel(F3);
    assert.ok(!t.includes('強關聯'), t);
  });
  it('unsourced 中國 brand row is dropped; the 德國 design row stays', () => {
    const v = buildMadeInView(F3);
    assert.deepEqual(v.designRows.map((d) => [d.country, d.kind]), [['Germany', 'design']]);
  });
  it('unsourced 「台灣品牌」/「法國品牌」 notes are not shown', () => {
    const r = { ...F3, product: { ...F3.product, notes: ['台灣品牌，輕量推車。', '法國品牌'] }, caveats: [] } as CheckResult;
    const t = panel(r);
    assert.ok(!t.includes('台灣品牌') && !t.includes('法國品牌'), t);
  });
  it('with a verified quote, 確認 may show', () => {
    const r = {
      ...F3,
      meta: { ...F3.meta, searchCoo: [{ country: 'China', basis: 'barcode', status: 'confirmed', url: 'https://example.com/p' }] },
    } as CheckResult;
    assert.ok(buildLayerRows(r).some((x) => x.key === 'manufacturer' && x.tag === 'confirmed'));
  });
});
