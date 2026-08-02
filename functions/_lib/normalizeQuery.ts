/** Normalize free-text query for cache keys and de-dupe. */
export function normalizeQuery(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}
