'use client';

// Bộ điều khiển dùng trực tiếp thành phần từ `@/components-ui` (01. TSUKUBA) + `@primer/react` v38:
// - TextInput → `@/components-ui` TextInput (hỗ trợ debounce + trạng thái lỗi Primer)
// - Tag → `@/components-ui` Tag (nhãn màu pastel sáng theo semantic token)
// - SegmentedSwitch → `@/components-ui` SegementedControlWraper + `@primer/react` SegmentedControl
// - ChipGroup / Chip → Thanh lọc phân đoạn trượt mượt bằng framer-motion layoutId (cao chuẩn 32px máy tính)
// - Pagination → tích hợp `@/components-ui` Paging & `@primer/react` Pagination
import type { Icon } from '@primer/octicons-react';
import {
  Pagination as PrimerPagination,
  SegmentedControl,
  UnderlineNav,
} from '@primer/react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  createContext,
  useContext,
  useId,
  type ButtonHTMLAttributes,
  type ElementType,
  type InputHTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import UiPaging from '@/components-ui/paging';
import SegementedControlWraper from '@/components-ui/segementd-control-wrapper';
import UiTag from '@/components-ui/tag';
import UiTextInput from '@/components-ui/text-input';

const CTL_BOX =
  'h-[var(--ctl-h)] min-w-0 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-sm text-[var(--fgColor-default)] outline-none placeholder:text-[var(--fgColor-muted)] focus:border-[var(--focus-outlineColor)] max-[767px]:h-[var(--ctl-h-touch)] max-[767px]:text-input';

export const CTL_FIELD = `${CTL_BOX} w-full px-2.5`;

export function TextInput({
  error = false,
  leadingVisual,
  trailingVisual,
  onValueDelayChanged,
  className = '',
  size: _htmlSize,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
  leadingVisual?: ElementType | ReactElement | null;
  trailingVisual?: ElementType | ReactElement | null;
  onValueDelayChanged?: (value: string) => void;
}) {
  void _htmlSize;
  return (
    <UiTextInput
      {...rest}
      block
      leadingVisual={leadingVisual ?? undefined}
      trailingVisual={trailingVisual ?? undefined}
      onValueDelayChanged={onValueDelayChanged}
      validationStatus={error ? 'error' : undefined}
      className={clsx('!min-w-0', className)}
    />
  );
}

export function SegmentedSwitch<T extends string>({
  label,
  options,
  value,
  onChange,
  className = '',
}: {
  label: string;
  options: Array<{ value: T; label: string; icon?: Icon }>;
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <SegementedControlWraper className={className}>
      <SegmentedControl aria-label={label}>
        {options.map((opt) => (
          <SegmentedControl.Button
            key={opt.value}
            selected={opt.value === value}
            leadingIcon={opt.icon}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </SegmentedControl.Button>
        ))}
      </SegmentedControl>
    </SegementedControlWraper>
  );
}

type ChipGroupState = { mode: 'standalone' | 'segmented' | 'underline'; groupId: string };
const ChipGroupContext = createContext<ChipGroupState>({ mode: 'standalone', groupId: 'standalone' });

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
  const groupId = useId();
  if (tabs) {
    return (
      <ChipGroupContext.Provider value={{ mode: 'underline', groupId }}>
        <UnderlineNav aria-label={label} className={clsx('!w-auto !border-b-0 !px-0 !py-0', className)}>
          {children}
        </UnderlineNav>
      </ChipGroupContext.Provider>
    );
  }
  return (
    <ChipGroupContext.Provider value={{ mode: 'segmented', groupId }}>
      <div
        role="group"
        aria-label={label}
        className={clsx(
          'inline-flex flex-wrap items-center gap-0.5 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] p-0.5',
          className,
        )}
      >
        {children}
      </div>
    </ChipGroupContext.Provider>
  );
}

