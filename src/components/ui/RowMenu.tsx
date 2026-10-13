'use client';

import Link from 'next/link';
import { Ellipsis } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type RowMenuItem =
  | { kind: 'link'; href: string; label: string; icon: LucideIcon }
  | { kind: 'action'; label: string; icon: LucideIcon; onSelect: () => void; danger?: boolean; disabled?: boolean; disabledHint?: string };

// Nút ⋯ mở danh sách thao tác có icon. Đóng khi chọn mục, bấm ra ngoài hoặc nhấn Esc.
export function RowMenu({ items, label }: { items: RowMenuItem[]; label: string }) {
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

  return (
    <div ref={wrapRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 place-items-center rounded-xl border border-line bg-surface text-ink-2 transition-colors hover:border-ink-2 hover:text-ink"
      >
        <Ellipsis className="size-[18px]" aria-hidden />
      </button>

      {open && (
        <div role="menu" aria-label={label} className="absolute right-0 top-[calc(100%+6px)] z-40 min-w-[190px] rounded-2xl border border-line bg-surface p-1.5 shadow-lift">
          {items.map((item) => {
            const Icon = item.icon;
            const className = `flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-base font-semibold transition-colors ${
              item.kind === 'action' && item.danger ? 'text-blush-ink hover:bg-blush' : 'text-ink hover:bg-stone'
            } disabled:cursor-not-allowed disabled:opacity-40`;
            if (item.kind === 'link') {
              return (
                <Link key={item.label} href={item.href} role="menuitem" className={className} onClick={() => setOpen(false)}>
                  <Icon className="size-4 text-ink-2" aria-hidden />
                  {item.label}
                </Link>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                title={item.disabled ? item.disabledHint : undefined}
                className={className}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                <Icon className={`size-4 ${item.danger ? 'text-blush-ink' : 'text-ink-2'}`} aria-hidden />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
