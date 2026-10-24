/**
 * When fetched pages confirm a made-in. A region is not a country. One
 * retailer page is a vote. Pages that name different places do not confirm.
 */
import { isRegionNotCountry } from './regions';

export type ConfirmPage = { country?: string; url?: string };

function fold(s: string): string {
  return s.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

function samePlace(a: string, b: string): boolean {
  return Boolean(fold(a)) && fold(a) === fold(b);
}

function hostOf(url?: string): string {
  try {
    return new URL(String(url ?? '')).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Two pages on different sites name one country, or the model's own country
 * matches one page, and no page names another country. A region is not a
 * country, so it is not a vote and not a disagreeing place.
 */
export function confirmingCountry(
  pages: readonly ConfirmPage[],
  modelAnswer?: string
): { country: string; support: 'web' | 'ai_web' } | undefined {
  const places = pages.filter(
    (p) => p.country?.trim() && p.url?.trim() && !isRegionNotCountry(p.country)
  );
  const countries: string[] = [];
  for (const p of places) {
    const c = p.country!.trim();
    if (!countries.some((x) => samePlace(x, c))) countries.push(c);
  }
  if (countries.length !== 1) return undefined;
  const country = countries[0]!;
  const hosts = new Set(places.map((p) => hostOf(p.url)).filter(Boolean));
  const model = (modelAnswer ?? '').trim();
  const modelIsCountry = Boolean(model) && !isRegionNotCountry(model);
  if (modelIsCountry && !samePlace(model, country)) return undefined;
  const agrees = modelIsCountry && samePlace(model, country);
  if (hosts.size >= 2) return { country, support: agrees ? 'ai_web' : 'web' };
  if (hosts.size === 1 && agrees) return { country, support: 'ai_web' };
  return undefined;
}
