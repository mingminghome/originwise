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
