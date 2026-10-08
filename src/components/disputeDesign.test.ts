/**
 * 製造地 card: design / brand wording is 附加資訊, never a made-in; pages that
 * disagree get a 爭議 line with both sides. Example data runs through the
 * real gate + synthesize (disputeDesign.testutil.ts); no live lookups.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { catalogs, createT } from '../core/i18n';
import { ChinaCard, MadeInCard } from './ResultCards';
import { buildChinaCard } from './ChinaLink';
import { buildMadeInView } from './resultCards.model';
import { DISPUTE_CASES, JAN, URLS, page, runPages } from './disputeDesign.testutil';

(globalThis as { React?: unknown }).React = React;

const zh = createT('zh-Hant');
const en = createT('en');
const locales = Object.keys(catalogs) as Array<Parameters<typeof createT>[0]>;
const flat = (el: React.ReactElement) => renderToStaticMarkup(el).replace(/<[^>]+>/g, '');
const card = (r: Parameters<typeof MadeInCard>[0]['result'], t = zh) =>
  renderToStaticMarkup(React.createElement(MadeInCard, { result: r, t }));
const text = (r: Parameters<typeof MadeInCard>[0]['result'], t = zh) => flat(React.createElement(MadeInCard, { result: r, t }));
const china = (r: Parameters<typeof MadeInCard>[0]['result'], t = zh) => flat(React.createElement(ChinaCard, { result: r, t }));
const DESIGN_ZH = '附加資訊：品牌標示「德國設計／研發」，這不是製造地。';

describe('design wording is never made-in (Cybex "Engineered in Germany")', () => {
  it('1 · only an "Engineered in Germany" page → 未確認, no 德國 made-in candidate, 附加資訊 with its link', () => {
    const r = DISPUTE_CASES.dispute1();
    const v = buildMadeInView(r);
    assert.equal(v.state, 'unconfirmed');
    assert.ok(!v.candidates.some((c) => /germany|德國/i.test(c.label)), JSON.stringify(v.candidates));
    assert.equal(v.dispute, undefined);
    assert.deepEqual(v.designRows.map((d) => [d.country, d.kind]), [['Germany', 'design']]);
    const html = card(r);
    const t = text(r);
    assert.ok(t.includes('未確認'));
    assert.ok(t.includes(DESIGN_ZH), t);
    assert.ok(!t.includes('爭議'));
    // 「來源：」 is text; only the page title is the link.
    assert.match(html, /<span class="rc-source-prefix">來源：<\/span><a href="https:\/\/www\.cybex-online\.com\/zh-tw\/melio"/);
    assert.ok(!html.includes('有提及'), html);
  });

  it('2 · AI 中國 + exact-model 產地：中國 page + German design page → 中國 75% plus 附加資訊, no 爭議', () => {
    const r = DISPUTE_CASES.dispute2();
    const v = buildMadeInView(r);
    assert.equal(v.state, 'confirmed');
    assert.equal(v.country, 'China');
    assert.equal(v.basis, 'model');
    assert.equal(Math.round((v.confidence ?? 0) * 100), 75);
    assert.ok(!v.candidates.some((c) => /germany|德國/i.test(c.label)));
    const t = text(r);
    assert.ok(t.includes('中國') && t.includes('75%'), t);
    assert.ok(t.includes(DESIGN_ZH), t);
    assert.ok(!t.includes('爭議'));
    // The design page is not a made-in source row.
    assert.ok(!v.sourceRows.some((s) => s.url === URLS.brand));
  });

  it('3 · exact-model pages 產地：中國 vs Made in Germany → 未確認 + 爭議 with both sides, candidates ungraded', () => {
    const r = DISPUTE_CASES.dispute3();
    const v = buildMadeInView(r);
    assert.equal(v.state, 'unconfirmed');
    assert.equal(v.reason, 'pagesDisagree');
    assert.deepEqual(v.dispute, [
      { country: 'China', pages: 1, exactPages: 1 },
      { country: 'Germany', pages: 1, exactPages: 1 },
    ]);
    assert.ok(v.candidates.every((c) => c.neutral && !c.exactPages));
    const t = text(r);
    assert.ok(t.includes('爭議：中國（1 個型號相符的網頁）；德國（1 個型號相符的網頁）'), t);
    assert.ok(t.includes('網頁說法不一'));
    const html = card(r);
    assert.ok(!html.includes('rc-cand-meta'), 'candidates stay ungraded');
    // Each side keeps its own source, prefix outside the link.
    assert.match(html, /來源 1：<\/span><a href="https:\/\/www\.momoshop\.com\.tw/);
    assert.match(html, /來源 1：<\/span><a href="https:\/\/www\.kinderwagen-shop\.de/);
    assert.match(text(r, en), /Disputed: China \(exact-model pages: 1\); Germany \(exact-model pages: 1\)/);
  });

  it('(a) "Designed in Germany" page + barcode page Made in China → 中國 confirmed, 附加資訊, no 爭議', () => {
    const r = DISPUTE_CASES.dispute4();
    const v = buildMadeInView(r);
    assert.equal(v.state, 'confirmed');
    assert.equal(v.basis, 'barcode');
    assert.equal(v.country, 'China');
    assert.equal(v.dispute, undefined);
    const t = text(r);
    assert.ok(t.includes(DESIGN_ZH) && !t.includes('爭議'), t);
  });

  it('(b) one sentence "Designed in Germany, made in China" counts China only', () => {
    const r = DISPUTE_CASES.dispute5();
    const v = buildMadeInView(r);
    assert.deepEqual(v.candidates.map((c) => c.label), ['China']);
    assert.equal(v.candidates[0]!.exactPages, 1);
    assert.deepEqual((r.meta.searchCoo ?? []).map((c) => c.country), ['China']);
    const t = text(r);
    assert.ok(t.includes('1 個型號相符的網頁') && t.includes(DESIGN_ZH) && !t.includes('爭議'), t);
    // With the AI saying China too: 中國 75%, still 附加資訊.
    const ai = runPages({ madeIn: 'China', pages: [page(URLS.mami, 'Cybex Melio 嬰兒推車 | MamiLove', 'Designed in Germany, made in China.')] });
    const av = buildMadeInView(ai);
    assert.equal(av.state, 'confirmed');
    assert.equal(Math.round((av.confidence ?? 0) * 100), 75);
    assert.equal(av.designRows.length, 1);
  });

  it('(c) a real Made in Germany page against a Made in China page → 未確認 + 爭議 with both sides and sources', () => {
    const r = runPages({
      pages: [
        page(URLS.mami, 'Cybex Melio 嬰兒推車 | MamiLove', 'Made in China'),
        page(URLS.shopDe, 'Cybex Melio Kinderwagen', 'Made in Germany'),
      ],
    });
    const v = buildMadeInView(r);
    assert.equal(v.state, 'unconfirmed');
    assert.deepEqual(v.dispute?.map((d) => d.country), ['China', 'Germany']);
    assert.ok(v.candidates.every((c) => c.neutral && c.sources?.length === 1));
    assert.equal(v.designRows.length, 0);
  });

  for (const [label, wording, kindKey] of [
    ['German engineering', 'German engineering for city life.', 'check.rc.designInfo'],
    ['德國品牌', '德國品牌，輕量推車。', 'check.rc.brandInfo'],
    ['German brand', 'Cybex is a German brand.', 'check.rc.brandInfo'],
  ] as const) {
    it(`(d) ${label} with no made-in claim → 未確認 + 附加資訊, no German made-in candidate`, () => {
      const r = runPages({ pages: [page(URLS.brand, 'CYBEX Melio 嬰兒推車', wording)] });
      const v = buildMadeInView(r);
      assert.equal(v.state, 'unconfirmed');
      assert.ok(!v.candidates.some((c) => /germany|德國/i.test(c.label)));
      assert.equal(v.designRows.length, 1);
      assert.ok(text(r).includes(zh(kindKey, { country: '德國' })), text(r));
    });
  }

  it('(e) a package label at 95% wins over any design wording (made-in pages included)', () => {
    const r = runPages({
      madeIn: 'China',
      ocrText: 'MADE IN CHINA',
      pages: [page(URLS.brand, 'CYBEX Melio 嬰兒推車', 'Designed and engineered in Germany. German engineering. 德國設計。')],
    });
    const v = buildMadeInView(r);
    assert.equal(v.state, 'confirmed');
    assert.equal(v.basis, 'label');
    assert.equal(Math.round((v.confidence ?? 0) * 100), 95);
    assert.equal(v.dispute, undefined);
    assert.equal(v.designRows.length, 1);
    // Barcode at 95% too.
    const b = buildMadeInView(DISPUTE_CASES.dispute4());
    assert.equal(Math.round((b.confidence ?? 0) * 100), 95);
    assert.equal(JAN.length, 13);
  });

  it('the design country never appears on the China relationship card', () => {
    for (const make of [DISPUTE_CASES.dispute1, DISPUTE_CASES.dispute2, DISPUTE_CASES.dispute4, DISPUTE_CASES.dispute5]) {
      const r = make();
      for (const t of [zh, en]) {
        const c = china(r, t);
        assert.ok(!/德國|Germany/.test(c), c);
      }
      const view = buildChinaCard(r);
      assert.ok(!view.brandOrigin || !/germany|德國/i.test(view.brandOrigin));
      assert.ok(!view.reasons.some((x) => 'country' in x && /germany|德國/i.test(String(x.country))));
    }
  });
});

describe('dispute / design wording in all 16 locales', () => {
  const KEYS = ['dispute', 'disputeSideExact', 'disputeSideMixed', 'disputeSidePages', 'designInfo', 'brandInfo', 'infoSource'];
  it('every locale has its own wording, soft, never 非確認', () => {
    for (const lng of locales) {
      const t = createT(lng);
      for (const k of KEYS) {
        const s = t(`check.rc.${k}`, { country: 'X', n: 1, e: 1, sides: 'S', label: 'L' });
        assert.ok(s && !s.startsWith('check.rc.'), `${lng} ${k}`);
        assert.ok(!s.includes('非確認'), `${lng} ${k}`);
        if (lng !== 'en' && k !== 'infoSource') assert.notEqual(s, en(`check.rc.${k}`, { country: 'X', n: 1, e: 1, sides: 'S', label: 'L' }), `${lng} ${k}`);
      }
      const r1 = DISPUTE_CASES.dispute1();
      const r3 = DISPUTE_CASES.dispute3();
      assert.ok(card(r1, t).includes('madein-design'), lng);
      assert.ok(card(r3, t).includes('madein-dispute'), lng);
      assert.ok(!card(r1, t).includes('非確認') && !card(r3, t).includes('非確認'), lng);
    }
  });
});
