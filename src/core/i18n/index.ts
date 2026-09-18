import { cs } from './cs';
import { da } from './da';
import { de } from './de';
import { el } from './el';
import { en, type MessageTree } from './en';
import { es } from './es';
import { fi } from './fi';
import { fr } from './fr';
import { hu } from './hu';
import { it } from './it';
import {
  LOCALES,
  type Locale,
  localeTag,
  normalizeLocale,
} from './locales';
import { nl } from './nl';
import { pl } from './pl';
import { pt } from './pt';
import { ro } from './ro';
import { sv } from './sv';
import { zhHant } from './zh-Hant';

export const catalogs: Record<Locale, MessageTree> = {
  en,
  cs,
  da,
  de,
  el,
  es,
  fr,
  it,
  hu,
  nl,
  pl,
  pt,
  ro,
  fi,
  sv,
  'zh-Hant': zhHant,
};

type Path = string;

function getPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function createT(locale: Locale) {
  const tree = catalogs[locale] ?? en;
  return (key: Path, vars?: Record<string, string | number>): string => {
    const raw = getPath(tree, key) ?? getPath(en, key) ?? key;
    if (typeof raw !== 'string') return key;
    if (!vars) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
      vars[name] !== undefined ? String(vars[name]) : `{${name}}`
    );
  };
}

export type TFunction = ReturnType<typeof createT>;

export { en, zhHant, LOCALES, localeTag, normalizeLocale };
export type { Locale };
