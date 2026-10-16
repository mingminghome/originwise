/**
 * Server-built prompts for OriginWise agents.
 * User content is fenced as untrusted data.
 */

import { langLabel } from './locale';

export { langLabel };

export function fence(tag: string, body: string): string {
  return `<${tag}>\n${body || '(none)'}\n</${tag}>`;
}

export const GEO_POLICY = `
GEO / TIER POLICY (for facts only — final tier is computed server-side):
- Taiwan (TW) is ALWAYS a separate country. Never describe Taiwan as "China" for ownership/origin tiers.
- Report TW/HK/MO with explicit country/region names.
- Prefer "unknown" over inventing ownership or legal parent names.
- Respond with ONE JSON object only (no markdown fences).
`.trim();

/** Shared product geo accuracy rules (monolith / product / dual). */
export const PRODUCT_FACT_RULES = `
MULTI-LAYER ORIGIN (critical — do not collapse into one country):
Products often have SEPARATE layers. Report each layer; never substitute one for another.

1) originCountry = brand design / brand home market. Not the factory.
   designedIn = the country the brand says it designs / engineers / develops this product in
   ("Designed in Germany", "Engineered in Germany", "German engineering", "Designed by Apple in California",
   德國設計, 設計於, 研發於, 德國工程). Report it only in designedIn, separately from madeIn.
   Design / brand wording is never made-in evidence: never put it in madeIn, madeInSources quotes, parts or componentsOrigin.
   One sentence with both ("Designed in Germany, made in China"): only the made-in part counts for madeIn,
   and a madeInSources quote is only that part ("made in China").
2) manufacturerCountry = legal manufacturer domicile (often same as brand HQ).
3) madeIn / manufacturedIn = FINAL legal country of origin for THIS unit/SKU:
   - Prefer packaging "Made in …" / "Country of origin" / retailer COO for this exact model.
   - Final assembly or a regional localization plant counts as madeIn when that is the official stamp.
   - Do NOT put brand HQ or a generic global factory into madeIn when the unit is labeled elsewhere.
   - madeInSources = at most 2 pages behind your madeIn answer, each {"url","title","quote"}:
     url = the page address exactly as you saw it (web research Sources); title = its title;
     quote = the exact words on that page that name the country (e.g. "產地：中國", "Made in China").
     Each url must be the product page for THIS model that the quote was copied from: never a site root /
     homepage, a category or listing page, or a search page (those are never counted).
     When a Sources line shows only a site name or domain as its title (a grounding redirect link such as
     https://vertexaisearch.cloud.google.com/grounding-api-redirect/…), copy that redirect link exactly;
     never rebuild a URL from the domain or title.
     Never invent, guess or rebuild a URL; every cited URL is fetched and checked.
     Use [] when madeIn is unknown or you have no page for it.
4) componentsOrigin = where major parts differ from final madeIn. Omit when unknown.
5) parts[] — names for THIS SKU, max 8. Food, drink, cosmetics → ingredients. Other goods → parts and common spares.
   kind: "part" | "spare" | "ingredient" | "component".
   madeIn / originCountry on a part ONLY when Sources or the label name THAT part's country.
   When <web_research> is empty AND there is no packaging/OCR "Made in" / びん／乳首／キャップ line: OMIT madeIn and originCountry on every part.
   NEVER copy brand HQ, originCountry, or design nationality into part countries.
   Do not invent ANY country on parts without web/OCR/label evidence.
   chinaRelated true ONLY for mainland China, and only with that evidence. Otherwise omit it.
   Omit part notes.
6) Omit notes. Do not write that made-in or a part country is unknown, or that a barcode or package photo is missing.

SKU:
- NEVER set madeIn=China from the category or from brand nationality. NEVER invent China when the label names another country.
- If you know where THIS model is manufactured (a plant, a "Made in" / hergestellt line, or a factory country for this SKU), set madeIn to that country even when it is also the brand's home. The server lists it as one source. It is confirmed only when web pages agree or a package label says so.
- If you only know the brand home or "designed in" country, set madeIn "unknown".
- Photo/OCR "Made in" / "Country of origin" beats brand stereotypes.

DESIGN HQ ≠ FACTORY:
- originCountry = brand/design home. madeIn = factory / legal COO. "Designed in X", "German engineering", or brand nationality alone must not set madeIn.
- A retailer or manufacturer statement that THIS model is made in the brand's home country DOES set madeIn.

SAME NAME / SUPPLY-SHIFT:
- Match category + legal parent, never the spelling alone. Do not copy made-in from a same-named product in a different category.
- A rumor of moving some parts out of China is componentsOrigin only. It does not set madeIn.

MARKET OF THIS QUERY:
- The writing of the user text selects the unit on sale. Kana (hiragana or katakana) = the unit sold in Japan. Simplified-only characters = the unit sold in mainland China. Traditional-only characters = the unit sold in Taiwan or Hong Kong. Latin script names no market.
- madeIn is the finished unit in THAT market. The same model name sold in another market can be finished in a different country. Do not copy that other unit's factory into madeIn.
- A part made in another country stays in parts[] / componentsOrigin. It does not set madeIn.
- When a QUERY MARKET line is present, follow it: search and cite that market's unit, not another market's listing of the same name.
`.trim();

