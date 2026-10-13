'use client';

import { ChevronDown, Monitor, Moon, Sun, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocalStorage } from '@/lib/use-local-storage';

type Pref = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'esl-theme';
const OPTIONS: { value: Pref; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Sáng', icon: Sun },
  { value: 'dark', label: 'Tối', icon: Moon },
  { value: 'system', label: 'Theo hệ thống', icon: Monitor },
];

// Đặt data-theme theo lựa chọn. "Theo hệ thống" thì bỏ thuộc tính để CSS tự theo hệ điều hành.
function applyTheme(pref: Pref) {
  const root = document.documentElement;
  if (pref === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', pref);
}

export function ThemeMenu() {
  const [stored, setStored] = useLocalStorage(STORAGE_KEY, 'system');
  const pref: Pref = stored === 'light' || stored === 'dark' ? stored : 'system';
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function choose(next: Pref) {
    setStored(next);
    applyTheme(next);
    setOpen(false);
  }

  const current = OPTIONS.find((o) => o.value === pref) ?? OPTIONS[2];
  const CurrentIcon = current.icon;

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Giao diện: ${current.label}`}
        onClick={() => setOpen((o) => !o)}
        className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink-2 transition-colors hover:border-ink-2 hover:text-ink min-[768px]:inline-flex min-[768px]:h-auto min-[768px]:w-auto min-[768px]:gap-1 min-[768px]:border-0 min-[768px]:bg-transparent min-[768px]:px-1.5 min-[768px]:py-2"
      >
        <CurrentIcon className="size-[18px]" aria-hidden />
        <ChevronDown className="hidden size-3.5 text-muted min-[768px]:block" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Giao diện"
          className="absolute right-0 top-[calc(100%+10px)] z-[90] min-w-[190px] rounded-2xl border border-line bg-surface p-1.5 shadow-lift"
        >
          {OPTIONS.map((o) => {
            const Icon = o.icon;
            const selected = o.value === pref;
            return (
              <button
                key={o.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => choose(o.value)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-base font-semibold text-ink transition-colors hover:bg-stone ${selected ? 'bg-primary-soft' : ''}`}
              >
                <Icon className="size-4 text-ink-2" aria-hidden />
                <span className="flex-1">{o.label}</span>
                {selected && <Check className="size-4 text-ink-2" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
