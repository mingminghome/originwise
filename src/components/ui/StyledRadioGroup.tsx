type Option = { value: string; label: string };

type Props = {
  name: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  'aria-label'?: string;
};

export function StyledRadioGroup({
  name,
  value,
  options,
  onChange,
  'aria-label': ariaLabel,
}: Props) {
  return (
    <div className="ui-radio-group" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            className={`ui-radio ${on ? 'is-on' : ''}`}
            onClick={() => onChange(o.value)}
          >
            <span className="ui-radio-dot" aria-hidden />
            <span>{o.label}</span>
          </button>
        );
      })}
      {/* Keep name for forms if needed later */}
      <input type="hidden" name={name} value={value} readOnly />
    </div>
  );
}
