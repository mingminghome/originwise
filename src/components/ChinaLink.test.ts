/**
 * China link card: chip rule, rows and badge reconciliation.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CheckResult } from '../core/types';
import { readFileSync } from 'node:fs';
import { synthesize } from '../../functions/_lib/synthesize';
import { formatTierReason } from '../core/i18n/tierReasons';
import { createT } from '../core/i18n';
import {
  brandHqFolded,
  buildChinaCard,
  buildChinaLinks,
  companyFactsSourced,
  companyView,
  confirmedMadeIn,
  displayTier,
  isChinaCountry,
  stakeInSources,
} from './ChinaLink';

/** Trimmed real /api/check payload for "Cybex Melio" (2026-10-08). */
const CYBEX_LIVE = JSON.parse(
  readFileSync(new URL('./fixtures/cybex-melio-live.json', import.meta.url), 'utf8')
) as { query: string; result: CheckResult };

function base(partial: Partial<CheckResult> = {}): CheckResult {
  return { schemaVersion: 1, relationTier: 'unknown', title: 'X', summary: '', ...partial };
}

describe('isChinaCountry', () => {
  it('mainland China only by default; Taiwan never; HK/Macau only for greater_china', () => {
    for (const v of ['China', 'PRC', 'Mainland China', '中國', '中国', 'Changsha, China']) {
      assert.equal(isChinaCountry(v), true, v);
    }
    for (const v of ['Taiwan', '台灣', 'Republic of China', 'Japan', 'Germany', '', undefined]) {
      assert.equal(isChinaCountry(v), false, String(v));
      assert.equal(isChinaCountry(v, 'greater_china'), false, String(v));
    }
    assert.equal(isChinaCountry('Hong Kong'), false);
    assert.equal(isChinaCountry('Hong Kong', 'greater_china'), true);
    assert.equal(isChinaCountry('Macau', 'greater_china'), true);
  });
});

describe('buildChinaLinks chip rule', () => {
  it('Anker (HQ China) → 中國公司', () => {
    const { chip, rows } = buildChinaLinks(
      base({
        product: { brand: 'Soundcore' },
        company: { name: 'Anker Innovations', hqCountry: 'China' },
      })
    );
    assert.equal(chip, 'chinaCompany');
    assert.deepEqual(rows.find((r) => r.key === 'hq'), {
      key: 'hq',
      status: 'china',
      value: 'China',
      detail: 'Anker Innovations',
    });
    // Made-in is never a China-card row (decided only in the 製造地 card).
    assert.equal(rows.some((r) => (r.key as string) === 'madeIn'), false);
  });

  it('Cybex (HQ Germany, Goodbaby majority in China) → 中資控股, not 中國公司', () => {
    const { chip, rows } = buildChinaLinks(
      base({
        company: {
          name: 'Cybex GmbH',
          hqCountry: 'Germany',
          parents: [
            { name: 'Some fund', country: 'Germany', control: 'minority' },
            { name: 'Goodbaby International Holdings', country: 'China', control: 'majority' },
          ],
        },
      })
    );
    assert.equal(chip, 'chinaControlled');
    assert.equal(rows.find((r) => r.key === 'hq')?.status, 'notChina');
    const owner = rows.find((r) => r.key === 'owner');
    assert.equal(owner?.status, 'china');
    assert.equal(owner?.detail, 'Goodbaby International Holdings');
  });

  it('a minority Chinese stake is not 中資控股', () => {
    const { chip } = buildChinaLinks(
      base({
        company: {
          hqCountry: 'Germany',
          parents: [{ name: 'Investor', country: 'China', control: 'minority' }],
        },
      })
    );
    assert.equal(chip, null);
  });

  it('Taiwan HQ → neither chip (Taiwan is not China), in either scope', () => {
    for (const geoScope of ['prc', 'greater_china'] as const) {
      const { chip, rows } = buildChinaLinks(
        base({ geoScope, company: { name: 'ASUS', hqCountry: 'Taiwan' } })
      );
      assert.equal(chip, null);
      assert.equal(rows.find((r) => r.key === 'hq')?.status, 'notChina');
    }
  });

  it('HK HQ: no chip under default prc scope; 中國公司 under greater_china', () => {
    const r = { company: { name: 'HK Co', hqCountry: 'Hong Kong' } };
    assert.equal(buildChinaLinks(base(r)).chip, null);
    assert.equal(buildChinaLinks(base({ ...r, geoScope: 'greater_china' })).chip, 'chinaCompany');
  });

  it('vague HQ ("unknown") gives no HQ row and no chip', () => {
    const { chip, rows } = buildChinaLinks(base({ company: { hqCountry: 'unknown' } }));
    assert.equal(chip, null);
    assert.equal(rows.some((r) => r.key === 'hq'), false);
  });
});

