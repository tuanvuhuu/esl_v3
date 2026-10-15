// Điều khiển dùng chung (docs/DESIGN.md mục 8): ô nhập, ô chọn, chip, và phân trang.
// Mọi thứ cao đúng token --ctl-h (32px) trên máy tính, --ctl-h-touch (44px) trên điện thoại.
import Link from 'next/link';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

// Khung chung của ô nhập và ô chọn
const CTL_BOX =
  'h-[var(--ctl-h)] min-w-0 rounded-[var(--radius-ctl)] border border-line bg-surface text-sm text-ink outline-none placeholder:text-muted focus:border-primary-deep max-[767px]:h-[var(--ctl-h-touch)] max-[767px]:text-input';

// Dùng cho ô nhập trong form (Field.inputClass)
export const CTL_FIELD = `${CTL_BOX} w-full px-2.5`;

export function TextInput({ error = false, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return <input {...rest} className={`${CTL_BOX} w-full px-2.5 ${error ? 'border-blush-ink' : ''} ${className}`} />;
}

// Chip lọc và chip tab (chuẩn trang Học sinh). Có href thì là liên kết (lọc qua URL), không thì là nút.
const CHIP =
  'inline-flex h-[var(--ctl-h)] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors max-[767px]:h-[var(--chip-h-touch)] max-[767px]:text-xs';

export function Chip({
  selected,
  count,
  href,
  tab = false,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean; count?: number; href?: string; tab?: boolean }) {
  const tone = selected ? 'bg-primary text-on-primary' : 'bg-stone text-stone-ink hover:bg-line';
  const body = (
    <>
      {children}
      {count !== undefined && <b className={`text-xs font-normal ${selected ? 'opacity-80' : 'opacity-60'}`}>{count}</b>}
    </>
  );
  if (href) {
    return (
      <Link href={href} scroll={false} role={tab ? 'tab' : undefined} aria-selected={tab ? selected : undefined} aria-current={!tab && selected ? 'page' : undefined} className={`${CHIP} ${tone} ${className}`}>
        {body}
      </Link>
    );
  }
  return (
    <button
      type="button"
      role={tab ? 'tab' : undefined}
      aria-selected={tab ? selected : undefined}
      aria-pressed={tab ? undefined : selected}
      {...rest}
      className={`${CHIP} ${tone} ${className}`}
    >
      {body}
    </button>
  );
}

// Thẻ nhãn dữ liệu (con của phụ huynh, lớp của giáo viên): không phải nút lọc, cỡ chữ nhỏ hơn chip
export function Tag({ href, children, className = '' }: { href?: string; children: ReactNode; className?: string }) {
  const cls = `inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-stone px-2.5 py-1 text-sm font-normal text-stone-ink ${href ? 'hover:text-ink hover:underline' : ''} ${className}`;
  if (href) {
    return (
      <Link href={href} scroll={false} className={cls}>
        {children}
      </Link>
    );
  }
  return <span className={cls}>{children}</span>;
}

export function ChipGroup({ label, tabs = false, className = '', children }: { label: string; tabs?: boolean; className?: string; children: ReactNode }) {
  return (
    <div role={tabs ? 'tablist' : 'group'} aria-label={label} className={`flex flex-wrap items-center gap-2 ${className}`}>
      {children}
    </div>
  );
}

// Phân trang dùng chung: ô số cùng cỡ với ô nhập
const PAGE_BTN =
  'grid h-[var(--ctl-h)] min-w-[var(--ctl-h)] place-items-center rounded-[var(--radius-ctl)] border px-2 text-sm font-bold transition-colors max-[767px]:h-[var(--ctl-h-touch)] max-[767px]:min-w-[var(--ctl-h-touch)]';

// Đích của một nút trang: đường dẫn (phân trang theo URL) hoặc hàm chạy ngay trên trang (dữ liệu đã nằm trên trang)
type PageTarget = { href: string } | { onClick: () => void };

function PageLink({ target, label, current = false, disabled = false, children }: { target: PageTarget; label: string; current?: boolean; disabled?: boolean; children: ReactNode }) {
  if (disabled) {
    return (
      <span aria-disabled="true" aria-label={label} className={`${PAGE_BTN} border-line bg-surface text-ink opacity-40`}>
        {children}
      </span>
    );
  }
  const tone = `${PAGE_BTN} ${current ? 'border-primary-deep bg-primary text-on-primary' : 'border-line bg-surface text-ink hover:border-ink-2'}`;
  if ('href' in target) {
    return (
      <Link href={target.href} scroll={false} aria-label={label} aria-current={current ? 'page' : undefined} className={tone}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={target.onClick} aria-label={label} aria-current={current ? 'page' : undefined} className={tone}>
      {children}
    </button>
  );
}

export function Pagination({
  page,
  pageCount,
  hrefFor,
  onPage,
  label = 'Phân trang',
}: {
  page: number;
  pageCount: number;
  hrefFor?: (p: number) => string; // phân trang theo URL
  onPage?: (p: number) => void; // phân trang ngay trên trang
  label?: string;
}) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  const to = (p: number): PageTarget => (hrefFor ? { href: hrefFor(p) } : { onClick: () => onPage?.(p) });
  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3">
      <small className="text-sm text-muted">Trang {page} / {pageCount}</small>
      <div className="flex items-center gap-1.5">
        <PageLink disabled={page <= 1} target={to(page - 1)} label="Trang trước">‹</PageLink>
        {pages.map((p) => (
          <PageLink key={p} target={to(p)} current={p === page} label={`Trang ${p}`}>
            {p}
          </PageLink>
        ))}
        <PageLink disabled={page >= pageCount} target={to(page + 1)} label="Trang sau">›</PageLink>
      </div>
    </nav>
  );
}
