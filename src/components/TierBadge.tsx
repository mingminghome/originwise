import type { RelationTier } from '../core/types';

/**
 * Only place in the UI that uses semantic color for relation results.
 * Rest of the app stays monochrome.
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
