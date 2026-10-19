/**
 * Small ⓘ info affordance with a tap / keyboard reveal.
 *
 * - Native `title` for desktop hover; phones get a tap toggle.
 * - The full sentence is wired with aria-describedby (read even while the
 *   text is hidden), the button has its own aria-label and aria-expanded.
 * - Closes on a tap outside, on Escape, and on a second tap.
 * - The whole affordance is section-share UI (data-section-share="ui"): it is
 *   removed from saved / shared images, so an open tip is never captured.
 *   The text renders in the flow under the label (not a floating box), so it
 *   cannot be half-cut by the card edge.
 */
import { useEffect, useId, useRef, useState } from 'react';

export function InfoTip({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className={`rc-info${open ? ' is-open' : ''}`} data-section-share="ui">
      <button
        type="button"
        className="rc-info-btn"
        aria-label={label}
        aria-describedby={tipId}
        aria-expanded={open}
        title={text}
        onClick={() => setOpen((v) => !v)}
      >
        ⓘ
      </button>
      <span id={tipId} role="tooltip" className="rc-info-text" hidden={!open}>
        {text}
      </span>
    </span>
  );
}
