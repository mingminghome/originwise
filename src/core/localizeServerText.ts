/**
 * Show the server's fixed English note / caveat / summary lines in the
 * reader's language. Anything not recognised (model-written text, which is
 * already in the requested language) passes through unchanged.
 */
import {
  COO_CONFLICT_CHINA_RE,
  COO_CONFLICT_MADEIN_RE,
  SERVER_TEXT,
  SUMMARY_PREFIX,
  SUMMARY_SEP,
  type ServerTextKey,
} from '../../functions/_lib/serverText';
import { localeOfT, type TFunction } from './i18n';
import { zhDisplayText } from '../../functions/_lib/zhHant';
import { localizeCountry } from './i18n/countries';

/** Summary fields whose value is a country name. */
const COUNTRY_SUMMARY_KEYS = new Set(['madeIn', 'brandOrigin', 'hq']);

/** Older server wording still in cached results → today's key (and wording). */
const LEGACY_TEXT: Array<[string, ServerTextKey]> = [
  [
    'Final COO unconfirmed — no web page showed the barcode/JAN with a made-in; product-name matches are likely candidates only.',
    'cooUnconfirmedNoBarcode',
  ],
];

const BY_TEXT = new Map<string, ServerTextKey>([
  ...(Object.entries(SERVER_TEXT) as [ServerTextKey, string][]).map(([k, v]) => [v, k] as [string, ServerTextKey]),
  ...LEGACY_TEXT,
]);
/** Longest first so a sentence never matches inside a longer one. */
const SENTENCES = [...BY_TEXT.keys()].sort((a, b) => b.length - a.length);

function srv(t: TFunction, key: string, vars?: Record<string, string | number>): string {
  const full = `check.srv.${key}`;
  const out = t(full, vars);
  return out === full ? '' : out;
}

function labelled(t: TFunction, group: string, code: string): string {
  const key = `check.${group}.${code}`;
  const out = t(key);
  return out === key ? code : out;
}

/** "Japan (likely 55% · parts)" → localized rating + source. */
function localizeCandidate(t: TFunction, bit: string): string {
  const m = /^(.+) \((\w+) (\d+)% · (\w+)\)$/.exec(bit.trim());
  if (!m) return bit;
  const [, label, rating, pct, source] = m;
  return srv(t, 'candidate', {
    label: localizeCountry(t, label),
    rating: labelled(t, 'candidateRating', rating),
    pct,
    source: labelled(t, 'candidateSource', source),
  }) || bit;
}

function localizeSegment(t: TFunction, seg: string): string {
  const s = seg.trim();
  if (!s) return seg;
  const key = BY_TEXT.get(s);
  if (key) return srv(t, key) || seg;

  let m = COO_CONFLICT_CHINA_RE.exec(s);
  if (m) {
    return srv(t, 'cooConflictChina', {
      source: labelled(t, 'srv.signal', m[1]),
      label: m[2],
    }) || seg;
  }
  m = COO_CONFLICT_MADEIN_RE.exec(s);
  if (m) {
    return srv(t, 'cooConflictMadeIn', {
      source: labelled(t, 'srv.signal', m[1]),
      label: m[2],
      madeIn: m[3],
    }) || seg;
  }

  for (const [k, prefix] of Object.entries(SUMMARY_PREFIX)) {
    if (!s.startsWith(prefix)) continue;
    const rest = s.slice(prefix.length);
    // Placeholder values from older cached results ("Components/global line: unknown").
    if (VAGUE_VALUE_RE.test(rest.trim())) return '';
    const value =
      k === 'candidates'
        ? rest
            .split('; ')
            .map((b) => localizeCandidate(t, b))
            .join(srv(t, 'listSep') || '; ')
        : COUNTRY_SUMMARY_KEYS.has(k)
          ? localizeCountry(t, rest)
          : rest;
    return srv(t, `sum.${k}`, { value }) || seg;
  }

  // Server sentence glued to model text (e.g. a part note + " — " + reason).
  // Model text: zh-Hant clean-up (Simplified slips, 未知 → 未確認) first.
  let out = localeOfT(t) === 'zh-Hant' ? zhDisplayText(s) : s;
  for (const sentence of SENTENCES) {
    if (out.includes(sentence)) {
      const tr = srv(t, BY_TEXT.get(sentence)!);
      if (tr) out = out.split(sentence).join(tr);
    }
  }
  return out === s ? seg : out;
}

const VAGUE_VALUE_RE = /^(unknown|n\/?a|none|null|unclear|未知|不明|不詳)$/i;

export function localizeServerText(t: TFunction, text: string | undefined | null): string {
  if (!text) return '';
  return splitTopLevel(text)
    .map((seg) => localizeSegment(t, seg))
    .filter(Boolean)
    .join(SUMMARY_SEP);
}

/** Split on " · " outside parentheses (candidate bits carry their own " · "). */
export function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(' || ch === '（') depth++;
    else if ((ch === ')' || ch === '）') && depth > 0) depth--;
    else if (depth === 0 && text.startsWith(SUMMARY_SEP, i)) {
      out.push(text.slice(start, i));
      start = i + SUMMARY_SEP.length;
      i += SUMMARY_SEP.length - 1;
    }
  }
  out.push(text.slice(start));
  return out;
}
