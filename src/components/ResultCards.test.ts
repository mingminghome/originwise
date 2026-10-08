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
import { catalogs, createT } from '../core/i18n';
import type { CheckResult } from '../core/types';
import { ChinaCard, LayersCard, MadeInCard } from './ResultCards';
import { OriginLayers } from './OriginLayers';
import { CAPTURE_UI_SELECTOR, sectionShareCapture } from '../core/util/sectionImage';
import { ResultPanel } from './ResultPanel';
import { buildLayerRows, buildMadeInView, partCountryEvidence, sameCountryLabel } from './resultCards.model';
import { zhCountryText } from '../../functions/_lib/zhHant';

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
        sources: ['Cybex — https://example.com/about'],
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
        result: {
          ...unconfirmed,
          confidence: 0.5,
          relationTier: 'indirect',
          sources: ['TP-Link about — https://example.com/about'],
        },
        t: zh,
      })
    );
    assert.ok(out.includes('中國公司'));
    assert.ok(out.includes('直接'));
    assert.ok(out.includes('信心 75%'));
    assert.ok(out.includes('中國'));
  });

  it('no 75% floor when the HQ comes from model memory only (no Source line)', () => {
    const out = html(
      createElement(ChinaCard, {
        result: { ...unconfirmed, confidence: 0.5, relationTier: 'indirect', sources: undefined },
        t: zh,
      })
    );
    assert.ok(out.includes('中國公司'));
    assert.ok(out.includes('信心 50%'));
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
    // Exactly one tier pill on the page (in the China card), neutral style.
    assert.equal(out.split('data-testid="china-tier"').length - 1, 1);
    assert.equal(out.split('class="tier-badge').length - 1, 0);
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

const live = (name: string) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8')) as {
    query: string;
    result: CheckResult;
  };

describe('China card fairness (real payloads)', () => {
  const cybex = live('cybex-melio-live').result;
  const tapo = live('tapo-live').result;
  const sheer = live('sheer-live').result;
  const card = (r: CheckResult) => html(createElement(ChinaCard, { result: r, t: zh }));

  it('neutral pills: no tier badge / alarm class; chips use the plain chip style', () => {
    for (const r of [cybex, tapo, sheer]) {
      const out = card(r);
      assert.doesNotMatch(out, /tier-badge|rc-chip--solid/);
      assert.match(out, /class="rc-chip rc-tier-chip is-direct" data-testid="china-tier">直接</);
    }
  });

  it('footnote at the bottom in zh-Hant (exact) and en', () => {
    const out = card(tapo);
    assert.ok(
      out.includes('此卡只描述公司所在地、持股與製造地，不代表對產品品質、安全或公司的評價。')
    );
    assert.ok(out.lastIndexOf('china-footnote') > out.lastIndexOf('rc-reasons'));
    const en = html(createElement(ChinaCard, { result: tapo, t: createT('en') }));
    assert.ok(
      en.includes(
        'This card only describes where the company is based, who owns it and where the product is made. It is not a judgement of product quality, safety or the company.'
      )
    );
  });

  it('Cybex: control fact once, neutral 控股 (no source states 全資), no 公司總部位於中國', () => {
    const out = card(cybex);
    assert.equal(out.split('控股母公司位於中國大陸。').length - 1, 1);
    assert.ok(!out.includes('報告中有較強的中國大陸股權或控制關聯'));
    assert.ok(!out.includes('報告中有較弱的關聯'));
    assert.ok(out.includes('中國 · 控股'));
    assert.ok(!out.includes('全資'));
    assert.doesNotMatch(out, /公司總部位於[：:]?\s*中國/);
    assert.ok(out.includes('信心 95%'));
  });

  it('Tapo: 中國公司, 總部 + 品牌來源地 lines, no ownership lines, 75% (sourced)', () => {
    const out = card(tapo);
    assert.ok(out.includes('中國公司'));
    assert.ok(out.includes('公司總部位於：中國。'));
    assert.ok(out.includes('品牌來源地：中國。'));
    assert.ok(!out.includes('產品來源標示為'));
    assert.ok(!out.includes('股權或控制關聯'));
    assert.ok(out.includes('信心 75%'));
  });

  it('Sheer: 中國製造 chip, one made-in line (barcode), no own confidence chip', () => {
    const out = card(sheer);
    assert.ok(out.includes('中國製造'));
    assert.ok(out.includes('製造地：中國（依條碼比對，見下方製造地卡）'));
    assert.ok(!out.includes('產品製造／生產地為'));
    assert.ok(!out.includes('data-testid="china-confidence"'));
    assert.ok(!out.includes('較弱的關聯'));
    const label = html(
      createElement(ChinaCard, {
        result: { ...sheer, product: { ...sheer.product, madeInBasis: 'label' } },
        t: zh,
      })
    );
    assert.ok(label.includes('製造地：中國（依包裝標示，見下方製造地卡）'));
  });

  it('Cybex 製造地 candidates: 較可能（非確認） sits next to the rating word', () => {
    const out = html(createElement(MadeInCard, { result: cybex, t: zh }));
    assert.ok(out.includes('較可能（非確認） · 零件／物料'), out);
    assert.doesNotMatch(out, /(?:較可能|可能) · /);
  });
});

describe('model-only made-in (item 9)', () => {
  // Model says China; web search found nothing; no label.
  const modelOnly = base({
    relationTier: 'none',
    confidence: 0.7,
    tierReasons: ['explicit_non_cn_geo'],
    sources: [],
    product: { name: 'Bottle', madeIn: 'China', notes: ['Some SKUs are made in China'] },
    company: { name: 'Pigeon', hqCountry: 'Japan' },
    meta: { searchProvider: 'brave', searchCoo: [] },
  });

  it('headline 未確認, one 中國 row labelled 模型參考（未經確認）, no %, tier unchanged', () => {
    const view = buildMadeInView(modelOnly);
    assert.equal(view.state, 'unconfirmed');
    assert.deepEqual(view.candidates, [{ label: 'China', rating: 'possible', source: 'model_memory' }]);
    const out = html(createElement(MadeInCard, { result: modelOnly, t: zh }));
    assert.ok(out.includes('rc-headline is-unconfirmed">未確認'));
    assert.ok(out.includes('模型參考（未經確認）'));
    assert.doesNotMatch(out.slice(out.indexOf('rc-candidates')), /\d+\s*%/);
    const china = html(createElement(ChinaCard, { result: modelOnly, t: zh }));
    assert.ok(!china.includes('中國製造'));
    assert.ok(!china.includes('製造地：'));
    assert.ok(china.includes('data-testid="china-tier">無關') || china.includes('is-none'));
  });

  it('country and label share one cell (no separate row); tooltip is tap/keyboard UI excluded from captures', () => {
    const out = html(createElement(MadeInCard, { result: modelOnly, t: zh }));
    assert.match(
      out,
      /<span class="rc-cand-country is-model"><span class="rc-cand-name">中國<\/span><span class="rc-cand-label" data-testid="model-ref" title="[^"]+">模型參考（未經確認）<\/span><span class="rc-info" data-section-share="ui">/
    );
    // aria wiring: button labelled, described by the full sentence, collapsed.
    const id = out.match(/aria-describedby="([^"]+)"/)?.[1];
    assert.ok(id);
    assert.match(out, /<button type="button" class="rc-info-btn" aria-label="說明"/);
    assert.match(out, /aria-expanded="false"/);
    assert.ok(
      out.includes(
        `id="${id}" role="tooltip" class="rc-info-text" hidden="">未經網頁或包裝標示確認，只是模型的推測；請以包裝上的標示為準。</span>`
      )
    );
  });

  // Model says China; web only found a Thailand parts mention (modelref preview shape).
  const mixed = base({
    relationTier: 'none',
    sources: [],
    product: {
      name: 'Bottle',
      madeIn: 'China',
      originCandidates: [{ label: 'Thailand', confidence: 0.55, source: 'parts', rating: 'likely' }],
    },
    company: { name: 'Pigeon', hqCountry: 'Japan' },
  });
  const liOf = (out: string, model: boolean) =>
    [...out.matchAll(/<li(?: class="is-model")?>.*?<\/li>/g)]
      .map((m) => m[0])
      .filter((li) => li.startsWith('<li class="is-model"') === model);

  it('model-only row shows no likelihood grade (Tester / Chief follow-up)', () => {
    const out = html(createElement(MadeInCard, { result: modelOnly, t: zh }));
    const [row] = liOf(out, true);
    assert.ok(row, out);
    assert.ok(!row.includes('rc-cand-meta'), row);
    assert.doesNotMatch(row, /可能|（非確認）/);
  });

  it('web row next to a model-only row keeps its grade', () => {
    const out = html(createElement(MadeInCard, { result: mixed, t: zh }));
    const [web] = liOf(out, false);
    assert.ok(web?.includes('<span class="rc-cand-meta">較可能（非確認） · 零件／物料</span>'), out);
    const [model] = liOf(out, true);
    assert.ok(model && !model.includes('rc-cand-meta'), out);
  });

  it('no locale renders a grade on a model-only row (all 16)', () => {
    const locales = Object.keys(catalogs) as Array<Parameters<typeof createT>[0]>;
    assert.equal(locales.length, 16);
    for (const lng of locales) {
      const t = createT(lng);
      const out = html(createElement(MadeInCard, { result: mixed, t }));
      const models = liOf(out, true);
      assert.equal(models.length, 1, `${lng}: ${out}`);
      const row = models[0]!;
      assert.ok(row.includes(t('check.rc.modelRef')), lng);
      assert.ok(!row.includes('rc-cand-meta'), `${lng}: ${row}`);
      // Strip the label + tooltip text, then no grade word or hedge may remain.
      const rest = row
        .split(t('check.rc.modelRef')).join('')
        .split(t('check.rc.modelRefHelp')).join('');
      for (const k of ['possible', 'likely'] as const) {
        assert.ok(!rest.includes(`>${t(`check.candidateRating.${k}`)}`), `${lng} ${k}: ${row}`);
      }
      assert.ok(!rest.includes(t('check.rc.notConfirmed')), `${lng}: ${row}`);
      const webs = liOf(out, false);
      assert.equal(webs.length, 1, lng);
      assert.ok(webs[0]!.includes(`${t('check.candidateRating.likely')}${t('check.rc.notConfirmed')}`), `${lng}: ${webs[0]}`);
    }
  });

  it('HQ echo with no product-specific mention is dropped (#28)', () => {
    const echo = base({
      product: { name: 'Bottle', madeIn: 'Japan' },
      company: { name: 'Pigeon', hqCountry: 'Japan' },
    });
    assert.deepEqual(buildMadeInView(echo).candidates, []);
  });

  it('merges into an existing web row for the same country (no duplicate 中國 rows)', () => {
    const merged = base({
      product: {
        name: 'Bottle',
        madeIn: '中國',
        originCandidates: [{ label: 'China', confidence: 0.6, source: 'web_name', rating: 'possible' }],
      },
      company: { name: 'Pigeon', hqCountry: 'Japan' },
    });
    const rows = buildMadeInView(merged).candidates;
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.source, 'web_name');
    const out = html(createElement(MadeInCard, { result: merged, t: zh }));
    assert.ok(!out.includes('data-testid="model-ref"'));
    assert.ok(out.includes('<span class="rc-cand-meta">可能（非確認） · '), out);
  });
});

