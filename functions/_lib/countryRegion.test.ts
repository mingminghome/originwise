/**
 * ROC / Republic of China is Taiwan; People's Republic of China (any apostrophe)
 * is China — in the region helper, the canonical-country patterns, the shared
 * country-name table and the made-in value reader. Undoing either side fails here.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canonicalCountry } from './countryLabel';
import { countryNameLabel } from './countryNames';
import { madeInValueCountry, normalizeCooLabel } from './cooPriority';
import { normalizeRegion } from './regions';

const ROC = ['ROC', 'R.O.C.', 'R.O.C', 'Republic of China', 'the Republic of China', 'Republic of China (Taiwan)', 'Taiwan, R.O.C.', '中華民國', '中华民国'];
const PRC = [
  "People's Republic of China",
  'People’s Republic of China',
  'People s Republic of China',
  'Peoples Republic of China',
  "PEOPLE'S REPUBLIC OF CHINA",
  'PRC',
  'P.R.C.',
  'China',
];

describe('ROC is Taiwan, PRC is China', () => {
  it('region helper: ROC forms → TW', () => {
    for (const s of ROC) assert.equal(normalizeRegion(s), 'TW', s);
  });
  it('region helper: PRC forms (any apostrophe or none) → CN, never TW', () => {
    for (const s of PRC) assert.equal(normalizeRegion(s), 'CN', s);
  });
  it('canonical country: ROC forms → Taiwan, PRC forms → China', () => {
    for (const s of ROC) assert.equal(canonicalCountry(s), 'Taiwan', s);
    for (const s of PRC) assert.equal(canonicalCountry(s), 'China', s);
  });
  it('country-name table: roc / r.o.c. / republic of china are Taiwan aliases', () => {
    for (const s of ['roc', 'r.o.c.', 'republic of china']) assert.equal(countryNameLabel(s), 'Taiwan', s);
    for (const s of ["people's republic of china", 'people’s republic of china', 'people s republic of china', 'peoples republic of china']) {
      assert.equal(countryNameLabel(s), 'China', s);
    }
  });
  it('made-in value reader: ROC → Taiwan, PRC → China', () => {
    for (const s of ['ROC', 'R.O.C.', 'Republic of China', 'Republic of China (Taiwan)']) {
      assert.equal(madeInValueCountry(s), 'Taiwan', s);
    }
    for (const s of ["People's Republic of China", 'PRC']) assert.equal(madeInValueCountry(s), 'China', s);
    assert.equal(normalizeCooLabel('ROC'), 'Taiwan');
  });
  it('a word that only contains roc is no Taiwan', () => {
    for (const s of ['Rockville', 'procurement', 'ROC curve', 'Brocade']) {
      assert.notEqual(canonicalCountry(s), 'Taiwan', s);
    }
    for (const s of ['Rockville', 'procurement', 'Brocade']) assert.notEqual(normalizeRegion(s), 'TW', s);
  });
});
