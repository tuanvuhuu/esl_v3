'use client';

import Link from 'next/link';
import { Ellipsis } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type RowMenuItem =
  | { kind: 'link'; href: string; label: string; icon: LucideIcon }
  | { kind: 'action'; label: string; icon: LucideIcon; onSelect: () => void; danger?: boolean; disabled?: boolean; disabledHint?: string };

// Chiều cao ước lượng để chọn mở menu lên hay xuống: mỗi mục 40px, cộng lề và viền
const ITEM_H = 40;
const MENU_PAD = 14;

// Nút ⋯ mở danh sách thao tác có icon. Menu vẽ trên body nên không bị khung bảng cắt. Mở xuống, hoặc lên nếu thiếu chỗ phía dưới.
// Đóng khi chọn mục, bấm ra ngoài, nhấn Esc, hoặc khi cuộn và đổi cỡ màn hình (menu cố định theo màn hình).
export function RowMenu({ items, label }: { items: RowMenuItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      // Bấm trong nút hoặc trong menu (menu nằm trên body) thì không đóng
      if (!wrapRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  // Mở: đặt menu theo vị trí nút, mép phải thẳng với nút. Thiếu chỗ bên dưới thì mở lên.
  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const b = btnRef.current?.getBoundingClientRect();
    if (b) {
      const height = items.length * ITEM_H + MENU_PAD;
      const below = b.bottom + 6;
      const up = below + height > window.innerHeight - 8;
      setPos({ top: up ? Math.max(8, b.top - 6 - height) : below, right: Math.max(8, document.documentElement.clientWidth - b.right) });
    }
    setOpen(true);
  }

  return (
    <div ref={wrapRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={toggle}
        className="grid size-[var(--icon-h)] place-items-center rounded-[var(--radius-ctl)] border border-line bg-surface text-ink-2 transition-colors hover:border-ink-2 hover:text-ink max-[767px]:size-[var(--icon-h-touch)]"
      >
        <Ellipsis className="size-[18px]" aria-hidden />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            style={{ top: pos.top, right: pos.right }}
            className="fixed z-[75] min-w-[190px] rounded-[var(--radius-panel)] border border-line bg-surface p-1.5 shadow-lift"
          >
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
          </div>,
          document.body,
        )}
    </div>
  );
}
