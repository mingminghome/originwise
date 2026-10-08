/**
 * 製造地 card for 依型號比對 (item g, Ming's rule): the AI answer counts as
 * one source; the web verifies it. Results are built by the real synthesize
 * path (no live lookups), then rendered in all 16 locales.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { catalogs, createT } from '../core/i18n';
import type { CheckResult } from '../core/types';
import type { WebCooClaim } from '../../functions/_lib/schema';
import { synthesize } from '../../functions/_lib/synthesize';
import { buildChinaCard } from './ChinaLink';
import { ChinaCard, MadeInCard, sourcePrefix } from './ResultCards';
import { buildMadeInView, partsListCandidates } from './resultCards.model';
import { ResultPanel } from './ResultPanel';
import { localizeCountry } from '../core/i18n/countries';

(globalThis as { React?: unknown }).React = React;

const locales = Object.keys(catalogs) as Array<Parameters<typeof createT>[0]>;
const text = (el: React.ReactElement) =>
  renderToStaticMarkup(el)
    .replace(/<[^>]+>/g, '\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n');

/** Visible text with tags dropped and no line breaks (rows read as one line each). */
const flat = (el: React.ReactElement) => renderToStaticMarkup(el).replace(/<[^>]+>/g, '');

const MOMO = 'https://www.momoshop.com.tw/goods/GoodsDetail.jsp?i_code=1';
const MAMI = 'https://mamilove.com.tw/product/2';
const SOURCES = [`Cybex Melio 嬰兒推車 — ${MOMO}`, `CYBEX MELIO stroller — ${MAMI}`];

function run(madeIn: string | undefined, webCoo: WebCooClaim[]): CheckResult {
  const r = synthesize({
    jobId: 'mm',
    geoScope: 'prc',
    locale: 'zh-Hant',
    webEnriched: true,
    webBrief: 'x',
    sources: SOURCES,
    partials: {
      product: { name: 'Cybex Melio 嬰兒推車', brand: 'Cybex', ...(madeIn ? { madeIn } : {}), confidence: 0.9 },
    },
    webCoo,
  });
  return {
    ...r,
    sources: SOURCES,
    meta: {
      ...r.meta,
      searchProvider: 'firecrawl',
      searchCoo: webCoo,
      searchMatch: r.product?.madeInBasis === 'model' ? 'model' : 'name',
    },
  } as CheckResult;
}

const exact = (country: string, url: string): WebCooClaim => ({
  country,
  basis: 'name',
  status: 'likely',
  url,
  exactModel: true,
});
const model = (country: string, url: string): WebCooClaim => ({
  country,
  basis: 'model',
  status: 'confirmed',
  url,
  exactModel: true,
});

const AI_WEB = run('China', [exact('中國', MOMO)]);
const WEB2_OUTVOTED = run('Czech Republic', [model('中國', MOMO), model('China', MAMI)]);
const AI_ONLY = run('China', []);
const CONFLICT = run('China', [exact('中國', MOMO), exact('Germany', MAMI)]);

