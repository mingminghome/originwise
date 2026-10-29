/**
 * Origin-field words for one web search.
 *
 * The model reads the query and returns the shop words for that writing.
 * English written in Latin skips the call. Any other writing asks once.
 * A failed call uses the English shop words. There is no per-language list.
 */

import { extractJsonObject } from '../jsonExtract';
import { callProvider } from '../llm';
import { langLabel } from '../locale';
import type { SearchEnv } from './types';

export const FALLBACK_ORIGIN_TERMS = ['"made in"', '"country of origin"'] as const;
const FALLBACK_FACTORY_TERMS = ['factory', 'OEM'] as const;

export type OriginTerms = { madeIn: readonly string[]; factory: readonly string[] };

const CACHE = new Map<string, OriginTerms>();

/** Same writing shares one answer. The key is the query text, not a language name. */
export function languageKey(text: string, locale: string): string {
  const sample = text.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 40);
  const mark = sample.replace(/[a-z0-9\s.,+\-]/gi, '').slice(0, 16);
  return `${locale || 'en'}:${mark || 'latin'}`;
}

function englishQuery(text: string, locale: string): boolean {
  return (locale || 'en') === 'en' && languageKey(text, locale).endsWith(':latin');
}

function fallbackTerms(): OriginTerms {
  return { madeIn: FALLBACK_ORIGIN_TERMS, factory: FALLBACK_FACTORY_TERMS };
}

function keepTerm(text: string, term: string): boolean {
  if (!/[\u3040-\u30ff]/.test(text)) return true;
  return /[\u3040-\u30ff\u4e00-\u9fff]/.test(term);
}

function cleanTerms(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const s = String(item ?? '')
      .replace(/[+"()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (s.length < 2 || s.length > 32) continue;
    out.push(s);
    if (out.length >= 4) break;
  }
  return out;
}

export async function originSearchTerms(
  text: string,
  locale: string,
  env: SearchEnv
): Promise<OriginTerms> {
  const key = languageKey(text, locale);
  const hit = CACHE.get(key);
  if (hit) return hit;
  if (englishQuery(text, locale) || !env.GEMINI_API_KEY?.trim()) return fallbackTerms();
  try {
    const sample = text.replace(/\s+/g, ' ').trim().slice(0, 120);
    const raw = await Promise.race([
      callProvider(
        'gemini',
        `Return JSON only: {"terms":["..."],"factory":["..."]}
terms: 2 to 4 short shop words for the made-in field of a product.
factory: 2 to 3 short shop words for a factory, plant, or OEM / contract manufacturer.
Use the language of the product query. The reader's language is ${langLabel(locale)}.
No country names. No design, brand, or headquarters words.
Query: ${JSON.stringify(sample)}`,
        env
      ),
      new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('origin_terms_timeout')), 4000);
      }),
    ]);
    const parsed = extractJsonObject(raw);
    const terms = cleanTerms(parsed?.terms).filter((t) => keepTerm(text, t));
    const factory = cleanTerms(parsed?.factory).filter((t) => keepTerm(text, t));
    const madeIn = terms.length ? terms : fallbackTerms().madeIn;
    const plants = factory.length ? factory : fallbackTerms().factory;
    const split = { madeIn, factory: plants };
    CACHE.set(key, split);
    return split;
  } catch {
    /* the writing's own origin words still search */
  }
  return fallbackTerms();
}
