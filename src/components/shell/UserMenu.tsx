'use client';

import { IdCard, KeyRound, LogOut, Send, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

// Menu tài khoản: tên và vai trò của người đang đăng nhập, cài đặt (nếu có quyền), đăng xuất.
export function UserMenu({ name, email, role, canSettings }: { name: string; email: string; role: string; canSettings: boolean }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const initials = name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase();

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
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Tài khoản"
        onClick={() => setOpen((o) => !o)}
        className="grid size-[var(--icon-h)] place-items-center rounded-[var(--radius-ctl)] border border-line bg-surface text-ink-2 transition-colors hover:border-ink-2 hover:text-ink"
      >
        <User className="size-[18px]" aria-hidden />
      </button>

      {open && (
        <div role="menu" aria-label="Tài khoản" className="absolute right-0 top-[calc(100%+10px)] z-[90] w-[min(284px,calc(100vw-32px))] rounded-[var(--radius-panel)] border border-line bg-surface p-2.5 shadow-lift">
          <div className="flex items-center gap-3 border-b border-line px-2 pb-3 pt-2">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-butter text-sm font-bold text-butter-ink">{initials}</span>
            <div className="min-w-0">
              <b className="block truncate text-base text-ink">{name}</b>
              <small className="block truncate text-xs text-muted">{email} · {role}</small>
            </div>
          </div>
          <div className="mt-2 flex flex-col gap-0.5 border-t border-line pt-2">
            <span role="menuitem" aria-disabled="true" className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-base font-semibold text-muted">
              <IdCard className="size-4" aria-hidden />
              Hồ sơ cá nhân (sắp có)
            </span>
            {canSettings && (
              <Link href="/cai-dat" role="menuitem" onClick={() => setOpen(false)} className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-base font-semibold text-ink hover:bg-stone">
                <Settings className="size-4 text-ink-2" aria-hidden />
                Cài đặt
              </Link>
            )}
            <Link href="/doi-mat-khau" role="menuitem" onClick={() => setOpen(false)} className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-base font-semibold text-ink hover:bg-stone">
              <KeyRound className="size-4 text-ink-2" aria-hidden />
              Đổi mật khẩu
            </Link>
            <Link href="/tin-nhan" role="menuitem" onClick={() => setOpen(false)} className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-base font-semibold text-ink hover:bg-stone">
              <Send className="size-4 text-ink-2" aria-hidden />
              Kết nối Telegram
            </Link>
            <form method="post" action="/logout">
              <button type="submit" role="menuitem" className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-base font-semibold text-blush-ink hover:bg-blush">
                <LogOut className="size-4 text-blush-ink" aria-hidden />
                Đăng xuất
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
