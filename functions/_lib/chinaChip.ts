/**
 * Brand HQ vs parent HQ (shared by the server tier and the China card).
 *
 * Models sometimes fold a Chinese parent into the company: Acme comes back
 * as company "Parentco International / Acme", hqCountry China, brand origin
 * Germany. That China HQ is the parent's, not the brand's. Treat it as a
 * China-controlling parent (中資控股), never as a Chinese company (中國公司).
 *
 * Folded when ALL hold:
 * - the brand origin is known and outside China scope (Germany, Japan…),
 * - the reported HQ is in China scope,
 * - a parent is listed that is in China scope, or whose name also appears
 *   inside the company name ("Parentco International / Acme").
 * Brand origin China (BrandC, Brandd) or unknown → the HQ stays the brand's.
 */
import { inScope, normalizeRegion, type GeoScope } from './regions';

export type ParentLike = { name?: string; country?: string; control?: string };

export type HqFoldInput = {
  brandOrigin?: string;
  hqCountry?: string;
  companyName?: string;
  parents?: ParentLike[];
};

function plainName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[（(].*?[)）]/g, ' ')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '');
}

/** The company text contains the parent name, or the parent name contains the company. */
export function parentNamedInCompany(companyName: string | undefined, parent: ParentLike): boolean {
  const company = plainName(String(companyName ?? ''));
  const parentName = plainName(String(parent.name ?? ''));
  if (company.length < 3 || parentName.length < 3) return false;
  return company.includes(parentName) || parentName.includes(company);
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
