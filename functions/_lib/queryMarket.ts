/**
 * The query's own writing is the market. There is no script-to-country table:
 * a Polish query is the Polish-sold unit the same way a Japanese query is the
 * Japan-sold unit. The check and the research prompt both use this one line.
 */

export function queryMarketLine(text: string): string {
  const sample = text.replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!sample) return '';
  const where = searchMarket(text);
  const place = where
    ? ` Search ${where.location} pages in ${where.lang}. Do not use shops from other countries.`
    : '';
  return `QUERY MARKET: the user wrote ${JSON.stringify(sample)}. Search and judge the unit sold under that writing, in whatever language it is.${place} madeIn is that finished unit. The same name sold in another market can be finished in a different country, and that factory is not this madeIn. A part's country stays on that part. Use the origin-field words of this language. Design, brand-home, and domestic-marketing lines are not the factory.`;
}

/**
 * Kana means the Japan-sold unit. Search APIs otherwise return CA and UK shops.
 * Kanji alone is not enough: a Chinese query has no kana.
 */
export function searchMarket(text: string): { country: string; lang: string; location: string } | undefined {
  if (/[\u3040-\u30ff]/.test(text)) return { country: 'JP', lang: 'ja', location: 'Japan' };
  return undefined;
}
