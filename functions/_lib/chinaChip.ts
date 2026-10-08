/**
 * Brand HQ vs parent HQ (shared by the server tier and the China card).
 *
 * Models sometimes fold a Chinese parent into the company: Cybex comes back
 * as company "Goodbaby International / Cybex", hqCountry China, brand origin
 * Germany. That China HQ is the parent's, not the brand's. Treat it as a
 * China-controlling parent (中資控股), never as a Chinese company (中國公司).
 *
 * Folded when ALL hold:
 * - the brand origin is known and outside China scope (Germany, Japan…),
 * - the reported HQ is in China scope,
 * - a parent is listed that is in China scope, or whose name also appears
 *   inside the company name ("Goodbaby International / Cybex").
 * Brand origin China (Anker, TP-Link) or unknown → the HQ stays the brand's.
 */
import { inScope, normalizeRegion, type GeoScope } from './regions';

export type ParentLike = { name?: string; country?: string; control?: string };

export type HqFoldInput = {
  brandOrigin?: string;
  hqCountry?: string;
  companyName?: string;
  parents?: ParentLike[];
};

const NAME_STOP = new Set([
  'international', 'holdings', 'holding', 'group', 'limited', 'ltd', 'inc', 'co',
  'corp', 'corporation', 'company', 'gmbh', 'plc', 'llc', 'the',
]);

function nameTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[（(].*?[)）]/g, ' ')
    .split(/[^a-z0-9\u4e00-\u9fff]+/)
    .filter((w) => w.length >= 3 && !NAME_STOP.has(w));
}

/** Parent whose distinctive name word also appears in the company name. */
export function parentNamedInCompany(companyName: string | undefined, parent: ParentLike): boolean {
  const company = new Set(nameTokens(String(companyName ?? '')));
  if (!company.size) return false;
  return nameTokens(String(parent.name ?? '')).some((w) => company.has(w));
}

export function hqFoldedIntoParent(input: HqFoldInput, scope: GeoScope = 'prc'): boolean {
  const origin = normalizeRegion(input.brandOrigin);
  if (origin === 'UNKNOWN' || inScope(origin, scope)) return false;
  if (!inScope(normalizeRegion(input.hqCountry), scope)) return false;
  return (input.parents ?? []).some(
    (p) =>
      Boolean(p.name?.trim()) &&
      (inScope(normalizeRegion(p.country), scope) ||
        parentNamedInCompany(input.companyName, p))
  );
}
