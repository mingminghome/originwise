/**
 * Fetch pages for a product check. The tidy step reads the page text.
 * This file does not name a country.
 */

import { isSearchResultUrl } from '../sourceLine';
import { FALLBACK_ORIGIN_TERMS } from './originTerms';
import type { FetchedPage, SearchEnv, SearchOutput } from './types';

export const MAX_RESULT_PAGES = 4;
export const PAGE_FETCH_MS = 6000;
const PAGE_TEXT_MAX = 100_000;
export const MAX_MERGED_PAGES = MAX_RESULT_PAGES * 2;

/* ---------- Normalization & Barcode Helpers ---------- */

function nfkc(s: string): string {
  return (s || '').normalize('NFKC');
}

/** Checksum validator for GTIN-8, GTIN-12 (UPC-A), GTIN-13 (EAN/JAN), and GTIN-14. */
export function isValidGtin(digits: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(digits)) return false;
  const chars = digits.split('').map(Number);
  const check = chars.pop()!;
  let sum = 0;
  let mult = 3;
  for (let i = chars.length - 1; i >= 0; i--) {
    sum += chars[i]! * mult;
    mult = mult === 3 ? 1 : 3;
  }
  const calc = (10 - (sum % 10)) % 10;
  return calc === check;
}

export function findJans(...texts: Array<string | undefined>): string[] {
  const out = new Set<string>();
  for (const t of texts) {
    if (!t) continue;
    for (const m of nfkc(t).matchAll(/(?<!\d)(\d{8}|\d{12,14})(?!\d)/g)) {
      if (isValidGtin(m[1]!)) out.add(m[1]!);
    }
  }
  return [...out];
}

/**
 * Tokens that identify this unit. When the query mixes a script with Latin,
 * the leading Latin brand and later category words are not required, so a
 * retailer page that writes the brand in another script still matches. The
 * size token stays, so 160ml does not match 240ml.
 */
export function identityTokens(entity: string): string[] {
  const words =
    nfkc(entity || '')
      .toLowerCase()
      .replace(/[™®©℠]/g, ' ')
      .match(/[\u3040-\u30ff\u4e00-\u9fff]+|[a-z0-9]+/g) ?? [];
  const tokens = words.filter((w) => {
    if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(w)) return [...w].length >= 2;
    // A one-digit size ("Peach 8") still identifies the unit.
    if (/^\d+$/.test(w)) return true;
    return w.length >= 2;
  });
  const cjk = tokens.filter((t) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(t));
  const latin = tokens.filter((t) => !/[\u3040-\u30ff\u4e00-\u9fff]/.test(t));
  const drop = new Set<string>();
  if (cjk.length > 1) for (const t of cjk.slice(1)) drop.add(t);
  // The brand is the first word only when it is Latin and a model token follows.
  if (cjk.length > 0 && latin.length > 1 && tokens[0] === latin[0]) drop.add(latin[0]!);
  const kept = tokens.filter((t) => !drop.has(t));
  return kept.length ? kept : tokens;
}

/* ---------- Search Query Builders ---------- */

