/**
 * The market named by the query's writing. Kana is the Japan-sold unit.
 * A simplified-only character is the mainland-sold unit. A traditional-only
 * character is the Taiwan / Hong Kong-sold unit. Latin, or Han with no
 * script marker, names no market. Not a product list.
 */

export type QueryMarket = 'ja' | 'zh-Hans' | 'zh-Hant';

const KANA = /[\u3040-\u30ff]/;
/** Characters that are not Japanese shinjitai. */
const HANS_ONLY = /[产东门贝华广车云电买网儿]/;
/** Characters that are not simplified Chinese. */
const HANT_ONLY = /[產東門貝華廣車雲電買網國臺兒]/;

export function queryMarket(text: string): QueryMarket | undefined {
  if (KANA.test(text)) return 'ja';
  const hans = HANS_ONLY.test(text);
  const hant = HANT_ONLY.test(text);
  if (hans && !hant) return 'zh-Hans';
  if (hant && !hans) return 'zh-Hant';
  return undefined;
}

const MARKET_LINE: Record<QueryMarket, string> = {
  ja: 'QUERY MARKET: the user text is Japanese, so this is the unit sold in Japan. madeIn is that finished unit. The same name sold in another market can be finished in a different country, and that factory is not this madeIn. A part made in another country stays on that part. Search and cite 原産国 / 日本製 / 国内 for this unit.',
  'zh-Hans':
    'QUERY MARKET: the user text is simplified Chinese, so this is the unit sold in mainland China. Do not copy the factory of the same name sold in Japan or another market. A part\'s country stays on that part.',
  'zh-Hant':
    'QUERY MARKET: the user text is traditional Chinese, so this is the unit sold in Taiwan or Hong Kong. Do not copy the factory of the same name sold in Japan or mainland China. A part\'s country stays on that part.',
};

/** One instruction line for the check and the research prompt. Empty when the text names no market. */
export function queryMarketLine(text: string): string {
  const market = queryMarket(text);
  return market ? MARKET_LINE[market] : '';
}