export const COMPANY_FACT_RULES = `
COMPANY / OWNERSHIP (critical):
- Taiwan parents (e.g. Hon Hai / Foxconn / 鴻海) are Taiwan — never list parent.country as China/PRC.
- Manufacturing or supply in mainland China is a chinaRelations entry (type manufacturing/supply), not ownership HQ.
- Prefer "unknown" over inventing parent control percentages.

PARENT vs LOCAL DISTRIBUTOR (critical — never collapse):
- parents[] = legal owner / holding company / controlling shareholder ONLY.
- Exclusive distributor, importer, local agent, licensed retailer, warranty agent, "台灣總代理" / "official distributor" are NOT parents. Never put them in parents[].
- Two brands sharing the same local distributor, agent, or shop-in-shop does NOT make one brand the parent of the other.
- A market-desk label like "OtherBrand TW" / "OtherBrand Taiwan" is a local sales identity, not a legal parent.
- Similar pronunciation of brand names does not mean the same company.
- If you only know the local seller, omit parents[] (unknown). Never put a distributor in parents[].
`.trim();

export const ALTERNATIVES_FACT_RULES = `
ALTERNATIVES PURPOSE (critical — this is the whole point of the list):
- Suggest substitute brands/products the user could choose INSTEAD — ones with NO mainland China manufacture when possible, or CLEARLY LOWER China involvement than the checked item.
- Do NOT list peers that are also typically made in China / PRC-owned just because they are "similar". Those are not useful alternatives here.
- Prefer: non-CN made-in + non-PRC HQ/ownership. Next: mixed supply but lower CN share than the query item. Never pad with high-CN options.
- If you cannot name credible lower-CN options, return empty arrays rather than China-heavy fillers.

ALTERNATIVES ACCURACY:
- Brand HQ or "designed in" is not non-China manufacture. Many goods are still made in mainland China.
- NEVER set madeIn (or originCountry) to the brand HQ / design country unless you have factory or COO evidence for that SKU (named plant, city, label, or reputable spec). If factory is unknown, omit the item.
- NEVER invent a non-China factory country from supply-shift rumors, a same-spelling brand in another category, or "some parts moved". Finished-unit COO for THIS query's category only.
- NEVER write notes that claim "not made in China" / "designed and manufactured in {HQ}" without a named plant or on-label COO for this SKU and category.
- Do not suggest the same brand as the query, or a sibling brand from the same parent/factory group, as a lower-CN substitute.
- Do not mix two companies that share a name but differ in category or legal parent.
- relationTier "none" ONLY if factory/COO (not design HQ) is clearly outside mainland China AND ownership is not PRC-controlled.
- made-in China/PRC → "direct" (do not include such items as alternatives unless nothing else exists and you must mark them honestly — prefer empty).
- Unclear factory country → omit the item (do not list it as "none" or fill madeIn from HQ or from a same-name other category).
- Max 4 each. Each note is one short sentence naming the factory/COO country and why China involvement is lower.
`.trim();

export const WEB_CONTEXT_RULE = `
WEB RESEARCH (when <web_research> is present and not empty):
- Treat it as CURRENT public web findings (may include citations). Prefer it over stale training memory for ownership, HQ, and typical made-in.
- Packaging OCR / "Made in" on THIS unit still beats generic web claims for madeIn of this exact SKU.
- If web and memory conflict, prefer the more specific SKU/market source; note the conflict in notes/caveats.
- Do not invent registry IDs or ownership % that are not supported by web or clear knowledge.
`.trim();
