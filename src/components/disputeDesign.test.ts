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
import { SERVER_TEXT } from '../../functions/_lib/serverText';
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

describe('label photo: CJK design wording never eats the made-in country (95% from the label)', () => {
  for (const [ocr, madeIn, made, design] of [
    ['設計於德國 中國製造', 'China', '中國', '德國'],
    ['設計於德國中國製造', 'China', '中國', '德國'],
    ['設計於日本 台灣製', 'Taiwan', '台灣', '日本'],
    ['設計於日本台灣製', 'Taiwan', '台灣', '日本'],
    ['研發於德國中國生產', 'China', '中國', '德國'],
    ['德國設計中國製造', 'China', '中國', '德國'],
    ['Designed in Germany Made in China', 'China', '中國', '德國'],
  ] as const) {
    it(`「${ocr}」 → ${made} 95% (label) + 附加資訊 ${design}, no ${design} made-in candidate`, () => {
      const r = runPages({ madeIn, ocrText: `CYBEX Melio\n${ocr}`, pages: [] });
      const v = buildMadeInView(r);
      assert.equal(v.state, 'confirmed', JSON.stringify(v));
      assert.equal(v.basis, 'label');
      assert.equal(v.country, madeIn);
      assert.equal(Math.round((v.confidence ?? 0) * 100), 95);
      assert.equal(v.dispute, undefined);
      assert.ok(!v.candidates.some((c) => /germany|japan|德國|日本/i.test(c.label)), JSON.stringify(v.candidates));
      assert.equal(v.designRows.length, 1, JSON.stringify(v.designRows));
      const t = text(r);
      assert.ok(t.includes(made) && t.includes('95%'), t);
      assert.ok(t.includes(zh('check.rc.designInfo', { country: design })), t);
      assert.ok(!t.includes('爭議') && !t.includes('有提及'), t);
    });
  }
  it('the AI reading the design country as made-in never gets the label 95%', () => {
    const r = runPages({ madeIn: 'Germany', ocrText: 'CYBEX Melio\n設計於德國 中國製造', pages: [] });
    const v = buildMadeInView(r);
    assert.ok(!(v.state === 'confirmed' && v.country === 'Germany' && v.basis === 'label'), JSON.stringify(v));
  });
  for (const note of ['德國廠牌 Cybex，輕量推車。', '德國廠商 Cybex 出品。', 'Cybex 創立於德國。', 'Cybex 成立於德國。']) {
    it(`card: note ${JSON.stringify(note)} → no 「德國 · 有提及」 row, 品牌 附加資訊 instead`, () => {
      const r = runPages({ notes: [note], pages: [] });
      const v = buildMadeInView(r);
      assert.ok(!v.candidates.some((c) => /germany|德國/i.test(c.label)), JSON.stringify(v.candidates));
      const t = text(r);
      assert.ok(!t.includes('有提及'), t);
      assert.ok(t.includes(zh('check.rc.brandInfo', { country: '德國' })), t);
    });
  }
  it('card: the server note "Made-in omitted: it matched…" shows no Italy', () => {
    const r = runPages({ notes: [SERVER_TEXT.madeInOmittedBrand], pages: [] });
    const v = buildMadeInView(r);
    assert.ok(!v.candidates.some((c) => /italy|義大利|意大利/i.test(c.label)), JSON.stringify(v.candidates));
    assert.ok(!/義大利|意大利/.test(text(r)) && !/Italy/.test(text(r, en)));
  });
  it('dispute6 render fixture: 中國 95% plus 附加資訊', () => {
    const v = buildMadeInView(DISPUTE_CASES.dispute6());
    assert.equal(v.basis, 'label');
    assert.equal(Math.round((v.confidence ?? 0) * 100), 95);
    assert.ok(text(DISPUTE_CASES.dispute6()).includes(DESIGN_ZH));
  });
});

