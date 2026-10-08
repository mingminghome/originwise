/**
 * Tester's live checks after #31–#34 (Sheer, Tapo, Cybex, Softouch label):
 * HQ-echo notes rows, contradictory part notes, Simplified 于, search-provider
 * footnote, untranslated 「web」 / 「strong」, 未知 vs 未確認, the redundant
 * outside-China line, the missing 製造商 row and the Softouch 零件 rows.
 *
 * Fixtures: *-real.json are the real payloads (/workspace/ow-real-*.json).
 * Live-only bits Tester saw (a notes candidate the pre-fix server builds
 * from these same payloads, a retailer part note) are added on top and
 * marked as such. softouch-label-live.json is rebuilt from Tester's screen.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { catalogs, createT } from '../core/i18n';
import type { CheckResult } from '../core/types';
import { localizeServerText } from '../core/localizeServerText';
import { __test as synth } from '../../functions/_lib/synthesize';
import { SERVER_TEXT } from '../../functions/_lib/serverText';
import { WEB_KNOWLEDGE_NOTE, webKnowledgeNote } from '../../functions/_lib/schema';
import { fixZhHantText, toTraditionalZh, zhDisplayText } from '../../functions/_lib/zhHant';
import { cleanOmittedPartNote, omittedPartNote } from '../../functions/_lib/noteText';
import { buildChinaCard } from './ChinaLink';
import { OriginLayers } from './OriginLayers';
import { ResultPanel } from './ResultPanel';
import { ChinaCard, LayersCard } from './ResultCards';
import { buildLayerRows, buildMadeInView, partsListCandidates } from './resultCards.model';

(globalThis as { React?: unknown }).React = React;

type Payload = { result: CheckResult; provider?: string };
const load = (f: string) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8')) as Payload;
const SHEER = load('sheer-real.json').result;
const TAPO = load('tapo-real.json').result;
const CYBEX = load('cybex-real.json').result;
const SOFTOUCH = load('softouch-label-live.json').result;

const zh = createT('zh-Hant');
const text = (el: React.ReactElement) =>
  renderToStaticMarkup(el)
    .replace(/<[^>]+>/g, '\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n');
const panel = (result: CheckResult, t = zh) => text(React.createElement(ResultPanel, { result, t }));
const details = (result: CheckResult) =>
  text(React.createElement(OriginLayers, { result, t: zh, detailOnly: true }));

/** What the pre-fix server added to these payloads (live-only on Tester's screen). */
const withNotesRow = (r: CheckResult, label: string): CheckResult => ({
  ...r,
  product: {
    ...r.product,
    originCandidates: [
      ...(r.product?.originCandidates ?? []).filter((c) => c.source !== 'manufacturer'),
      { label, confidence: 0.38, source: 'notes', rating: 'mentioned' },
    ],
  },
});

const candidatesOf = (r: CheckResult) =>
  synth.collectOriginCandidates(r.product as never, {
    webEnriched: r.knowledgeBasis === 'web_enriched',
    productConfidence: r.product?.confidence,
    hqCountry: r.company?.hqCountry,
  });

describe('item 1 / (c): HQ-echo notes rows (日本 on Sheer, 中國 on Tapo, 德國 on Cybex)', () => {
  it('server: a note that only restates the HQ / brand country is no candidate', () => {
    assert.ok(!candidatesOf(SHEER).some((c) => c.label === 'Japan'), 'Sheer 日本 notes row');
    assert.ok(!candidatesOf(TAPO).some((c) => c.source === 'notes'), 'Tapo 中國 notes row');
    assert.ok(!candidatesOf(CYBEX).some((c) => c.label === 'Germany'), 'Cybex 德國 notes row');
    // Product-specific rows stay.
    assert.ok(candidatesOf(CYBEX).some((c) => c.label === 'China' && c.source === 'parts'));
  });

  it('server: an HQ-country note tied to manufacturing in the same clause stays', () => {
    const r: CheckResult = {
      ...SHEER,
      product: { ...SHEER.product, madeIn: undefined, notes: ['零售商頁面標示本品為日本製造。'] },
    };
    const c = candidatesOf(r).find((x) => x.label === 'Japan');
    assert.equal(c?.source, 'notes');
  });

  it('client: cached rows are dropped too (real Cybex payload carries 德國 · notes · 38%)', () => {
    assert.ok(CYBEX.product?.originCandidates?.some((c) => c.label === 'Germany' && c.source === 'notes'));
    assert.ok(!partsListCandidates(CYBEX).some((c) => c.label === 'Germany'));
    assert.doesNotMatch(details(CYBEX), /德國 · 有提及/);
  });

  it('client: no 「日本 · 有提及 · 38%」 on Sheer, no 「中國 · 有提及 · 38%」 on Tapo', () => {
    assert.doesNotMatch(details(withNotesRow(SHEER, 'Japan')), /日本 · 有提及 · 38%/);
    assert.doesNotMatch(details(withNotesRow(TAPO, 'China')), /中國 · 有提及 · 38%/);
    const v = buildMadeInView(withNotesRow(TAPO, 'China'));
    assert.ok(!v.candidates.some((c) => c.source === 'notes'), '製造地 candidates');
  });
});

