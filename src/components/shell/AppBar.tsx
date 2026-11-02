'use client';

// Thanh tiêu đề theo kiến trúc KhungUngDung.tsx của 01. TSUKUBA trên nền @primer/react v38 + Octicons.
import { SearchIcon, ThreeBarsIcon } from '@primer/octicons-react';
import { IconButton } from '@primer/react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { CampusOption, CampusScope } from '@/lib/campus';
import { CampusPicker } from './CampusPicker';
import { NotificationBell } from './NotificationBell';
import { useCrumbs } from './PageCrumbs';
import { ThemeMenu } from './ThemeMenu';
import { UserMenu } from './UserMenu';

type Props = {
  userName: string;
  userEmail: string;
  userRole: string;
  canSettings: boolean;
  campuses: CampusOption[];
  campusScope: CampusScope;
  campusAllowAll: boolean;
  onOpenMenu: () => void;
};

export function AppBar({
  userName,
  userEmail,
  userRole,
  canSettings,
  campuses,
  campusScope,
  campusAllowAll,
  onOpenMenu,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const crumbs = useCrumbs();

  const urlQuery = pathname === '/hoc-sinh' ? (searchParams.get('q') ?? '') : '';
  const [query, setQuery] = useState(urlQuery);
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/hoc-sinh?q=${encodeURIComponent(q)}` : '/hoc-sinh');
  }

  return (
    <header className="sticky top-0 z-30 flex min-h-[54px] shrink-0 items-center gap-2 border-b border-[var(--borderColor-default)] bg-[var(--bgColor-default)]/95 px-6 py-2 backdrop-blur-md max-[1199px]:px-5 max-[767px]:min-h-[56px] max-[767px]:px-4">
      <IconButton
        icon={ThreeBarsIcon}
        aria-label="Mở menu"
        variant="default"
        unsafeDisableTooltip
        onClick={onOpenMenu}
        className="!size-[var(--icon-h)] shrink-0 min-[1200px]:!hidden max-[767px]:!hidden"
      />

      <Link
        href="/tong-quan"
        aria-label="ESL Center, về trang Tổng quan"
        className="hidden items-center gap-2 max-[1199px]:flex max-[767px]:mr-auto"
      >
        <span className="grid size-8 place-items-center rounded-[var(--borderRadius-medium)] bg-[var(--button-primary-bgColor-rest)] text-sm font-extrabold text-[var(--button-primary-fgColor-rest)]">
          E
        </span>
        <b className="text-sm font-bold text-[var(--fgColor-default)]">ESL Center</b>
      </Link>

      <nav
        aria-label="Vị trí hiện tại"
        className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-sm font-medium text-[var(--fgColor-muted)] max-[767px]:hidden"
      >
        {crumbs?.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={`${i}-${c}`} className="flex min-w-0 items-center gap-2 whitespace-nowrap">
              {i > 0 && <span className="text-[var(--fgColor-muted)] opacity-60">/</span>}
              <span
                className={
                  isLast
                    ? 'truncate rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-accent-emphasis)] bg-[var(--bgColor-accent-muted)]/40 px-2.5 py-0.5 font-semibold text-[var(--fgColor-default)]'
                    : 'font-medium text-[var(--fgColor-accent)]'
                }
              >
                {c}
              </span>
            </span>
          );
        })}
      </nav>

      <form
        onSubmit={onSearch}
        role="search"
        className="flex h-[var(--ctl-h)] w-80 max-w-full items-center gap-2 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] pl-2.5 pr-2 focus-within:border-[var(--focus-outlineColor)] focus-within:ring-2 focus-within:ring-[var(--bgColor-accent-muted)] max-[1199px]:w-68 max-[767px]:hidden"
      >
        <SearchIcon size={15} className="shrink-0 text-[var(--fgColor-muted)]" aria-hidden />
        <label htmlFor="global-search" className="sr-only">
          Tìm học sinh
        </label>
        <input
          id="global-search"
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm học sinh, mã HS, SĐT"
          autoComplete="off"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--fgColor-default)] outline-none placeholder:text-[var(--fgColor-muted)] [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd
          className="rounded border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-1.5 text-2xs font-semibold leading-[18px] text-[var(--fgColor-muted)] max-[1199px]:hidden"
          aria-hidden
        >
          /
        </kbd>
      </form>

      <IconButton
        icon={SearchIcon}
        aria-label="Tìm học sinh"
        variant="default"
        unsafeDisableTooltip
        onClick={() => router.push('/hoc-sinh')}
        className="!hidden !size-[var(--icon-h-touch)] shrink-0 max-[767px]:!grid"
      />

      <CampusPicker campuses={campuses} scope={campusScope} allowAll={campusAllowAll} />

      <NotificationBell />

      <ThemeMenu />
      <UserMenu name={userName} email={userEmail} role={userRole} canSettings={canSettings} />
    </header>
  );
}
