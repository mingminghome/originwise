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
import { factVerified, noteWithinEvidence, quoteNamesBrand } from '../core/evidence';
import { textTiesCountryToMade } from '../../functions/_lib/noteText';
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

const Q1 = load('live_q1.json');
const Q2 = load('live_q2.json');
const Q3 = load('live_q3.json');

describe('evidence helpers (structural, no claim words)', () => {
  // Tester #46 bypass probes + ZH Copy rows: a country plus the made-in
  // concept in one clause, whatever the claim wording.
  const caught = [
    '經查證產地為中國', '已證實於中國製造', '可確定為中國製造', '確定在中國製造', 'Verified: made in China',
    'confirmed made in China', '產地經核實為中國', '已查明產地為中國', 'Made in China per retailer spec sheet',
    'proven to be made in China', 'definitely made in China', '產品於中國製造',
    '品牌源自德國並維持德國工程設計，但實際最終製造地與組裝廠位於中國大陸。',
    '經零售通路規格表確認實體最終產地為中國。',
    '中國廠生產', '於中國組裝', '經實測為中國製', '已證實中國製造',
  ];
  for (const s of caught) {
    it(`hidden while 製造地 is 未確認: ${s}`, () => {
      assert.ok(textTiesCountryToMade(s), s);
      assert.equal(noteWithinEvidence(F2, s), false, s);
    });
  }
  // Rows the structural rule cannot catch (no country name, or no made-in
  // word the parsers know). Pinned so a change is visible; see the PR body.
  for (const s of ['產自中國', '大陸代工', '深圳廠出貨', '確定係中國整']) {
    it(`known gap (not caught structurally): ${s}`, () => assert.equal(textTiesCountryToMade(s), false));
  }
  it('HQ / design / server hedge lines are not made-in claims', () => {
    for (const s of ['法定母公司為總部位於中國的好孩子國際控股有限公司。', '品牌設計地為英國', 'Final made-in unconfirmed; other countries are candidates only.'])
      assert.equal(textTiesCountryToMade(s), false, s);
  });
  it('brand wording naming a country needs a brand quote naming it', () => {
    for (const s of ['a french brand', 'brand from France', '來自法國的品牌', '台灣品牌'])
      assert.equal(noteWithinEvidence(F2, s), false, s);
  });
  it('known brand gaps (no country, or no brand concept the parser knows)', () => {
    for (const s of ['法系品牌', '源自法國', '法國喘牌子', '法國牌子', '歐洲品牌']) assert.equal(noteWithinEvidence(F2, s), true, s);
  });
  it('a slug is not a quote; 歐洲品牌 never reads as a country', () => {
    assert.equal(quoteNamesBrand('taiwan-brand', 'Taiwan'), false);
    assert.equal(quoteNamesBrand('台灣品牌', 'Taiwan'), true);
    assert.equal(quoteNamesBrand('歐洲品牌', 'Europe'), false);
  });
});

describe('per-row evidence (Tester #46)', () => {
  it('a verified made-in quote for Japan lifts no brand / manufacturer / parent row', () => {
    const x = { ...F3, meta: { ...F3.meta, searchCoo: [{ country: 'Japan', basis: 'barcode', status: 'confirmed', url: 'https://example.com/jp' }] } } as CheckResult;
    assert.ok(!buildLayerRows(x).some((r) => r.tag === 'confirmed'), JSON.stringify(buildLayerRows(x)));
    assert.ok(!panel(x).includes('強關聯'));
  });
  it('a made-in quote does not confirm HQ or brand origin, even for the same country', () => {
    const x = { ...F1, meta: { ...F1.meta, searchCoo: [{ country: 'United Kingdom', basis: 'barcode', status: 'confirmed', url: 'https://example.com/uk' }] } } as CheckResult;
    const rows = buildLayerRows(x);
    assert.notEqual(rows.find((r) => r.key === 'hq')?.tag, 'confirmed');
    assert.notEqual(rows.find((r) => r.key === 'brandOrigin')?.tag, 'confirmed');
  });
  it('a brand-only label quote never makes the manufacturer row 確認', () => {
    const lb = { ...F2, partsEvidence: 'label', product: { ...F2.product, originCountry: 'Germany', manufacturer: 'X', manufacturerCountry: 'Germany', designInfo: [{ country: 'Germany', kind: 'brand', quote: '德國品牌' }] } } as CheckResult;
    const rows = buildLayerRows(lb);
    assert.equal(rows.find((r) => r.key === 'brandOrigin')?.tag, 'confirmed');
    assert.notEqual(rows.find((r) => r.key === 'manufacturer')?.tag, 'confirmed');
    assert.equal(factVerified(lb, 'madeIn', 'Germany'), false);
  });
  it('live_q3 Melio: the taiwan-brand slug row is dropped', () => {
    const v = buildMadeInView(Q3);
    assert.ok(!v.designRows.some((d) => d.country === 'Taiwan'), JSON.stringify(v.designRows));
    assert.ok(!card(Q3).includes('台灣品牌'));
  });
  it('live_q1 JL: 「成品於波蘭製造」 note is hidden; Poland is a tier row', () => {
    const t = panel(Q1);
    assert.ok(!t.includes('成品於波蘭製造'), t);
    assert.ok(buildMadeInView(Q1).unconfirmedTier.some((c) => c.label === 'Poland'));
  });
  it('live_q2 Milano: 歐洲 tier row, 「於歐洲工坊製造」 note hidden', () => {
    const t = panel(Q2);
    assert.ok(!t.includes('歐洲工坊製造'), t);
    assert.ok(buildMadeInView(Q2).unconfirmedTier.some((c) => c.label === '歐洲'));
  });
  it('live_f1 JL Poland name-match reads 「波蘭 · 60% · 依品名比對的網頁 · 未確認」 in the tier', () => {
    const t = card(F1);
    assert.ok(t.includes('模型參考（未經確認）'), t);
    assert.ok(t.includes('60% · 依品名比對的網頁 · 未確認'), t);
    assert.ok(!t.includes('查到的產地候選'), t);
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
    assert.ok(t.includes('50% · 模型知識 · 未確認'), t);
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

describe('no 確認 / strong without a quote for that row (live_f3 Melio)', () => {
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
});
