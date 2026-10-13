'use client';

import { ChevronDown, House } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HOME_ITEM, isActivePath, type NavGroup } from '@/lib/nav';
import { useLocalStorage } from '@/lib/use-local-storage';
import { NAV_ICONS } from './nav-icons';

const COLLAPSE_KEY = 'esl-nav-collapsed';

function parseIdList(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

// Thanh bên web (từ 1200px: cố định). Từ 768 đến 1199px: ngăn kéo. Điện thoại: không hiện.
export function Sidebar({ groups, open, onNavigate }: { groups: NavGroup[]; open: boolean; onNavigate: () => void }) {
  const pathname = usePathname();
  const [storedCollapsed, setStoredCollapsed] = useLocalStorage(COLLAPSE_KEY, '[]');
  const collapsed = new Set(parseIdList(storedCollapsed));

  function toggle(id: string) {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setStoredCollapsed(JSON.stringify([...next]));
  }

  return (
    <aside
      id="side"
      aria-label="Menu chính"
      className={[
        'flex flex-col gap-6 overflow-y-auto bg-surface p-6',
        'max-[767px]:hidden',
        'min-[1200px]:sticky min-[1200px]:top-0 min-[1200px]:h-screen min-[1200px]:w-60 min-[1200px]:border-r min-[1200px]:border-line',
        'max-[1199px]:fixed max-[1199px]:inset-y-0 max-[1199px]:left-0 max-[1199px]:z-[56] max-[1199px]:w-[min(304px,86vw)] max-[1199px]:rounded-r-[28px] max-[1199px]:shadow-lift max-[1199px]:transition-transform max-[1199px]:duration-300',
        open ? 'max-[1199px]:translate-x-0' : 'max-[1199px]:-translate-x-[104%]',
      ].join(' ')}
    >
      <div className="flex items-center gap-3 px-2">
        <span className="grid size-10 place-items-center rounded-[13px] bg-primary text-lg font-extrabold text-on-primary">E</span>
        <div>
          <b className="block text-md text-ink">ESL Center</b>
          <small className="block text-xs text-muted">Quản lý trung tâm</small>
        </div>
      </div>

      <nav className="flex flex-col gap-4" aria-label="Các mục quản lý">
        <Link
          href={HOME_ITEM.href}
          onClick={onNavigate}
          aria-current={isActivePath(pathname, HOME_ITEM.href) ? 'page' : undefined}
          className={`flex min-h-10 items-center gap-2.5 rounded-xl px-3 py-2 text-base font-semibold transition-colors ${isActivePath(pathname, HOME_ITEM.href) ? 'bg-primary text-on-primary' : 'text-ink hover:bg-stone'}`}
        >
          <House className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0 leading-snug">{HOME_ITEM.label}</span>
        </Link>
        {groups.map((group) => {
          const isCollapsed = collapsed.has(group.id);
          const hasActive = group.items.some((i) => isActivePath(pathname, i.href));
          return (
            <div key={group.id}>
              <button
                type="button"
                aria-expanded={!isCollapsed}
                onClick={() => toggle(group.id)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-base font-bold text-ink transition-colors hover:bg-stone"
              >
                <span className="flex-1">{group.title}</span>
                {isCollapsed && hasActive && <span className="size-1.5 rounded-full bg-primary-deep" aria-label="Có mục đang mở" />}
                <ChevronDown className={`size-4 text-muted transition-transform ${isCollapsed ? '-rotate-90' : ''}`} aria-hidden />
              </button>
              {!isCollapsed && (
                <ul className="mt-1 flex flex-col gap-1 border-l-2 border-line pl-2 ml-5">
                  {group.items.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    const Icon = NAV_ICONS[item.icon];
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          aria-current={active ? 'page' : undefined}
                          className={`flex min-h-10 items-center gap-2.5 rounded-xl px-3 py-2 text-base font-semibold transition-colors ${active ? 'bg-primary text-on-primary' : 'text-ink-2 hover:bg-stone'}`}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          <span className="min-w-0 leading-snug">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

    </aside>
  );
}
