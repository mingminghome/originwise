/**
 * Model-note helpers shared by the server (synthesize) and the UI (cards),
 * so cached results get the same treatment as new ones. Client-safe: only
 * the country tables and the fixed server sentences.
 */
import { COUNTRY_NAME_PATTERNS, canonicalCountry } from './countryLabel';
import { SERVER_TEXT } from './serverText';

/** Clauses: a country and a made-in word only count together in one clause. */
const CLAUSE_SPLIT = /[，。；;！？!?\n]|,\s|\.\s/;

/** Words that make a clause about where something is made (not HQ / design). */
const MADE_CUE =
  /製造|制造|生產|生产|產地|产地|組裝|组装|組立|工廠|工厂|工場|製|made\s*in|manufactur|assembl|produced|production|factory/i;

function clauseNames(clause: string, label: string): boolean {
  const canon = canonicalCountry(label) ?? label;
  const row = COUNTRY_NAME_PATTERNS.find((r) => r.label === canon);
  return row ? row.pattern.test(clause) : clause.toLowerCase().includes(label.trim().toLowerCase());
}

/**
 * A note ties this country to where the product (or a part) is made, in the
 * same clause: 「實體產品之最終製造與組裝地為中國大陸」 yes;
 * 「品牌設計及總部設於日本」 / 「TP-Link 品牌總部設於中國」 no.
 */
export function notesNameMadeIn(notes: readonly unknown[] | undefined, label: string): boolean {
  return (notes ?? []).some((n) =>
    String(n ?? '')
      .split(CLAUSE_SPLIT)
      .some((c) => clauseNames(c, label) && MADE_CUE.test(c))
  );
}

/** Any country name (or "made in") in the text. */
export function textNamesCountry(text: string): boolean {
  return /made\s*in/i.test(text) || COUNTRY_NAME_PATTERNS.some((r) => r.pattern.test(text));
}

const OMITTED: readonly string[] = [SERVER_TEXT.partOmittedNoEvidence, SERVER_TEXT.partOmittedUnconfirmed];
const NOTE_SEP = ' — ';

/**
 * Part note after the server dropped the part's country. The model's own
 * note usually justifies the dropped country (「零售商標示中國製」); keeping
 * it next to 「未列出零件產地」 contradicts itself, so it is replaced. A note
 * with no country (material, process) is kept.
 */
export function omittedPartNote(note: string | undefined, why: string): string {
  const n = note?.trim();
  if (!n || textNamesCountry(n)) return why;
  return `${n}${NOTE_SEP}${why}`;
}

/** Same rule on an already-joined note (older cached results). */
export function cleanOmittedPartNote(note: string): string {
  const why = OMITTED.find((s) => note.includes(s));
  if (!why) return note;
  const rest = note
    .split(NOTE_SEP)
    .filter((seg) => !OMITTED.includes(seg.trim()))
    .join(NOTE_SEP)
    .trim();
  return omittedPartNote(rest, why);
}
