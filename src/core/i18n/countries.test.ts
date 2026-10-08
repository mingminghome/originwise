/**
 * Country names in the reader's language (summary, tier reasons, layers).
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CheckResult } from '../types';
import { localizeServerText } from '../localizeServerText';
import { localizeCountry } from './countries';
import { createT } from './index';
import { formatTierReason } from './tierReasons';

const zh = createT('zh-Hant');
const en = createT('en');
const de = createT('de');

describe('localizeCountry', () => {
  it('zh-Hant: English country names → 繁中', () => {
    assert.equal(localizeCountry(zh, 'Japan'), '日本');
    assert.equal(localizeCountry(zh, 'China'), '中國');
    assert.equal(localizeCountry(zh, 'Germany'), '德國');
    assert.equal(localizeCountry(zh, 'Thailand'), '泰國');
    assert.equal(localizeCountry(zh, 'Taiwan'), '台灣');
    assert.equal(localizeCountry(zh, 'Hong Kong'), '香港');
    assert.equal(localizeCountry(zh, '中国'), '中國');
    assert.equal(localizeCountry(zh, 'Changsha, China'), 'Changsha, 中國');
  });

  it('en: unchanged; other locales via region names; unknown text passes through', () => {
    assert.equal(localizeCountry(en, 'China'), 'China');
    assert.equal(localizeCountry(de, 'China'), 'China');
    assert.equal(localizeCountry(de, 'Germany'), 'Deutschland');
    assert.equal(localizeCountry(de, 'Japan'), 'Japan');
    assert.equal(localizeCountry(de, 'Thailand'), 'Thailand');
    assert.equal(localizeCountry(createT('fr'), 'Germany'), 'Allemagne');
    assert.equal(localizeCountry(de, 'Atlantis'), 'Atlantis');
    // A bare test stub has no locale → treated as English.
    assert.equal(localizeCountry(((k: string) => k) as typeof en, 'China'), 'China');
  });
});

describe('server summary in 繁中', () => {
  it('候選產地 / 總部 / 製造地 / 品牌來源地 show Chinese country names', () => {
    const out = localizeServerText(
      zh,
      'Made in: Thailand · Candidates: Japan (likely 55% · web_name) · Brand origin: Japan · HQ: China · Company: TP-Link'
    );
    assert.ok(out.includes('泰國'), out);
    assert.ok(out.includes('日本'), out);
    assert.ok(out.includes('中國'), out);
    assert.ok(!/Thailand|Japan|China/.test(out), out);
    assert.ok(out.includes('TP-Link'), out);
  });

  it('English stays English', () => {
    const out = localizeServerText(en, 'HQ: China');
    assert.ok(out.includes('China'), out);
  });
});

describe('tier reasons in 繁中', () => {
  const result: CheckResult = {
    schemaVersion: 1,
    relationTier: 'direct',
    title: 'Tapo C200',
    summary: '',
    product: { madeIn: 'Vietnam', originCountry: 'China' },
    company: { hqCountry: 'China' },
  };

  it('hq_cn interpolates 中國, not China', () => {
    const line = formatTierReason('hq_cn', zh, result);
    assert.ok(line.includes('中國'), line);
    assert.ok(!line.includes('China'), line);
  });

  it('explicit_non_cn_geo lists 越南 in Chinese', () => {
    const line = formatTierReason('explicit_non_cn_geo', zh, result);
    assert.ok(line.includes('越南'), line);
    assert.ok(!line.includes('Vietnam'), line);
  });

  it('en keeps English place names', () => {
    assert.ok(formatTierReason('hq_cn', en, result).includes('China'));
  });
});

describe('explicit_non_cn_geo never lists China', () => {
  it('drops 中國 / China from the outside-China places (CJK values from the model)', () => {
    const r: CheckResult = {
      schemaVersion: 1,
      relationTier: 'direct',
      title: 'Sheer',
      summary: '',
      product: { madeIn: '中國', originCountry: '日本' },
      company: { hqCountry: '日本' },
    };
    const line = formatTierReason('explicit_non_cn_geo', zh, r);
    assert.ok(line.includes('日本'), line);
    assert.ok(!/：.*中國/.test(line), line);
  });
});
