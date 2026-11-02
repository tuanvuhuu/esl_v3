'use client';

// Điều khiển dùng chung trên nền @primer/react v38: TextInput, Chip, Tag, ChipGroup và Pagination.
// Cao đúng chuẩn --ctl-h (32px) trên máy tính, --ctl-h-touch (44px) trên điện thoại.
import { ChevronLeftIcon, ChevronRightIcon } from '@primer/octicons-react';
import { CounterLabel, TextInput as PrimerTextInput } from '@primer/react';
import clsx from 'clsx';
import Link from 'next/link';
import type { ButtonHTMLAttributes, ElementType, InputHTMLAttributes, ReactElement, ReactNode } from 'react';

const CTL_BOX =
  'h-[var(--ctl-h)] min-w-0 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-sm text-[var(--fgColor-default)] outline-none placeholder:text-[var(--fgColor-muted)] focus:border-[var(--focus-outlineColor)] max-[767px]:h-[var(--ctl-h-touch)] max-[767px]:text-input';

export const CTL_FIELD = `${CTL_BOX} w-full px-2.5`;

export function TextInput({
  error = false,
  leadingVisual,
  trailingVisual,
  className = '',
  size: _htmlSize,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
  leadingVisual?: ElementType | ReactElement | null;
  trailingVisual?: ElementType | ReactElement | null;
}) {
  void _htmlSize;
  return (
    <PrimerTextInput
      {...rest}
      block
      leadingVisual={leadingVisual}
      trailingVisual={trailingVisual}
      validationStatus={error ? 'error' : undefined}
      className={clsx('!min-w-0', className)}
    />
  );
}

// Chip lọc và chip tab. Có href thì là liên kết (lọc qua URL), không thì là nút.
const CHIP =
  'inline-flex h-[var(--ctl-h)] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-colors max-[767px]:h-[var(--chip-h-touch)] max-[767px]:text-xs';

export function Chip({
  selected,
  count,
  href,
  tab = false,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean; count?: number; href?: string; tab?: boolean }) {
  const tone = selected
    ? 'border-[var(--button-primary-borderColor-rest)] bg-[var(--button-primary-bgColor-rest)] text-[var(--button-primary-fgColor-rest)] font-semibold'
    : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)]';
  const body = (
    <>
      {children}
      {count !== undefined && (
        <CounterLabel className="!font-normal">
          {count}
        </CounterLabel>
      )}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        scroll={false}
        role={tab ? 'tab' : undefined}
        aria-selected={tab ? selected : undefined}
        aria-current={!tab && selected ? 'page' : undefined}
        className={clsx(CHIP, tone, className)}
      >
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
      className={clsx(CHIP, tone, className)}
    >
      {body}
    </button>
  );
}

// Thẻ nhãn dữ liệu (con của phụ huynh, lớp của giáo viên)
export function Tag({ href, children, className = '' }: { href?: string; children: ReactNode; className?: string }) {
  const cls = clsx(
    'inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-2.5 py-0.5 text-sm font-normal text-[var(--fgColor-default)]',
    href && 'hover:border-[var(--borderColor-accent-emphasis)] hover:text-[var(--fgColor-link)] hover:underline',
    className,
  );
  if (href) {
    return (
      <Link href={href} scroll={false} className={cls}>
        {children}
      </Link>
    );
  }
  return <span className={cls}>{children}</span>;
}

export function ChipGroup({
  label,
  tabs = false,
  className = '',
  children,
}: {
  label: string;
  tabs?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role={tabs ? 'tablist' : 'group'} aria-label={label} className={clsx('flex flex-wrap items-center gap-2', className)}>
      {children}
    </div>
  );
}

// Phân trang dùng chung theo chuẩn Primer + 01. TSUKUBA
const PAGE_BTN =
  'inline-flex h-[var(--ctl-h)] min-w-[var(--ctl-h)] items-center justify-center rounded-[var(--borderRadius-medium)] border px-2 text-sm font-semibold transition-colors max-[767px]:h-[var(--ctl-h-touch)] max-[767px]:min-w-[var(--ctl-h-touch)]';

type PageTarget = { href: string } | { onClick: () => void };

function PageLink({
  target,
  label,
  current = false,
  disabled = false,
  children,
}: {
  target: PageTarget;
  label: string;
  current?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        aria-label={label}
        className={clsx(PAGE_BTN, 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-muted)] opacity-45')}
      >
        {children}
      </span>
    );
  }
  const tone = clsx(
    PAGE_BTN,
    current
      ? 'border-[var(--button-primary-borderColor-rest)] bg-[var(--button-primary-bgColor-rest)] text-[var(--button-primary-fgColor-rest)]'
      : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]',
  );
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
  hrefFor?: (p: number) => string;
  onPage?: (p: number) => void;
  label?: string;
}) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  const to = (p: number): PageTarget => (hrefFor ? { href: hrefFor(p) } : { onClick: () => onPage?.(p) });
  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <small className="text-sm text-[var(--fgColor-muted)]">
        Trang {page} / {pageCount}
      </small>
      <div className="flex items-center gap-1.5">
        <PageLink disabled={page <= 1} target={to(page - 1)} label="Trang trước">
          <ChevronLeftIcon size={16} aria-hidden />
        </PageLink>
        {pages.map((p) => (
          <PageLink key={p} target={to(p)} current={p === page} label={`Trang ${p}`}>
            {p}
          </PageLink>
        ))}
        <PageLink disabled={page >= pageCount} target={to(page + 1)} label="Trang sau">
          <ChevronRightIcon size={16} aria-hidden />
        </PageLink>
      </div>
    </nav>
  );
}
