/** Extract first JSON object from model text. */
export function extractJsonObject(text: string): Record<string, unknown> | null {
  if (!text?.trim()) return null;
  try {
    const cleaned = text.replace(/```json\s*|```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    return JSON.parse(cleaned.slice(start, end + 1)) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}