describe('label photo: 製造於 X after a design phrase reads X; the design country stays 附加資訊', () => {
  for (const [ocr, madeIn, made, design] of [
    ['設計於德國製造於中國', 'China', '中國', '德國'],
    ['設計於德國 製造於中國', 'China', '中國', '德國'],
    ['德國設計 生產於越南', 'Vietnam', '越南', '德國'],
    ['設計：德國 產地：中國', 'China', '中國', '德國'],
  ] as const) {
    it(`「${ocr}」 → ${made} 95% + 附加資訊 ${design}`, () => {
      const r = runPages({ madeIn, ocrText: `CYBEX Melio\n${ocr}`, pages: [] });
      const v = buildMadeInView(r);
      assert.equal(v.state, 'confirmed', JSON.stringify(v));
      assert.equal(v.basis, 'label');
      assert.equal(v.country, madeIn);
      assert.equal(Math.round((v.confidence ?? 0) * 100), 95);
      assert.ok(!v.candidates.some((c) => /germany|德國/i.test(c.label)), JSON.stringify(v.candidates));
      const t = text(r);
      assert.ok(t.includes(made) && t.includes('95%'), t);
      assert.ok(t.includes(zh('check.rc.designInfo', { country: design })), t);
      assert.ok(!t.includes('有提及') && !t.includes('爭議'), t);
    });
  }
  it('「設計於德國製造於中國」 with the AI saying Germany never gets 德國 · 依包裝標示 · 95%', () => {
    const r = runPages({ madeIn: 'Germany', ocrText: 'CYBEX Melio\n設計於德國製造於中國', pages: [] });
    const v = buildMadeInView(r);
    assert.ok(!(v.country === 'Germany' && v.basis === 'label'), JSON.stringify(v));
    assert.ok(!/德國 · 依包裝標示/.test(text(r)));
  });
  for (const ocr of ['設計於德國 德國製造', '德國設計 德國製造']) {
    it(`「${ocr}」 → 德國 95% from the label (the second 德國 is the made-in)`, () => {
      const r = runPages({ madeIn: 'Germany', ocrText: `CYBEX Melio\n${ocr}`, pages: [] });
      const v = buildMadeInView(r);
      assert.equal(v.state, 'confirmed', JSON.stringify(v));
      assert.equal(v.basis, 'label');
      assert.equal(v.country, 'Germany');
      assert.equal(Math.round((v.confidence ?? 0) * 100), 95);
    });
  }
  it('設計：德國 in the notes gives no 「德國 · 有提及」 row, only 附加資訊', () => {
    const r = runPages({ madeIn: 'China', ocrText: 'CYBEX Melio\n產地：中國', notes: ['設計：德國 產地：中國'], pages: [] });
    const t = text(r);
    assert.ok(!t.includes('有提及'), t);
    assert.ok(t.includes(DESIGN_ZH), t);
  });
});

describe('upper-case codes after a made-in cue: 95% from a label, 較可能 from one page', () => {
  for (const [code, madeIn, zhName] of [
    ['Country of Origin: CN', 'China', '中國'],
    ['COO: CN', 'China', '中國'],
    ['MADE IN CN', 'China', '中國'],
    ['MADE IN JP', 'Japan', '日本'],
    ['MADE IN TW', 'Taiwan', '台灣'],
    ['Made in VN', 'Vietnam', '越南'],
  ] as const) {
    it(`label "${code}" → ${zhName} 95%`, () => {
      const r = runPages({ madeIn, ocrText: `CYBEX Melio\n${code}`, pages: [] });
      const v = buildMadeInView(r);
      assert.equal(v.state, 'confirmed', JSON.stringify(v));
      assert.equal(v.basis, 'label');
      assert.equal(Math.round((v.confidence ?? 0) * 100), 95);
      assert.ok(text(r).includes(zhName), text(r));
    });
    it(`page "${code}" → ${zhName} 較可能`, () => {
      const r = runPages({ pages: [page(URLS.mami, 'Cybex Melio 嬰兒推車 | MamiLove', `商品規格\n${code}\n重量：5.9 kg`)] });
      const coo = r.meta.searchCoo ?? [];
      assert.equal(coo.length, 1, JSON.stringify(coo));
      assert.equal(coo[0]!.status, 'likely');
      assert.equal(coo[0]!.country, madeIn);
      assert.ok(text(r).includes(zhName), text(r));
      // Same card as the full country name on that page (one page → likely, as on de6dba0).
      const full = runPages({ pages: [page(URLS.mami, 'Cybex Melio 嬰兒推車 | MamiLove', `商品規格\nMade in ${madeIn}\n重量：5.9 kg`)] });
      assert.equal(text(r), text(full));
    });
  }
  it('Made in IT / Made in DE / IT company / made in my kitchen stay rejected on both paths', () => {
    for (const t of ['Made in IT', 'Made in DE', 'IT company', 'made in my kitchen']) {
      const label = buildMadeInView(runPages({ madeIn: 'Italy', ocrText: `CYBEX Melio\n${t}`, pages: [] }));
      assert.notEqual(label.basis, 'label', t);
      const pg = runPages({ pages: [page(URLS.mami, 'Cybex Melio 嬰兒推車 | MamiLove', t)] });
      assert.deepEqual(pg.meta.searchCoo ?? [], [], t);
    }
  });
});

