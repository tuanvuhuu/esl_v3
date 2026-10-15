'use client';

import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { normalizeSearch } from '@/lib/text';

export type SelectOption = { value: string; label: string; disabled?: boolean };

type Common = {
  // Tên ô: đọc bằng công nghệ hỗ trợ, và là tiêu đề của bảng chọn
  label: string;
  options: SelectOption[];
  // Chữ hiện khi chưa có lựa chọn nào khớp
  placeholder?: string;
  // Tên trường khi gửi form (ô ẩn)
  name?: string;
  // Icon đầu ô, dùng ở thanh lọc
  icon?: ReactNode;
  // Có ô tìm trong bảng. Mặc định bật khi có hơn sáu lựa chọn.
  searchable?: boolean;
  error?: boolean;
  disabled?: boolean;
  // Rộng hết khung (ô trong form, ô trong cột bảng)
  block?: boolean;
  // Co theo chữ bên trong, không có chiều rộng tối thiểu (ô chọn trên thanh lọc, ví dụ chọn lớp)
  auto?: boolean;
  // "field": ô trong form và thanh lọc. "bar": nút gọn trên thanh trên cùng, chỉ hiện icon khi màn hình dưới 1200px.
  variant?: 'field' | 'bar';
  className?: string;
};

type SingleProps = Common & {
  multiple?: false;
  // Có value thì ô do bên ngoài điều khiển. Không có thì ô tự giữ, dùng defaultValue.
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

// Ô chọn dùng chung (DESIGN mục 8), thay mọi ô chọn kiểu danh sách trong app.
// Bấm mở bảng có ô tìm và danh sách. Một lựa chọn: chọn xong bảng đóng. Nhiều lựa chọn: bảng mở, mỗi mục có ô đánh dấu.
// Bảng nằm ngay dưới ô (định vị tuyệt đối như RowMenu), nên hộp thoại cha không bị đóng khi bấm vào bảng.
export function SelectPanel(props: SelectPanelProps) {
  const { label, options, placeholder = '', name, icon, error = false, disabled = false, block = false, auto = false, variant = 'field', className = '' } = props;
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

  // Ghi giá trị mới. Ô tự giữ thì cập nhật trong ô; ô do bên ngoài điều khiển thì chỉ báo lên.
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

  // Bấm ra ngoài thì đóng
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

  // Mở bảng thì đặt con trỏ vào ô tìm (nếu có), không thì vào bảng
  useEffect(() => {
    if (!open) return;
    if (searchable) searchRef.current?.focus();
    else panelRef.current?.focus();
  }, [open, searchable]);

  // Dời mục đang chọn bằng phím thì cuộn để thấy mục đó
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
      // Chỉ đóng bảng này. Không để hộp thoại cha (nếu có) cũng đóng: Modal bỏ qua Esc đã được xử lý.
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
      // Enter chọn mục đang sáng, không gửi form
      e.preventDefault();
      const opt = visible[active];
      if (opt) choose(opt);
    }
  }

  return (
    <div
      ref={wrapRef}
      className={`relative min-w-0 ${block ? 'flex w-full' : `inline-flex max-w-full ${auto ? 'self-start' : ''}`} ${className}`}
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
            ? `inline-flex size-[var(--icon-h)] shrink-0 items-center justify-center gap-2 rounded-[var(--radius-ctl)] border bg-surface text-ink-2 outline-none transition-colors hover:border-ink-2 hover:text-ink focus:border-primary-deep disabled:opacity-40 max-[767px]:size-[var(--icon-h-touch)] min-[1200px]:w-auto min-[1200px]:max-w-[12rem] min-[1200px]:justify-start min-[1200px]:px-3 ${error ? 'border-blush-ink' : 'border-line'}`
            : `inline-flex h-[var(--ctl-h)] ${auto ? '' : 'w-full'} items-center gap-2 rounded-[var(--radius-ctl)] border bg-surface px-2.5 text-left text-sm font-semibold outline-none transition-colors hover:border-ink-2 focus:border-primary-deep disabled:opacity-40 max-[767px]:h-[var(--ctl-h-touch)] ${block || auto ? 'min-w-0' : 'min-w-[10rem]'} ${error ? 'border-blush-ink' : 'border-line'} ${hasValue ? 'text-ink' : 'text-muted'}`
        }
      >
        {icon}
        {bar ? (
          <span className="min-w-0 truncate text-sm font-bold text-ink max-[1199px]:hidden">{shown}</span>
        ) : (
          <span className={`min-w-0 truncate ${auto ? '' : 'flex-1'}`}>{shown}</span>
        )}
        {bar ? (
          <ChevronDown className={`size-3.5 shrink-0 text-muted transition-transform max-[1199px]:hidden ${open ? 'rotate-180' : ''}`} aria-hidden />
        ) : (
          <ChevronDown className={`size-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
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
          // Bấm trong bảng không kích hoạt nhãn bọc ô (Field), nên ô không tự bật lại
          onClick={(e) => e.preventDefault()}
          className={`absolute ${bar ? 'right-0' : 'left-0'} top-[calc(100%+6px)] z-40 flex w-[max(100%,14rem)] flex-col gap-2 rounded-[var(--radius-panel)] border border-line bg-surface p-2 shadow-lift outline-none`}
        >
          <p className="px-2 pt-1 text-xs font-normal text-muted">{label}</p>

          {searchable && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
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
                className="h-[var(--ctl-h)] w-full min-w-0 rounded-[var(--radius-ctl)] border border-primary-deep bg-surface pl-8 pr-2.5 text-sm text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden max-[767px]:h-[var(--ctl-h-touch)] max-[767px]:text-input"
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
                  className={`flex min-h-[var(--ctl-h)] w-full items-center gap-2.5 rounded-[var(--radius-ctl)] px-2 text-left text-sm font-semibold text-ink transition-colors max-[767px]:min-h-[var(--ctl-h-touch)] disabled:opacity-40 ${i === active ? 'bg-stone' : ''}`}
                >
                  {multiple ? (
                    <span
                      aria-hidden
                      className={`grid size-4 shrink-0 place-items-center rounded-[4px] border ${on ? 'border-primary-deep bg-primary-deep text-on-primary' : 'border-ink-2 bg-surface'}`}
                    >
                      {on && <Check className="size-3" aria-hidden />}
                    </span>
                  ) : (
                    <span aria-hidden className="grid size-4 shrink-0 place-items-center text-primary-deep">
                      {on && <Check className="size-4" aria-hidden />}
                    </span>
                  )}
                  <span className="min-w-0 break-words">{o.label}</span>
                </button>
              );
            })}
          </div>
          {visible.length === 0 && <p className="px-2 pb-1 text-sm text-muted">Không có lựa chọn phù hợp.</p>}
        </div>
      )}
    </div>
  );
}
