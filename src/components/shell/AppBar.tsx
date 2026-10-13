'use client';

import { Bell, Menu, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useCrumbs } from './PageCrumbs';
import { ThemeMenu } from './ThemeMenu';
import { UserMenu } from './UserMenu';

type Props = {
  userName: string;
  userEmail: string;
  userRole: string;
  canSettings: boolean;
  onOpenMenu: () => void; // chỉ dùng ở máy tính bảng (ngăn kéo menu)
};

// Thanh trên cùng: menu (máy tính bảng), tìm kiếm (phím /), chuông, giao diện, tài khoản.
export function AppBar({ userName, userEmail, userRole, canSettings, onOpenMenu }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const crumbs = useCrumbs();

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
    <header className="sticky top-0 z-30 flex min-h-[68px] items-center gap-2 border-b border-line bg-bar-bg px-8 py-3 backdrop-blur-md max-[1199px]:px-6 max-[767px]:min-h-[60px] max-[767px]:gap-2 max-[767px]:px-4 max-[767px]:py-2.5">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Mở menu"
        className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-2 hover:border-ink-2 hover:text-ink min-[1200px]:hidden max-[767px]:hidden"
      >
        <Menu className="size-[18px]" aria-hidden />
      </button>

      <div className="hidden items-center gap-2 max-[1199px]:flex">
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-md font-extrabold text-on-primary">E</span>
        <b className="text-base text-ink">ESL Center</b>
      </div>

      <nav aria-label="Vị trí hiện tại" className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-sm font-semibold text-muted max-[767px]:hidden">
        {crumbs?.map((c, i) => (
          <span key={`${i}-${c}`} className="flex min-w-0 items-center gap-2 whitespace-nowrap">
            {i > 0 && <span className="opacity-50">/</span>}
            <span className={i === crumbs.length - 1 ? 'truncate text-ink' : ''}>{c}</span>
          </span>
        ))}
      </nav>

      <form onSubmit={onSearch} role="search" className="flex h-10 w-80 max-w-full items-center gap-2 rounded-xl border border-line bg-surface pl-3 pr-2.5 focus-within:border-primary-deep focus-within:shadow-[0_0_0_3px_rgba(240,183,58,0.2)] max-[1199px]:w-70 max-[767px]:hidden">
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
        className="hidden size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-2 max-[767px]:grid"
      >
        <Search className="size-[18px]" aria-hidden />
      </button>

      <button
        type="button"
        aria-label="Thông báo"
        onClick={() => {}}
        className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-2 hover:border-ink-2 hover:text-ink"
      >
        <Bell className="size-[18px]" aria-hidden />
        <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-primary-deep ring-2 ring-surface" aria-hidden />
      </button>

      <ThemeMenu />
      <UserMenu name={userName} email={userEmail} role={userRole} canSettings={canSettings} />
    </header>
  );
}
