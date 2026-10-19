import type { RelationTier } from '../core/types';

/**
 * Compact relation colour (history and other short labels).
 * The China card uses the same colours on .rc-tier-chip.
 */
export function TierBadge({
  tier,
  label,
  size = 'md',
}: {
  tier: RelationTier;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <span className={`tier-badge tier-badge--${tier} tier-badge--${size}`}>
      <span className="tier-badge-dot" aria-hidden />
      {label}
    </span>
  );
}