describe('display name: a label "Made in Viet Nam" shows 越南, never "Viet Nam"', () => {
  for (const ocr of ['Made in Viet Nam', 'MADE IN VIET NAM', 'Made in Vietnam']) {
    it(ocr, () => {
      for (const madeIn of [undefined, 'Vietnam']) {
        const r = runPages({ ocrText: `CYBEX Melio\n${ocr}`, pages: [], ...(madeIn ? { madeIn } : {}) });
        const v = buildMadeInView(r);
        assert.equal(v.basis, 'label');
        const t = text(r);
        assert.ok(t.includes('越南') && !/Viet Nam/i.test(t), t);
        assert.match(text(r, en), /Vietnam/);
      }
    });
  }
  it('a page "Made in Viet Nam" candidate also shows 越南', () => {
    const r = runPages({ pages: [page(URLS.mami, 'Cybex Melio 嬰兒推車 | MamiLove', 'Made in Viet Nam')] });
    const t = text(r);
    assert.ok(t.includes('越南') && !/Viet Nam/i.test(t), t);
  });
});

describe('label field with a second explicit made-in claim: 未確認 + 爭議 (both from the package label)', () => {
  for (const [ocr, a, b] of [
    ['產地：中國 日本製', '中國', '日本'],
    ['原産国：中国 MADE IN JAPAN', '中國', '日本'],
    ['產地：中國（日本製造）', '中國', '日本'],
  ] as const) {
    for (const madeIn of [undefined, 'China', 'Japan']) {
      it(`「${ocr}」${madeIn ? ` (AI ${madeIn})` : ''} → 未確認, 爭議：${a}（包裝標示）；${b}（包裝標示）`, () => {
        const r = runPages({ ocrText: `CYBEX Melio\n${ocr}`, pages: [], ...(madeIn ? { madeIn } : {}) });
        const v = buildMadeInView(r);
        assert.equal(v.state, 'unconfirmed', JSON.stringify(v));
        assert.equal(v.dispute?.length, 2, JSON.stringify(v));
        const t = text(r);
        assert.ok(t.includes(`${a}（包裝標示）；${b}（包裝標示）`), t);
        assert.ok(!t.includes('95%'), t);
      });
    }
  }
  for (const [ocr, made] of [
    ['原産国：ベトナム（日本製生地使用）', '越南'],
    ['原産国：中国（日本企画）', '中國'],
    ['產地：中國 香港出貨', '中國'],
    ['Origin: China (fabric made in Japan)', '中國'],
  ] as const) {
    it(`「${ocr}」 → ${made} 95% from the label, no 爭議`, () => {
      const r = runPages({ ocrText: `CYBEX Melio\n${ocr}`, pages: [] });
      const v = buildMadeInView(r);
      assert.equal(v.state, 'confirmed', JSON.stringify(v));
      assert.equal(v.basis, 'label');
      const t = text(r);
      assert.ok(t.includes(made) && t.includes('95%') && !t.includes('爭議'), t);
    });
  }
});

