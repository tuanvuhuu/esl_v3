'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import type { NavGroup } from '@/lib/nav';
import { NAV_ICONS } from './nav-icons';

// Bảng Tính năng từ nút tròn ở tab bar. Chạm một biểu tượng sẽ mở màn hình tương ứng.
export function FeatureSheet({ open, groups, badges, onClose }: { open: boolean; groups: NavGroup[]; badges: Record<string, number>; onClose: () => void }) {
  return (
    <div className={`fixed inset-0 z-[65] ${open ? 'flex' : 'hidden'}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-scrim transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tính năng"
        className={`absolute inset-x-0 bottom-0 flex max-h-[84dvh] flex-col rounded-t-[28px] bg-surface px-5 pt-2.5 shadow-lift transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-[104%]'}`}
      >
        <div className="mx-auto mb-3.5 h-1.5 w-11 rounded-full bg-line" aria-hidden />
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <b className="text-xl text-ink">Tính năng</b>
            <Link href="/tinh-nang" onClick={onClose} className="text-sm font-bold text-ink-2 underline underline-offset-4">Xem tất cả</Link>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="grid size-[var(--icon-h-touch)] place-items-center rounded-[var(--radius-ctl)] border border-line bg-surface text-ink-2 min-[768px]:size-[var(--icon-h)]">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pb-[calc(16px+var(--safe-b))]">
          {groups.map((group) => (
            <section key={group.id} className="mb-4">
              <h2 className="mb-3 text-xs font-normal uppercase tracking-wider text-muted">{group.title}</h2>
              <div className="grid grid-cols-4 gap-x-1 gap-y-4">
                {group.items.map((item) => {
                  const Icon = NAV_ICONS[item.icon];
                  const count = badges[item.href] ?? 0;
                  return (
                    <Link key={item.href} href={item.href} onClick={onClose} className="flex min-w-0 flex-col items-center gap-2 text-center">
                      <span className="relative grid size-14 place-items-center rounded-[19px] bg-primary-soft text-ink">
                        <Icon className="size-6" aria-hidden />
                        {count > 0 && (
                          <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-primary-deep px-1 text-2xs font-extrabold leading-5 text-on-primary" aria-label={`${count} mục chờ`}>
                            {count}
                          </span>
                        )}
                      </span>
                      <span className="line-clamp-2 text-xs font-semibold leading-tight text-ink-2">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
