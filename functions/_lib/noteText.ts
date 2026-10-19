/**
 * Fixed English lines older results still carry. The card drops the ones
 * that only ask for a package. Anything else is shown as stored.
 */
import { SERVER_TEXT } from './serverText';

const USELESS_COO_NOTES = [
  SERVER_TEXT.cooUnconfirmedSeeParts,
  SERVER_TEXT.cooUnconfirmedNoLabel,
  SERVER_TEXT.cooUnconfirmedNoBarcode,
  SERVER_TEXT.cooUnconfirmedCandidates,
  SERVER_TEXT.madeInOmittedBrand,
];

export function isUselessCooNote(note: string): boolean {
  const s = note.trim();
  if (!s) return true;
  return USELESS_COO_NOTES.some((line) => s === line || s.includes(line));
}

const OMITTED: readonly string[] = [SERVER_TEXT.partOmittedNoEvidence, SERVER_TEXT.partOmittedUnconfirmed];

/** When a part note already contains the omission line, that line is the note. */
export function cleanOmittedPartNote(note: string): string {
  return OMITTED.find((s) => note.includes(s)) ?? note;
}
