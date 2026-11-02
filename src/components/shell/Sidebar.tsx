'use client';

// Thanh bên điều hướng theo kiến trúc KhungUngDung.tsx của dự án 01. TSUKUBA trên nền @primer/react v38 + Octicons.
import { ChevronDownIcon, ChevronRightIcon, HomeIcon, SearchIcon } from '@primer/octicons-react';
import { TextInput } from '@primer/react';
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
    .replace(/[̀-ͯ]/g, '');
}

export function Sidebar({ groups, open, onNavigate }: { groups: NavGroup[]; open: boolean; onNavigate: () => void }) {
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
        'scroll-quiet flex flex-col gap-3 overflow-y-auto bg-[var(--bgColor-default)] px-2.5 py-3',
        'max-[767px]:hidden',
        'min-[1200px]:sticky min-[1200px]:top-0 min-[1200px]:h-screen min-[1200px]:w-56 min-[1200px]:border-r min-[1200px]:border-[var(--borderColor-default)]',
        'max-[1199px]:fixed max-[1199px]:inset-y-0 max-[1199px]:left-0 max-[1199px]:z-[56] max-[1199px]:w-[min(272px,86vw)] max-[1199px]:border-r max-[1199px]:border-[var(--borderColor-default)] max-[1199px]:shadow-[var(--shadow-floating-large,var(--lift))] max-[1199px]:transition-transform max-[1199px]:duration-200',
        open ? 'max-[1199px]:translate-x-0' : 'max-[1199px]:-translate-x-[104%]',
      )}
    >
      <Link href={HOME_ITEM.href} aria-label="ESL Center, về trang Tổng quan" className="flex items-center gap-2.5 px-1.5 py-0.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-[var(--borderRadius-medium)] bg-[var(--button-primary-bgColor-rest)] text-sm font-extrabold text-[var(--button-primary-fgColor-rest)]">
          E
        </span>
        <div className="min-w-0">
          <b className="block truncate text-sm font-bold leading-tight text-[var(--fgColor-default)]">ESL Center</b>
          <small className="block truncate text-2xs text-[var(--fgColor-muted)]">Quản lý trung tâm</small>
        </div>
      </Link>

      <div className="px-0.5">
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

      <nav className="flex flex-col gap-1" aria-label="Các mục quản lý">
        {homeShown && (
          <Link
            href={HOME_ITEM.href}
            onClick={onNavigate}
            aria-current={homeActive ? 'page' : undefined}
            className={clsx(
              'relative flex min-h-8 items-center gap-2.5 rounded-[var(--borderRadius-medium)] px-2.5 py-1.5 text-sm transition-colors',
              homeActive
                ? 'bg-[var(--bgColor-accent-muted)] font-semibold text-[var(--fgColor-default)]'
                : 'font-medium text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]',
            )}
          >
            {homeActive && (
              <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[var(--primary-deep)]" />
            )}
            <HomeIcon size={16} className={homeActive ? 'shrink-0 text-[var(--fgColor-accent)]' : 'shrink-0 text-[var(--fgColor-muted)]'} aria-hidden />
            <span className="min-w-0 truncate leading-snug">{HOME_ITEM.label}</span>
          </Link>
        )}

        {shown.map((group) => {
          const isCollapsed = !searching && collapsed.has(group.id);
          const hasActive = group.items.some((i) => isActivePath(pathname, i.href));
          return (
            <div key={group.id} className="mt-0.5">
              <button
                type="button"
                aria-expanded={!isCollapsed}
                disabled={searching}
                onClick={() => toggle(group.id)}
                className="flex min-h-8 w-full items-center justify-between gap-2 rounded-[var(--borderRadius-medium)] px-2.5 py-1 text-left text-xs font-semibold uppercase tracking-wide text-[var(--fgColor-muted)] transition-colors hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)] disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span className="flex-1 truncate">{group.title}</span>
                {isCollapsed && hasActive && (
                  <span className="size-1.5 rounded-full bg-[var(--primary-deep)]" aria-label="Có mục đang mở" />
                )}
                {!searching &&
                  (isCollapsed ? <ChevronRightIcon size={14} aria-hidden /> : <ChevronDownIcon size={14} aria-hidden />)}
              </button>

              {!isCollapsed && (
                <ul className="ml-2.5 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--borderColor-default)] pl-2">
                  {group.items.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    const Icon = NAV_ICONS[item.icon];
                    return (
                      <li key={item.href} className="relative">
                        {active && (
                          <span
                            aria-hidden
                            className="absolute -left-[9px] bottom-1.5 top-1.5 w-[3px] rounded-full bg-[var(--primary-deep)]"
                          />
                        )}
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          aria-current={active ? 'page' : undefined}
                          className={clsx(
                            'flex min-h-8 items-center gap-2 rounded-[var(--borderRadius-medium)] px-2.5 py-1.5 text-sm transition-colors',
                            active
                              ? 'bg-[var(--bgColor-accent-muted)] font-semibold text-[var(--fgColor-default)]'
                              : 'font-normal text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]',
                          )}
                        >
                          <Icon
                            size={16}
                            className={clsx('shrink-0', active ? 'text-[var(--fgColor-accent)]' : 'text-[var(--fgColor-muted)]')}
                            aria-hidden
                          />
                          <span className="min-w-0 truncate leading-snug">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}

        {nothing && <p className="px-2.5 py-1 text-xs text-[var(--fgColor-muted)]">Không có chức năng phù hợp.</p>}
      </nav>
    </aside>
  );
}