function quoteTerm(term: string): string {
  const s = term.replace(/["+()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  return s.includes(' ') ? `"${s}"` : s;
}

/**
 * Model and size tokens with +, origin words joined by OR, no quotes around
 * the whole name, and no "+(a OR b)" (that form returns no pages). `broad`
 * drops the + so the follow-up is a wider query with the same words.
 */
function withOperators(
  entity: string,
  terms: readonly string[],
  jan?: string,
  broad = false
): string {
  const toks = identityTokens(entity).map((t) => (broad || /\s/.test(t) ? t : `+${t}`));
  const origin = (terms.length ? terms : FALLBACK_ORIGIN_TERMS).map(quoteTerm).filter(Boolean).join(' OR ');
  const bits = [toks.join(' '), jan ?? '', origin, '-youtube.com'].filter(Boolean);
  return bits.join(' ').replace(/\s+/g, ' ').trim();
}

export function buildSearchQuery(
  entity: string,
  jans: string[],
  terms: readonly string[] = FALLBACK_ORIGIN_TERMS
): string {
  return withOperators(entity, terms, jans[0]);
}

export function buildMadeInQuery(
  entity: string,
  terms: readonly string[] = FALLBACK_ORIGIN_TERMS
): string {
  return withOperators(entity, terms, undefined, true);
}

/** The company name, so a factory search is not locked to one size. */
export function brandToken(entity: string): string {
  const words =
    nfkc(entity).match(/[A-Za-z][A-Za-z0-9]{1,}|[\u3040-\u30ff\u4e00-\u9fff]{2,}/g) ?? [];
  // "Le Creuset" must search Creuset. A two-letter word matches unrelated sites.
  const latin = words.find((w) => /^[A-Za-z]/.test(w) && w.length >= 3);
  if (latin) return latin;
  return words.find((w) => w.length >= 2) ?? '';
}

/** A user-review host or path. It is not a product-page made-in. */
function isReviewPage(url: string): boolean {
  let host = '';
  let path = '';
  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase();
    path = u.pathname.toLowerCase();
  } catch {
    return false;
  }
  const reviewLabel = (s: string) => s === 'review' || s === 'reviews' || s.endsWith('review') || s.endsWith('reviews');
  if (host.split('.').some(reviewLabel)) return true;
  return path.split('/').filter(Boolean).some(reviewLabel);
}

/**
 * Factory and OEM search. The brand is required. The size is not, because a
 * plant page names the company and not this unit. Origin words stay out.
 */
export function buildFactoryQuery(entity: string, terms: readonly string[]): string {
  const brand = brandToken(entity);
  const line = identityTokens(entity).find((t) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(t)) ?? '';
  const plants = terms.map(quoteTerm).filter(Boolean).join(' OR ');
  return [brand, line, plants, '-youtube.com'].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * A page is about this unit when it contains the size and the model words.
 * A query written with kana must contain those Japanese model words, so an
 * English listing of another line does not count. Any other query accepts
 * the Latin model words when the page has none of the query's script.
 * A brand-only listing does not count.
 */
export function pageMentionsUnit(entity: string, page: string): boolean {
  const tokens = identityTokens(entity);
  if (tokens.length < 2) return true;
  const flat = nfkc(page).toLowerCase().replace(/\s+/g, '');
  const raw = nfkc(page).toLowerCase();
  const has = (t: string) => {
    // "8" matches Peach 8, not 18 or 80.
    if (/^\d+$/.test(t)) return new RegExp(`(?:^|\\D)${t}(?:\\D|$)`).test(raw);
    return flat.includes(t.toLowerCase());
  };
  const sizes = tokens.filter((t) => /\d/.test(t));
  if (sizes.some((t) => !has(t))) return false;
  const cjk = tokens.filter((t) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(t));
  const latin = tokens.filter((t) => !cjk.includes(t) && !sizes.includes(t));
  const japanQuery = /[\u3040-\u30ff]/.test(entity);
  if (japanQuery && cjk.length) return cjk.every(has);
  const pageCjk = /[\u3040-\u30ff\u4e00-\u9fff]/.test(page);
  if (pageCjk && cjk.length) return cjk.every(has);
  if (latin.length) return latin.every(has);
  return cjk.length ? cjk.every(has) : true;
}

/** Pages that are this unit, in this market. Other shops do not count as evidence. */
export function keepUnitPages<T extends { url: string; finalUrl?: string; title?: string; text: string }>(
  entity: string,
  pages: readonly T[]
): T[] {
  return pages.filter((p) => {
    if (!p.url || isSearchResultUrl(p.url)) return false;
    if (isReviewPage(p.finalUrl || p.url)) return false;
    if (pageOutsideMarket(p.finalUrl || p.url, entity)) return false;
    return pageMentionsUnit(entity, `${p.title ?? ''}\n${p.text}`);
  });
}

/**
 * A factory page names the brand and one of the factory words just searched.
 * It does not have to name this size. It is not a made-in source.
 */
export function keepFactoryPages<T extends { url: string; finalUrl?: string; title?: string; text: string }>(
  entity: string,
  pages: readonly T[],
  terms: readonly string[]
): T[] {
  const brand = brandToken(entity).toLowerCase();
  if (!brand) return [];
  const cues = terms
    .map((t) => nfkc(t).toLowerCase().replace(/["']/g, '').trim())
    .filter((t) => t.length >= 2);
  const line = identityTokens(entity).find((t) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(t));
  const out: T[] = [];
  for (const p of pages) {
    if (!p.url || isSearchResultUrl(p.url)) continue;
    const url = p.finalUrl || p.url;
    if (isReviewPage(url)) continue;
    if (pageOutsideMarket(url, entity)) continue;
    const blob = nfkc(`${url}\n${p.title ?? ''}\n${p.text}`).toLowerCase();
    if (!blob.includes(brand)) continue;
    if (cues.length && !cues.some((c) => blob.includes(c))) continue;
    if (line && !blob.includes(line.toLowerCase())) continue;
    out.push(p);
    if (out.length >= 2) break;
  }
  return out;
}

/**
 * A Japan-market query keeps .jp and global hosts (.com, .net, .org).
 * Any other country-code ending is another market's shop.
 */
export function pageOutsideMarket(url: string, entity: string): boolean {
  if (!/[\u3040-\u30ff]/.test(entity) || !url) return false;
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  const last = host.split('.').pop() ?? '';
  if (last === 'jp' || last === 'com' || last === 'net' || last === 'org') return false;
  return last.length === 2;
}

function pageKey(url: string): string {
  return url.replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
}

export function mergePages(
  first: FetchedPage[],
  extra: FetchedPage[],
  cap = MAX_MERGED_PAGES
): FetchedPage[] {
  const seen = new Set<string>();
  const out: FetchedPage[] = [];
  for (const p of [...first, ...extra]) {
    if (!p.url) continue;
    const k = pageKey(p.url);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
    if (out.length >= cap) break;
  }
  return out;
}

/* ---------- Network & Page Parsing Helpers ---------- */

const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
};

const CHROME_TAGS = ['header', 'nav', 'footer'] as const;

/** Header, nav, and footer. A folded product tab is not one of these. */
function dropSiteChrome(html: string): string {
  let out = html;
  for (const tag of CHROME_TAGS) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, 'gi');
    let prev = '';
    while (out !== prev) {
      prev = out;
      out = out.replace(re, ' ');
    }
  }
  return dropRoleChrome(out);
}

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
]);

