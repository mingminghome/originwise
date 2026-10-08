/**
 * Result headline = what the user typed. Models sometimes re-spell the
 * product ("Cybex Mello" for a "Cybex Melio" query); the query is the one
 * thing we know is right. The model's product name stays visible as a
 * secondary "Identified as" line when it differs from the query.
 * Photo-only checks have no query → the model title.
 */
import type { CheckResult } from './types';

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s\-_/·.,()（）]+/g, '');
}

export function resultTitle(
  result: Pick<CheckResult, 'title' | 'product'>,
  query?: string | null
): { title: string; modelName?: string } {
  const q = String(query ?? '').trim();
  const model = String(result.product?.name || result.title || '').trim();
  if (!q) return { title: result.title };
  return {
    title: q.slice(0, 120),
    modelName: model && norm(model) !== norm(q) ? model.slice(0, 120) : undefined,
  };
}
