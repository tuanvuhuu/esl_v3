'use client';

import { AppsIcon } from '@primer/octicons-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isActivePath, type NavItem } from '@/lib/nav';
import { NAV_ICONS } from './nav-icons';

export function MobileTabBar({ tabs, onFeatures }: { tabs: NavItem[]; onFeatures: () => void }) {
  const pathname = usePathname();
  const left = tabs.slice(0, 2);
  const right = tabs.slice(2, 4);

  return (
    <nav
      aria-label="Điều hướng nhanh"
      className="fixed inset-x-0 bottom-0 z-40 hidden grid-cols-5 items-end border-t border-[var(--borderColor-default)] bg-[var(--bgColor-default)]/95 px-2 pb-[calc(8px+var(--safe-b))] pt-1.5 backdrop-blur-md max-[767px]:grid"
    >
      {left.map((item) => (
        <TabLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
      ))}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onFeatures}
          aria-label="Tính năng"
          className="-translate-y-3.5 grid size-13 place-items-center rounded-full border border-[var(--button-primary-borderColor-rest)] bg-[var(--button-primary-bgColor-rest)] text-[var(--button-primary-fgColor-rest)] shadow-[var(--shadow-floating-medium,0_8px_20px_rgba(0,0,0,0.18))] active:scale-95"
        >
          <AppsIcon size={22} aria-hidden />
        </button>
      </div>
      {right.map((item) => (
        <TabLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
      ))}
    </nav>
  );
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = NAV_ICONS[item.icon];
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-13 min-w-0 flex-col items-center gap-1 pt-1 text-center text-2xs font-semibold ${
        active ? 'text-[var(--fgColor-default)]' : 'text-[var(--fgColor-muted)]'
      }`}
    >
      <span
        className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${
          active ? 'bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)]' : ''
        }`}
      >
        <Icon size={18} aria-hidden />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