/** role="navigation" on a div is the same chrome as a nav tag. */
function dropRoleChrome(html: string): string {
  const parts: string[] = [];
  let i = 0;
  let copyFrom = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) break;
    const gt = html.indexOf('>', lt);
    if (gt < 0) break;
    const raw = html.slice(lt, gt + 1);
    const name = /^<\s*([a-zA-Z][\w:-]*)/.exec(raw)?.[1]?.toLowerCase();
    const role = /\brole\s*=\s*["'](banner|navigation|contentinfo)["']/i.exec(raw)?.[1];
    const selfClose = /\/>\s*$/.test(raw) || (name ? VOID_TAGS.has(name) : false);
    if (!name || !role || selfClose) {
      i = gt + 1;
      continue;
    }
    const end = endOfElement(html, name, gt + 1);
    parts.push(html.slice(copyFrom, lt), ' ');
    i = end;
    copyFrom = end;
  }
  parts.push(html.slice(copyFrom));
  return parts.join('');
}

function endOfElement(html: string, name: string, from: number): number {
  const open = new RegExp(`<${name}\\b`, 'gi');
  const close = new RegExp(`</${name}\\s*>`, 'gi');
  let depth = 1;
  let i = from;
  while (depth > 0 && i < html.length) {
    open.lastIndex = i;
    close.lastIndex = i;
    const o = open.exec(html);
    const c = close.exec(html);
    if (!c) return html.length;
    if (o && o.index < c.index) {
      depth += 1;
      i = o.index + o[0].length;
    } else {
      depth -= 1;
      i = c.index + c[0].length;
    }
  }
  return i;
}

export function stripHtml(html: string): string {
  const withoutChrome = dropSiteChrome(
    (html || '')
      .slice(0, 1_500_000)
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi, ' ')
  );
  return withoutChrome
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|dt|dd|th|td)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+|#39);/gi, (m, ent: string) => {
      const e = ent.toLowerCase();
      if (e.startsWith('#x')) {
        const n = parseInt(e.slice(2), 16);
        return Number.isFinite(n) ? String.fromCodePoint(n) : ' ';
      }
      if (e.startsWith('#') && e !== '#39') {
        const n = parseInt(e.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : ' ';
      }
      return ENTITY_MAP[e] ?? m;
    })
    .replace(/[ \t\f\v\r]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
    .slice(0, PAGE_TEXT_MAX);
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number
): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSourcePage(
  url: string,
  rawTitle = '',
  rawSnippet = '',
  opts: {
    ms?: number;
    allowHop?: (url: string) => boolean;
    maxRedirects?: number;
    totalMs?: number;
  } = {}
): Promise<FetchedPage> {
  const title = stripHtml(rawTitle);
  const snippet = stripHtml(rawSnippet);
  const ms = opts.ms ?? PAGE_FETCH_MS;
  const headers = {
    Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8',
    'User-Agent': 'OriginWise/1.0 (+https://originwise.pages.dev)',
  };
  let res: Response | null = null;
  let deadline = Infinity;
  if (opts.allowHop) {
    let at = url;
    const max = opts.maxRedirects ?? 3;
    deadline = Date.now() + (opts.totalMs ?? ms * (max + 1));
    for (let hop = 0; ; hop++) {
      const left = deadline - Date.now();
      if (!opts.allowHop(at) || left <= 0) {
        res = null;
        break;
      }
      res = await fetchWithTimeout(at, { headers, redirect: 'manual' }, Math.min(ms, left));
      const loc = res && res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
      if (!loc) break;
      if (hop >= max) {
        res = null;
        break;
      }
      try {
        at = new URL(loc, at).toString();
      } catch {
        res = null;
        break;
      }
    }
    if (res && res.ok && at !== url) {
      Object.defineProperty(res, 'url', { value: at });
    }
  } else {
    res = await fetchWithTimeout(url, { headers, redirect: 'follow' }, ms);
  }
  if (res && res.url && isSearchResultUrl(res.url)) {
    return { url, title, text: '' };
  }
  let body = '';
  if (res && res.ok) {
    const ct = res.headers.get('content-type') || '';
    if (!ct || /text\/html|text\/plain|xhtml/i.test(ct)) {
      try {
        const left = deadline - Date.now();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const raw = Number.isFinite(left)
          ? await Promise.race([
              res.text(),
              new Promise<string>((_, reject) => {
                timer = setTimeout(() => reject(new Error('budget')), Math.max(0, left));
              }),
            ]).finally(() => clearTimeout(timer))
          : await res.text();
        const isHtml = /html/i.test(ct) || /<html|<body|<div/i.test(raw.slice(0, 2000));
        body = isHtml ? stripHtml(raw) : raw.slice(0, 200_000);
      } catch {
        body = '';
      }
    }
  }
  const text = [title, snippet, body].filter(Boolean).join('\n');
  return {
    url,
    finalUrl: res?.url && res.url !== url ? res.url : undefined,
    title,
    text,
  };
}

