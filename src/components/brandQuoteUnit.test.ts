/**
 * #48 brand quote unit (Tester live 11 Oct 2026, Cybex Melio 法國品牌 from an
 * angelbaby.com.tw menu link 「GLOBBER｜法國品牌滑步車」): a brand quote verifies
 * only from its own unit naming the queried brand / product and nothing else.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CheckResult } from '../core/types';
import { factVerified } from '../core/evidence';
import { designFromPages, gateClaims, type FetchedPage } from '../../functions/_lib/search/extract';

const MELIO = 'Cybex Melio';
const page = (text: string): FetchedPage => ({ url: 'https://shop.example.com/cybex-melio', title: '', text });
const rowsFor = (line: string) => {
  const pages = [page(`Cybex Melio 嬰兒推車\n${line}`)];
  return designFromPages(gateClaims(MELIO, [], pages, []).design, pages).filter((d) => d.kind === 'brand');
};
const card = (designInfo: NonNullable<CheckResult['product']>['designInfo']) =>
  ({ product: { brand: 'Cybex', name: 'Melio', designInfo } }) as unknown as CheckResult;

describe('#48 brand quote unit', () => {
  for (const [line, country] of [
    ['Cybex｜GLOBBER 法國品牌', 'France'],
    ['GLOBBER｜法國品牌滑步車', 'France'],
    ['Cybex Joie Globber Maxi-Cosi 法國品牌', 'France'],
    ['Cybex 同級的法國品牌', 'France'],
    ['Cybex 類似法國品牌', 'France'],
    ['Cybex·Globber 法國品牌', 'France'],
  ] as const) {
    it(`must-block: ${line}`, () => {
      const rows = rowsFor(line);
      const r = rows.find((d) => d.country === country);
      assert.ok(r, JSON.stringify(rows));
      assert.ok(!r.fetched && !r.quoteLine, JSON.stringify(r));
      assert.equal(factVerified(card(rows), 'brand', country), false);
    });
  }
  it('must-block: a cached fetched row with no quoteLine reads 有提及', () => {
    assert.equal(factVerified(card([{ country: 'France', kind: 'brand', quote: '法國品牌', url: 'https://x.example/p', fetched: true }]), 'brand', 'France'), false);
  });
  it('must-verify: Cybex 德國品牌 on the same line', () => {
    const rows = rowsFor('Cybex 德國品牌');
    const r = rows.find((d) => d.country === 'Germany');
    assert.ok(r?.fetched && r.quoteLine === 'Cybex 德國品牌', JSON.stringify(rows));
    assert.equal(factVerified(card(rows), 'brand', 'Germany'), true);
  });
  it('label photo stays exempt', () => {
    assert.equal(factVerified(card([{ country: 'Germany', kind: 'brand', quote: '德國品牌', fetched: true, label: true }]), 'brand', 'Germany'), true);
  });
  it('known cost: heading then the country on the next line reads 有提及', () => {
    const rows = rowsFor('CYBEX\n德國品牌，創立於2005年');
    assert.equal(factVerified(card(rows), 'brand', 'Germany'), false);
  });
});
