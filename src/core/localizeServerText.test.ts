/**
 * Server-added English notes / caveats / summary shown in the reader's language.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  cooConflictChinaText,
  cooConflictMadeInText,
  SERVER_TEXT,
  webFailText,
} from '../../functions/_lib/serverText';
import { webFailCaveat } from '../../functions/_lib/synthesize';
import { catalogs, createT } from './i18n';
import { LOCALES } from './i18n/locales';
import { localizeServerText, splitTopLevel } from './localizeServerText';

const zh = createT('zh-Hant');
const en = createT('en');

describe('localizeServerText', () => {
  it('has a translation for every server line in every locale', () => {
    for (const loc of LOCALES) {
      const t = createT(loc.id);
      for (const [key, english] of Object.entries(SERVER_TEXT)) {
        const out = localizeServerText(t, english);
        assert.ok(out.trim(), `${loc.id} ${key} empty`);
        if (loc.id === 'en') assert.equal(out, english, key);
        else assert.notEqual(out, english, `${loc.id} ${key} still English`);
      }
      assert.ok(catalogs[loc.id]);
    }
  });

  it('keeps the English catalog equal to what the server sends', () => {
    for (const [key, english] of Object.entries(SERVER_TEXT)) {
      assert.equal(en(`check.srv.${key}`), english, key);
    }
  });

  it('translates a full summary, candidates included', () => {
    const summary =
      'Final COO unconfirmed · Candidates: Japan (likely 55% · parts); China (possible 30% · web_name) · Brand origin: Japan · HQ: Japan · Company: Pigeon';
    const out = localizeServerText(zh, summary);
    assert.match(out, /^最終產地未確認 · /);
    // Country names show in 繁中 too (候選產地：Japan → 日本, 總部：China → 中國).
    assert.match(out, /候選產地：日本（較可能，55%，零件／物料）；中國（可能，30%，依品名比對的網頁）/);
    assert.match(out, /品牌來源地：日本/);
    assert.match(out, /總部：日本 · 公司：Pigeon$/);
    assert.doesNotMatch(out, /Candidates|Brand origin|HQ:|Company:/);
  });

  it('translates the China-link summary lines', () => {
    assert.equal(localizeServerText(zh, SERVER_TEXT.tierNone), '從現有資料中未發現與中國的關聯。');
    assert.match(localizeServerText(zh, 'Made in: Thailand'), /^製造地：泰國$/);
    assert.match(localizeServerText(en, 'Made in: Thailand'), /^Made in: Thailand$/);
  });

  it('translates every web-fail caveat the synthesizer can emit', () => {
    for (const code of ['upstream_quota', 'upstream_credits', 'disabled', 'nonsense', undefined]) {
      const english = webFailCaveat(code);
      assert.equal(english, webFailText(code));
      const out = localizeServerText(zh, english);
      assert.match(out, /製造地及零件產地僅依模型知識，結果會較保守。/, String(code));
    }
    assert.match(localizeServerText(zh, webFailCaveat('upstream_quota')), /每日額度重設/);
  });

  it('translates made-in conflict notes and keeps the country label', () => {
    const a = localizeServerText(zh, cooConflictChinaText('retailer', 'Japan'));
    assert.equal(a, '最終產地未確認：零售商資料（Japan）與「中國製造」互相矛盾；單憑所有權／母公司不能判定製造地。');
    const b = localizeServerText(zh, cooConflictMadeInText('ocr', 'China', 'Vietnam'));
    assert.match(b, /標籤資料（China）與製造地「Vietnam」互相矛盾/);
  });

  it('replaces a server sentence glued to model text', () => {
    const note = `Teat — ${SERVER_TEXT.partOmittedUnconfirmed}`;
    assert.equal(localizeServerText(zh, note), 'Teat — 未列出零件產地：搜尋或標籤未能確認此零件的產地。');
  });

  it('leaves model-written text alone, separators included', () => {
    const s = '日本製の哺乳びん · 生産国 タイ (JAN 4902508)';
    assert.equal(localizeServerText(zh, s), s);
    assert.equal(localizeServerText(zh, ''), '');
    assert.equal(localizeServerText(zh, undefined), '');
  });

  it('splits on " · " only outside parentheses', () => {
    assert.deepEqual(splitTopLevel('A (x · y) · B'), ['A (x · y)', 'B']);
  });

  it('server code uses the shared strings, not its own copies', () => {
    for (const f of ['functions/_lib/synthesize.ts', 'functions/_lib/cooPriority.ts']) {
      const src = readFileSync(f, 'utf8');
      for (const english of Object.values(SERVER_TEXT)) {
        assert.ok(!src.includes(`'${english}'`), `${f} has a literal copy of: ${english}`);
      }
    }
  });
});

describe('localizeServerText placeholder values', () => {
  it('drops a summary bit whose value is unknown', () => {
    const t = ((k: string, v?: Record<string, string>) =>
      k === 'check.srv.sum.madeIn' ? `MADE:${v?.value}` : k === 'check.srv.sum.components' ? `COMP:${v?.value}` : k) as never;
    const out = localizeServerText(t, 'Made in: China · Components/global line: unknown · HQ: Japan');
    assert.ok(!out.includes('unknown'), out);
    assert.ok(out.length > 0, out);
  });
});
