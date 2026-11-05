'use client';

// Thanh tiêu đề trải ngang 100% theo chuẩn KhungUngDung.tsx & CaNhanApp.module.css (dự án 01. TSUKUBA).
import { SearchIcon, ThreeBarsIcon } from '@primer/octicons-react';
import { IconButton, TextInput } from '@primer/react';
import { KeybindingHint } from '@primer/react/experimental';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { CampusOption, CampusScope } from '@/lib/campus';
import { CampusPicker } from './CampusPicker';
import { NotificationBell } from './NotificationBell';
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
    <header className="sticky top-0 z-40 flex h-[52px] shrink-0 items-center gap-2 border-b border-[var(--menu-border)] bg-[var(--bar-bg)] px-4 backdrop-blur-md transition-colors duration-200 max-[767px]:h-[56px] max-[767px]:px-3">
      <IconButton
        icon={ThreeBarsIcon}
        aria-label="Mở menu"
        variant="invisible"
        unsafeDisableTooltip
        onClick={onOpenMenu}
        className="!size-[var(--icon-h)] shrink-0 min-[1200px]:!hidden max-[767px]:!hidden"
      />

      <Link
        href="/tong-quan"
        aria-label="ESL Center, về trang Tổng quan"
        className="group flex shrink-0 items-center gap-2 whitespace-nowrap text-[var(--fgColor-default)]"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-[6px] bg-[var(--primary)] text-xs font-bold tracking-tight text-[var(--on-primary)] shadow-[0_1px_2px_rgba(15,23,42,0.16)] transition-transform duration-150 group-hover:scale-[1.04]">
          ESL
        </span>
        <span className="text-sm font-bold tracking-tight text-[var(--fgColor-default)]">ESL Center</span>
        <span className="hidden rounded-[var(--borderRadius-small)] border border-[color-mix(in_srgb,var(--primary)_24%,var(--borderColor-default))] bg-[var(--primary-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--primary-deep)] transition-colors min-[960px]:inline-block">
          Quản lý trung tâm
        </span>
      </Link>

      <div className="flex-1" />

      <form
        onSubmit={onSearch}
        role="search"
        className="w-72 max-w-full [&_span[class*='TextInputWrapper']]:!border-[var(--menu-border)] [&_span[class*='TextInputWrapper']]:!bg-[color-mix(in_srgb,var(--surface)_90%,var(--primary-soft)_10%)] [&_svg]:!text-[var(--primary)] max-[1023px]:w-56 max-[767px]:hidden"
      >
        <label htmlFor="global-search" className="sr-only">
          Tìm học sinh, phụ huynh, SĐT
        </label>
        <TextInput
          ref={inputRef}
          id="global-search"
          type="search"
          block
          leadingVisual={SearchIcon}
          trailingVisual={() => <KeybindingHint keys="/" size="small" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm học sinh, phụ huynh, SĐT…"
        />
      </form>

      <div className="flex shrink-0 items-center gap-1">
        <CampusPicker campuses={campuses} scope={campusScope} allowAll={campusAllowAll} />
        <NotificationBell />
        <ThemeMenu />
        <UserMenu name={userName} email={userEmail} role={userRole} canSettings={canSettings} />
      </div>
    </header>
  );
}