describe('製造地 card, 依型號比對', () => {
  it('(1) AI answer + 1 exact-model page: confirmed; rows = AI answer, then the page; chip == rows', () => {
    const v = buildMadeInView(AI_WEB);
    assert.equal(v.state, 'confirmed');
    assert.equal(v.basis, 'model');
    assert.deepEqual(v.sourceRows.map((r) => (r.ai ? 'AI' : r.url)), ['AI', MOMO]);
    assert.equal(v.sourceCount, 2);
    for (const lng of locales) {
      const t = createT(lng);
      const out = flat(React.createElement(MadeInCard, { result: AI_WEB, t }));
      assert.ok(out.includes(t('check.matchBasis.model')), `${lng}: basis label`);
      assert.ok(out.includes(t('check.rc.sourceNth', { n: 1, label: t('check.rc.sourceAiAnswer') })), `${lng}: AI row`);
      assert.ok(out.includes(t('check.rc.sourceCount', { n: 2 })), `${lng}: chip`);
      assert.ok(!out.includes(t('check.rc.modelRef')), `${lng}: no model reference row`);
    }
    const zh = flat(React.createElement(MadeInCard, { result: AI_WEB, t: createT('zh-Hant') }));
    assert.match(zh, /依型號比對/);
    assert.match(zh, /來源 1：AI 回答/);
    assert.match(zh, /來源 2：Cybex Melio 嬰兒推車/);
  });

  it('(2) two exact-model domains outvote the AI answer: confirmed from the pages, AI answer as a model-reference candidate row', () => {
    const v = buildMadeInView(WEB2_OUTVOTED);
    assert.equal(v.state, 'confirmed');
    assert.equal(v.basis, 'model');
    assert.deepEqual(v.sourceRows.map((r) => (r.ai ? 'AI' : r.url)), [MOMO, MAMI]);
    assert.deepEqual(v.candidates.map((c) => c.label), ['Czech Republic']);
    const zhT = createT('zh-Hant');
    const zh = text(React.createElement(MadeInCard, { result: WEB2_OUTVOTED, t: zhT }));
    assert.ok(zh.includes(zhT('check.rc.modelRef')), zh);
    assert.ok(!zh.includes('AI 回答'), 'the outvoted AI answer is not a source row');
  });

  it('(3) AI answer alone: not confirmed, held back as the model reference row (#32)', () => {
    const v = buildMadeInView(AI_ONLY);
    assert.equal(v.state, 'unconfirmed');
    assert.equal(v.sourceCount, 0);
    const zhT = createT('zh-Hant');
    const zh = text(React.createElement(MadeInCard, { result: AI_ONLY, t: zhT }));
    assert.ok(zh.includes(zhT('check.rc.modelRef')));
    assert.ok(!zh.includes('依型號比對'));
  });

  it('(4) exact-model pages disagree: 未確認 with both candidates', () => {
    const v = buildMadeInView(CONFLICT);
    assert.equal(v.state, 'unconfirmed');
    const labels = v.candidates.map((c) => c.label);
    assert.ok(labels.some((l) => /中國|China/.test(l)) && labels.includes('Germany'), labels.join(','));
  });

  it('China card: a model-match made-in feeds it, worded 依型號比對 in every locale', () => {
    for (const r of [AI_WEB, WEB2_OUTVOTED]) {
      const view = buildChinaCard(r);
      assert.ok(view.reasons.some((x) => x.kind === 'madeIn' && x.basis === 'model'));
    }
    for (const lng of locales) {
      const t = createT(lng);
      const out = text(React.createElement(ChinaCard, { result: AI_WEB, t }));
      const line = t('check.chinaLink.madeInLineModel', { place: localizeCountry(t, 'China') });
      assert.ok(out.includes(line), `${lng}: ${line}\n${out}`);
    }
    assert.ok(!buildChinaCard(AI_ONLY).reasons.some((x) => x.kind === 'madeIn'));
  });

  it('About card: 「When a made-in counts as confirmed」 describes the AI-answer + web rule in all locales', () => {
    const en = createT('en')('how.evidenceBody');
    for (const lng of locales) {
      const body = createT(lng)('how.evidenceBody');
      if (lng !== 'en') assert.notEqual(body, en, `${lng}: translated`);
      assert.ok(!/[{}]/.test(body), lng);
    }
    assert.match(createT('en')('how.evidenceBody'), /AI answer and at least one web page/);
    assert.match(createT('en')('how.evidenceBody'), /two or more such pages on different websites/);
    assert.match(createT('en')('how.evidenceBody'), /AI answer alone is never confirmed/);
    assert.match(createT('en')('how.evidenceBody'), /A link the AI cites counts only after a check/);
    assert.match(createT('zh-Hant')('how.evidenceBody'), /AI 引用，未能驗證/);
    assert.match(createT('zh-Hant')('how.evidenceBody'), /依型號比對/);
    assert.match(createT('zh-Hant')('how.evidenceBody'), /只有 AI 回答時不算確認/);
  });
});

/* ---------- The six rule cases (EXAMPLE fixture, real gate + synthesize) ---------- */

