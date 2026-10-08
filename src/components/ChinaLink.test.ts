/**
 * China link card: chip rule, rows and badge reconciliation.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CheckResult } from '../core/types';
import { buildChinaLinks, displayTier, isChinaCountry } from './ChinaLink';

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
    assert.equal(rows.find((r) => r.key === 'madeIn')?.status, 'unconfirmed');
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
