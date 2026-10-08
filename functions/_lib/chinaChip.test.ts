import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hqFoldedIntoParent, parentNamedInCompany } from './chinaChip';

const GOODBABY = { name: 'Goodbaby International Holdings Ltd. (好孩子國際控股有限公司)', country: '中國', control: 'wholly' };

describe('hqFoldedIntoParent', () => {
  it('Cybex live answer: German brand, HQ 中國, China parent → folded', () => {
    assert.equal(
      hqFoldedIntoParent({ brandOrigin: '德國', hqCountry: '中國', companyName: 'Goodbaby International / Cybex', parents: [GOODBABY] }),
      true
    );
  });

  it('parent with no country but named in the company → folded', () => {
    assert.equal(
      hqFoldedIntoParent({ brandOrigin: 'Germany', hqCountry: 'China', companyName: 'Goodbaby International / Cybex', parents: [{ name: 'Goodbaby International Holdings' }] }),
      true
    );
    assert.equal(parentNamedInCompany('Goodbaby International / Cybex', { name: 'Pigeon International Holdings' }), false);
  });

  it('Anker / Tapo: brand origin China → not folded (中國公司)', () => {
    assert.equal(hqFoldedIntoParent({ brandOrigin: 'China', hqCountry: 'China', companyName: 'Anker Innovations', parents: [{ name: 'Anker Innovations Technology', country: 'China' }] }), false);
    assert.equal(hqFoldedIntoParent({ brandOrigin: '中國', hqCountry: '中國', companyName: 'TP-Link', parents: [] }), false);
  });

  it('unknown brand origin or no parent → not folded', () => {
    assert.equal(hqFoldedIntoParent({ hqCountry: 'China', companyName: 'X', parents: [GOODBABY] }), false);
    assert.equal(hqFoldedIntoParent({ brandOrigin: 'Germany', hqCountry: 'China', companyName: 'X', parents: [] }), false);
  });

  it('Taiwan HQ is never China scope → not folded', () => {
    assert.equal(hqFoldedIntoParent({ brandOrigin: 'Germany', hqCountry: 'Taiwan', companyName: 'X', parents: [GOODBABY] }), false);
  });

  it('Hong Kong HQ folds only under greater_china', () => {
    const input = { brandOrigin: 'Germany', hqCountry: 'Hong Kong', companyName: 'Goodbaby / Cybex', parents: [{ ...GOODBABY, country: 'Hong Kong' }] };
    assert.equal(hqFoldedIntoParent(input, 'prc'), false);
    assert.equal(hqFoldedIntoParent(input, 'greater_china'), true);
  });
});