describe('零件 rows: own grade + % OR 模型參考 + ⓘ, never neither, never borrowed (#32)', () => {
  const SRC = ['Shop — https://shop.example.jp/p/1'];
  // Realistic mixed case: a part country is web-backed only with a web
  // candidate for that country (the server adds one per part country).
  const mixed = base({
    knowledgeBasis: 'web_enriched',
    partsEvidence: 'web',
    sources: SRC,
    product: {
      name: 'Bottle',
      originCandidates: [
        { label: 'Thailand', confidence: 0.55, source: 'parts', rating: 'likely' },
        { label: 'Japan', confidence: 0.5, source: 'parts', rating: 'possible' },
        { label: 'China', confidence: 0.5, source: 'model_memory', rating: 'possible' },
      ],
      parts: [{ name: 'Bottle body', kind: 'part', madeIn: 'Japan' }],
    },
    company: { name: 'Example', hqCountry: 'Japan' },
  });
  // The old 7b2650e fixture: partsEvidence 'web' but no candidate for Japan.
  // Bottle body · Japan must not borrow Thailand's 較可能 / 55%.
  const noJapanCandidate = base({
    knowledgeBasis: 'web_enriched',
    partsEvidence: 'web',
    sources: SRC,
    product: {
      name: 'Bottle',
      originCandidates: [{ label: 'Thailand', confidence: 0.55, source: 'parts', rating: 'likely' }],
      parts: [{ name: 'Bottle body', kind: 'part', madeIn: 'Japan' }],
    },
  });
  const merged = base({
    knowledgeBasis: 'web_enriched',
    partsEvidence: 'web',
    sources: SRC,
    product: {
      name: 'Bottle',
      originCandidates: [
        { label: 'China', confidence: 0.55, source: 'parts', rating: 'likely' },
        { label: '中國', confidence: 0.5, source: 'model_memory', rating: 'possible' },
      ],
    },
  });
  const modelParts = base({
    knowledgeBasis: 'model_memory',
    partsEvidence: 'model',
    product: {
      name: 'Bottle',
      originCandidates: [{ label: 'Thailand', confidence: 0.55, source: 'parts', rating: 'likely' }],
      parts: [{ name: 'Nipple', kind: 'part', madeIn: 'Thailand' }],
    },
  });
  const labelParts = base({
    knowledgeBasis: 'model_memory',
    partsEvidence: 'label',
    product: { name: 'Bottle', parts: [{ name: '乳首', kind: 'part', madeIn: 'China' }] },
  });
  const ALL = { mixed, noJapanCandidate, merged, modelParts, labelParts };

  const partsSection = (out: string) => {
    const i = out.indexOf('origin-layer--parts');
    assert.ok(i > -1, out);
    return out.slice(i);
  };
  const lis = (out: string) => [...out.matchAll(/<li(?: class="is-model")?>.*?<\/li>/g)].map((m) => m[0]);
  const isModelLi = (li: string) => li.startsWith('<li class="is-model"');
  const textOf = (frag: string) => frag.replace(/<[^>]+>/g, '');
  const locales = Object.keys(catalogs) as Array<Parameters<typeof createT>[0]>;
  const listHtml = (result: CheckResult, t: ReturnType<typeof createT>) =>
    partsSection(html(createElement(OriginLayers, { result, t, detailOnly: true })));
  const layersPartsRow = (result: CheckResult, t: ReturnType<typeof createT>) => {
    const card = html(createElement(LayersCard, { result, t }));
    const label = t('check.chinaLink.parts');
    return (
      card.match(/<div class="rc-row rc-layer-row(?: is-model)?">.*?<\/div>/g)?.find((r) => r.includes(`>${label}</dt>`)) ?? ''
    );
  };

  /** What the Save path removes (stripCaptureUi): ⓘ, tooltips, toolbars. */
  function stripCapture(markup: string): string {
    assert.equal(CAPTURE_UI_SELECTOR, '[data-section-share="ui"], [role="tooltip"]');
    let out = markup;
    for (;;) {
      const m = /<(\w+)\b[^>]*(?:data-section-share="ui"|role="tooltip")[^>]*>/.exec(out);
      if (!m) return out;
      const tag = m[1]!;
      const re = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, 'g');
      re.lastIndex = m.index + m[0].length;
      let depth = 1;
      let end = out.length;
      for (let x = re.exec(out); x; x = re.exec(out)) {
        depth += x[0].startsWith('</') ? -1 : 1;
        if (depth === 0) {
          end = x.index + x[0].length;
          break;
        }
      }
      out = out.slice(0, m.index) + out.slice(end);
    }
  }

  /** Grade text a backed row must carry, from ITS OWN country's candidate. */
  const ownGrade = (result: CheckResult, country: string, t: ReturnType<typeof createT>) => {
    const ev = partCountryEvidence(result, country);
    if (ev.kind === 'label') return { model: false, rating: t('check.rc.tagConfirmed'), pct: '' };
    if (ev.kind === 'model') return { model: true, rating: '', pct: '' };
    return { model: false, rating: t(`check.candidateRating.${ev.rating}`), pct: `${Math.round(ev.confidence * 100)}%` };
  };

  function assertInvariant(name: string, result: CheckResult, t: ReturnType<typeof createT>, saved: boolean) {
    const ref = t('check.rc.modelRef');
    const help = t('check.rc.modelRefHelp');
    const pre = (x: string) => (saved ? stripCapture(x) : x);
    // 零件候選 list: every row is graded (own % / label 確認) or model-ref.
    const list = pre(listHtml(result, t));
    const rows = lis(list);
    assert.ok(rows.length > 0, `${name}: ${list}`);
    for (const li of rows) {
      const text = textOf(li).split(ref).join('').split(help).join('');
      const graded = /\d+%/.test(text) || text.includes(t('check.matchBasis.label'));
      const model = isModelLi(li) && li.includes(ref);
      assert.ok(graded !== model, `${name}: neither/both → ${li}`);
      if (model) assert.doesNotMatch(text, /\d\s*%/, `${name}: ${li}`);
      if (saved) assert.ok(!li.includes('ⓘ') && !textOf(li).includes(help), `${name}: ${li}`);
    }
    // 產地分層 零件 row: same evidence as the list for the same part + country.
    const row = pre(layersPartsRow(result, t));
    const part = result.product?.parts?.find((x) => x.madeIn || x.originCountry);
    if (!part) return;
    const country = (part.madeIn || part.originCountry)!;
    const g = ownGrade(result, country, t);
    const partLi = rows.find((li) => textOf(li).startsWith(part.name));
    assert.ok(partLi, `${name}: part row missing in list`);
    if (g.model) {
      assert.ok(row.includes(ref) && !row.includes('rc-tag'), `${name}: ${row}`);
      assert.ok(isModelLi(partLi!), `${name}: ${partLi}`);
      assert.doesNotMatch(textOf(row).split(ref).join('').split(help).join(''), /\d\s*%/);
    } else {
      assert.ok(!row.includes('data-testid="model-ref"'), `${name}: ${row}`);
      const tag = textOf(row.match(/<span class="rc-tag[^"]*">.*?<\/span>/)?.[0] ?? '');
      assert.ok(tag.includes(g.rating) && tag.includes(g.pct), `${name}: tag ${tag} vs ${g.rating} ${g.pct}`);
      const liText = textOf(partLi!);
      assert.ok(liText.includes(g.rating) && liText.includes(g.pct), `${name}: list ${liText} vs ${g.rating} ${g.pct}`);
      if (g.pct) {
        // Independent of the helper: the % must be a candidate of THIS country.
        const key = (x: string) => zhCountryText(x.trim());
        const own = (result.product?.originCandidates ?? []).some(
          (c) => key(c.label) === key(country) && `${Math.round(c.confidence * 100)}%` === g.pct
        );
        assert.ok(own, `${name}: ${g.pct} is not ${country}'s own evidence`);
      }
    }
    if (saved) assert.ok(!row.includes('ⓘ') && !textOf(row).includes(help), `${name}: ${row}`);
  }

  it('invariant holds for every fixture, in all 16 locales, on screen and in the 780px save', () => {
    assert.equal(locales.length, 16);
    assert.equal(sectionShareCapture.phoneCssPx * sectionShareCapture.pixelRatio, 780);
    for (const lng of locales) {
      const t = createT(lng);
      for (const [name, result] of Object.entries(ALL)) {
        assertInvariant(`${lng}/${name}`, result, t, false);
        assertInvariant(`${lng}/${name}/save`, result, t, true);
      }
    }
  });

  it('mixed (zh-Hant): 瓶身-style part row carries its own 日本 grade; no row shows neither', () => {
    const rows = lis(listHtml(mixed, zh)).map((li) => [isModelLi(li), textOf(li)] as const);
    assert.deepEqual(
      rows.map(([m, x]) => [m, x.replace(/未經網頁.*$/, '')]),
      [
        [false, '泰國 · 較可能 · 55% · 零件／物料'],
        [true, '中國模型參考（未經確認）ⓘ'],
        [false, 'Bottle body · 零件 · 日本 · 可能 · 50%'],
      ]
    );
    const row = layersPartsRow(mixed, zh);
    assert.equal(textOf(row), '零件Bottle body · 日本可能（非確認） · 50%');
  });

  it('no borrowing: without a 日本 candidate, Bottle body · 日本 is 模型參考 in both places', () => {
    const list = lis(listHtml(noJapanCandidate, zh));
    const body = list.find((li) => textOf(li).startsWith('Bottle body'))!;
    assert.ok(isModelLi(body), body);
    assert.doesNotMatch(textOf(body), /較可能|55%/);
    const row = layersPartsRow(noJapanCandidate, zh);
    assert.ok(row.includes('模型參考（未經確認）') && !row.includes('較可能'), row);
    // Thailand keeps its own grade.
    assert.ok(list.some((li) => textOf(li) === '泰國 · 較可能 · 55% · 零件／物料'));
  });

  it('model + web on the same country → one web row with grade and %', () => {
    for (const lng of locales) {
      const t = createT(lng);
      const rows = lis(listHtml(merged, t));
      assert.equal(rows.length, 1, `${lng}: ${rows}`);
      assert.ok(!isModelLi(rows[0]!), lng);
      assert.ok(textOf(rows[0]!).includes(` · ${t('check.candidateRating.likely')} · 55% · `), `${lng}: ${rows[0]}`);
    }
  });

  it('dedupe: the specific part row replaces the bare country row (泰國 once)', () => {
    const rows = lis(listHtml(modelParts, zh));
    assert.equal(rows.length, 1, rows.join('\n'));
    assert.ok(isModelLi(rows[0]!));
    assert.ok(textOf(rows[0]!).startsWith('Nipple · 零件 · 泰國模型參考（未經確認）'), rows[0]);
    const mixedRows = lis(listHtml(mixed, zh)).map(textOf);
    assert.equal(mixedRows.filter((x) => x.includes('日本')).length, 1, mixedRows.join(' | '));
  });

  it('label parts: 確認 · 依包裝標示 in the list, 確認 tag in 產地分層', () => {
    const [li] = lis(listHtml(labelParts, zh));
    assert.equal(textOf(li!), '乳首 · 零件 · 中國 · 確認 · 依包裝標示');
    assert.ok(textOf(layersPartsRow(labelParts, zh)).endsWith('確認'));
  });

  it('country match: Thailand ≠ Japan (both were region OTHER), Thailand = 泰國, China = 中國（含港澳）', () => {
    assert.equal(sameCountryLabel('Thailand', 'Japan'), false);
    assert.equal(sameCountryLabel('Thailand', '泰國'), true);
    assert.equal(sameCountryLabel('China', '中國（含港澳）'), true);
    assert.equal(sameCountryLabel('China', 'Taiwan'), false);
    // 製造地 candidates keep separate rows for separate OTHER countries.
    const two = base({
      product: {
        name: 'Bottle',
        originCandidates: [
          { label: 'Thailand', confidence: 0.55, source: 'parts', rating: 'likely' },
          { label: 'Japan', confidence: 0.5, source: 'parts', rating: 'possible' },
        ],
      },
    });
    assert.deepEqual(buildMadeInView(two).candidates.map((c) => c.label), ['Thailand', 'Japan']);
  });

  it('zh-Hant parts note uses ZH Copy wording; other locales unchanged', () => {
    assert.equal(zh('check.partsModelOnlyBanner'), '零件產地只是模型的推測，未經網頁或包裝標示確認。');
    assert.ok(!createT('en')('check.partsModelOnlyBanner').includes('只是'));
  });

  it('製造地 candidates: every row shows its grade or 模型參考 (16 locales, 780 save)', () => {
    for (const lng of locales) {
      const t = createT(lng);
      for (const [name, result] of Object.entries(ALL)) {
        for (const saved of [false, true]) {
          let out = html(createElement(MadeInCard, { result, t }));
          if (saved) out = stripCapture(out);
          const i = out.indexOf('rc-candidates');
          if (i === -1) continue;
          for (const li of lis(out.slice(i))) {
            const model = li.includes('data-testid="model-ref"');
            assert.ok(model !== li.includes('rc-cand-meta'), `${lng}/${name}: ${li}`);
            if (saved) assert.ok(!li.includes('ⓘ'), `${lng}/${name}: ${li}`);
          }
        }
      }
    }
  });
});

