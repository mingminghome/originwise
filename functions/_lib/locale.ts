/**
 * Server locale allow-list. Keep IDs + LLM labels in sync with
 * `src/core/i18n/locales.ts`.
 */

export const SUPPORTED_LOCALES = [
  'en',
  'cs',
  'da',
  'de',
  'el',
  'es',
  'fr',
  'it',
  'hu',
  'nl',
  'pl',
  'pt',
  'ro',
  'fi',
  'sv',
  'zh-Hant',
] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

const LLM_LABEL: Record<AppLocale, string> = {
  en: 'English',
  cs: 'Czech (Čeština)',
  da: 'Danish (Dansk)',
  de: 'German (Deutsch)',
  el: 'Greek (Ελληνικά)',
  es: 'Spanish (Español)',
  fr: 'French (Français)',
  it: 'Italian (Italiano)',
  hu: 'Hungarian (Magyar)',
  nl: 'Dutch (Nederlands)',
  pl: 'Polish (Polski)',
  pt: 'Portuguese (Português)',
  ro: 'Romanian (Română)',
  fi: 'Finnish (Suomi)',
  sv: 'Swedish (Svenska)',
  'zh-Hant': 'Traditional Chinese (繁體中文)',
};

const PREFIX_TO_ID: Record<string, AppLocale> = {};
for (const id of SUPPORTED_LOCALES) {
  PREFIX_TO_ID[id.split('-')[0]!.toLowerCase()] = id;
}

function isLocale(raw: string): raw is AppLocale {
  return Object.hasOwn(LLM_LABEL, raw);
}

export function normalizeLocale(raw: unknown): AppLocale {
  const s = String(raw ?? '').trim();
  if (isLocale(s)) return s;
  const prefix = s.split(/[-_]/)[0]?.toLowerCase();
  if (prefix && Object.hasOwn(PREFIX_TO_ID, prefix)) return PREFIX_TO_ID[prefix];
  return 'en';
}

export function langLabel(locale: string): string {
  return LLM_LABEL[normalizeLocale(locale)];
}
