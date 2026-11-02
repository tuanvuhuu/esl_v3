'use client';

import { XIcon } from '@primer/octicons-react';
import { IconButton } from '@primer/react';
import Link from 'next/link';
import type { NavGroup } from '@/lib/nav';
import { NAV_ICONS } from './nav-icons';

export function FeatureSheet({
  open,
  groups,
  badges,
  onClose,
}: {
  open: boolean;
  groups: NavGroup[];
  badges: Record<string, number>;
  onClose: () => void;
}) {
  return (
    <div className={`fixed inset-0 z-[65] ${open ? 'flex' : 'hidden'}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-scrim transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tính năng"
        className={`absolute inset-x-0 bottom-0 flex max-h-[84dvh] flex-col rounded-t-2xl border-t border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-5 pt-2.5 shadow-lift transition-transform duration-200 ${
          open ? 'translate-y-0' : 'translate-y-[104%]'
        }`}
      >
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-[var(--borderColor-default)]" aria-hidden />
        <div className="mb-2.5 flex items-center justify-between border-b border-[var(--borderColor-muted)] pb-2.5">
          <div className="flex items-center gap-3">
            <b className="text-lg font-bold text-[var(--fgColor-default)]">Tính năng</b>
            <Link href="/tinh-nang" onClick={onClose} className="text-sm font-semibold text-[var(--fgColor-link)] underline underline-offset-4">
              Xem tất cả
            </Link>
          </div>
          <IconButton
            icon={XIcon}
            variant="default"
            unsafeDisableTooltip
            onClick={onClose}
            aria-label="Đóng"
            className="!size-[var(--icon-h-touch)] min-[768px]:!size-[var(--icon-h)]"
          />
        </div>
        <div className="flex-1 overflow-y-auto pb-[calc(16px+var(--safe-b))]">
          {groups.map((group) => (
            <section key={group.id} className="mb-4">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--fgColor-muted)]">{group.title}</h2>
              <div className="grid grid-cols-4 gap-x-1 gap-y-4">
                {group.items.map((item) => {
                  const Icon = NAV_ICONS[item.icon];
                  const count = badges[item.href] ?? 0;
                  return (
                    <Link key={item.href} href={item.href} onClick={onClose} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                      <span className="relative grid size-13 place-items-center rounded-2xl border border-[var(--borderColor-muted)] bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-default)]">
                        <Icon size={22} aria-hidden />
                        {count > 0 && (
                          <span
                            className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-[var(--primary-deep)] px-1 text-2xs font-extrabold leading-5 text-[var(--on-primary)]"
                            aria-label={`${count} mục chờ`}
                          >
                            {count}
                          </span>
                        )}
                      </span>
                      <span className="line-clamp-2 text-xs font-medium leading-tight text-[var(--fgColor-default)]">{item.label}</span>
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
