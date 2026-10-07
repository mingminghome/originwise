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
import type { TFunction } from './i18n';

const BY_TEXT = new Map<string, ServerTextKey>(
  (Object.entries(SERVER_TEXT) as [ServerTextKey, string][]).map(([k, v]) => [v, k])
);
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
    label,
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
    const value =
      k === 'candidates'
        ? rest
            .split('; ')
            .map((b) => localizeCandidate(t, b))
            .join(srv(t, 'listSep') || '; ')
        : rest;
    return srv(t, `sum.${k}`, { value }) || seg;
  }

  // Server sentence glued to model text (e.g. a part note + " — " + reason).
  let out = s;
  for (const sentence of SENTENCES) {
    if (out.includes(sentence)) {
      const tr = srv(t, BY_TEXT.get(sentence)!);
      if (tr) out = out.split(sentence).join(tr);
    }
  }
  return out === s ? seg : out;
}

export function localizeServerText(t: TFunction, text: string | undefined | null): string {
  if (!text) return '';
  return splitTopLevel(text)
    .map((seg) => localizeSegment(t, seg))
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