describe('item 2: part note never says 中國製 next to 「未列出零件產地」', () => {
  it('server: a stripped part country takes its note with it', () => {
    const parts = synth.sanitizeParts(
      [
        { name: 'PPSUボトル本体', kind: 'part', madeIn: 'China', note: '零售商頁面標示中國製造' },
        { name: 'シリコーンゴム製乳首', kind: 'part', madeIn: 'China', note: '矽膠材質' },
      ],
      { webEnriched: true, webBrief: 'Pigeon Sheer PPSU 240ml JAN 4902508277471 生產國 中國', hqCountry: 'Japan' }
    );
    assert.equal(parts[0]!.madeIn, undefined);
    assert.equal(parts[0]!.note, SERVER_TEXT.partOmittedUnconfirmed);
    assert.equal(parts[1]!.note, `矽膠材質 — ${SERVER_TEXT.partOmittedUnconfirmed}`);
  });

  it('client: an older joined note shows the omitted line only', () => {
    const joined = `零售商頁面標示中國製造 — ${SERVER_TEXT.partOmittedUnconfirmed}`;
    assert.equal(cleanOmittedPartNote(joined), SERVER_TEXT.partOmittedUnconfirmed);
    assert.equal(omittedPartNote(undefined, SERVER_TEXT.partOmittedNoEvidence), SERVER_TEXT.partOmittedNoEvidence);
    const r: CheckResult = {
      ...SHEER,
      product: {
        ...SHEER.product,
        parts: [{ name: 'PPSUボトル本体', kind: 'part', chinaRelated: false, note: joined }],
      },
    };
    const out = details(r);
    assert.ok(out.includes('PPSUボトル本体 · 零件 · 未列出零件產地'), out);
    assert.ok(!out.includes('中國製造'), out);
  });
});

describe('item 3: Simplified 于 in zh-Hant model text', () => {
  it('于 after a Han character is 於; the surname at the start is left', () => {
    assert.equal(toTraditionalZh('品牌設計及總部設于日本'), '品牌設計及總部設於日本');
    assert.equal(toTraditionalZh('总部位于中国，由于成本'), '總部位於中國，由於成本');
    assert.equal(toTraditionalZh('于先生'), '于先生');
    assert.equal(fixZhHantText('对于运输链'), '對於運輸鏈');
  });

  it('cached Sheer caveat / note render 設於 (client), Japanese stays as written', () => {
    const out = panel(SHEER);
    assert.ok(!out.includes('設于'), 'Simplified 于 shown');
    assert.ok(out.includes('品牌設計及總部設於日本'));
    assert.equal(localizeServerText(zh, '日本製の哺乳びん · 生産国 タイ'), '日本製の哺乳びん · 生産国 タイ');
  });
});

describe('items 4 + 5 / (b): AI pool footnote and the web row label', () => {
  it('Firecrawl runs name Firecrawl, never Google 搜尋（Gemini）(Sheer, Tapo)', () => {
    for (const r of [SHEER, TAPO]) {
      const out = panel(r);
      assert.ok(out.includes('這次的即時網路搜尋使用 Firecrawl。'), out);
      assert.ok(!out.includes('Google 搜尋（Gemini）'), 'Gemini credited');
    }
  });

  it('a Gemini search run keeps the Gemini quota note (Cybex)', () => {
    assert.ok(panel(CYBEX).includes('即時網路搜尋需使用 Google 搜尋（Gemini）的額度'));
  });

  it('the web row is 網路搜尋 in zh-Hant and translated in every locale', () => {
    const out = panel(SHEER).split('\n');
    assert.ok(out.includes('網路搜尋'));
    assert.ok(!out.includes('web'), 'English web label');
    for (const [loc, cat] of Object.entries(catalogs)) {
      const c = cat as { check: { agent: Record<string, string>; agentsHintVia: string } };
      assert.ok(c.check.agent.web && c.check.agent.web !== 'web', `${loc} agent.web`);
      assert.ok(c.check.agentsHintVia.includes('{provider}'), `${loc} agentsHintVia`);
      assert.ok(!c.check.agentsHintVia.includes('Gemini'), `${loc} agentsHintVia names Gemini`);
    }
  });

  it('server note names the provider that ran', () => {
    assert.ok(webKnowledgeNote('firecrawl').includes('(Firecrawl)'));
    assert.ok(!webKnowledgeNote('firecrawl').includes('Gemini'));
    assert.ok(webKnowledgeNote('brave').includes('(Brave Search)'));
    assert.equal(WEB_KNOWLEDGE_NOTE, webKnowledgeNote('gemini'));
  });
});

