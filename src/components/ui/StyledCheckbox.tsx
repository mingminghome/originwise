import { useId } from 'react';
import { Check } from 'lucide-react';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * Custom checkbox (no native input) aligned with warm BabyWise chrome.
 */
export function StyledCheckbox({
  checked,
  onChange,
  label,
  id,
  className = '',
  disabled = false,
}: Props) {
  const autoId = useId();
  const controlId = id ?? autoId;

  return (
    <button
      id={controlId}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      className={`ui-check ${checked ? 'is-on' : ''} ${className}`.trim()}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
    >
      <span className={`ui-check-box ${checked ? 'is-on' : ''}`} aria-hidden>
        {checked && <Check size={14} strokeWidth={3} />}
      </span>
      <span className="ui-check-label">{label}</span>
    </button>
  );
}
