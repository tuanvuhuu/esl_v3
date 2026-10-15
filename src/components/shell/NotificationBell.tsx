'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { listNotificationsAction } from '@/app/(app)/thong-bao/actions';
import type { AttentionGroup } from '@/lib/queries/notifications';

// Chuông thông báo: việc cần chú ý theo quyền của người dùng, cùng nguồn với mục Cần chú ý ở Tổng quan.
// Số trên chuông là tổng số việc. Danh sách lấy lại mỗi khi đổi trang. Bấm một việc để mở trang đó.
// Bảng đưa ra thẳng body (portal) vì thanh đầu có backdrop-blur, làm định vị cố định bị lệch.
export function NotificationBell() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [groups, setGroups] = useState<AttentionGroup[]>([]);
  // Bảng chỉ mở ở đúng trang lúc mở. Đổi trang thì bảng tự đóng, không cần effect để đóng.
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

  // Bấm ra ngoài (cả nút và bảng không tính là ngoài) hoặc nhấn Esc thì đóng
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

  // Đặt bảng ngay dưới nút, căn theo nút nhưng không tràn khỏi màn hình (điện thoại nút nằm giữa thanh)
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
    <div ref={rootRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={count > 0 ? `Thông báo, ${count} việc cần chú ý` : 'Thông báo'}
        onClick={toggle}
        className="relative grid size-[var(--icon-h)] shrink-0 place-items-center rounded-[var(--radius-ctl)] border border-line bg-surface text-ink-2 hover:border-ink-2 hover:text-ink max-[767px]:size-[var(--icon-h-touch)]"
      >
        <Bell className="size-[18px]" aria-hidden />
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary-deep px-1 text-2xs font-bold text-on-primary">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Thông báo"
            style={{ top: place.top, left: place.left, width: place.width }}
            className="fixed z-50 flex max-h-[70vh] flex-col rounded-[var(--radius-panel)] border border-line bg-surface shadow-lift"
          >
            <div className="shrink-0 border-b border-line px-4 py-3">
              <b className="text-base font-bold text-ink">Thông báo</b>
              <span className="ml-2 text-sm text-muted">{count > 0 ? `${count} việc cần chú ý` : 'Không có việc cần chú ý'}</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {groups.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted">Hôm nay không có việc gấp.</p>
              ) : (
                groups.map((g) => (
                  <section key={g.key} className="flex flex-col gap-1 p-2">
                    <h2 className="text-xs font-normal uppercase tracking-wider text-muted">
                      {g.title} ({g.count})
                    </h2>
                    <ul className="flex flex-col">
                      {g.items.map((it) => (
                        <li key={it.id}>
                          <Link
                            href={it.href}
                            onClick={() => setOpenPath(null)}
                            className="flex items-center justify-between gap-3 rounded-[var(--radius-ctl)] px-3 py-2 hover:bg-stone"
                          >
                            <span className="min-w-0">
                              <b className="block truncate text-sm font-bold text-ink">{it.title}</b>
                              <small className="block truncate text-xs text-muted">{it.meta}</small>
                            </span>
                            <small className="shrink-0 text-xs font-semibold text-blush-ink">{it.right}</small>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {g.count > g.items.length && (
                      <Link
                        href={g.href}
                        onClick={() => setOpenPath(null)}
                        className="px-3 pt-1 text-xs font-bold text-ink underline underline-offset-4"
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
