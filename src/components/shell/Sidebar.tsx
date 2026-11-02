'use client';

// Thanh điều hướng bên trái đồng bộ KhungUngDung.tsx & AppLayout.module.css (01. TSUKUBA) + vạch trượt mượt framer-motion.
import { ChevronDownIcon, HomeIcon, SearchIcon } from '@primer/octicons-react';
import { TextInput } from '@primer/react';
import clsx from 'clsx';
import { motion, useReducedMotion } from 'framer-motion';
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
  const shouldReduceMotion = useReducedMotion();
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
        'scroll-quiet flex flex-col gap-1 overflow-y-auto bg-[var(--bgColor-default)] px-2.5 py-3',
        'max-[767px]:hidden',
        'min-[1200px]:sticky min-[1200px]:top-[52px] min-[1200px]:h-[calc(100vh-52px)] min-[1200px]:w-[244px] min-[1200px]:border-r min-[1200px]:border-[var(--borderColor-default)]',
        'max-[1199px]:fixed max-[1199px]:inset-y-0 max-[1199px]:left-0 max-[1199px]:z-[56] max-[1199px]:w-[min(268px,86vw)] max-[1199px]:border-r max-[1199px]:border-[var(--borderColor-default)] max-[1199px]:shadow-[var(--shadow-floating-large,var(--lift))] max-[1199px]:transition-transform max-[1199px]:duration-200',
        open ? 'max-[1199px]:translate-x-0' : 'max-[1199px]:-translate-x-[104%]',
      )}
    >
      <div className="px-0.5 pb-1.5">
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

      <nav aria-label="Các mục quản lý" className="flex flex-col gap-0.5">
        {homeShown && (
          <Link
            href={HOME_ITEM.href}
            onClick={onNavigate}
            aria-current={homeActive ? 'page' : undefined}
            className={clsx(
              'relative flex min-h-8 items-center gap-2.5 rounded-[var(--borderRadius-medium)] px-2.5 py-1.5 text-[13px] transition-colors',
              homeActive
                ? 'bg-[var(--primary-soft)] font-semibold text-[var(--primary-deep)]'
                : 'font-normal text-[var(--fgColor-default)] hover:bg-[var(--bgColor-neutral-muted)]',
            )}
          >
            {homeActive && (
              <motion.span
                layoutId={shouldReduceMotion ? undefined : 'tsukuba-sidebar-active-bar'}
                transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                className="pointer-events-none absolute -left-1.5 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[var(--primary)]"
                aria-hidden
              />
            )}
            <HomeIcon
              size={16}
              className={clsx('shrink-0 transition-colors', homeActive ? 'text-[var(--primary)]' : 'text-[var(--fgColor-muted)]')}
            />
            <span className="min-w-0 flex-1 truncate">{HOME_ITEM.label}</span>
          </Link>
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
                className="flex h-8 w-full items-center justify-between gap-2 rounded-[var(--borderRadius-medium)] px-2 text-left text-[13px] font-semibold text-[var(--fgColor-default)] transition-colors hover:bg-[var(--bgColor-neutral-muted)] disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span className="flex-1 truncate">{group.title}</span>
                {isCollapsed && hasActive && (
                  <span className="size-1.5 rounded-full bg-[var(--primary)]" aria-label="Có mục đang mở" />
                )}
                {!searching && (
                  <ChevronDownIcon
                    size={15}
                    aria-hidden
                    className={clsx(
                      'shrink-0 text-[var(--fgColor-muted)] transition-transform duration-200',
                      isCollapsed ? '-rotate-90' : 'rotate-0',
                    )}
                  />
                )}
              </button>

              {!isCollapsed && (
                <div className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--borderColor-muted)] pl-2">
                  {group.items.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    const Icon = NAV_ICONS[item.icon];
                    const count = badges[item.href] ?? 0;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? 'page' : undefined}
                        className={clsx(
                          'relative flex min-h-8 items-center gap-2.5 rounded-[var(--borderRadius-medium)] px-2.5 py-1.5 text-[13px] transition-colors',
                          active
                            ? 'bg-[var(--primary-soft)] font-semibold text-[var(--primary-deep)]'
                            : 'font-normal text-[var(--fgColor-default)] hover:bg-[var(--bgColor-neutral-muted)]',
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId={shouldReduceMotion ? undefined : 'tsukuba-sidebar-active-bar'}
                            transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                            className="pointer-events-none absolute -left-[9.5px] top-1.5 bottom-1.5 w-[3px] rounded-full bg-[var(--primary)]"
                            aria-hidden
                          />
                        )}
                        <Icon
                          size={16}
                          className={clsx(
                            'shrink-0 transition-colors',
                            active ? 'text-[var(--primary)]' : 'text-[var(--fgColor-muted)]',
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {count > 0 && (
                          <span className="inline-flex h-[18px] min-w-5 items-center justify-center rounded-full bg-[var(--bgColor-attention-muted)] px-1.5 text-[11px] font-medium leading-none tabular-nums text-[var(--fgColor-attention)]">
                            {count > 99 ? '99+' : count}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {nothing && <p className="px-2.5 py-2 text-xs text-[var(--fgColor-muted)]">Không có chức năng phù hợp.</p>}
    </aside>
  );
}
