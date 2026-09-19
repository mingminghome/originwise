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