describe('a pure country list in one 產地 field: 未確認 + 爭議, sourced to the label or to the page', () => {
  const NO_CAND = zh('check.rc.noCandidates');
  for (const [ocr, a, b] of [
    ['產地：德國 中國', '德國', '中國'],
    ['產地：德國、中國', '德國', '中國'],
    ['產地：日本／中國', '日本', '中國'],
    ['Origin: China / Germany', '中國', '德國'],
    ['Origin: China and Vietnam (see label)', '中國', '越南'],
  ] as const) {
    it(`label 「${ocr}」 → 爭議：${a}（包裝標示）；${b}（包裝標示）, no %, no 「${NO_CAND}」`, () => {
      const r = runPages({ ocrText: `CYBEX Melio\n${ocr}`, pages: [] });
      const v = buildMadeInView(r);
      assert.equal(v.state, 'unconfirmed', JSON.stringify(v));
      const t = text(r);
      assert.ok(t.includes(`爭議：${a}（包裝標示）；${b}（包裝標示）`), t);
      assert.ok(!t.includes('%') && !t.includes(NO_CAND), t);
    });
    it(`page 「${ocr}」 → 爭議 names the web page (never 包裝標示), sides ungraded`, () => {
      const r = runPages({ pages: [page(URLS.mami, 'Cybex Melio 嬰兒推車 | MamiLove', `商品規格\n${ocr}\n重量：5.9 kg`)] });
      const v = buildMadeInView(r);
      assert.equal(v.state, 'unconfirmed', JSON.stringify(v));
      assert.equal(v.dispute?.length, 2, JSON.stringify(v));
      assert.ok(v.dispute!.every((d) => !d.label && d.pages === 1), JSON.stringify(v.dispute));
      assert.ok(v.candidates.every((c) => c.neutral), JSON.stringify(v.candidates));
      const t = text(r);
      assert.match(t, new RegExp(`爭議：${a}（1 個(型號相符的)?網頁）；${b}（1 個(型號相符的)?網頁）`), t);
      assert.ok(!t.includes('包裝標示') && !t.includes('%') && !t.includes(NO_CAND), t);
    });
  }
  it('a label 爭議 line hides 「沒有查到可信的產地候選。」 (explicit second claim too)', () => {
    const r = runPages({ ocrText: 'CYBEX Melio\n產地：中國 日本製', pages: [] });
    const t = text(r);
    assert.ok(t.includes('爭議：中國（包裝標示）；日本（包裝標示）') && !t.includes(NO_CAND), t);
    // Without a 爭議 line the empty-state text still shows.
    assert.ok(text(runPages({ pages: [] })).includes(NO_CAND));
  });
});

describe('label 爭議 card layout and merging with a page 爭議', () => {
  const HEAD = zh('check.rc.candidatesTitle');
  it(`a label 爭議 with no candidate rows hides the empty 「${HEAD}」 heading`, () => {
    for (const ocr of ['產地：中國 日本製', '產地：德國 中國']) {
      const r = runPages({ ocrText: `CYBEX Melio\n${ocr}`, pages: [] });
      const t = text(r);
      assert.ok(t.includes('爭議：') && !t.includes(HEAD) && !t.includes(zh('check.rc.noCandidates')), t);
    }
    // No 爭議: heading and empty-state text still show.
    const t = text(runPages({ pages: [] }));
    assert.ok(t.includes(HEAD) && t.includes(zh('check.rc.noCandidates')), t);
  });
  it('label China/Japan + page China/Vietnam → one merged 爭議 line, each country once, label first', () => {
    const r = runPages({
      ocrText: 'CYBEX Melio\n產地：中國 日本製',
      pages: [page(URLS.mami, 'Cybex Melio 嬰兒推車 | MamiLove', '商品規格\n產地：中國、越南\n重量：5.9 kg')],
    });
    const v = buildMadeInView(r);
    assert.deepEqual(
      v.dispute?.map((d) => [d.label ?? false, d.pages]),
      [
        [true, 1],
        [true, 0],
        [false, 1],
      ],
      JSON.stringify(v.dispute)
    );
    const t = text(r);
    // Round 10: a label side's matching-model pages are worded like a page-only side.
    assert.match(t, /爭議：中國（包裝標示、1 個型號相符的網頁）；日本（包裝標示）；越南（1 個(型號相符的)?網頁）/, t);
    assert.ok(!t.includes('%'), t);
  });
  it('the merged line in English names both sources', () => {
    const r = runPages({
      ocrText: 'CYBEX Melio\n產地：中國 日本製',
      pages: [page(URLS.mami, 'Cybex Melio 嬰兒推車 | MamiLove', '商品規格\n產地：中國、越南\n重量：5.9 kg')],
    });
    assert.match(text(r, en), /China \(package label; exact-model pages: 1\)/);
  });
});