import { readFileSync } from 'node:fs';
import { stripUiForCapture } from './modelMatch.testutil';
type RuleFixture = Record<`rule${1 | 2 | 3 | 4 | 5 | 6}`, { result: CheckResult }>;
const RULES = JSON.parse(
  readFileSync(new URL('./fixtures/madein-rules.json', import.meta.url), 'utf8')
) as RuleFixture;
const CASES = [1, 2, 3, 4, 5, 6].map((n) => RULES[`rule${n}` as keyof RuleFixture].result);

describe('製造地 rule cases (example fixture madein-rules.json)', () => {
  const zhT = createT('zh-Hant');
  const card = (r: CheckResult, t = zhT) => flat(React.createElement(MadeInCard, { result: r, t }));

  it('1: AI answer + one exact-model page → 中國 · 依型號比對; rows: AI answer, the page', () => {
    const v = buildMadeInView(RULES.rule1.result);
    assert.equal(v.state, 'confirmed');
    assert.deepEqual(v.sourceRows.map((r) => Boolean(r.ai)), [true, false]);
    assert.match(card(RULES.rule1.result), /中國.*依型號比對.*信心 75%.*來源 1：AI 回答/);
  });

  it('2: two domains, no AI answer → confirmed 依型號比對 at 80%, two page rows, no AI row', () => {
    const v = buildMadeInView(RULES.rule2.result);
    assert.equal(v.state, 'confirmed');
    assert.equal(v.sourceRows.length, 2);
    assert.ok(v.sourceRows.every((r) => !r.ai));
    assert.match(card(RULES.rule2.result), /依型號比對.*信心 80%/);
  });

  it('3: AI answer only → 未確認, reason 只有 AI 回答，未有網頁佐證, the model-reference row', () => {
    const v = buildMadeInView(RULES.rule3.result);
    assert.equal(v.state, 'unconfirmed');
    assert.equal(v.reason, 'aiOnly');
    const zh = card(RULES.rule3.result);
    assert.ok(zh.includes('只有 AI 回答，未有網頁佐證'));
    assert.ok(zh.includes(zhT('check.rc.modelRef')));
  });

  it('4: exact-model pages disagree → 未確認, 網頁說法不一, neutral candidates with their own sources, no basis chip', () => {
    const r = RULES.rule4.result;
    const v = buildMadeInView(r);
    assert.equal(v.state, 'unconfirmed');
    assert.equal(v.reason, 'pagesDisagree');
    assert.deepEqual(v.candidates.map((c) => c.label).sort(), ['China', 'Germany']);
    assert.ok(v.candidates.every((c) => c.neutral && c.sources?.length === 1));
    const zh = card(r);
    assert.ok(zh.includes('網頁說法不一'));
    assert.ok(!zh.includes(zhT('check.candidateRating.likely')), zh);
    assert.ok(!zh.includes(zhT('check.matchBasis.name')), zh);
    assert.match(zh, /中國.*來源 1：Cybex Melio 輕量嬰兒推車.*德國.*來源 1：Cybex Melio Kinderwagen/);
  });

  it('5: an AI-cited link that fails the check → reason AI 引用未能驗證, 「AI 引用，未能驗證」 row (every locale), confirms nothing', () => {
    const r = RULES.rule5.result;
    const v = buildMadeInView(r);
    assert.equal(v.state, 'unconfirmed');
    assert.equal(v.reason, 'aiCitedUnverified');
    assert.equal(v.sourceCount, 0);
    assert.equal(v.citedRows.length, 1);
    const zh = card(r);
    assert.match(zh, /AI 引用，未能驗證：Cybex Melio factory/);
    assert.ok(zh.includes('AI 引用未能驗證'));
    assert.ok(zh.includes(zhT('check.rc.modelRef')));
    for (const lng of locales) {
      const t = createT(lng);
      const label = t('check.rc.citedUnverified');
      assert.ok(label && label !== 'check.rc.citedUnverified', lng);
      if (lng !== 'en') assert.notEqual(label, createT('en')('check.rc.citedUnverified'), lng);
      assert.ok(card(r, t).includes(label), lng);
    }
  });

  it('6: near-miss page (Melio Carbon) is an excluded row 「型號不符（Melio Carbon），未計算」; one exact page → 未確認 + candidate, 只有一個網頁提及', () => {
    const r = RULES.rule6.result;
    const v = buildMadeInView(r);
    assert.equal(v.state, 'unconfirmed');
    assert.equal(v.reason, 'onePageOnly');
    assert.deepEqual(v.excludedRows.map((e) => e.model), ['Melio Carbon']);
    const china = v.candidates.find((c) => c.label === 'China' || c.label === '中國');
    assert.equal(china?.sources?.length, 1);
    assert.ok(!china!.sources!.some((s) => /carbon/i.test(`${s.url} ${s.label}`)));
    const zh = card(r);
    assert.match(zh, /型號不符（Melio Carbon），未計算：Cybex Melio Carbon ベビーカー/);
    assert.ok(zh.includes('只有一個網頁提及'));
    for (const lng of locales) {
      const t = createT(lng);
      const label = t('check.rc.excludedOtherModel', { model: 'Melio Carbon' });
      assert.ok(label.includes('Melio Carbon') && !label.includes('{'), lng);
      if (lng !== 'en') assert.notEqual(label, createT('en')('check.rc.excludedOtherModel', { model: 'Melio Carbon' }), lng);
      assert.ok(card(r, t).includes(label), lng);
    }
  });

  it('6: one exact-model page → candidate meta 「1 個型號相符的網頁」 / "1 exact-model page", no grade, no %', () => {
    const r = RULES.rule6.result;
    const china = buildMadeInView(r).candidates.find((c) => c.label === 'China' || c.label === '中國');
    assert.equal(china?.exactPages, 1);
    const zhHtml = renderToStaticMarkup(React.createElement(MadeInCard, { result: r, t: zhT }));
    assert.match(zhHtml, /<span class="rc-cand-meta" data-testid="cand-exact-one">1 個型號相符的網頁<\/span>/);
    assert.ok(!zhHtml.includes('較可能'), zhHtml);
    assert.ok(!zhHtml.includes('依品名比對'), zhHtml);
    assert.ok(!/\d+%/.test(zhHtml), zhHtml);
    const en = createT('en');
    const enHtml = renderToStaticMarkup(React.createElement(MadeInCard, { result: r, t: en }));
    assert.match(enHtml, /<span class="rc-cand-meta" data-testid="cand-exact-one">1 exact-model page<\/span>/);
    assert.ok(!enHtml.includes(en('check.candidateRating.likely')), enHtml);
    for (const lng of locales) {
      const t = createT(lng);
      const label = t('check.rc.oneExactModelPage');
      assert.ok(label && label !== 'check.rc.oneExactModelPage' && !/%/.test(label), lng);
      if (lng !== 'en') assert.notEqual(label, en('check.rc.oneExactModelPage'), lng);
      assert.ok(card(r, t).includes(label), lng);
    }
  });

  it('loose name-match page only (web_name, no exact model): keeps its grade, never 「1 個型號相符的網頁」', () => {
    const one = run(undefined, [{ country: '中國', basis: 'name', status: 'likely', url: MOMO }]);
    const v = buildMadeInView(one);
    assert.equal(v.state, 'unconfirmed');
    assert.ok(v.candidates.every((c) => !c.exactPages));
    const en = createT('en');
    for (const t of [zhT, en]) {
      const html = renderToStaticMarkup(React.createElement(MadeInCard, { result: one, t }));
      assert.ok(!html.includes(t('check.rc.oneExactModelPage')), html);
      assert.ok(!html.includes('cand-exact-one'), html);
      assert.ok(html.includes(`${t('check.candidateRating.likely')} · ${t('check.candidateSource.web_name')}`), html);
    }
    // Disagreeing exact pages (case 4) stay neutral: no grade and no exact-page
    // count on the rows; the counts sit in the 爭議 line only.
    const four = renderToStaticMarkup(React.createElement(MadeInCard, { result: RULES.rule4.result, t: zhT }));
    assert.ok(!four.includes('cand-exact-one') && !four.includes('rc-cand-meta'), four);
    assert.ok(four.includes('madein-dispute'), four);
  });

  it('reasons are localised in every locale; the old barcode-only reason is gone', () => {
    const en = createT('en');
    for (const lng of locales) {
      const t = createT(lng);
      for (const k of ['aiOnly', 'pagesDisagree', 'sourcesDisagree', 'aiCitedUnverified', 'onePageOnly']) {
        const v = t(`check.rc.reason.${k}`);
        assert.ok(v && v !== `check.rc.reason.${k}`, `${lng} ${k}`);
        if (lng !== 'en') assert.notEqual(v, en(`check.rc.reason.${k}`), `${lng} ${k}`);
      }
      assert.equal(t('check.rc.noBarcodePage'), 'check.rc.noBarcodePage', `${lng}: old key removed`);
      for (const r of CASES) assert.ok(!card(r, t).includes(en('check.rc.reason.aiOnly')) || lng === 'en');
    }
    for (const r of CASES) assert.ok(!card(r).includes('沒有網頁同時顯示條碼及產地'));
  });

  it('the likely tier never reaches the headline: unconfirmed cases headline 未確認, the country sits below', () => {
    for (const r of CASES.slice(2)) {
      const html = renderToStaticMarkup(React.createElement(MadeInCard, { result: r, t: zhT }));
      const headline = /<p class="rc-headline[^"]*">([^<]*)<\/p>/.exec(html)?.[1];
      assert.equal(headline, '未確認');
    }
    // Also a plain one-page likely result built by synthesize.
    const one = run(undefined, [{ country: '中國', basis: 'name', status: 'likely', url: MOMO }]);
    assert.equal(buildMadeInView(one).state, 'unconfirmed');
    assert.ok(!renderToStaticMarkup(React.createElement(MadeInCard, { result: one, t: zhT })).includes('is-likely'));
    // No 依品名比對 basis chip on any 未確認 card, in any locale (a candidate keeps its own grade).
    for (const lng of locales) {
      const t = createT(lng);
      for (const res of [...CASES.slice(2), one]) {
        const html = renderToStaticMarkup(React.createElement(MadeInCard, { result: res, t }));
        const chips = /<div class="rc-chips">(.*?)<\/div>/.exec(html)?.[1] ?? '';
        assert.ok(!chips.includes(t('check.matchBasis.name')), `${lng}: ${chips}`);
        assert.ok(!chips.includes(t('check.matchBasis.model')), `${lng}: ${chips}`);
      }
    }
  });

  it('no 「非確認」 (or the English "not confirmed" suffix) anywhere: every card, every case, 16 locales, screen and save', () => {
    for (const lng of locales) {
      const t = createT(lng);
      for (const r of [...CASES, AI_WEB, WEB2_OUTVOTED, AI_ONLY, CONFLICT]) {
        for (const el of [
          React.createElement(MadeInCard, { result: r, t }),
          React.createElement(ChinaCard, { result: r, t }),
        ]) {
          const html = renderToStaticMarkup(el);
          for (const out of [html, stripUiForCapture(html)]) {
            assert.ok(!out.includes('非確認'), `${lng}`);
            assert.ok(!/\(not confirmed\)/i.test(out), `${lng}`);
          }
        }
      }
    }
    for (const lng of locales) assert.equal(createT(lng)('check.rc.notConfirmed'), 'check.rc.notConfirmed', lng);
  });

  it('source rows: the 「來源 N：」 prefix is outside the link; only the page title is underlined', () => {
    for (const r of CASES) {
      for (const lng of locales) {
        const t = createT(lng);
        const html = renderToStaticMarkup(React.createElement(MadeInCard, { result: r, t }));
        for (const out of [html, stripUiForCapture(html)]) {
          for (const m of out.matchAll(/<a [^>]*>([\s\S]*?)<\/a>/g)) {
            const inner = m[1]!;
            for (const n of [1, 2, 3]) {
              const pre = sourcePrefix(t, n).before.trim();
              if (pre) assert.ok(!inner.includes(pre), `${lng}: prefix inside <a>: ${inner}`);
            }
            assert.ok(!inner.includes(t('check.rc.citedUnverified')), lng);
            assert.ok(!inner.includes(t('check.rc.excludedOtherModel', { model: 'Melio Carbon' })), lng);
          }
        }
      }
    }
    const html = renderToStaticMarkup(React.createElement(MadeInCard, { result: RULES.rule2.result, t: zhT }));
    assert.match(html, /<span class="rc-source-prefix">來源 2：<\/span><a [^>]*class="rc-source-title"[^>]*>CYBEX MELIO 推車 規格<\/a>/);
  });
});

