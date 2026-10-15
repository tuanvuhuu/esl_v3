'use client';

import { ChevronDown, House, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
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

// Bỏ dấu và chữ hoa để gõ "hoc sinh" vẫn ra "Học sinh"
function fold(text: string): string {
  return text.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Thanh bên web (từ 1200px: cố định, 208px). Từ 768 đến 1199px: ngăn kéo. Điện thoại: không hiện.
// Thanh cuộn chỉ hiện khi rê chuột vào menu (class scroll-quiet trong globals.css).
export function Sidebar({ groups, open, onNavigate }: { groups: NavGroup[]; open: boolean; onNavigate: () => void }) {
  const pathname = usePathname();
  const [storedCollapsed, setStoredCollapsed] = useLocalStorage(COLLAPSE_KEY, '[]');
  const [query, setQuery] = useState('');
  const collapsed = new Set(parseIdList(storedCollapsed));
  const needle = fold(query.trim());
  const searching = needle !== '';

  // Đang tìm: chỉ giữ mục khớp và mở sẵn mọi nhóm
  const shown = searching
    ? groups.map((g) => ({ ...g, items: g.items.filter((i) => fold(i.label).includes(needle)) })).filter((g) => g.items.length > 0)
    : groups;
  const homeShown = !searching || fold(HOME_ITEM.label).includes(needle);
  const nothing = searching && !homeShown && shown.length === 0;
  const homeActive = isActivePath(pathname, HOME_ITEM.href);

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
        'scroll-quiet flex flex-col gap-4 overflow-y-auto bg-surface px-3 py-4',
        'max-[767px]:hidden',
        'min-[1200px]:sticky min-[1200px]:top-0 min-[1200px]:h-screen min-[1200px]:w-52 min-[1200px]:border-r min-[1200px]:border-line',
        'max-[1199px]:fixed max-[1199px]:inset-y-0 max-[1199px]:left-0 max-[1199px]:z-[56] max-[1199px]:w-[min(272px,86vw)] max-[1199px]:rounded-r-[24px] max-[1199px]:shadow-lift max-[1199px]:transition-transform max-[1199px]:duration-300',
        open ? 'max-[1199px]:translate-x-0' : 'max-[1199px]:-translate-x-[104%]',
      ].join(' ')}
    >
      <Link href={HOME_ITEM.href} aria-label="ESL Center, về trang Tổng quan" className="flex items-center gap-2.5 px-1.5">
        <span className="grid size-8 place-items-center rounded-[10px] bg-primary text-md font-extrabold text-on-primary">E</span>
        <div>
          <b className="block text-base leading-tight text-ink">ESL Center</b>
          <small className="block text-2xs text-muted">Quản lý trung tâm</small>
        </div>
      </Link>

      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm chức năng"
          aria-label="Tìm kiếm chức năng"
          autoComplete="off"
          className="h-8 w-full rounded-lg border border-line bg-bg pl-2.5 pr-7 text-sm text-ink outline-none placeholder:text-muted focus:border-primary-deep [&::-webkit-search-cancel-button]:hidden"
        />
        <Search className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
      </div>

      <nav className="flex flex-col gap-2" aria-label="Các mục quản lý">
        {homeShown && (
          <Link
            href={HOME_ITEM.href}
            onClick={onNavigate}
            aria-current={homeActive ? 'page' : undefined}
            className={`flex min-h-8 items-center gap-2 rounded-lg px-2.5 py-1 text-sm font-semibold transition-colors ${homeActive ? 'bg-primary-soft text-ink' : 'text-ink hover:bg-stone'}`}
          >
            <House className="size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 leading-snug">{HOME_ITEM.label}</span>
          </Link>
        )}
        {shown.map((group) => {
          const isCollapsed = !searching && collapsed.has(group.id);
          const hasActive = group.items.some((i) => isActivePath(pathname, i.href));
          return (
            <div key={group.id}>
              <button
                type="button"
                aria-expanded={!isCollapsed}
                disabled={searching}
                onClick={() => toggle(group.id)}
                className="flex min-h-8 w-full items-center gap-2 rounded-lg px-2.5 py-1 text-left text-sm font-bold text-ink transition-colors hover:bg-stone disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span className="flex-1">{group.title}</span>
                {isCollapsed && hasActive && <span className="size-1.5 rounded-full bg-primary-deep" aria-label="Có mục đang mở" />}
                {!searching && <ChevronDown className={`size-3.5 text-muted transition-transform ${isCollapsed ? '-rotate-90' : ''}`} aria-hidden />}
              </button>
              {!isCollapsed && (
                <ul className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l-2 border-line pl-1.5">
                  {group.items.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    const Icon = NAV_ICONS[item.icon];
                    return (
                      <li key={item.href} className="relative">
                        {active && <span aria-hidden className="absolute -left-[9px] bottom-1 top-1 w-[3px] rounded-full bg-primary-deep" />}
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          aria-current={active ? 'page' : undefined}
                          className={`flex min-h-8 items-center gap-2 rounded-lg px-2.5 py-1 text-sm font-semibold transition-colors ${active ? 'bg-primary-soft text-ink' : 'text-ink-2 hover:bg-stone'}`}
                        >
                          <Icon className="size-3.5 shrink-0" aria-hidden />
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
        {nothing && <p className="px-2.5 text-xs text-muted">Không có chức năng phù hợp.</p>}
      </nav>
    </aside>
  );
}