describe('label 爭議 outranks web pages: matching-model pages never replace it (only a barcode wins)', () => {
  const L = 'CYBEX Melio\n產地：中國 日本製';
  const A = (t: string) => page(URLS.mami, 'Cybex Melio 嬰兒推車 | MamiLove', t);
  const B = (t: string) => page(URLS.shopDe, 'Cybex Melio Kinderwagen', t);
  const sides = (v: ReturnType<typeof buildMadeInView>) =>
    v.dispute?.map((d) => [d.country, d.label ?? false, d.pages, d.exactPages ?? 0]);
  it('label 中國 日本製 + 2 matching pages Vietnam → 未確認, 爭議：中國（包裝標示）；日本（包裝標示）；越南（2 個型號相符的網頁）', () => {
    const r = runPages({ ocrText: L, pages: [A('Made in Vietnam'), B('Made in Vietnam')] });
    const v = buildMadeInView(r);
    assert.equal(v.state, 'unconfirmed', JSON.stringify(v));
    assert.deepEqual(sides(v), [['China', true, 0, 0], ['Japan', true, 0, 0], ['Vietnam', false, 2, 2]], JSON.stringify(v.dispute));
    const t = text(r);
    assert.ok(t.includes('爭議：中國（包裝標示）；日本（包裝標示）；越南（2 個型號相符的網頁）'), t);
    assert.ok(!t.includes('%') && !t.includes('80'), t);
  });
  it('label 中國 日本製 + 2 matching pages China → 未確認, China lists both sources', () => {
    const r = runPages({ ocrText: L, pages: [A('Made in China'), B('Made in China')] });
    const v = buildMadeInView(r);
    assert.equal(v.state, 'unconfirmed', JSON.stringify(v));
    assert.deepEqual(sides(v), [['China', true, 2, 2], ['Japan', true, 0, 0]], JSON.stringify(v.dispute));
    const t = text(r);
    assert.ok(t.includes('爭議：中國（包裝標示、2 個型號相符的網頁）；日本（包裝標示）'), t);
    assert.ok(!t.includes('%'), t);
  });
  it('label 中國 日本製 + 1 page Vietnam → the page side is merged in', () => {
    const r = runPages({ ocrText: L, pages: [A('Made in Vietnam')] });
    const t = text(r);
    assert.match(t, /爭議：中國（包裝標示）；日本（包裝標示）；越南（1 個(型號相符的)?網頁）/, t);
  });
  it('label 中國 日本製 + AI Vietnam + 1 matching page Vietnam → still 未確認 + 爭議', () => {
    const r = runPages({ ocrText: L, madeIn: 'Vietnam', pages: [A('Made in Vietnam')] });
    const v = buildMadeInView(r);
    assert.equal(v.state, 'unconfirmed', JSON.stringify(v));
    assert.ok(text(r).includes('爭議：中國（包裝標示）；日本（包裝標示）；越南'), text(r));
  });
  it('label 中國 日本製 + barcode page China → China 95% from the barcode (unchanged)', () => {
    const r = runPages({
      ocrText: `${L}\nJAN ${JAN}`,
      pages: [page(URLS.jan, `Cybex Melio 嬰兒推車 ${JAN}`, `條碼：${JAN}\nMade in China`)],
    });
    const v = buildMadeInView(r);
    assert.equal(v.state, 'confirmed', JSON.stringify(v));
    assert.equal(v.basis, 'barcode');
    assert.equal(v.country, 'China');
  });
  it('a single label claim + 2 matching pages that disagree → the label 95% still wins (unchanged)', () => {
    for (const n of [1, 2]) {
      const pages = [A('Made in Vietnam'), B('Made in Vietnam')].slice(0, n);
      const v = buildMadeInView(runPages({ ocrText: 'CYBEX Melio\nMade in China', pages }));
      assert.equal(v.state, 'confirmed', JSON.stringify(v));
      assert.equal(v.basis, 'label');
      assert.equal(v.country, 'China');
      assert.ok(!v.dispute, JSON.stringify(v));
    }
  });
});