describe('產地說明 fold follows the 製造地 card (Tester #35 item 3)', () => {
  const zhT = createT('zh-Hant');
  const fold = (r: CheckResult, t = zhT) => {
    const html = renderToStaticMarkup(React.createElement(ResultPanel, { result: r, t }));
    const i = html.indexOf('data-testid="fold-notes"');
    if (i < 0) return '';
    const end = html.indexOf('</details>', i);
    return html.slice(i, end).replace(/<[^>]+>/g, '');
  };

  it('case 4: the fold reason is 網頁說法不一 (the card\'s), no 零件 row for the made-in candidates, no grade or %', () => {
    const out = fold(RULES.rule4.result);
    assert.ok(out.includes('最終產地未確認：網頁說法不一；其他國家只列為候選。'), out);
    assert.doesNotMatch(out, /較可能|60%|依品名比對|條碼/);
    assert.ok(!out.includes(zhT('check.layerParts')), out);
  });

  it('case 6: the fold leads with the card reason 只有一個網頁提及; no 較可能 · 60% · 依品名比對的網頁 row', () => {
    const out = fold(RULES.rule6.result);
    assert.ok(out.includes('最終產地未確認：只有一個網頁提及；其他國家只列為候選。'), out);
    assert.doesNotMatch(out, /較可能|60%|依品名比對/);
  });

  it('every unconfirmed case, every locale: the fold reason is the card reason; no barcode-only wording', () => {
    for (const lng of locales) {
      const t = createT(lng);
      for (const r of CASES.slice(2)) {
        const v = buildMadeInView(r);
        const out = fold(r, t);
        assert.ok(out.includes(t(`check.rc.reason.${v.reason}`)), `${lng} ${v.reason}: ${out}`);
        assert.ok(!out.includes('沒有條碼網頁') && !/no barcode page/i.test(out), `${lng}: ${out}`);
      }
    }
  });

  it('made-in candidates (web_name, model_memory) never feed 零件 rows', () => {
    for (const r of CASES) {
      for (const c of partsListCandidates(r)) assert.ok(c.source !== 'web_name' && c.source !== 'model_memory', JSON.stringify(c));
    }
  });
});

