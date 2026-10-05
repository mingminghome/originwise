/**
 * JSON extraction for model replies, including token-truncated objects.
 * Run: npm test
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractJsonObject } from './jsonExtract';
import { geminiVisibleText } from './llm';

describe('extractJsonObject', () => {
  it('reads a fenced object', () => {
    const obj = extractJsonObject('```json\n{"brands":[],"products":[]}\n```');
    assert.deepEqual(obj, { brands: [], products: [] });
  });

  it('ignores a later brace and keeps the first object', () => {
    const obj = extractJsonObject('{"ok":true} trailing {not json');
    assert.deepEqual(obj, { ok: true });
  });

  it('repairs a trailing comma', () => {
    const obj = extractJsonObject('{"brands":[{"name":"Winix"},]}');
    assert.equal((obj?.brands as { name: string }[])[0]?.name, 'Winix');
  });

  it('closes a COO-style object cut off mid-string', () => {
    const raw =
      '{"product":{"name":"Sharp","madeIn":"Poland","notes":["工廠在波蘭';
    const obj = extractJsonObject(raw);
    const product = obj?.product as { madeIn?: string; notes?: string[] };
    assert.equal(product.madeIn, 'Poland');
    assert.equal(product.notes?.[0], '工廠在波蘭');
  });

  it('closes an alternatives list cut off mid-note', () => {
    const raw =
      '{"brands":[{"name":"Winix","madeIn":"South Korea","relationTier":"none","note":"工廠在韓國"}],"products":[{"name":"Coway","madeIn":"South Korea","note":"組裝';
    const obj = extractJsonObject(raw);
    const brands = obj?.brands as { name: string }[];
    const products = obj?.products as { name: string; note?: string }[];
    assert.equal(brands[0]?.name, 'Winix');
    assert.equal(products[0]?.name, 'Coway');
    assert.equal(products[0]?.note, '組裝');
  });
});

describe('geminiVisibleText', () => {
  it('drops thought parts so they are not parsed as JSON', () => {
    const text = geminiVisibleText([
      { thought: true, text: 'The COO might be {"madeIn":"China"}' },
      { text: '{"brands":[],"products":[]}' },
    ]);
    assert.equal(text, '{"brands":[],"products":[]}');
    assert.deepEqual(extractJsonObject(text), { brands: [], products: [] });
  });
});