describe('製造地 card: parts candidates only the model named (closes #32 decision 2)', () => {
  const modelParts = base({
    knowledgeBasis: 'model_memory',
    partsEvidence: 'model',
    product: {
      name: 'Bottle',
      originCandidates: [{ label: 'Thailand', confidence: 0.55, source: 'parts', rating: 'likely' }],
      parts: [{ name: 'Nipple', kind: 'part', madeIn: 'Thailand' }],
    },
  });
  // Model parts say China, a web page says China too → one web row.
  const agree = base({
    knowledgeBasis: 'web_enriched',
    partsEvidence: 'model',
    product: {
      name: 'Bottle',
      originCandidates: [
        { label: 'China', confidence: 0.55, source: 'parts', rating: 'likely' },
        { label: 'China', confidence: 0.5, source: 'web_name', rating: 'possible' },
      ],
    },
  });
  // Web parts evidence: the parts row is backed and keeps its grade.
  const webParts = base({
    knowledgeBasis: 'web_enriched',
    partsEvidence: 'web',
    sources: ['Shop — https://shop.example.jp/p/1'],
    product: {
      name: 'Bottle',
      originCandidates: [{ label: 'Thailand', confidence: 0.55, source: 'parts', rating: 'likely' }],
    },
  });
  const lis = (out: string) =>
    [...out.slice(out.indexOf('rc-candidates')).matchAll(/<li(?: class="is-model")?>.*?<\/li>/g)].map((m) => m[0]);
  const textOf = (frag: string) => frag.replace(/<[^>]+>/g, '');
  const strip = (markup: string) => {
    // Save path (stripCaptureUi) removes the ⓘ wrapper and the tooltip.
    let out = markup;
    for (;;) {
      const m = /<span\b[^>]*(?:data-section-share="ui"|role="tooltip")[^>]*>/.exec(out);
      if (!m) {
        const d = /<div\b[^>]*data-section-share="ui"[^>]*>/.exec(out);
        if (!d) return out;
        let depth = 1;
        const re = /<div\b[^>]*>|<\/div>/g;
        re.lastIndex = d.index + d[0].length;
        let end = out.length;
        for (let x = re.exec(out); x; x = re.exec(out)) {
          depth += x[0].startsWith('</') ? -1 : 1;
          if (!depth) { end = x.index + x[0].length; break; }
        }
        out = out.slice(0, d.index) + out.slice(end);
        continue;
      }
      let depth = 1;
      const re = /<span\b[^>]*>|<\/span>/g;
      re.lastIndex = m.index + m[0].length;
      let end = out.length;
      for (let x = re.exec(out); x; x = re.exec(out)) {
        depth += x[0].startsWith('</') ? -1 : 1;
        if (!depth) { end = x.index + x[0].length; break; }
      }
      out = out.slice(0, m.index) + out.slice(end);
    }
  };

  it('model-only parts row: country + 模型參考 + ⓘ, no grade / % / source (zh-Hant)', () => {
    const view = buildMadeInView(modelParts);
    assert.equal(view.state, 'unconfirmed');
    const out = html(createElement(MadeInCard, { result: modelParts, t: zh }));
    const rows = lis(out);
    assert.equal(rows.length, 1, out);
    assert.match(
      rows[0]!,
      /^<li class="is-model"><span class="rc-cand-country is-model"><span class="rc-cand-name">泰國<\/span><span class="rc-cand-label" data-testid="model-ref" title="[^"]+">模型參考（未經確認）<\/span><span class="rc-info" data-section-share="ui"><button type="button" class="rc-info-btn" aria-label="說明"/
    );
    assert.ok(!rows[0]!.includes('rc-cand-meta'), rows[0]);
    assert.doesNotMatch(textOf(rows[0]!), /可能|\d\s*%|零件／物料/);
  });

  it('16 locales and the 780px save: no grade, %, ⓘ or tooltip on the model-only parts row', () => {
    assert.equal(sectionShareCapture.phoneCssPx * sectionShareCapture.pixelRatio, 780);
    const locales = Object.keys(catalogs) as Array<Parameters<typeof createT>[0]>;
    assert.equal(locales.length, 16);
    for (const lng of locales) {
      const t = createT(lng);
      const out = html(createElement(MadeInCard, { result: modelParts, t }));
      const [row] = lis(out);
      assert.ok(row?.startsWith('<li class="is-model"'), `${lng}: ${out}`);
      assert.ok(row!.includes(t('check.rc.modelRef')) && !row!.includes('rc-cand-meta'), `${lng}: ${row}`);
      const rest = textOf(row!).split(t('check.rc.modelRef')).join('').split(t('check.rc.modelRefHelp')).join('');
      assert.ok(!rest.includes(t('check.candidateRating.likely')), `${lng}: ${rest}`);
      assert.ok(!rest.includes(t('check.candidateSource.parts')), `${lng}: ${rest}`);
      assert.doesNotMatch(rest, /\d\s*%/);
      const saved = strip(out);
      assert.ok(!saved.includes('ⓘ') && !saved.includes('role="tooltip"'), `${lng}: ${saved}`);
      assert.ok(!textOf(saved).includes(t('check.rc.modelRefHelp')), lng);
      const [savedRow] = lis(saved);
      assert.ok(savedRow!.includes(t('check.rc.modelRef')), lng);
      assert.doesNotMatch(textOf(savedRow!), /\d\s*%/);
      // Web-backed parts keep grade + source in every locale.
      const [web] = lis(html(createElement(MadeInCard, { result: webParts, t })));
      assert.ok(!web!.startsWith('<li class="is-model"'), lng);
      assert.ok(
        textOf(web!).includes(`${t('check.candidateRating.likely')}${t('check.rc.notConfirmed')} · ${t('check.candidateSource.parts')}`),
        `${lng}: ${web}`
      );
    }
  });

  it('model parts + web on the same country stay one web row with its grade', () => {
    const rows = buildMadeInView(agree).candidates;
    assert.deepEqual(rows, [{ label: 'China', rating: 'possible', source: 'web_name' }]);
    const out = html(createElement(MadeInCard, { result: agree, t: zh }));
    assert.ok(!out.includes('data-testid="model-ref"'), out);
    assert.ok(out.includes('<span class="rc-cand-meta">可能（非確認） · '), out);
  });
});
