/**
 * Colour of the 0–100 China-link score.
 * 0 is no link. Above 0 and under 70 is a partial link. 70 and above is a strong link.
 */
export function scoreTone(score: number): 'none' | 'indirect' | 'direct' {
  const n = Number.isFinite(score) ? score : 0;
  if (n >= 70) return 'direct';
  if (n > 0) return 'indirect';
  return 'none';
}
