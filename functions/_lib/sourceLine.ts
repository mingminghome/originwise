/**
 * Source lines look like "Title — https://url" (or just a URL / title).
 * Shared by the server (synthesize) and the client (cached results), so it
 * stays dependency-free.
 */

export type SourceParts = { title: string; url?: string };

const TITLE_MAX = 120;
const URL_MAX = 2000;

/**
 * Search-result / listing-search pages are not evidence for one product, so
 * they never show as a Source (kakaku search, Amazon /s?k=, Google search…).
 */
const SEARCH_PAGE_RES: RegExp[] = [
  /(^|\.)google\.[a-z.]+\/search\b/i,
  /(^|\.)bing\.com\/search\b/i,
  /(^|\.)search\.yahoo\./i,
  /(^|\.)duckduckgo\.com\/\?/i,
  /(^|\.)search\.brave\.com\//i,
  /(^|\.)kakaku\.com\/search_results\b/i,
  /(^|\.)kakaku\.com\/[^?#]*\?[^#]*\bquery=/i,
  /(^|\.)amazon\.[a-z.]+\/s(\/|\?|$)/i,
  /(^|\.)search\.rakuten\.co\.jp\//i,
  /(^|\.)shopping\.yahoo\.co\.jp\/search\b/i,
  /(^|\.)ebay\.[a-z.]+\/sch\//i,
  /(^|\.)shopee\.[a-z.]+\/search\b/i,
  /(^|\.)momoshop\.com\.tw\/search\//i,
  /(^|\.)pchome\.com\.tw\/search\b/i,
];

/** Drop a dangling percent-escape left by an earlier cut ("…%E3%8" → "…"). */
function trimBrokenEscape(url: string): string {
  let out = url.replace(/%[0-9A-Fa-f]?$/, '');
  // A cut inside a multi-byte character leaves a partial UTF-8 sequence.
  for (let i = 0; i < 4; i++) {
    try {
      decodeURI(out);
      return out;
    } catch {
      out = out.replace(/%[0-9A-Fa-f]{2}$/, '');
    }
  }
  return out;
}

/** True when the URL is a search-results page rather than a product page. */
export function isSearchResultUrl(url: string): boolean {
  const bare = url.replace(/^https?:\/\//i, '');
  if (SEARCH_PAGE_RES.some((re) => re.test(bare))) return true;
  try {
    const u = new URL(url);
    if (/\/search(results?|_results?)?\/?$/i.test(u.pathname) && u.search) return true;
  } catch {
    return false;
  }
  return false;
}

/** Split "Title — https://…" into parts; the URL is never cut mid-way. */
export function splitSourceLine(line: string): SourceParts {
  const raw = String(line ?? '').trim();
  const m = raw.match(/https?:\/\/\S+/);
  if (!m) return { title: raw.slice(0, TITLE_MAX) };
  const url = trimBrokenEscape(m[0].replace(/[)\]>.,;]+$/, ''));
  const title = raw
    .slice(0, m.index)
    .replace(/[\s—–-]+$/, '')
    .trim()
    .slice(0, TITLE_MAX);
  return { title, url };
}

function validUrl(url: string): boolean {
  if (url.length > URL_MAX) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Clean one source line: keep the URL whole, cap the title, drop search pages
 * and broken URLs. Returns '' when the line should not be shown.
 */
export function cleanSourceLine(line: string): string {
  const { title, url } = splitSourceLine(line);
  if (!url) return title;
  if (!validUrl(url)) return title;
  if (isSearchResultUrl(url)) return '';
  return title ? `${title} — ${url}` : url;
}

/** Clean, de-duplicate and cap a source list. */
export function cleanSources(lines: readonly unknown[], cap = 8): string[] {
  const out: string[] = [];
  const seenUrl = new Set<string>();
  for (const l of lines) {
    const c = cleanSourceLine(String(l ?? ''));
    if (!c) continue;
    const url = splitSourceLine(c).url;
    if (url) {
      if (seenUrl.has(url)) continue;
      seenUrl.add(url);
    } else if (out.includes(c)) continue;
    out.push(c);
    if (out.length >= cap) break;
  }
  return out;
}

/** Short visible label for a link: title, else host. */
export function sourceLabel(parts: SourceParts): string {
  if (parts.title) return parts.title;
  if (!parts.url) return '';
  try {
    return new URL(parts.url).hostname.replace(/^www\./, '');
  } catch {
    return parts.url;
  }
}
