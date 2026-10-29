import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Globe2, Search, SlidersHorizontal, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { countryMarketCodes } from '../../functions/_lib/regions';
import type { TFunction } from '../core/i18n';
import { localeTag, type Locale } from '../core/i18n/locales';

const MAX_MARKETS = 8;

type ActionId = 'markets';

function marketChoices(tag: string): { code: string; name: string }[] {
  let names: Intl.DisplayNames;
  try {
    names = new Intl.DisplayNames([tag, 'en'], { type: 'region' });
  } catch {
    names = new Intl.DisplayNames(['en'], { type: 'region' });
  }
  return countryMarketCodes()
    .map((code) => {
      let name = code;
      try {
        name = names.of(code) || code;
      } catch {
        name = code;
      }
      return { code, name };
    })
    .sort((a, b) => a.name.localeCompare(b.name, tag));
}

function placeList(names: string[], tag: string): string {
  try {
    return new Intl.ListFormat(tag, { style: 'narrow', type: 'unit' }).format(names);
  } catch {
    return names.join(', ');
  }
}

/**
 * Optional check operations. Closed until the icon is opened.
 * Add a later filter by appending to `actions` and its panel.
 * Markets limit the search and the alternative recommendations.
 */
export function AdvancedSearch({
  locale,
  markets,
  disabled,
  onChange,
  t,
}: {
  locale: Locale;
  markets: readonly string[];
  disabled?: boolean;
  onChange: (markets: string[]) => void;
  t: TFunction;
}) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<ActionId | null>(null);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const findRef = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const tag = localeTag(locale);
  const showPlaces = open && action === 'markets';
  const choices = useMemo(
    () => (showPlaces || markets.length > 0 ? marketChoices(tag) : []),
    [showPlaces, markets.length, tag]
  );
  const byCode = useMemo(() => new Map(choices.map((row) => [row.code, row.name])), [choices]);
  const selected = new Set(markets);
  const needle = query.trim().toLowerCase();
  const hits = !showPlaces
    ? []
    : needle
      ? choices.filter(
          (row) =>
            row.name.toLowerCase().includes(needle) || row.code.toLowerCase().includes(needle)
        )
      : choices;
  const summary = markets.length
    ? placeList(
        markets.map((code) => byCode.get(code) ?? code),
        tag
      )
    : t('check.advancedNone');

  const actions: { id: ActionId; label: string; status: string; icon: LucideIcon }[] = [
    {
      id: 'markets',
      label: t('check.advancedMarkets'),
      status: summary,
      icon: Globe2,
    },
  ];

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
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

  useEffect(() => {
    if (showPlaces) queueMicrotask(() => findRef.current?.focus());
  }, [showPlaces]);

  const toggle = (code: string) => {
    if (selected.has(code)) {
      onChange(markets.filter((item) => item !== code));
      return;
    }
    if (markets.length >= MAX_MARKETS) return;
    onChange([...markets, code]);
  };

  const active = actions.find((item) => item.id === action);

  return (
    <div className="check-advanced" ref={rootRef}>
      <button
        type="button"
        className={
          open || markets.length
            ? 'check-icon-btn check-advanced-trigger is-on'
            : 'check-icon-btn check-advanced-trigger'
        }
        aria-label={t('check.advancedTitle')}
        aria-expanded={open}
        aria-controls={panelId}
        title={t('check.advancedTitle')}
        disabled={disabled}
        onClick={() => {
          setOpen((value) => !value);
          setAction(null);
        }}
      >
        <SlidersHorizontal size={18} />
        {markets.length ? (
          <span className="check-advanced-badge">{markets.length}</span>
        ) : null}
      </button>
      {open ? (
        <div
          id={panelId}
          className="check-advanced-pop"
          role="dialog"
          aria-label={active ? active.label : t('check.advancedTitle')}
        >
          <div className="check-advanced-pop-head">
            {active ? (
              <button
                type="button"
                className="check-advanced-back"
                onClick={() => setAction(null)}
              >
                <ChevronLeft size={16} aria-hidden />
                {t('common.back')}
              </button>
            ) : (
              <span className="check-advanced-pop-title">{t('check.advancedTitle')}</span>
            )}
            <button
              type="button"
              className="check-advanced-find-clear"
              aria-label={t('common.close')}
              onClick={() => setOpen(false)}
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          {active?.id === 'markets' ? (
            <div className="check-advanced-body">
              <p className="muted check-advanced-hint">
                {t('check.advancedHint', { n: MAX_MARKETS })}
              </p>
              {markets.length ? (
                <div className="chip-row check-market-picks">
                  {markets.map((code) => {
                    const name = byCode.get(code) ?? code;
                    return (
                      <button
                        key={code}
                        type="button"
                        className="chip active"
                        disabled={disabled}
                        aria-label={name}
                        onClick={() => toggle(code)}
                      >
                        {name}
                        <X size={14} aria-hidden />
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="chip"
                    disabled={disabled}
                    onClick={() => onChange([])}
                  >
                    {t('check.advancedClear')}
                  </button>
                </div>
              ) : null}
              <div className="check-advanced-find-wrap">
                <Search size={16} aria-hidden />
                <input
                  ref={findRef}
                  className="check-advanced-find"
                  value={query}
                  placeholder={t('check.advancedSearchPlaces')}
                  aria-label={t('check.advancedSearchPlaces')}
                  disabled={disabled}
                  autoComplete="off"
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query ? (
                  <button
                    type="button"
                    className="check-advanced-find-clear"
                    aria-label={t('common.cancel')}
                    disabled={disabled}
                    onClick={() => {
                      setQuery('');
                      findRef.current?.focus();
                    }}
                  >
                    <X size={14} aria-hidden />
                  </button>
                ) : null}
              </div>
              {needle && !hits.length ? (
                <p className="muted check-advanced-hint">{t('check.advancedEmptyHits')}</p>
              ) : null}
              {hits.length ? (
                <ul className="check-market-list" aria-label={t('check.advancedMarkets')}>
                  {hits.map((row) => {
                    const on = selected.has(row.code);
                    return (
                      <li key={row.code}>
                        <button
                          type="button"
                          className={on ? 'check-market-hit is-on' : 'check-market-hit'}
                          aria-pressed={on}
                          disabled={disabled || (!on && markets.length >= MAX_MARKETS)}
                          onClick={() => toggle(row.code)}
                        >
                          <span>{row.name}</span>
                          <span
                            className={on ? 'check-market-box is-on' : 'check-market-box'}
                            aria-hidden
                          >
                            {on ? <Check size={12} strokeWidth={3} /> : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : (
            <ul className="check-advanced-actions">
              {actions.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="check-advanced-action"
                      onClick={() => setAction(item.id)}
                    >
                      <Icon size={16} aria-hidden />
                      <span className="check-advanced-action-label">{item.label}</span>
                      <span className="check-advanced-action-status">{item.status}</span>
                      <ChevronRight size={16} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
