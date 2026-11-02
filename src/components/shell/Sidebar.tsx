'use client';

// Thanh điều hướng bên trái dùng NavList chính gốc của @primer/react v38 + ô lọc chức năng chuẩn KhungUngDung.tsx (01. TSUKUBA).
import { ChevronDownIcon, ChevronRightIcon, HomeIcon, SearchIcon } from '@primer/octicons-react';
import { CounterLabel, NavList, TextInput } from '@primer/react';
import clsx from 'clsx';
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

function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function Sidebar({
  groups,
  badges = {},
  open,
  onNavigate,
}: {
  groups: NavGroup[];
  badges?: Record<string, number>;
  open: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const [storedCollapsed, setStoredCollapsed] = useLocalStorage(COLLAPSE_KEY, '[]');
  const [query, setQuery] = useState('');
  const collapsed = new Set(parseIdList(storedCollapsed));
  const needle = fold(query.trim());
  const searching = needle !== '';

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
      className={clsx(
        'scroll-quiet flex flex-col gap-2 overflow-y-auto bg-[var(--bgColor-default)] px-2 py-3',
        'max-[767px]:hidden',
        'min-[1200px]:sticky min-[1200px]:top-[52px] min-[1200px]:h-[calc(100vh-52px)] min-[1200px]:w-[248px] min-[1200px]:border-r min-[1200px]:border-[var(--borderColor-default)]',
        'max-[1199px]:fixed max-[1199px]:inset-y-0 max-[1199px]:left-0 max-[1199px]:z-[56] max-[1199px]:w-[min(272px,86vw)] max-[1199px]:border-r max-[1199px]:border-[var(--borderColor-default)] max-[1199px]:shadow-[var(--shadow-floating-large,var(--lift))] max-[1199px]:transition-transform max-[1199px]:duration-200',
        open ? 'max-[1199px]:translate-x-0' : 'max-[1199px]:-translate-x-[104%]',
      )}
    >
      <div className="px-1 pb-1">
        <TextInput
          block
          type="search"
          leadingVisual={SearchIcon}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm chức năng"
          aria-label="Tìm kiếm chức năng"
          autoComplete="off"
        />
      </div>

      <NavList aria-label="Các mục quản lý">
        {homeShown && (
          <NavList.Item as={Link} href={HOME_ITEM.href} onClick={onNavigate} aria-current={homeActive ? 'page' : undefined}>
            <NavList.LeadingVisual>
              <HomeIcon size={16} />
            </NavList.LeadingVisual>
            {HOME_ITEM.label}
          </NavList.Item>
        )}

        {shown.map((group) => {
          const isCollapsed = !searching && collapsed.has(group.id);
          const hasActive = group.items.some((i) => isActivePath(pathname, i.href));
          return (
            <div key={group.id} className="mt-1">
              <button
                type="button"
                aria-expanded={!isCollapsed}
                disabled={searching}
                onClick={() => toggle(group.id)}
                className="flex h-8 w-full items-center justify-between gap-2 rounded-[var(--borderRadius-medium)] px-2 text-left text-xs font-semibold text-[var(--fgColor-muted)] transition-colors hover:bg-[var(--bgColor-neutral-muted)] hover:text-[var(--fgColor-default)] disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span className="flex-1 truncate uppercase tracking-wider">{group.title}</span>
                {isCollapsed && hasActive && (
                  <span className="size-1.5 rounded-full bg-[var(--primary)]" aria-label="Có mục đang mở" />
                )}
                {!searching &&
                  (isCollapsed ? <ChevronRightIcon size={14} aria-hidden /> : <ChevronDownIcon size={14} aria-hidden />)}
              </button>

              {!isCollapsed &&
                group.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = NAV_ICONS[item.icon];
                  const count = badges[item.href] ?? 0;
                  return (
                    <NavList.Item
                      key={item.href}
                      as={Link}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                    >
                      <NavList.LeadingVisual>
                        <Icon size={16} />
                      </NavList.LeadingVisual>
                      {item.label}
                      {count > 0 && (
                        <NavList.TrailingVisual>
                          <CounterLabel scheme="primary">{count > 99 ? '99+' : count}</CounterLabel>
                        </NavList.TrailingVisual>
                      )}
                    </NavList.Item>
                  );
                })}
            </div>
          );
        })}
      </NavList>

      {nothing && <p className="px-3 py-2 text-xs text-[var(--fgColor-muted)]">Không có chức năng phù hợp.</p>}
    </aside>
  );
}
