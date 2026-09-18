/**
 * Supported UI locales. English first, then EU languages by native name,
 * then Traditional Chinese.
 */

export const LOCALES = [
  { id: 'en', nativeName: 'English', tag: 'en', llmLabel: 'English' },
  {
    id: 'cs',
    nativeName: 'Čeština',
    tag: 'cs',
    llmLabel: 'Czech (Čeština)',
  },
  { id: 'da', nativeName: 'Dansk', tag: 'da', llmLabel: 'Danish (Dansk)' },
  {
    id: 'de',
    nativeName: 'Deutsch',
    tag: 'de',
    llmLabel: 'German (Deutsch)',
  },
  {
    id: 'el',
    nativeName: 'Ελληνικά',
    tag: 'el',
    llmLabel: 'Greek (Ελληνικά)',
  },
  {
    id: 'es',
    nativeName: 'Español',
    tag: 'es',
    llmLabel: 'Spanish (Español)',
  },
  {
    id: 'fr',
    nativeName: 'Français',
    tag: 'fr',
    llmLabel: 'French (Français)',
  },
  {
    id: 'it',
    nativeName: 'Italiano',
    tag: 'it',
    llmLabel: 'Italian (Italiano)',
  },
  {
    id: 'hu',
    nativeName: 'Magyar',
    tag: 'hu',
    llmLabel: 'Hungarian (Magyar)',
  },
  {
    id: 'nl',
    nativeName: 'Nederlands',
    tag: 'nl',
    llmLabel: 'Dutch (Nederlands)',
  },
  { id: 'pl', nativeName: 'Polski', tag: 'pl', llmLabel: 'Polish (Polski)' },
  {
    id: 'pt',
    nativeName: 'Português',
    tag: 'pt',
    llmLabel: 'Portuguese (Português)',
  },
  {
    id: 'ro',
    nativeName: 'Română',
    tag: 'ro',
    llmLabel: 'Romanian (Română)',
  },
  { id: 'fi', nativeName: 'Suomi', tag: 'fi', llmLabel: 'Finnish (Suomi)' },
  {
    id: 'sv',
    nativeName: 'Svenska',
    tag: 'sv',
    llmLabel: 'Swedish (Svenska)',
  },
  {
    id: 'zh-Hant',
    nativeName: '繁體中文',
    tag: 'zh-Hant',
    llmLabel: 'Traditional Chinese (繁體中文)',
  },
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

export function localeMeta(locale: Locale): LocaleMeta {
  return BY_ID[locale] ?? BY_ID.en;
}

export function llmLangLabel(locale: string): string {
  return localeMeta(normalizeLocale(locale)).llmLabel;
}
