/**
 * Is a URL a page about one product, or a site entrance (r23)? Shared by the
 * AI-cited check and the search-page gate, so both read a homepage the same
 * way: a made-in line on a homepage, a listing root or a search page is never
 * exact-model evidence, whatever the page text says.
 */
import { isSearchResultUrl } from './sourceLine';

/** Parameters that never pick a page: tracking, language, currency, region. */
const NEUTRAL_PARAM =
  /^(utm_\w+|ref|ref_|fbclid|gclid|yclid|mc_\w+|spm|_ga|srsltid|lang|language|locale|hl|lc|setlang|currency|cur|setcurrency|country|region|market)$/i;

/** Site-search parameters ("/?s=melio", "/?q=melio"). */
const SEARCH_PARAM = /^(s|q|query|search|keyword|keywords|k|text)$/i;

/** ISO 639-1 language codes. */
const ISO_639_1 = new Set(
  (
    'aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ' +
    'ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik ' +
    'io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml ' +
    'mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd ' +
    'se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi ' +
    'vo wa wo xh yi yo za zh zu'
  ).split(' ')
);

/** ISO 3166-1 alpha-2 regions (plus uk, eu as sites use them): /en/us/, /us/en/. */
const REGIONS = new Set(
  (
    'ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bl bm bn bo bq br bs bt ' +
    'bv bw by bz ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj dk dm do dz ec ee eg eh ' +
    'er es et fi fj fk fm fo fr ga gb gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht ' +
    'hu id ie il im in io iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls ' +
    'lt lu lv ly ma mc md me mf mg mh mk ml mm mn mo mp mq mr ms mt mu mv mw mx my mz na nc ne nf ng ni ' +
    'nl no np nr nu nz om pa pe pf pg ph pk pl pm pn pr ps pt pw py qa re ro rs ru rw sa sb sc sd se sg ' +
    'sh si sj sk sl sm sn so sr ss st sv sx sy sz tc td tf tg th tj tk tl tm tn to tr tt tv tw tz ua ug ' +
    'um us uy uz va vc ve vg vi vn vu wf ws ye yt za zm zw uk eu'
  ).split(' ')
);

/**
 * Bare two-letter ISO codes that are far more often a path word than a site
 * locale (/ps = PlayStation, /my = my account, /to, /so, /am …). Still a
 * locale with a region or script (ps-af, my-mm).
 */
const BARE_NOT_LOCALE = new Set(['am', 'an', 'as', 'be', 'ia', 'ie', 'io', 'na', 'or', 'ps', 'so', 'to', 'vo']);

/** Region codes that are far more often a page word than a market root (/tv, /ps, /go …). */
const REGION_PAGE_WORDS = new Set(['tv', 'ps', 'go', 'io', 'ai', 'me']);

/** A market segment on its own: /us/, /jp/, /hk/, /my/ (a region, not a page word). */
function marketSeg(seg: string | undefined): boolean {
  return seg !== undefined && REGIONS.has(seg) && !REGION_PAGE_WORDS.has(seg);
}

/**
 * Locale segment: an ISO 639-1 language, optionally with a script and / or a
 * region (en, ja, zh-tw, zh_TW, zh-hant, zh-hant-tw, en-gb, es-419). Any other
 * one- or two-letter path (/tv, /go, /ip-650) is a page.
 */
function localeSeg(seg: string): boolean {
  const m = /^([a-z]{2})(?:[-_]([a-z]{4}))?(?:[-_]([a-z]{2}|\d{3}))?$/i.exec(seg);
  if (!m) return false;
  const lang = m[1]!.toLowerCase();
  if (!ISO_639_1.has(lang)) return false;
  return Boolean(m[2] || m[3]) || !BARE_NOT_LOCALE.has(lang);
}

/** Index / home file names: index.html, index.php, default.aspx, home, home.html. */
const INDEX_SEG = /^(?:index|default|home)(?:\.(?:html?|php|aspx?|jsp|cfm))?$/i;

/** Shop listing roots with nothing after them (Shopify and common carts). */
const LISTING_ROOTS = new Set(['collections', 'collections/all', 'products', 'product', 'shop', 'store', 'catalog', 'all']);

/** Site-search paths with or without a query. */
const SEARCH_PATHS = new Set(['search', 'catalogsearch/result', 'search/result', 'search/results', 'searchresults']);

/**
 * True when the URL cannot be the page for one product: a site root (also
 * with only locale / index segments, a #route, or only tracking / locale /
 * currency parameters), a shop listing root, or a search page. A root with a
 * real page parameter (WordPress ?p=123, OpenCart index.php?route=…) is a page.
 * Category pages with a slug (/collections/strollers) are not caught here.
 */
export function notProductPageUrl(raw: string | undefined | null): boolean {
  const s = String(raw ?? '').trim();
  if (!s) return false;
  if (isSearchResultUrl(s)) return true;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  let segs: string[];
  try {
    segs = u.pathname
      .split('/')
      .filter(Boolean)
      .map((x) => decodeURIComponent(x).toLowerCase());
  } catch {
    return false;
  }
  // Leading locale segments: /zh-tw/, /zh-tw/en/, a language with a separate
  // region segment either way round (/en/us/, /us/en/), or a market alone (/us/).
  const region = (x: string | undefined) => x !== undefined && (REGIONS.has(x) || /^\d{3}$/.test(x));
  for (;;) {
    if (segs.length >= 2 && localeSeg(segs[0]!) && region(segs[1])) segs.splice(0, 2);
    else if (segs.length >= 2 && region(segs[0]) && localeSeg(segs[1]!)) segs.splice(0, 2);
    else if (segs.length && localeSeg(segs[0]!)) segs.shift();
    else if (marketSeg(segs[0])) segs.shift();
    else break;
  }
  if (segs.length && INDEX_SEG.test(segs[segs.length - 1]!)) segs.pop();
  const rest = segs.join('/');
  const keys = [...u.searchParams.keys()];
  const neutral = keys.every((k) => NEUTRAL_PARAM.test(k));
  if (SEARCH_PATHS.has(rest)) return true;
  if (!rest) {
    if (keys.some((k) => SEARCH_PARAM.test(k))) return true;
    return neutral;
  }
  return LISTING_ROOTS.has(rest) && neutral;
}

/** Gemini grounding Sources link (a redirect to the real page). */
export function isGroundingRedirect(raw: string | undefined | null): boolean {
  try {
    const u = new URL(String(raw ?? ''));
    return u.hostname === 'vertexaisearch.cloud.google.com' && u.pathname.startsWith('/grounding-api-redirect/');
  } catch {
    return false;
  }
}