describe('displayTier', () => {
  it('sourced China HQ never shows weaker than direct / 75%', () => {
    const shown = displayTier(
      base({
        relationTier: 'indirect',
        confidence: 0.5,
        knowledgeBasis: 'web_enriched',
        sources: ['About — https://example.com/about'],
        company: { hqCountry: 'China' },
      })
    );
    assert.deepEqual(shown, { tier: 'direct', confidence: 0.75 });
  });

  it('model-memory China HQ: direct, but no 75% floor', () => {
    const shown = displayTier(
      base({ relationTier: 'indirect', confidence: 0.5, company: { hqCountry: 'China' } })
    );
    assert.deepEqual(shown, { tier: 'direct', confidence: 0.5 });
  });

  it('keeps a higher server confidence', () => {
    const shown = displayTier(
      base({ relationTier: 'direct', confidence: 0.9, company: { hqCountry: 'China' } })
    );
    assert.deepEqual(shown, { tier: 'direct', confidence: 0.9 });
  });

  it('no company link → server tier unchanged', () => {
    const shown = displayTier(
      base({ relationTier: 'none', confidence: 0.6, company: { hqCountry: 'Japan' } })
    );
    assert.deepEqual(shown, { tier: 'none', confidence: 0.6 });
  });
});

describe('folded parent HQ (real Cybex payload)', () => {
  const r = CYBEX_LIVE.result;

  it('is the live answer: company "Goodbaby International / Cybex", HQ 中國, brand origin 德國', () => {
    assert.equal(r.company?.name, 'Goodbaby International / Cybex');
    assert.equal(r.company?.hqCountry, '中國');
    assert.equal(r.product?.originCountry, '德國');
  });

  it('chip is 中資控股, never 中國公司', () => {
    const { chip, rows, hqFolded } = buildChinaLinks(r);
    assert.equal(chip, 'chinaControlled');
    assert.equal(hqFolded, true);
    // 總部 row does not claim a China HQ for the brand…
    assert.equal(rows.find((x) => x.key === 'hq')?.status, 'unconfirmed');
    // …the China HQ is shown as the parent's.
    const owner = rows.find((x) => x.key === 'owner');
    assert.equal(owner?.status, 'china');
    assert.match(owner?.detail ?? '', /Goodbaby/);
  });

  it('server agrees: parent_majority_cn (not hq_cn), direct, ≥ 0.75', () => {
    const out = synthesize({
      jobId: 'cybex-live',
      geoScope: 'prc',
      webEnriched: true,
      sources: r.sources,
      partials: {
        product: { ...r.product, confidence: 0.6 } as never,
        company: { ...r.company, confidence: 0.9 } as never,
      },
    });
    assert.equal(out.relationTier, 'direct');
    assert.ok(out.tierReasons.includes('parent_majority_cn'));
    assert.ok(!out.tierReasons.includes('hq_cn'));
    assert.ok(out.confidence >= 0.75);
  });

  it('folds on name alone when the parent has no country', () => {
    const res: CheckResult = {
      ...r,
      company: {
        name: 'Goodbaby International / Cybex',
        hqCountry: 'China',
        parents: [{ name: 'Goodbaby International Holdings Ltd.', control: 'unknown' }],
      },
    };
    assert.equal(brandHqFolded(res), true);
    assert.equal(buildChinaLinks(res).chip, 'chinaControlled');
  });

  it('Anker / Tapo (brand origin China, HQ China) stay 中國公司', () => {
    for (const origin of ['China', '中國']) {
      const res: CheckResult = {
        schemaVersion: 1,
        relationTier: 'direct',
        title: 'Tapo C200',
        summary: '',
        product: { brand: 'TP-Link', originCountry: origin },
        company: {
          name: 'TP-Link',
          hqCountry: '中國',
          parents: [{ name: 'TP-Link Holdings', country: 'China', control: 'wholly' }],
        },
      };
      assert.equal(buildChinaLinks(res).chip, 'chinaCompany', origin);
      assert.equal(brandHqFolded(res), false);
    }
  });

  it('unknown brand origin keeps the HQ as the brand\'s', () => {
    const res: CheckResult = {
      ...r,
      product: { ...r.product, originCountry: undefined },
    };
    assert.equal(buildChinaLinks(res).chip, 'chinaCompany');
  });
});

const TAPO_LIVE = JSON.parse(
  readFileSync(new URL('./fixtures/tapo-live.json', import.meta.url), 'utf8')
) as { query: string; result: CheckResult };
const SHEER_LIVE = JSON.parse(
  readFileSync(new URL('./fixtures/sheer-live.json', import.meta.url), 'utf8')
) as { query: string; result: CheckResult };

const kinds = (v: ReturnType<typeof buildChinaCard>) =>
  v.reasons.map((r) => (r.kind === 'code' ? r.code : r.kind));

