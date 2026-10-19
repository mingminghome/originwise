/**
 * Result headline = what the user typed. Models sometimes re-spell the
 * product ("Acme Betta" for a "Acme Beta" query); the query is the one
 * thing we know is right. The model's product name stays visible as a
 * secondary "Identified as" line when it differs from the query.
 * Photo-only checks have no query → the model title.
 */
import type { CheckResult } from './types';

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s\-_/·.,()（）]+/g, '');
}

/** Model words the user wrote: CJK runs and sizes. A rename that drops one is a different product. */
function keepsQuery(model: string, query: string): boolean {
  const marks =
    query
      .normalize('NFKC')
      .match(/[\u3040-\u30ff\u4e00-\u9fff]{2,}|\d+\s*(?:ml|g|cm|mm|oz)\b/gi) ?? [];
  if (marks.length < 2) return true;
  const have = norm(model.normalize('NFKC'));
  return marks.every((m) => have.includes(norm(m)));
}

export function resultTitle(
  result: Pick<CheckResult, 'title' | 'product'>,
  query?: string | null
): { title: string; modelName?: string } {
  const q = String(query ?? '').trim();
  const model = String(result.product?.name || result.title || '').trim();
  if (!q) return { title: result.title };
  const same = norm(model) === norm(q);
  const shown = model && !same && keepsQuery(model, q) ? model.slice(0, 120) : undefined;
  return {
    title: q.slice(0, 120),
    modelName: shown,
  };
}
