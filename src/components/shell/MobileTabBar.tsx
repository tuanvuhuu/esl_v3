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
      className="fixed inset-x-0 bottom-0 z-40 hidden grid-cols-5 items-end border-t border-[var(--menu-border)] bg-[var(--bar-bg)] px-2 pb-[calc(8px+var(--safe-b))] pt-1.5 backdrop-blur-md transition-colors duration-200 max-[767px]:grid"
    >
      {left.map((item) => (
        <TabLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
      ))}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onFeatures}
          aria-label="Tính năng"
          className="-translate-y-3.5 grid size-13 place-items-center rounded-full border border-[var(--button-primary-borderColor-rest)] bg-[var(--button-primary-bgColor-rest)] text-[var(--button-primary-fgColor-rest)] shadow-[var(--shadow-floating-medium,0_8px_20px_rgba(0,0,0,0.18))] transition-colors active:scale-95"
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
      className={`flex min-h-13 min-w-0 flex-col items-center gap-1 pt-1 text-center text-2xs font-semibold transition-colors ${
        active ? 'text-[var(--primary-deep)]' : 'text-[var(--fgColor-default)]'
      }`}
    >
      <span
        className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${
          active
            ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-[0_1px_2px_rgba(15,23,42,0.14)]'
            : 'bg-[color-mix(in_srgb,var(--primary-soft)_65%,var(--surface))] text-[var(--primary-deep)]'
        }`}
      >
        <Icon size={17} aria-hidden />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