export function Chip({
  selected,
  count,
  href,
  tab = false,
  className = '',
  children,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean; count?: number; href?: string; tab?: boolean }) {
  const { mode, groupId } = useContext(ChipGroupContext);

  if (mode === 'underline') {
    if (href) {
      return (
        <UnderlineNav.Item
          as={Link}
          href={href}
          aria-current={selected ? 'page' : undefined}
          counter={count}
        >
          <span className="inline-flex items-center gap-1.5">{children}</span>
        </UnderlineNav.Item>
      );
    }
    return (
      <UnderlineNav.Item
        as="button"
        aria-current={selected ? 'page' : undefined}
        counter={count}
        onSelect={(e) => {
          e.preventDefault();
          onClick?.(e as unknown as ReactMouseEvent<HTMLButtonElement>);
        }}
      >
        <span className="inline-flex items-center gap-1.5">{children}</span>
      </UnderlineNav.Item>
    );
  }

  const segmented = mode === 'segmented';
  const pillCls = clsx(
    'relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap text-[13px] transition-colors select-none',
    segmented
      ? 'h-[var(--ctl-h)] rounded-[calc(var(--borderRadius-medium)-2px)] px-2.5 max-[767px]:h-[var(--chip-h-touch)]'
      : 'h-[var(--ctl-h)] rounded-[var(--borderRadius-medium)] border px-3 max-[767px]:h-[var(--chip-h-touch)]',
    segmented
      ? selected
        ? 'font-medium text-[var(--fgColor-default)]'
        : 'bg-transparent font-normal text-[var(--fgColor-muted)] hover:text-[var(--fgColor-default)]'
      : selected
        ? 'border-[var(--borderColor-accent-emphasis)] bg-[var(--primary-soft)] font-medium text-[var(--primary-deep)]'
        : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] font-normal text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)]',
    className,
  );

  const slidingBg =
    segmented && selected ? (
      <motion.span
        layoutId={`tsukuba-chip-${groupId}`}
        transition={{ type: 'spring', stiffness: 520, damping: 38 }}
        className="pointer-events-none absolute inset-0 rounded-[calc(var(--borderRadius-medium)-2px)] bg-[var(--bgColor-default)] shadow-[0_1px_2px_rgba(31,35,40,0.08),0_0_0_1px_var(--borderColor-default)]"
        aria-hidden
      />
    ) : null;

  const counterNode =
    count !== undefined ? (
      <span
        className={clsx(
          'relative z-[1] inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] leading-none tabular-nums',
          selected
            ? 'bg-[var(--primary-soft)] font-medium text-[var(--primary-deep)]'
            : 'bg-[var(--bgColor-neutral-muted)] font-normal text-[var(--fgColor-muted)]',
        )}
      >
        {count}
      </span>
    ) : null;

  const labelNode = <span className="relative z-[1] inline-flex items-center gap-1.5">{children}</span>;

  if (href) {
    return (
      <Link
        href={href}
        scroll={false}
        role={tab ? 'tab' : undefined}
        aria-selected={tab ? selected : undefined}
        aria-current={!tab && selected ? 'page' : undefined}
        className={pillCls}
      >
        {slidingBg}
        {labelNode}
        {counterNode}
      </Link>
    );
  }

  return (
    <button
      type="button"
      role={tab ? 'tab' : undefined}
      aria-selected={tab ? selected : undefined}
      aria-pressed={tab ? undefined : selected}
      onClick={onClick}
      className={pillCls}
      {...rest}
    >
      {slidingBg}
      {labelNode}
      {counterNode}
    </button>
  );
}

// Thẻ nhãn dữ liệu dùng `Tag` của `@/components-ui`
export function Tag({ href, children, className = '' }: { href?: string; children: ReactNode; className?: string }) {
  const content = (
    <UiTag variant="default" className={clsx('!inline-flex items-center gap-1', href && 'cursor-pointer hover:opacity-85', className)}>
      {children}
    </UiTag>
  );
  if (href) {
    return (
      <Link href={href} scroll={false} className="inline-flex">
        {content}
      </Link>
    );
  }
  return content;
}

type PaginationProps = {
  page: number;
  pageCount: number;
  totalCount?: number;
  pageSize?: number;
  label?: string;
  summary?: string;
} & (
  | { hrefFor: (page: number) => string }
  | { onPage: (page: number) => void }
  | { onChange: (page: number) => void }
);

export function Pagination(props: PaginationProps) {
  const { page, pageCount, totalCount, pageSize = 20, label, summary } = props;
  const infoText = summary ?? `Trang ${page} / ${pageCount}`;

  if (pageCount <= 1) {
    return summary ? (
      <div className="flex items-center justify-between text-xs text-[var(--fgColor-muted)]">
        <span>{summary}</span>
      </div>
    ) : null;
  }

  const handleSelect = (n: number) => {
    if ('onPage' in props) props.onPage(n);
    else if ('onChange' in props) props.onChange(n);
  };

  if (!('hrefFor' in props)) {
    return (
      <nav aria-label={label ?? 'Phân trang'} className="py-0.5 [&_[class*='prc-Pagination-']]:!m-0 [&_a]:!h-7 [&_a]:!min-w-7 [&_a]:!leading-none">
        <UiPaging
          data={{
            page_index: Math.max(0, page - 1),
            page_size: pageSize,
            page_count: pageCount,
            total_count: totalCount ?? pageCount * pageSize,
          }}
          onValueChanged={(next) => handleSelect(next.page_index + 1)}
        />
      </nav>
    );
  }

  return (
    <nav
      aria-label={label ?? 'Phân trang'}
      className="flex flex-wrap items-center justify-between gap-2 py-0.5 text-xs text-[var(--fgColor-muted)] [&_[class*='prc-Pagination-']]:!m-0 [&_a]:!h-7 [&_a]:!min-w-7 [&_a]:!leading-none"
    >
      <span>{infoText}</span>
      <PrimerPagination
        pageCount={pageCount}
        currentPage={page}
        marginPageCount={1}
        surroundingPageCount={1}
        hrefBuilder={(n) => props.hrefFor(n)}
        renderPage={({ number, children, key, ...pageProps }) => (
          <Link key={key} {...pageProps} href={props.hrefFor(number)} scroll={false}>
            {children}
          </Link>
        )}
      />
    </nav>
  );
}
