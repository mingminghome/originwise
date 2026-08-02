import type { Locale } from '../types';
import { en, type MessageTree } from './en';
import { zhHant } from './zh-Hant';

const catalogs: Record<Locale, MessageTree> = {
  en,
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

export function localeTag(locale: Locale): string {
  return locale === 'zh-Hant' ? 'zh-Hant' : 'en';
}

export { en, zhHant };
