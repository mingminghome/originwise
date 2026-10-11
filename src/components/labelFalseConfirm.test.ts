/**
 * PR #45 (Chief): the label (photo) path and the note path must not confirm a made-in that the page path (#44) never
 * reads as a whole-product claim: imitation, comparison, parts (after, or a part label on the line above), questions,
 * hedges, negations and bare 〜製品. 韓國製 + 朝鮮製 is a 爭議 on label and note, in both orders. Written before the fix.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { summarize } from './madeInRegression.testutil';

const BLOCK = [
  '仿日本製', '類日本製', '對標日本製', '比日本製更好',
  '日本製配件', '日本製馬達', '面料：日本製',
  '面料\n日本製', '面料：\n日本製', '配件\n日本製', '電池：\n中國製造',
  '日本製？', '日本製?', '日本製嗎',
  '可能日本製', '號稱日本製', '疑似日本製', '聽說是日本製',
  '非日本製', '不是日本製', '並非日本製', 'Not made in Japan',
  'Not made in China\n中國製造', '中國製造\nNot made in China', '非中國製\n中國製', '中國製\n非中國製',
  '日本製品', '朝鮮製品', '日本製風格', '日本原裝進口',
];
const VERIFY: Array<[string, string]> = [
  ['日本製', 'Japan'],
  ['產地：日本', 'Japan'],
  ['製造國：日本', 'Japan'],
  ['Made in Japan', 'Japan'],
  ['中國製造', 'China'],
  ['Not made in China\n日本製', 'Japan'],
  ['產地：中國延邊朝鮮族自治州', 'China'],
  ['產地：朝鮮', 'North Korea'],
  ['產地：北朝鮮', 'North Korea'],
];

describe('PR #45: label and note never confirm a non-claim', () => {
  for (const input of BLOCK) {
    it(`label ${JSON.stringify(input)} → no confirmed country`, () => {
      assert.equal(summarize('label', input).country, null);
    });
    it(`note ${JSON.stringify(input)} → no possible country`, () => {
      const s = summarize('note', input);
      assert.ok(!/possible|likely/.test(String(s.grade ?? '')), JSON.stringify(s));
    });
  }
  for (const [input, country] of VERIFY) {
    it(`label ${JSON.stringify(input)} → ${country} 95%`, () => {
      assert.deepEqual([summarize('label', input).country, summarize('label', input).grade], [country, 'label 95%']);
    });
  }
  for (const input of ['韓國製\n朝鮮製', '朝鮮製\n韓國製']) {
    it(`label ${JSON.stringify(input)} → 爭議 South Korea / North Korea`, () => {
      const s = summarize('label', input);
      assert.equal(s.country, null);
      assert.match(String(s.grade), /^爭議 /);
      assert.deepEqual(String(s.grade).replace('爭議 ', '').split(',').sort(), ['North Korea', 'South Korea']);
    });
    it(`note ${JSON.stringify(input)} → both Koreas, neither possible`, () => {
      const s = summarize('note', input);
      assert.deepEqual(String(s.country).split(',').sort(), ['North Korea', 'South Korea']);
      assert.ok(!/possible|likely/.test(String(s.grade ?? '')), JSON.stringify(s));
    });
  }
});