describe('China card: reasons map to shown rows (real payloads)', () => {
  it('Cybex: folded hq_cn is the parent fact, said once; no ownership_* lines', () => {
    const v = buildChinaCard(CYBEX_LIVE.result);
    assert.deepEqual(v.chips, ['chinaControlled']);
    assert.equal(v.tier, 'direct');
    assert.deepEqual(kinds(v), ['parent', 'pointer']);
    assert.equal(v.confidence, 0.95);
    // Sources are domain titles only → no stake stated → neutral 控股.
    assert.deepEqual(v.stake, { kind: 'neutral' });
  });

  it('Tapo: 總部 + 品牌來源地 lines only; unnamed ownership relations dropped', () => {
    const v = buildChinaCard(TAPO_LIVE.result);
    assert.deepEqual(v.chips, ['chinaCompany']);
    assert.deepEqual(kinds(v), ['hq_cn', 'brandOrigin', 'pointer']);
    assert.equal(v.tier, 'direct');
    // Sourced web answer → company floor applies (0.6 → 0.75).
    assert.equal(v.confidence, 0.75);
  });

  it('Sheer: 中國製造 chip, one made-in line by barcode, no own confidence, no ownership_weak', () => {
    const v = buildChinaCard(SHEER_LIVE.result);
    assert.deepEqual(v.chips, ['madeInChina']);
    assert.deepEqual(kinds(v), ['madeIn']);
    const made = v.reasons.find((r) => r.kind === 'madeIn');
    assert.equal(made?.kind === 'madeIn' && made.basis, 'barcode');
    assert.equal(v.confidence, undefined);
    assert.equal(v.tier, 'direct');
  });

  it('ownership_* with no named parent + stake never feed the tier', () => {
    const res: CheckResult = {
      schemaVersion: 1,
      relationTier: 'direct',
      title: 'X',
      summary: '',
      confidence: 0.8,
      tierReasons: ['ownership_strong_cn', 'ownership_weak_cn', 'explicit_non_cn_geo'],
      company: { name: 'Pigeon', hqCountry: 'Japan' },
    };
    const v = buildChinaCard(res);
    assert.equal(v.tier, 'none');
    assert.equal(displayTier(res).tier, 'none');
    assert.deepEqual(kinds(v), []);
  });

  it('a named China parent with a minority stake keeps ownership_weak_cn (indirect)', () => {
    const res: CheckResult = {
      schemaVersion: 1,
      relationTier: 'indirect',
      title: 'X',
      summary: '',
      tierReasons: ['ownership_weak_cn'],
      company: { name: 'Co', hqCountry: 'Germany', parents: [{ name: 'Tencent', country: 'China', control: 'minority' }] },
    };
    const v = buildChinaCard(res);
    assert.equal(v.tier, 'indirect');
    assert.ok(kinds(v).includes('ownership_weak_cn'));
    assert.deepEqual(v.chips, []);
  });

  it('no 75% floor when the company rows come from model memory only', () => {
    const res: CheckResult = { ...TAPO_LIVE.result, knowledgeBasis: 'model_memory', sources: undefined };
    assert.equal(buildChinaCard(res).confidence, 0.6);
    assert.equal(companyFactsSourced(res), false);
    assert.equal(companyFactsSourced(TAPO_LIVE.result), true);
  });

  it('model-only made-in (no barcode / label) is never a chip, line, tier or confidence', () => {
    const res: CheckResult = {
      ...SHEER_LIVE.result,
      product: { ...SHEER_LIVE.result.product, madeInBasis: undefined },
      meta: undefined,
    };
    assert.equal(confirmedMadeIn(res), undefined);
    const v = buildChinaCard(res);
    assert.deepEqual(v.chips, []);
    assert.ok(!kinds(v).includes('madeIn'));
    assert.notEqual(v.tier, 'direct');
  });
});

describe('stake label needs a Source that states it', () => {
  const owned = (sources?: string[]): CheckResult => ({
    schemaVersion: 1,
    relationTier: 'direct',
    title: 'X',
    summary: '',
    knowledgeBasis: 'web_enriched',
    sources,
    company: { name: 'Cybex GmbH', hqCountry: 'Germany', parents: [{ name: 'Goodbaby', country: 'China', control: 'wholly' }] },
  });
  it('title says wholly-owned → 全資', () => {
    const r = owned(['Cybex is a wholly-owned subsidiary of Goodbaby — https://example.com/a']);
    assert.equal(stakeInSources(r, 'wholly'), true);
    assert.deepEqual(buildChinaCard(r).stake, { kind: 'stated', control: 'wholly' });
  });
  it('no source states the stake → neutral 控股', () => {
    for (const r of [owned(['wikipedia.org — https://example.com/b']), owned(undefined)]) {
      assert.deepEqual(buildChinaCard(r).stake, { kind: 'neutral' });
    }
  });
  it('a stake word for a different level does not count', () => {
    const r = owned(['Goodbaby takes majority stake — https://example.com/c']);
    assert.equal(stakeInSources(r, 'wholly'), false);
  });
});

describe('China card helpers', () => {
  it('outside-China places list company places only, never the made-in', () => {
    const zh = createT('zh-Hant');
    const res: CheckResult = {
      schemaVersion: 1,
      relationTier: 'none',
      title: 'X',
      summary: '',
      product: { madeIn: 'Thailand', manufacturerCountry: 'Vietnam', originCountry: 'Japan' },
      company: { hqCountry: 'Japan' },
    };
    const line = formatTierReason('explicit_non_cn_geo', zh, companyView(res));
    assert.ok(line.includes('日本'), line);
    assert.ok(!/泰國|越南/.test(line), line);
  });
});
