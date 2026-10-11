/**
 * One card rule: nothing reads stronger than its evidence, and evidence
 * counts PER ROW.
 *
 * A verified quote is a fact about one country:
 * - 'madeIn': a confirmed made-in (barcode / package label / exact-model
 *   match, see confirmedMadeIn) or a search hit that passed the page gate
 *   with status 'confirmed';
 * - 'brand': a designInfo brand row whose own quote is brand wording that
 *   names that country (「德國品牌」, "a German brand"); a URL slug such as
 *   `taiwan-brand` is not a quote.
 * A row reads 確認 (a link reads strong) only when a quote backs THAT row's
 * fact for THAT row's country. There is no verified quote type for HQ,
 * manufacturer identity or ownership, so those rows never read 確認 here.
 *
 * Notes and caveats are checked structurally (country + the made-in or
 * brand concept the parsers already use), never by claim words:
 * - while 製造地 is 未確認, any note tying a country to manufacture /
 *   assembly / factory / origin is hidden;
 * - brand wording that names a country is hidden unless a brand quote names
 *   that country.
 */
import { countriesIn, designMentions } from '../../functions/_lib/designOrigin';
import { COUNTRY_NAME_PATTERNS, canonicalCountry } from '../../functions/_lib/countryLabel';
import { textTiesCountryToMade } from '../../functions/_lib/noteText';
import { confirmedMadeIn } from '../components/ChinaLink';
import type { CheckResult } from './types';

export type FactKind = 'madeIn' | 'brand';
export type VerifiedFact = { fact: FactKind; country: string };

function sameCountry(a: string, b: string): boolean {
  const ca = canonicalCountry(a) ?? a.trim().toLowerCase();
  const cb = canonicalCountry(b) ?? b.trim().toLowerCase();
  return Boolean(ca) && ca === cb;
}

/** Real text, not an identifier or URL slug ("taiwan-brand"). */
function isQuote(q: string | undefined): q is string {
  const t = (q ?? '').trim();
  return Boolean(t) && !/^[a-z0-9]+(?:[-_/][a-z0-9]+)+$/i.test(t) && !/^https?:/i.test(t);
}

/** The quote itself is brand wording that names this country. */
export function quoteNamesBrand(quote: string | undefined, country: string): boolean {
  if (!isQuote(quote)) return false;
  if (designMentions(quote).some((d) => sameCountry(d.country, country))) return true;
  if (countriesIn(quote).some((c) => sameCountry(c, country))) return true;
  // A field quote ("Origin: Germany", 「品牌：德國」): the country's own name is in it.
  const canon = canonicalCountry(country);
  const row = canon ? COUNTRY_NAME_PATTERNS.find((r) => r.label === canon) : undefined;
  return Boolean(row?.pattern.test(quote));
}

export function verifiedFacts(result: CheckResult): VerifiedFact[] {
  const out: VerifiedFact[] = [];
  const made = confirmedMadeIn(result);
  if (made) out.push({ fact: 'madeIn', country: made.country });
  for (const h of result.meta?.searchCoo ?? []) {
    if (h.status === 'confirmed' && !h.evidenceOnly && h.country) out.push({ fact: 'madeIn', country: h.country });
  }
  for (const d of result.product?.designInfo ?? []) {
    if (d.kind === 'brand' && d.country && quoteNamesBrand(d.quote, d.country)) out.push({ fact: 'brand', country: d.country });
  }
  return out;
}

/** A verified quote names this fact for this country. */
export function factVerified(result: CheckResult, fact: FactKind, country: string | undefined): boolean {
  if (!country?.trim()) return false;
  return verifiedFacts(result).some((f) => f.fact === fact && sameCountry(f.country, country));
}

/** A server note / caveat the card may show as-is. */
export function noteWithinEvidence(result: CheckResult, text: string): boolean {
  if (!confirmedMadeIn(result) && textTiesCountryToMade(text)) return false;
  for (const d of designMentions(text)) {
    if (d.kind === 'brand' && !factVerified(result, 'brand', d.country)) return false;
  }
  return true;
}

/** Relation types that are about where the product is made. */
const MADE_RELATIONS = new Set(['manufacturing', 'production', 'assembly', 'supply_chain', 'factory']);

/** China-link strength as shown: 'strong' needs a verified quote for that row's own fact and country. */
export function shownStrength(
  result: CheckResult,
  rel: { type?: string; country?: string; strength?: string }
): string | undefined {
  if (rel.strength !== 'strong') return rel.strength;
  const type = String(rel.type ?? '').toLowerCase();
  if (MADE_RELATIONS.has(type) && factVerified(result, 'madeIn', rel.country || 'China')) return 'strong';
  return 'unverified';
}
