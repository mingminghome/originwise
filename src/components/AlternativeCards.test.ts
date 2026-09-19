/**
 * Client filter for lower-CN alternative cards (cached history safety net).
 * Run: npm test
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isLowerChinaCandidate } from './AlternativeCards';

describe('isLowerChinaCandidate', () => {
  it('hides Direct / made-in-China fillers', () => {
    assert.equal(
      isLowerChinaCandidate({ name: 'A', relationTier: 'direct', madeIn: 'Vietnam' }),
      false
    );
    assert.equal(
      isLowerChinaCandidate({ name: 'B', relationTier: 'none', madeIn: 'China' }),
      false
    );
  });

  it('hides Unrelated cards that treat design HQ as the factory', () => {
    assert.equal(
      isLowerChinaCandidate({
        name: 'Peer EU stroller',
        relationTier: 'none',
        madeIn: 'Netherlands',
        originCountry: 'Netherlands',
        note: 'Dutch design and manufacture, not China production.',
      }),
      false
    );
    assert.equal(
      isLowerChinaCandidate({
        name: '同款歐系推車',
        relationTier: 'none',
        madeIn: '荷蘭',
        originCountry: '荷蘭',
        note: '荷蘭設計與製造，非中國生產。',
      }),
      false
    );
  });

  it('hides cards that claim 不依賴中國製造 or 非中國廠區', () => {
    assert.equal(
      isLowerChinaCandidate({
        name: 'Lookalike brand',
        relationTier: 'none',
        madeIn: '越南',
        hqCountry: '荷蘭',
        note: '總部設於荷蘭，嬰幼兒推車與汽座主要產地為越南，不依賴中國製造。',
      }),
      false
    );
    assert.equal(
      isLowerChinaCandidate({
        name: 'UK-market brand',
        relationTier: 'indirect',
        madeIn: '台灣',
        hqCountry: '英國',
        note: '部分產線轉移至台灣或非中國廠區。',
      }),
      false
    );
  });

  it('hides Unrelated cards that copy brand country into madeIn', () => {
    assert.equal(
      isLowerChinaCandidate({
        name: 'US-designed stroller',
        relationTier: 'none',
        madeIn: '美國',
        originCountry: '美國',
        note: '美國品牌與設計，工廠產地與供應鏈主要集中於北美及非中國地區，無中國大陸控股。',
      }),
      false
    );
  });

  it('keeps a factory-country alternative that is not China', () => {
    assert.equal(
      isLowerChinaCandidate({
        name: 'Other purifier',
        relationTier: 'none',
        madeIn: 'Poland',
        originCountry: 'Japan',
        note: 'Final-assembled at the Ostaszewo plant in Poland.',
      }),
      true
    );
  });
});
