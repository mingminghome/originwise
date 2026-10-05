/** Extract the first JSON object from model text, including truncated replies. */

function tryParseObject(raw: string): Record<string, unknown> | null {
  const candidates = [raw, raw.replace(/,\s*([}\]])/g, '$1')];
  for (const s of candidates) {
    try {
      const v = JSON.parse(s) as unknown;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        return v as Record<string, unknown>;
      }
    } catch {
      /* next candidate */
    }
  }
  return null;
}

/** First `{...}` whose braces balance, ignoring braces inside strings. */
function sliceBalancedObject(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i]!;
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Close a JSON object cut off by a token limit.
 * Drops a dangling key, fills a dangling colon, then closes open strings/arrays/objects.
 */
export function repairTruncatedJson(text: string): string {
  let inString = false;
  let escape = false;
  const stack: Array<'{' | '['> = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{' || c === '[') stack.push(c);
    else if ((c === '}' || c === ']') && stack.length) stack.pop();
  }

  let out = text;
  if (inString) out += '"';
  out = out.replace(/,\s*$/, '');
  if (/:\s*$/.test(out)) out += 'null';
  else out = out.replace(/,\s*"[^"\\]*"\s*$/, '');
  while (stack.length) {
    const open = stack.pop();
    out += open === '{' ? '}' : ']';
  }
  return out;
}

export function extractJsonObject(text: string): Record<string, unknown> | null {
  if (!text?.trim()) return null;
  const cleaned = text
    .replace(/```json\s*|```/gi, '')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .trim();
  const start = cleaned.indexOf('{');
  if (start < 0) return null;

  const balanced = sliceBalancedObject(cleaned, start);
  if (balanced) {
    const parsed = tryParseObject(balanced);
    if (parsed) return parsed;
  }

  const end = cleaned.lastIndexOf('}');
  if (end > start) {
    const parsed = tryParseObject(cleaned.slice(start, end + 1));
    if (parsed) return parsed;
  }

  return tryParseObject(repairTruncatedJson(cleaned.slice(start)));
}
