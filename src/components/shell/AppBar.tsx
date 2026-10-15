'use client';

import { Menu, Search } from 'lucide-react';
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
  onOpenMenu: () => void; // chỉ dùng ở máy tính bảng (ngăn kéo menu)
};

// Thanh trên cùng: menu (máy tính bảng), tìm kiếm (phím /), cơ sở, chuông, giao diện, tài khoản.
export function AppBar({ userName, userEmail, userRole, canSettings, campuses, campusScope, onOpenMenu }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const crumbs = useCrumbs();

  // Ô tìm chỉ hiện chữ khi đang ở trang Học sinh (lấy từ ?q=). Sang trang khác thì ô trống, không để chữ cũ nằm lại.
  const urlQuery = pathname === '/hoc-sinh' ? (searchParams.get('q') ?? '') : '';
  const [query, setQuery] = useState(urlQuery);
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  // Phím "/" đưa con trỏ vào ô tìm kiếm khi không đang gõ ở ô khác
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
    <header className="sticky top-0 z-30 flex shrink-0 min-h-[60px] items-center gap-2 border-b border-line bg-bar-bg px-6 py-2 backdrop-blur-md max-[1199px]:px-5 max-[767px]:min-h-[60px] max-[767px]:gap-2 max-[767px]:px-4 max-[767px]:py-2.5">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Mở menu"
        className="grid size-[var(--icon-h)] shrink-0 place-items-center rounded-[var(--radius-ctl)] border border-line bg-surface text-ink-2 hover:border-ink-2 hover:text-ink min-[1200px]:hidden max-[767px]:hidden"
      >
        <Menu className="size-[18px]" aria-hidden />
      </button>

      <Link href="/tong-quan" aria-label="ESL Center, về trang Tổng quan" className="hidden items-center gap-2 max-[1199px]:flex">
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-md font-extrabold text-on-primary">E</span>
        <b className="text-base text-ink">ESL Center</b>
      </Link>

      <nav aria-label="Vị trí hiện tại" className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-sm font-semibold text-muted max-[767px]:hidden">
        {crumbs?.map((c, i) => (
          <span key={`${i}-${c}`} className="flex min-w-0 items-center gap-2 whitespace-nowrap">
            {i > 0 && <span className="opacity-50">/</span>}
            <span className={i === crumbs.length - 1 ? 'truncate text-ink' : ''}>{c}</span>
          </span>
        ))}
      </nav>

      <form onSubmit={onSearch} role="search" className="flex h-[var(--ctl-h)] w-80 max-w-full items-center gap-2 rounded-[var(--radius-ctl)] border border-line bg-surface pl-2.5 pr-2 focus-within:border-primary-deep focus-within:shadow-[0_0_0_3px_rgba(240,183,58,0.2)] max-[1199px]:w-70 max-[767px]:hidden">
        <Search className="size-4 shrink-0 text-muted" aria-hidden />
        <label htmlFor="global-search" className="sr-only">Tìm học sinh</label>
        <input
          id="global-search"
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm học sinh, mã HS, SĐT"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd className="rounded-md border border-line px-1.5 text-xs font-bold leading-[18px] text-muted max-[1199px]:hidden" aria-hidden>
          /
        </kbd>
      </form>

      <button
        type="button"
        onClick={() => router.push('/hoc-sinh')}
        aria-label="Tìm học sinh"
        className="hidden size-[var(--icon-h-touch)] shrink-0 place-items-center rounded-[var(--radius-ctl)] border border-line bg-surface text-ink-2 max-[767px]:grid"
      >
        <Search className="size-[18px]" aria-hidden />
      </button>

      <CampusPicker campuses={campuses} scope={campusScope} />

      <NotificationBell />

      <ThemeMenu />
      <UserMenu name={userName} email={userEmail} role={userRole} canSettings={canSettings} />
    </header>
  );
}
