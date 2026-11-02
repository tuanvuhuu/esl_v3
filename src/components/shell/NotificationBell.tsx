'use client';

// Chuông thông báo theo phong cách NutChuong (01. TSUKUBA) trên nền @primer/react v38 + Octicons.
import { BellIcon } from '@primer/octicons-react';
import { IconButton } from '@primer/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { listNotificationsAction } from '@/app/(app)/thong-bao/actions';
import type { AttentionGroup } from '@/lib/queries/notifications';

export function NotificationBell() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [groups, setGroups] = useState<AttentionGroup[]>([]);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [place, setPlace] = useState({ top: 0, left: 0, width: 300 });
  const open = openPath === pathname;
  const count = groups.reduce((sum, g) => sum + g.count, 0);

  useEffect(() => {
    let alive = true;
    listNotificationsAction()
      .then((next) => {
        if (alive) setGroups(next);
      })
      .catch(() => {
        if (alive) setGroups([]);
      });
    return () => {
      alive = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpenPath(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPath(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setOpenPath(null);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    const width = Math.min(window.innerWidth >= 768 ? 360 : 300, window.innerWidth - 32);
    const left = Math.min(Math.max(16, (r?.right ?? 0) - width), window.innerWidth - width - 16);
    setPlace({ top: (r?.bottom ?? 0) + 8, left, width });
    setOpenPath(pathname);
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      <IconButton
        ref={btnRef}
        icon={BellIcon}
        variant="invisible"
        unsafeDisableTooltip
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={count > 0 ? `Thông báo, ${count} việc cần chú ý` : 'Thông báo'}
        onClick={toggle}
        className="!size-[var(--icon-h)] shrink-0 max-[767px]:!size-[var(--icon-h-touch)]"
      />
      {count > 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--bgColor-danger-emphasis,var(--blush-ink))] px-1 text-[10px] font-medium leading-none text-white ring-2 ring-[var(--bgColor-default)]"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Thông báo"
            style={{ top: place.top, left: place.left, width: place.width }}
            className="fixed z-50 flex max-h-[70vh] flex-col rounded-xl border border-[var(--borderColor-default)] bg-[var(--overlay-bgColor)] shadow-[var(--shadow-floating-large,var(--lift))]"
          >
            <div className="shrink-0 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)]/60 px-4 py-2.5">
              <b className="text-sm font-medium text-[var(--fgColor-default)]">Thông báo</b>
              <span className="ml-2 text-xs text-[var(--fgColor-muted)]">
                {count > 0 ? `${count} việc cần chú ý` : 'Không có việc cần chú ý'}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {groups.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-[var(--fgColor-muted)]">Hôm nay không có việc gấp.</p>
              ) : (
                groups.map((g) => (
                  <section key={g.key} className="flex flex-col gap-1 p-2">
                    <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--fgColor-muted)]">
                      {g.title} ({g.count})
                    </h2>
                    <ul className="flex flex-col">
                      {g.items.map((it) => (
                        <li key={it.id}>
                          <Link
                            href={it.href}
                            onClick={() => setOpenPath(null)}
                            className="flex items-center justify-between gap-3 rounded-[var(--borderRadius-medium)] px-2.5 py-2 transition-colors hover:bg-[var(--bgColor-muted)]"
                          >
                            <span className="min-w-0">
                              <b className="block truncate text-sm font-semibold text-[var(--fgColor-default)]">{it.title}</b>
                              <small className="block truncate text-xs text-[var(--fgColor-muted)]">{it.meta}</small>
                            </span>
                            <small className="shrink-0 text-xs font-semibold text-[var(--fgColor-danger)]">{it.right}</small>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {g.count > g.items.length && (
                      <Link
                        href={g.href}
                        onClick={() => setOpenPath(null)}
                        className="px-2.5 pt-1 text-xs font-semibold text-[var(--fgColor-link)] underline underline-offset-4"
                      >
                        Xem tất cả {g.count} mục
                      </Link>
                    )}
                  </section>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
