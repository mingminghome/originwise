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
  buildChinaLinks,
  chinaCardReasons,
  companyView,
  displayTier,
  isChinaCountry,
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
  it('China HQ never shows weaker than direct / 75%', () => {
    const shown = displayTier(
      base({ relationTier: 'indirect', confidence: 0.5, company: { hqCountry: 'China' } })
    );
    assert.deepEqual(shown, { tier: 'direct', confidence: 0.75 });
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

describe('China card reasons (no made-in lines)', () => {
  it('drops made-in / manufacturer / product-origin / parts reasons', () => {
    const { shown, madeInHidden } = chinaCardReasons([
      'made_in_cn',
      'manufacturer_cn',
      'origin_cn',
      'component_cn',
      'hq_cn',
      'parent_majority_cn',
      'explicit_non_cn_geo',
    ]);
    assert.deepEqual(shown, ['hq_cn', 'parent_majority_cn', 'explicit_non_cn_geo']);
    assert.equal(madeInHidden, true);
    assert.deepEqual(chinaCardReasons(['hq_cn']), { shown: ['hq_cn'], madeInHidden: false });
  });

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