export function parseSourceLine(line: string): { url: string; title: string } | null {
  const m = String(line || '').match(/https?:\/\/\S+/);
  if (!m) return null;
  const url = m[0].replace(/[)\]>,.]+$/, '');
  const title = line.slice(0, m.index).replace(/\s*[—-]\s*$/, '').trim();
  return { url, title };
}

export function productSourceLines(entity: string, _ocrText: string | undefined, pages: FetchedPage[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of pages) {
    if (!p.url || isSearchResultUrl(p.url) || seen.has(p.url)) continue;
    seen.add(p.url);
    const title = p.title || entity;
    out.push(`${title} — ${p.url}`);
  }
  return out;
}

export function mapSearchHttpError(status: number, body: string): string {
  const msg = (body || '').toLowerCase();
  if (
    status === 429 ||
    status === 402 ||
    /quota|rate limit|insufficient credits|payment required|usage limit/.test(msg)
  ) {
    return 'upstream_quota';
  }
  if (status === 408 || status === 503 || status === 504 || status >= 500) {
    return 'upstream_unavailable';
  }
  return 'upstream_error';
}

const PROVIDER_LABEL: Record<string, string> = {
  brave: 'Brave Search',
  firecrawl: 'Firecrawl',
};

/** Pack fetched page text. The tidy step, not this function, reads a country. */
export async function extractBriefFromPages(opts: {
  providerId: 'brave' | 'firecrawl';
  entity: string;
  ocrText?: string;
  pages: FetchedPage[];
  /** Plant or OEM pages. Kept beside the product pages, not as made-in. */
  factoryPages?: FetchedPage[];
  env: SearchEnv;
  requests: number;
  t0: number;
}): Promise<SearchOutput> {
  const pages = opts.pages.filter((p) => p.url && p.text.trim() && !isSearchResultUrl(p.url));
  const factoryPages = (opts.factoryPages ?? []).filter(
    (p) => p.url && p.text.trim() && !isSearchResultUrl(p.url)
  );
  const sources = productSourceLines(opts.entity, opts.ocrText, [...pages, ...factoryPages]);
  if (!pages.length && !factoryPages.length) {
    return {
      ok: false,
      brief: '',
      sources: [],
      error: 'empty_response',
      ms: Date.now() - opts.t0,
      requests: opts.requests,
    };
  }
  const label = PROVIDER_LABEL[opts.providerId] ?? opts.providerId;
  const body = pages
    .slice(0, MAX_RESULT_PAGES)
    .map((p, i) => `[${i + 1}] ${p.title || opts.entity}\n${p.url}\n${p.text.slice(0, 2500)}`)
    .join('\n\n');
  const plantBody = factoryPages
    .map((p, i) => `[F${i + 1}] ${p.title || opts.entity}\n${p.url}\n${p.text.slice(0, 1500)}`)
    .join('\n\n');
  return {
    ok: true,
    brief: `Web search via ${label}.\n\n${body}${plantBody ? `\n\nFACTORY\n${plantBody}` : ''}`.slice(0, 12000),
    sources,
    ms: Date.now() - opts.t0,
    requests: opts.requests,
    evidence: {
      pages: pages.map((p) => ({
        url: p.url,
        ...(p.finalUrl ? { finalUrl: p.finalUrl } : {}),
        title: p.title,
        text: p.text.slice(0, 40_000),
      })),
      factoryPages: factoryPages.map((p) => ({
        url: p.url,
        ...(p.finalUrl ? { finalUrl: p.finalUrl } : {}),
        title: p.title,
        text: p.text.slice(0, 40_000),
      })),
      droppedUrls: [],
    },
  };
}
