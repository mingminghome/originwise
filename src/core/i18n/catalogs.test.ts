/**
 * Catalog key parity + locale registry sync.
 * Run: npm test
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SUPPORTED_LOCALES } from '../../../functions/_lib/locale';
import { catalogs } from './index';
import { LOCALES, type Locale, parseLocale } from './locales';
import { en, type MessageTree } from './en';

function collectKeys(tree: MessageTree, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') keys.push(path);
    else keys.push(...collectKeys(v, path));
  }
  return keys.sort();
}

describe('i18n catalogs', () => {
  const enKeys = collectKeys(en);

  it('registers every locale in LOCALES', () => {
    const ids = LOCALES.map((l) => l.id).sort();
    const catalogIds = Object.keys(catalogs).sort();
    assert.deepEqual(catalogIds, ids);
  });

  it('keeps server locale IDs in sync with the UI registry', () => {
    assert.deepEqual([...SUPPORTED_LOCALES].sort(), LOCALES.map((l) => l.id).sort());
  });

  it('has the same message keys as English in every locale', () => {
    for (const loc of LOCALES) {
      const missing = enKeys.filter(
        (k) => !collectKeys(catalogs[loc.id]).includes(k)
      );
      const extra = collectKeys(catalogs[loc.id]).filter(
        (k) => !enKeys.includes(k)
      );
      assert.deepEqual(
        { missing, extra },
        { missing: [], extra: [] },
        loc.id
      );
    }
  });

  it('parses BCP-47 tags to supported locales', () => {
    assert.equal(parseLocale('de-AT'), 'de');
    assert.equal(parseLocale('fr-BE'), 'fr');
    assert.equal(parseLocale('zh-TW'), 'zh-Hant');
    assert.equal(parseLocale('pt-BR'), 'pt');
    assert.equal(parseLocale('el-GR'), 'el');
    assert.equal(parseLocale('ja-JP'), undefined);
    assert.equal(parseLocale('en'), 'en');
  });

  it('exports a typed catalog for each Locale', () => {
    const _check: Record<Locale, MessageTree> = catalogs;
    assert.ok(_check.en);
  });
});