describe('爭議 subtitle: 「來源說法不一」 when the label is a side, 「網頁說法不一」 only when every side is a web page', () => {
  const reasonChip = (r: Parameters<typeof MadeInCard>[0]['result'], t = zh) =>
    /data-testid="madein-reason"[^>]*>([^<]*)</.exec(card(r, t))?.[1];
  const A = (t: string) => page(URLS.mami, 'Cybex Melio 嬰兒推車 | MamiLove', t);
  it('label-only 爭議 → 來源說法不一 / Sources disagree', () => {
    const r = runPages({ ocrText: 'CYBEX Melio\n產地：中國 日本製', pages: [] });
    assert.equal(reasonChip(r), '來源說法不一');
    assert.equal(reasonChip(r, en), 'Sources disagree');
  });
  it('label 爭議 merged with a page 爭議 → 來源說法不一', () => {
    const r = runPages({ ocrText: 'CYBEX Melio\n產地：中國 日本製', pages: [A('商品規格\n產地：中國、越南\n重量：5.9 kg')] });
    assert.equal(reasonChip(r), '來源說法不一');
    assert.ok(!card(r).includes('網頁說法不一'));
  });
  it('label 爭議 + pages that agree with each other → 來源說法不一', () => {
    const r = runPages({
      ocrText: 'CYBEX Melio\n產地：中國 日本製',
      pages: [A('Made in Vietnam'), page(URLS.shopDe, 'Cybex Melio Kinderwagen', 'Made in Vietnam')],
    });
    assert.equal(reasonChip(r), '來源說法不一');
  });
  it('every side a web page → 網頁說法不一 / Web pages disagree', () => {
    const r = runPages({ pages: [A('商品規格\n產地：德國 中國\n重量：5.9 kg')] });
    assert.equal(reasonChip(r), '網頁說法不一');
    assert.equal(reasonChip(r, en), 'Web pages disagree');
    const r3 = DISPUTE_CASES.dispute3();
    assert.equal(reasonChip(r3), '網頁說法不一');
  });
  it('「來源說法不一」 has its own wording in all 16 locales', () => {
    for (const lng of locales) {
      const s = createT(lng)('check.rc.reason.sourcesDisagree');
      assert.ok(s && !s.startsWith('check.rc.'), lng);
      if (lng !== 'en') assert.notEqual(s, en('check.rc.reason.sourcesDisagree'), lng);
      assert.notEqual(s, createT(lng)('check.rc.reason.pagesDisagree'), lng);
    }
  });
});

describe('round 10: merged 爭議 wording and EU in every language', () => {
  const A = (t: string) => page(URLS.mami, 'Cybex Melio 嬰兒推車 | MamiLove', t);
  const B = (t: string) => page('https://www.babyhome.com.tw/item/cybex', 'Melio stroller', t);
  it('a label side whose pages match the model reads 「包裝標示、N 個型號相符的網頁」 like a page-only side', () => {
    const r = runPages({ ocrText: 'CYBEX Melio\n產地：中國 日本製', pages: [A('Made in China')] });
    const t = text(r);
    assert.ok(t.includes('中國（包裝標示、1 個型號相符的網頁）；日本（包裝標示）'), t);
  });
  it('a label side with a page that does not name the model keeps 「包裝標示、N 個網頁」', () => {
    const r = runPages({ ocrText: 'CYBEX Melio\n產地：中國 日本製', pages: [B('Made in China')] });
    const v = buildMadeInView(r);
    const side = v.dispute?.find((d) => d.country === 'China');
    if (side && side.pages && !side.exactPages) assert.ok(text(r).includes('中國（包裝標示、1 個網頁）'), text(r));
  });
  it('EU is shown in the reader\'s language (歐盟, Europäische Union …), never the English name outside English', () => {
    const r = runPages({ ocrText: 'CYBEX Melio\nCOO: China (EU-made)', pages: [] });
    assert.ok(text(r).includes('歐盟') && !text(r).includes('European Union'), text(r));
    for (const lng of locales) {
      const t = text(r, createT(lng));
      if (lng === 'en') assert.ok(t.includes('European Union'), lng);
      else assert.ok(!t.includes('European Union'), `${lng}: ${t}`);
    }
  });
});

describe('dispute / design wording in all 16 locales', () => {
  const KEYS = ['dispute', 'disputeSideExact', 'disputeSideMixed', 'disputeSidePages', 'disputeSideLabel', 'disputeSideLabelPages', 'disputeSideLabelExact', 'disputeSideLabelMixed', 'designInfo', 'brandInfo', 'infoSource'];
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
