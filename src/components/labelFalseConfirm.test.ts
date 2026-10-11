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
  '日本製品', '朝鮮製品', '日本原裝進口',
];
// r45 Chief ruling 2: comparison / imitation / style words next to the claim (label, note and page).
const BLOCK_STYLE = [
  '日本製風格', '像日本製', '日本製一樣好', '比較日本製', '媲美日本製', '日系風格', '堪比日本製', '不輸日本製',
  '比照日本製', '類似日本製', '日本製等級', '好似日本製', '同日本製一樣', '日式設計', '日本風', '和風',
  '日本製 (仿)', '日本製（非）', '日本製（副廠）', '日本製（A貨）', '日本製（仿製）', '日本製（非原廠）',
  '自稱日本製', '傳聞日本製', '假日本製', '冒充日本製', '日本製！？', '比日本製更耐用',
  // r45 round 3: more comparison words (one word class), and every bracket shape after the claim.
  '仿如日本製', '一如日本製', '勝過日本製', '胜过日本製', '超越日本製', '不亞於日本製', '不亚于日本製', '等同日本製',
  '日本製【仿】', '日本製「非」', '日本製 [A貨]', '日本製『仿』', '日本製［非］', '日本製〔副廠〕', '日本製〈仿〉', '日本製《A貨》',
];
// Negations split by a line break, a curly apostrophe or a double space.
const BLOCK_NEG = ['Not\n made in China\n中國製造', 'Not\n made in China', 'Not made in\nChina\n中國製造', 'Not made\nin China\n中國製造', 'Don’t made in China\n中國製造', 'Not  made in China\n中國製造', '非\n中國製', '不是\n中國製造'];
const VERIFY: Array<[string, string]> = [
  ['種類：日本製', 'Japan'],
  ['分類：日本製', 'Japan'],
  ['日本製 更耐用', 'Japan'],
  ['日本製更放心', 'Japan'],
  ['美國製更耐用', 'United States'],
  ['日本製（原裝）', 'Japan'],
  ['日本製（2024年款）', 'Japan'],
  ['日本製 (Made in Japan)', 'Japan'],
  ['日本製（水貨）', 'Japan'],
  ['日本製（行貨）', 'Japan'],
  ['產地：比利時', 'Belgium'],
  ['日本製 MADE IN JAPAN', 'Japan'], ['MADE IN JAPAN 日本製', 'Japan'], ['原產地：日本製', 'Japan'], ['「日本製」', 'Japan'], ['日本製。', 'Japan'],
  // r45 round 3: brackets that hold no hedge, quotes around the claim, and English lines that are not negations.
  ['日本製【原裝】', 'Japan'], ['日本製「行貨」', 'Japan'], ['日本製 [2024]', 'Japan'], ['日本製『原裝』', 'Japan'],
  ['日本製［行貨］', 'Japan'], ['日本製〔2024年款〕', 'Japan'], ['日本製〈原裝〉', 'Japan'], ['日本製《行貨》', 'Japan'],
  ['本商品為「日本製」', 'Japan'], ['標示：『日本製』', 'Japan'], ['【日本製】嬰兒推車', 'Japan'],
  ['Not dishwasher safe\nMade in Japan', 'Japan'], ['Note: made in Japan', 'Japan'],
  // Tester's word-boundary rows (a4f51a9): keep main's 95%.
  ['日本製 頂級推車', 'Japan'], ['日本製高級推車', 'Japan'], ['日本製 如圖', 'Japan'], ['日本製，如有問題請聯絡', 'Japan'],
  ['日本製 假日特價', 'Japan'], ['日本製 圖像僅供參考', 'Japan'], ['日本製 同款不同色', 'Japan'], ['日本製 風扇', 'Japan'],
  ['日本製防風毯', 'Japan'], ['日本製 還要更輕', 'Japan'], ['同步：日本製', 'Japan'], ['如意牌 日本製', 'Japan'],
  ['級別：日本製', 'Japan'], ['假期限定 日本製', 'Japan'], ['像素：日本製', 'Japan'], ['風格：簡約 產地：日本', 'Japan'],
  ['產地：日本 風格：北歐', 'Japan'],
  ['類別：日本製', 'Japan'],
  ['日本製，更安心', 'Japan'],
  ['產地：日本 不含中國製零件', 'Japan'],
  ['日本製品 ベビーカー', 'Japan'],
  ['產地：日本\n電池：中國製', 'Japan'],
  ['朝鮮製', 'North Korea'],
  ['朝鮮生產', 'North Korea'],
  ['朝鲜制造', 'North Korea'],
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

/**
 * r45 (Ming / Chief, one rule): a CJK made-in confirms on label / note only as the whole value of its line. These real
 * claims lose their confirm under that rule; Chief accepted the over-caution, with no exceptions.
 */
const OVER_CAUTION = new Set<string>(["種類：日本製", "分類：日本製", "日本製 更耐用", "日本製更放心", "美國製更耐用", "日本製（原裝）", "日本製（2024年款）", "日本製（水貨）", "日本製（行貨）", "日本製【原裝】", "日本製「行貨」", "日本製 [2024]", "日本製『原裝』", "日本製［行貨］", "日本製〔2024年款〕", "日本製〈原裝〉", "日本製《行貨》", "本商品為「日本製」", "標示：『日本製』", "【日本製】嬰兒推車", "日本製 頂級推車", "日本製高級推車", "日本製 如圖", "日本製，如有問題請聯絡", "日本製 假日特價", "日本製 圖像僅供參考", "日本製 同款不同色", "日本製 風扇", "日本製防風毯", "日本製 還要更輕", "同步：日本製", "如意牌 日本製", "級別：日本製", "假期限定 日本製", "像素：日本製", "類別：日本製", "日本製，更安心", "日本製品 ベビーカー"]);

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
    if (OVER_CAUTION.has(input)) {
      it(`label ${JSON.stringify(input)} → no confirm (accepted over-caution of the whole-value rule; was ${country} 95%)`, () => {
        assert.equal(summarize('label', input).country, null);
      });
      continue;
    }
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

describe('PR #45 ruling 2: style / comparison words and split negations', () => {
  for (const input of [...BLOCK_STYLE, ...BLOCK_NEG]) {
    for (const path of ['label', 'page'] as const) {
      it(`${path} ${JSON.stringify(input)} → no country`, () => assert.equal(summarize(path, input).country, null));
    }
    it(`note ${JSON.stringify(input)} → nothing possible`, () => {
      const s = summarize('note', input);
      assert.ok(!/possible|likely/.test(String(s.grade ?? '')), JSON.stringify(s));
    });
  }
  it('page 比利時製 → Belgium likely (比 is no comparison inside a country name)', () => {
    assert.deepEqual([summarize('page', '比利時製').country, summarize('page', '比利時製').grade], ['Belgium', 'likely']);
  });
  it('label 比利時製 is not blocked by the comparison rule (same as main: no CJK Belgium on label)', () => {
    assert.equal(summarize('label', '比利時製').country, summarize('label', 'ベルギー製').country);
  });
  it('label 比利時製更耐用 is never a comparison (比 inside 比利時): same as 比利時製', () =>
    assert.equal(summarize('label', '比利時製更耐用').country, summarize('label', '比利時製').country));
  it('label 比利時製 更耐用 reads as 比利時製 (比 inside 比利時 is no comparison)', () =>
    assert.deepEqual(summarize('label', '比利時製 更耐用'), summarize('label', '比利時製')));
  it('page 秘魯製 → Peru likely', () => assert.equal(summarize('page', '秘魯製').country, 'Peru'));
  it('日本製造商 follows the 製造商 rule: no country on label', () => assert.equal(summarize('label', '日本製造商').country, null));
});

describe('PR #45: an English negated quote never verifies on cited', async () => {
  const { citedPageConfirms } = await import('../../functions/_lib/citedSources');
  const page = (line: string) => ({ url: 'https://www.example.com/p/melio', title: 'Cybex Melio', text: `Cybex Melio\nLightweight stroller\n${line}` });
  for (const [q, c] of [
    ['Not made in Germany', 'Germany'],
    ['not manufactured in Germany', 'Germany'],
    ['Never made in China', 'China'],
    ['This is not made in Japan', 'Japan'],
  ] as const) {
    it(`${JSON.stringify(q)} does not verify ${c}`, () => {
      assert.equal(citedPageConfirms(page(q) as never, 'Cybex Melio', c, q), false);
    });
  }
  it('"Not made in China. Made in Germany." verifies Germany', () => {
    const q = 'Not made in China. Made in Germany.';
    assert.equal(citedPageConfirms(page(q) as never, 'Cybex Melio', 'Germany', q), true);
  });
  it('"Made in Germany" still verifies Germany', () => {
    assert.equal(citedPageConfirms(page('Made in Germany') as never, 'Cybex Melio', 'Germany', 'Made in Germany'), true);
  });
});
