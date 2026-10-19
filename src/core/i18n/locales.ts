/**
 * Supported UI locales. English first, then EU languages by native name,
 * then Traditional Chinese.
 */

export const LOCALES = [
  { id: 'en', nativeName: 'English', tag: 'en' },
  { id: 'cs', nativeName: 'Čeština', tag: 'cs' },
  { id: 'da', nativeName: 'Dansk', tag: 'da' },
  { id: 'de', nativeName: 'Deutsch', tag: 'de' },
  { id: 'el', nativeName: 'Ελληνικά', tag: 'el' },
  { id: 'es', nativeName: 'Español', tag: 'es' },
  { id: 'fr', nativeName: 'Français', tag: 'fr' },
  { id: 'it', nativeName: 'Italiano', tag: 'it' },
  { id: 'hu', nativeName: 'Magyar', tag: 'hu' },
  { id: 'nl', nativeName: 'Nederlands', tag: 'nl' },
  { id: 'pl', nativeName: 'Polski', tag: 'pl' },
  { id: 'pt', nativeName: 'Português', tag: 'pt' },
  { id: 'ro', nativeName: 'Română', tag: 'ro' },
  { id: 'fi', nativeName: 'Suomi', tag: 'fi' },
  { id: 'sv', nativeName: 'Svenska', tag: 'sv' },
  { id: 'zh-Hant', nativeName: '繁體中文', tag: 'zh-Hant' },
] as const;

export type Locale = (typeof LOCALES)[number]['id'];

export type LocaleMeta = (typeof LOCALES)[number];

const BY_ID: Record<Locale, LocaleMeta> = Object.fromEntries(
  LOCALES.map((l) => [l.id, l])
) as Record<Locale, LocaleMeta>;

const PREFIX_TO_ID: Record<string, Locale> = {};
for (const loc of LOCALES) {
  PREFIX_TO_ID[loc.id.split('-')[0]!.toLowerCase()] = loc.id;
}

export function isLocale(raw: unknown): raw is Locale {
  return typeof raw === 'string' && Object.hasOwn(BY_ID, raw);
}

/** Match a BCP-47 tag (e.g. `de-AT`, `zh-TW`) to a supported locale. */
export function parseLocale(raw: unknown): Locale | undefined {
  const s = String(raw ?? '').trim();
  if (!s) return undefined;
  if (isLocale(s)) return s;
  const prefix = s.split(/[-_]/)[0]?.toLowerCase();
  if (prefix && Object.hasOwn(PREFIX_TO_ID, prefix)) return PREFIX_TO_ID[prefix];
  return undefined;
}

export function normalizeLocale(raw: unknown): Locale {
  return parseLocale(raw) ?? 'en';
}

export function localeTag(locale: Locale): string {
  return BY_ID[locale]?.tag ?? 'en';
}
