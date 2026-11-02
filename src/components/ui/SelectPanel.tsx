'use client';

import { CheckIcon, SearchIcon, TriangleDownIcon } from '@primer/octicons-react';
import clsx from 'clsx';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { normalizeSearch } from '@/lib/text';

export type SelectOption = { value: string; label: string; disabled?: boolean };

type Common = {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  name?: string;
  icon?: ReactNode;
  searchable?: boolean;
  error?: boolean;
  disabled?: boolean;
  block?: boolean;
  auto?: boolean;
  variant?: 'field' | 'bar';
  className?: string;
};

type SingleProps = Common & {
  multiple?: false;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

type MultiProps = Common & {
  multiple: true;
  values?: string[];
  defaultValues?: string[];
  onChange?: (values: string[]) => void;
};

export type SelectPanelProps = SingleProps | MultiProps;

export function SelectPanel(props: SelectPanelProps) {
  const {
    label,
    options,
    placeholder = '',
    name,
    icon,
    error = false,
    disabled = false,
    block = false,
    auto = false,
    variant = 'field',
    className = '',
  } = props;
  const bar = variant === 'bar';
  const multiple = props.multiple === true;
  const controlled = props.multiple === true ? props.values !== undefined : props.value !== undefined;
  const [inner, setInner] = useState<string[]>(() =>
    props.multiple === true ? (props.defaultValues ?? []) : [props.defaultValue ?? ''],
  );
  const selected: string[] = controlled
    ? props.multiple === true
      ? (props.values ?? [])
      : [props.value ?? '']
    : inner;
  const searchable = props.searchable ?? options.length > 6;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const q = normalizeSearch(query.trim());
  const visible = q ? options.filter((o) => normalizeSearch(o.label).includes(q)) : options;
  const picked = selected
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter((text): text is string => text !== undefined);
  const hasValue = picked.length > 0;
  const shown = hasValue ? picked.join(', ') : placeholder;

  function commit(next: string[]) {
    if (!controlled) setInner(next);
    if (props.multiple === true) props.onChange?.(next);
    else props.onChange?.(next[0] ?? '');
  }

  function openPanel() {
    if (disabled) return;
    const firstPicked = options.findIndex((o) => selected.includes(o.value));
    setQuery('');
    setActive(firstPicked >= 0 ? firstPicked : 0);
    setOpen(true);
  }

  function closePanel(focusTrigger: boolean) {
    setOpen(false);
    setQuery('');
    if (focusTrigger) triggerRef.current?.focus();
  }

  function choose(opt: SelectOption) {
    if (opt.disabled) return;
    if (props.multiple === true) {
      commit(selected.includes(opt.value) ? selected.filter((v) => v !== opt.value) : [...selected, opt.value]);
      return;
    }
    commit([opt.value]);
    closePanel(true);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (searchable) searchRef.current?.focus();
    else panelRef.current?.focus();
  }, [open, searchable]);

  useEffect(() => {
    if (open) optionRefs.current[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function onTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      openPanel();
    }
  }

  function onPanelKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closePanel(true);
      return;
    }
    if (e.key === 'Tab') {
      closePanel(false);
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (visible.length === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => (a + step + visible.length) % visible.length);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const opt = visible[active];
      if (opt) choose(opt);
    }
  }

  return (
    <div
      ref={wrapRef}
      className={clsx('relative min-w-0', block ? 'flex w-full' : clsx('inline-flex max-w-full', auto && 'self-start'), className)}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={bar ? `${label}: ${shown}` : label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? closePanel(true) : openPanel())}
        onKeyDown={onTriggerKey}
        className={
          bar
            ? clsx(
                'inline-flex size-[var(--icon-h)] shrink-0 items-center justify-center gap-1.5 rounded-[var(--borderRadius-medium)] border bg-[var(--bgColor-default)] text-[var(--fgColor-muted)] outline-none transition-colors hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)] focus:border-[var(--focus-outlineColor)] disabled:opacity-45 max-[767px]:size-[var(--icon-h-touch)] min-[1200px]:h-[var(--ctl-h)] min-[1200px]:w-auto min-[1200px]:max-w-[13rem] min-[1200px]:justify-start min-[1200px]:px-2.5',
                error ? 'border-[var(--borderColor-danger-emphasis)]' : 'border-[var(--borderColor-default)]',
              )
            : clsx(
                'inline-flex h-[var(--ctl-h)] items-center gap-2 rounded-[var(--borderRadius-medium)] border bg-[var(--bgColor-default)] px-2.5 text-left text-sm font-medium outline-none transition-colors hover:border-[var(--fgColor-muted)] focus:border-[var(--focus-outlineColor)] disabled:opacity-45 max-[767px]:h-[var(--ctl-h-touch)]',
                !auto && 'w-full',
                block || auto ? 'min-w-0' : 'min-w-[10rem]',
                error ? 'border-[var(--borderColor-danger-emphasis)]' : 'border-[var(--borderColor-default)]',
                hasValue ? 'text-[var(--fgColor-default)]' : 'text-[var(--fgColor-muted)]',
              )
        }
      >
        {icon}
        {bar ? (
          <span className="min-w-0 truncate text-sm font-semibold text-[var(--fgColor-default)] max-[1199px]:hidden">{shown}</span>
        ) : (
          <span className={clsx('min-w-0 truncate', !auto && 'flex-1')}>{shown}</span>
        )}
        {bar ? (
          <TriangleDownIcon
            size={14}
            className={clsx('shrink-0 text-[var(--fgColor-muted)] transition-transform max-[1199px]:hidden', open && 'rotate-180')}
            aria-hidden
          />
        ) : (
          <TriangleDownIcon
            size={16}
            className={clsx('shrink-0 text-[var(--fgColor-muted)] transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        )}
      </button>

      {name &&
        (multiple ? selected : [selected[0] ?? '']).map((v) => <input key={v} type="hidden" name={name} value={v} />)}

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onPanelKey}
          onClick={(e) => e.preventDefault()}
          className={clsx(
            'absolute top-[calc(100%+6px)] z-40 flex w-[max(100%,15rem)] flex-col gap-1.5 rounded-xl border border-[var(--borderColor-default)] bg-[var(--overlay-bgColor)] p-2 shadow-[var(--shadow-floating-large,var(--lift))] outline-none',
            bar ? 'right-0' : 'left-0',
          )}
        >
          <p className="border-b border-[var(--borderColor-muted)] px-2 pb-1.5 pt-0.5 text-xs font-medium text-[var(--fgColor-muted)]">
            {label}
          </p>

          {searchable && (
            <div className="relative">
              <SearchIcon
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fgColor-muted)]"
                aria-hidden
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder="Tìm trong danh sách"
                aria-label={`Tìm trong ${label}`}
                autoComplete="off"
                className="h-[var(--ctl-h)] w-full min-w-0 rounded-[var(--borderRadius-medium)] border border-[var(--focus-outlineColor)] bg-[var(--bgColor-default)] pl-8 pr-2.5 text-sm text-[var(--fgColor-default)] outline-none placeholder:text-[var(--fgColor-muted)] [&::-webkit-search-cancel-button]:hidden max-[767px]:h-[var(--ctl-h-touch)] max-[767px]:text-input"
              />
            </div>
          )}

          <div
            role="listbox"
            aria-label={label}
            aria-multiselectable={multiple || undefined}
            className="scroll-quiet flex max-h-72 flex-col gap-0.5 overflow-y-auto"
          >
            {visible.map((o, i) => {
              const on = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  ref={(el) => {
                    optionRefs.current[i] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={on}
                  disabled={o.disabled}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={clsx(
                    'flex min-h-[var(--ctl-h)] w-full items-center gap-2 rounded-[var(--borderRadius-small)] px-2 text-left text-sm font-medium text-[var(--fgColor-default)] transition-colors max-[767px]:min-h-[var(--ctl-h-touch)] disabled:opacity-40',
                    i === active && 'bg-[var(--bgColor-muted)]',
                    on && 'bg-[var(--bgColor-accent-muted)]/60 font-semibold',
                  )}
                >
                  {multiple ? (
                    <span
                      aria-hidden
                      className={clsx(
                        'grid size-4 shrink-0 place-items-center rounded-[4px] border',
                        on
                          ? 'border-[var(--control-checked-borderColor-rest)] bg-[var(--control-checked-bgColor-rest)] text-white'
                          : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)]',
                      )}
                    >
                      {on && <CheckIcon size={12} aria-hidden />}
                    </span>
                  ) : (
                    <span aria-hidden className="grid size-4 shrink-0 place-items-center text-[var(--fgColor-accent)]">
                      {on && <CheckIcon size={14} aria-hidden />}
                    </span>
                  )}
                  <span className="min-w-0 break-words">{o.label}</span>
                </button>
              );
            })}
          </div>
          {visible.length === 0 && <p className="px-2 pb-1 text-sm text-[var(--fgColor-muted)]">Không có lựa chọn phù hợp.</p>}
        </div>
      )}
    </div>
  );
}
