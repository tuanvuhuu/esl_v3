'use client';

// Bộ điều khiển dùng trực tiếp thành phần từ `@/components-ui` (01. TSUKUBA) + `@primer/react` v38:
// - TextInput → `@/components-ui` TextInput (hỗ trợ debounce + trạng thái lỗi Primer)
// - Tag → `@/components-ui` Tag (nhãn màu muted theo semantic token)
// - SegmentedSwitch → `@/components-ui` SegementedControlWraper + `@primer/react` SegmentedControl
// - ChipGroup / Chip → `@primer/react` UnderlineNav + Button + CounterLabel
// - Pagination → tích hợp `@/components-ui` Paging & `@primer/react` Pagination
import type { Icon } from '@primer/octicons-react';
import {
  Button,
  CounterLabel,
  LinkButton,
  Pagination as PrimerPagination,
  SegmentedControl,
  UnderlineNav,
} from '@primer/react';
import clsx from 'clsx';
import Link from 'next/link';
import {
  createContext,
  useContext,
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

const UnderlineTabContext = createContext(false);

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
  if (tabs) {
    return (
      <UnderlineTabContext.Provider value={true}>
        <UnderlineNav aria-label={label} className={clsx('!w-auto !border-b-0 !px-0 !py-0', className)}>
          {children}
        </UnderlineNav>
      </UnderlineTabContext.Provider>
    );
  }
  return (
    <div role="group" aria-label={label} className={clsx('flex flex-wrap items-center gap-1.5', className)}>
      {children}
    </div>
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
  const inUnderlineNav = useContext(UnderlineTabContext);

  if (inUnderlineNav) {
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

  if (href) {
    return (
      <LinkButton
        as={Link}
        href={href}
        variant={selected ? 'primary' : 'default'}
        role={tab ? 'tab' : undefined}
        aria-selected={tab ? selected : undefined}
        aria-current={!tab && selected ? 'page' : undefined}
        className={className}
      >
        <span className="inline-flex items-center gap-1.5">{children}</span>
        {count !== undefined && (
          <CounterLabel className="ml-1.5 !font-normal">{count}</CounterLabel>
        )}
      </LinkButton>
    );
  }

  return (
    <Button
      type="button"
      variant={selected ? 'primary' : 'default'}
      count={count}
      role={tab ? 'tab' : undefined}
      aria-selected={tab ? selected : undefined}
      aria-pressed={tab ? undefined : selected}
      onClick={onClick}
      className={className}
      {...rest}
    >
      <span className="inline-flex items-center gap-1.5">{children}</span>
    </Button>
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
      <nav aria-label={label ?? 'Phân trang'} className="border-t border-[var(--borderColor-muted)] pt-2">
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
    <nav aria-label={label ?? 'Phân trang'} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--borderColor-muted)] pt-3 text-xs text-[var(--fgColor-muted)]">
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