describe('item 6: 製造商 row in 產地分層', () => {
  it('Sheer shows ピジョン株式会社 · 日本 with the company-fact tag', () => {
    const row = buildLayerRows(SHEER).find((r) => r.key === 'manufacturer');
    assert.deepEqual(
      { value: row?.value, country: row?.country, tag: row?.tag },
      { value: 'ピジョン株式会社', country: '日本', tag: 'confirmed' }
    );
    const out = text(React.createElement(LayersCard, { result: SHEER, t: zh }));
    assert.ok(out.includes('製造商\nピジョン株式会社 · 日本\n確認'), out);
  });

  it('no 製造商 row when the answer names no maker (Softouch label)', () => {
    assert.ok(!buildLayerRows(SOFTOUCH).some((r) => r.key === 'manufacturer'));
  });
});

describe('(a): relation strength is localized', () => {
  it('Tapo 所有權 row says 強關聯, never strong', () => {
    const out = details(TAPO);
    assert.ok(out.includes('總部 · 中國 · 強關聯'), out);
    assert.ok(!/\bstrong\b/.test(out));
    for (const [loc, cat] of Object.entries(catalogs)) {
      const s = (cat as { check: { relStrength: Record<string, string> } }).check.relStrength;
      for (const k of ['strong', 'moderate', 'weak']) assert.ok(s[k] && s[k] !== k, `${loc} ${k}`);
    }
  });
});

describe('(d): 未知 → 未確認 where it is about a made-in / country', () => {
  it('Tapo parts and notes', () => {
    const out = panel(TAPO);
    assert.ok(!out.includes('未知'), out);
    assert.ok(!/originCountry|madeIn/.test(out), 'field names shown');
    assert.ok(out.includes('攝影機鏡頭模組 · 元件 · 產地未確認'));
    assert.ok(out.includes('最終成品產地標示為未確認'));
  });

  it('unrelated 未知 is left alone', () => {
    assert.equal(zhDisplayText('此型號用途未知。'), '此型號用途未知。');
  });
});

describe('(e): no 「明確地點訊號在中國大陸以外」 line on the China card', () => {
  it('Sheer / Cybex / Softouch: the place is already the 總部 / 品牌來源地 row', () => {
    for (const r of [SHEER, CYBEX, SOFTOUCH]) {
      assert.ok(!buildChinaCard(r).reasons.some((x) => x.kind === 'code' && x.code === 'explicit_non_cn_geo'));
      const out = text(React.createElement(ChinaCard, { result: r, t: zh }));
      assert.ok(!out.includes('明確地點訊號'), out);
    }
  });
});

describe('(f): Softouch label', () => {
  it('產地分層 keeps びん · 日本 next to 乳首、キャップ、フード · 中國', () => {
    const parts = buildLayerRows(SOFTOUCH).filter((r) => r.key === 'parts');
    assert.deepEqual(
      parts.map((r) => [r.names, r.country, r.tag]),
      [
        [['乳首、キャップ、フード'], '中國', 'confirmed'],
        [['びん'], '日本', 'confirmed'],
      ]
    );
    const out = text(React.createElement(LayersCard, { result: SOFTOUCH, t: zh }));
    assert.ok(out.includes('びん · 日本'), out);
  });

  it('總部 stays 有提及: no search ran and the label does not state the HQ', () => {
    const hq = buildLayerRows(SOFTOUCH).find((r) => r.key === 'hq');
    assert.equal(hq?.tag, 'mentioned');
  });

  it('「零件／全球產線」 takes the full-width colon in zh-Hant', () => {
    const out = details(SOFTOUCH);
    assert.ok(out.includes('零件／全球產線：日本、中國'), out);
    assert.ok(!out.includes('零件／全球產線:'));
  });
});
