'use client';

import { LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isActivePath, type NavItem } from '@/lib/nav';
import { NAV_ICONS } from './nav-icons';

// Thanh tab dưới đáy (điện thoại). Nút giữa mở bảng Tính năng. Tab đã lọc theo quyền ở layout (task 9.2).
export function MobileTabBar({ tabs, onFeatures }: { tabs: NavItem[]; onFeatures: () => void }) {
  const pathname = usePathname();
  const left = tabs.slice(0, 2);
  const right = tabs.slice(2, 4);

  return (
    <nav
      aria-label="Điều hướng nhanh"
      className="fixed inset-x-0 bottom-0 z-40 hidden grid-cols-5 items-end border-t border-line bg-glass px-2 pb-[calc(8px+var(--safe-b))] pt-2 backdrop-blur-md max-[767px]:grid"
    >
      {left.map((item) => (
        <TabLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
      ))}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onFeatures}
          aria-label="Tính năng"
          className="-translate-y-4 grid size-14 place-items-center rounded-full bg-primary-deep text-on-primary shadow-[0_16px_30px_-10px_rgba(240,183,58,0.55)] active:translate-y-[-14px] active:scale-95"
        >
          <LayoutGrid className="size-6" aria-hidden />
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
      className={`flex min-h-14 min-w-0 flex-col items-center gap-1 pt-1.5 text-center text-2xs font-semibold ${active ? 'text-ink' : 'text-muted'}`}
    >
      <span className={`grid h-7 w-13 place-items-center rounded-full transition-colors ${active ? 'bg-primary-soft' : ''}`}>
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
