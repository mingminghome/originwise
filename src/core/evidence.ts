/**
 * One card rule: nothing reads stronger than its evidence, and evidence
 * counts PER ROW.
 *
 * A verified quote is a fact about one country:
 * - 'madeIn': a confirmed made-in (barcode / package label / exact-model
 *   match, see confirmedMadeIn) or a search hit that passed the page gate
 *   with status 'confirmed';
 * - 'brand': a designInfo brand row read on a page we fetched, whose own
 *   quote names that country (「德國品牌」, "a German brand"); a URL slug such
 *   as `taiwan-brand` is not a quote, and an AI-cited quote is only 有提及.
 * A row reads 確認 (a link reads strong) only when a quote backs THAT row's
 * fact for THAT row's country. There is no verified quote type for HQ,
 * manufacturer identity or ownership, so those rows never read 確認 here.
 *
 * A note is shown as the check stored it. The card does not scan the
 * sentence for a country or a city.
 */
import { confirmedMadeIn } from '../components/ChinaLink';
import type { CheckResult } from './types';

export type FactKind = 'madeIn' | 'brand';
export type VerifiedFact = { fact: FactKind; country: string };

function fold(s: string): string {
  return s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function sameCountry(a: string, b: string): boolean {
  const ca = fold(a);
  const cb = fold(b);
  return Boolean(ca) && ca === cb;
}

/** Name tokens of the queried brand / product. */
function queryNameTokens(...names: Array<string | undefined>): Set<string> {
  const out = new Set<string>();
  for (const n of names) {
    for (const t of fold(String(n ?? '')).split(/[^\p{L}\p{N}]+/u)) {
      if (t) out.add(t);
    }
  }
  return out;
}

const UNIT_GLUE = /[\s\u3000:：\-–—]+/u;

/**
 * A brand quote backs its row only when the unit is this product's name
 * and then the quote. Another name before or after the quote does not.
 */
function unitBacksBrand(unit: string, phrase: string, tokens: ReadonlySet<string>): boolean {
  const u = String(unit ?? '').normalize('NFKC').trim();
  const p = String(phrase ?? '').normalize('NFKC').trim();
  if (!u || !p || !tokens.size) return false;
  const at = u.indexOf(p);
  if (at < 0) return false;
  const head = u.slice(0, at).split(UNIT_GLUE).filter(Boolean);
  if (!head.every((w) => tokens.has(fold(w)))) return false;
  const inPhrase = fold(p).split(/[^\p{L}\p{N}]+/u).some((w) => tokens.has(w));
  if (!head.length && !inPhrase) return false;
  const tail = u.slice(at + p.length);
  for (const w of tail.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]+/gu) ?? []) {
    if (!tokens.has(fold(w))) return false;
  }
  return true;
}

/** Real text, not an identifier or URL slug ("taiwan-brand"). */
function isQuote(q: string | undefined): q is string {
  const t = (q ?? '').trim();
  return Boolean(t) && !/^[a-z0-9]+(?:[-_/][a-z0-9]+)+$/i.test(t) && !/^https?:/i.test(t);
}

/** The quote contains the country this row already names. */
export function quoteNamesBrand(quote: string | undefined, country: string): boolean {
  if (!isQuote(quote)) return false;
  const c = fold(country);
  return Boolean(c) && fold(quote).includes(c);
}

export function verifiedFacts(result: CheckResult): VerifiedFact[] {
  const out: VerifiedFact[] = [];
  const made = confirmedMadeIn(result);
  if (made) out.push({ fact: 'madeIn', country: made.country });
  for (const h of result.meta?.searchCoo ?? []) {
    if (h.status === 'confirmed' && !h.evidenceOnly && h.country) out.push({ fact: 'madeIn', country: h.country });
  }
  // A brand quote is verified only when it was read on a page we fetched
  // (designInfo.fetched); an AI-cited quote alone is 有提及, never 確認.
  // #48: and only from its own unit naming this brand / product and no other
  // (rechecked here, so a cached row with no quoteLine reads 有提及); the
  // package label photo is the product's own and stays exempt.
  const tokens = queryNameTokens(result.product?.brand, result.product?.name);
  for (const d of result.product?.designInfo ?? []) {
    if (d.kind !== 'brand' || !d.fetched || !d.country || !quoteNamesBrand(d.quote, d.country)) continue;
    if (d.label || (d.quoteLine && unitBacksBrand(d.quoteLine, d.quote ?? '', tokens))) out.push({ fact: 'brand', country: d.country });
  }
  return out;
}

/** A verified quote names this fact for this country. */
export function factVerified(result: CheckResult, fact: FactKind, country: string | undefined): boolean {
  if (!country?.trim()) return false;
  return verifiedFacts(result).some((f) => f.fact === fact && sameCountry(f.country, country));
}

/** A stored note. Empty text is not a note. */
export function noteWithinEvidence(_result: CheckResult, text: string): boolean {
  return Boolean(text.trim());
}

/** Company roles are not a made-in. Any other named relation is the factory row. */
const COMPANY_ROLES = new Set([
  'owner',
  'parent',
  'ownership',
  'brand',
  'hq',
  'headquarters',
  'supply',
  'supplier',
]);

/** China-link strength as shown: 'strong' needs a verified quote for that row's own fact and country. */
export function shownStrength(
  result: CheckResult,
  rel: { type?: string; country?: string; strength?: string }
): string | undefined {
  if (rel.strength !== 'strong') return rel.strength;
  const type = String(rel.type ?? '').trim().toLowerCase();
  if (
    type &&
    !COMPANY_ROLES.has(type) &&
    rel.country &&
    factVerified(result, 'madeIn', rel.country)
  ) {
    return 'strong';
  }
  return 'unverified';
}
