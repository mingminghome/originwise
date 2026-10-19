/**
 * A country field is shown as the check wrote it. The reader's language
 * comes from the surrounding sentence, not from a country-name table.
 */
import type { TFunction } from './index';

export function localizeCountry(_t: TFunction, value: string | undefined | null): string {
  return String(value ?? '').trim();
}
