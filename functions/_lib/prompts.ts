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
   德國設計, 設計於, 研發於, 德國工程). Report it ONLY here (or in notes as design info), separately from madeIn.
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
4) componentsOrigin = where major parts / the global line may be built when different from final madeIn.
5) parts[] — ALWAYS isolate from THIS product (do not wait for the user to list them):
   - List typical major BOM / recipe / service item NAMES for this category and SKU.
   - Consumables (food, drink, cosmetics, supplements) → ingredients. Goods with a bill of materials → parts and common spares.
   - kind: "part" | "spare" | "ingredient" | "component"
   - madeIn / originCountry per item ONLY when grounded web research and/or packaging/OCR
     evidence supports THAT part's country (cross-check the part against Sources / label text).
   - When <web_research> is empty AND there is no packaging/OCR "Made in" / びん／乳首／キャップ
     (or equivalent) line: OMIT madeIn and originCountry on every part (names + unknown note only).
   - NEVER copy brand HQ, originCountry, "Japanese/German/… brand", or design nationality into
     part countries. Brand home ≠ part factory.
   - Do not invent ANY country on parts without web/OCR/label evidence — not only "do not invent China."
   - chinaRelated true ONLY for mainland China (never Taiwan), and only when evidence supports it.
   - Unknown origin: omit chinaRelated or false; say unknown in note.
   - Max 8. Skip trivia; keep items that can change a China-relation judgment.
6) notes[] MUST explain multi-layer cases when layers differ (brand vs components vs final COO).

SKU / MARKET RULES:
- Full model strings and market suffixes matter; the same family can have different COO by region.
- NEVER set madeIn=China only because "many goods in this category are made in China" or because of brand nationality.
- NEVER invent China when the user or label names another country.
- If exact SKU made-in is uncertain: madeIn "unknown", lower confidence, and put candidates in notes — do not guess China.
- Photo/OCR "Made in" / "Country of origin" ALWAYS beats brand stereotypes and generic web guesses.

DESIGN HQ ≠ FACTORY (critical):
- originCountry = brand/design home. madeIn = factory / legal COO for this SKU. Never substitute one for the other.
- NEVER copy HQ, "designed in …", or brand nationality into madeIn.
- Brand marketing from a non-PRC country is not evidence of manufacture there. Many goods are designed at HQ and assembled elsewhere (often mainland China).
- A note like "designed and manufactured in {HQ country}" with no named plant, city, or COO label is a stereotype — set madeIn "unknown".
- Named factory, assembly plant, or on-label COO for THIS SKU may set madeIn. "Designed in X" must never set madeIn.

SAME NAME / SUPPLY-SHIFT (critical):
- The same brand spelling can be two unrelated companies. Match on category + legal parent, never the name string alone.
- Do not copy made-in from a same-named product in a different category.
- Rumors or policy talk of moving some parts/assembly out of China are componentsOrigin only. They do not set madeIn for the finished unit unless THIS SKU's label/COO says so.
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
- If you only know the local seller, omit parents[] (unknown). A distributor may appear in notes, never as parent.
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