describe('made-in card: 中国 / 中國 / China / 中华人民共和国 are one candidate', () => {
  const urls = ['https://a.example.com/1', 'https://b.example.org/2', 'https://c.example.net/3', 'https://d.example.jp/4'];
  const forms = ['中国', '中國', 'China', '中华人民共和国'];
  for (const [label, claim] of [['loose', (c: string, u: string): WebCooClaim => ({ country: c, basis: 'name', status: 'likely', url: u })], ['exact', exact]] as const) {
    it(`${label} pages`, () => {
      const r = run(undefined, forms.map((c, i) => claim(c, urls[i]!)));
      const v = buildMadeInView(r);
      const china = v.candidates.filter((c) => /china|中国|中國|中华/i.test(c.label));
      if (label === 'exact') {
        // All four exact pages agree once merged: confirmed, no disagreement, no candidate rows.
        assert.equal(v.state, 'confirmed', JSON.stringify(v));
        assert.match(v.country ?? '', /China|中國|中国/);
        assert.equal(china.length, 0);
      } else {
        assert.equal(v.state, 'unconfirmed');
        assert.equal(china.length, 1, JSON.stringify(v.candidates.map((c) => c.label)));
      }
      const html = flat(React.createElement(MadeInCard, { result: r, t: createT('zh-Hant') }));
      assert.equal((html.match(/中国/g) ?? []).length, 0, html);
      assert.equal((html.match(/中华人民共和国/g) ?? []).length, 0, html);
      const en = flat(React.createElement(MadeInCard, { result: r, t: createT('en') }));
      assert.match(en, /China/);
      assert.doesNotMatch(en, /中国|中國|中华/, en);
    });
  }
});
