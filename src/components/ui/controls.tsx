'use client';

// Bộ điều khiển dùng trực tiếp thành phần Core của @primer/react v38:
// - TextInput → @primer/react TextInput
// - ChipGroup (tabs) + Chip → @primer/react UnderlineNav + UnderlineNav.Item
// - ChipGroup (filter) + Chip → @primer/react Button / LinkButton + CounterLabel
// - Tag → @primer/react Token
// - Pagination → @primer/react Pagination
import {
  Button,
  CounterLabel,
  LinkButton,
  Pagination as PrimerPagination,
  TextInput as PrimerTextInput,
  Token,
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
        <UnderlineNav aria-label={label} className={clsx('!px-0', className)}>
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

// Thẻ nhãn dữ liệu dùng Token của @primer/react (con của phụ huynh, lớp của giáo viên)
export function Tag({ href, children, className = '' }: { href?: string; children: ReactNode; className?: string }) {
  if (typeof children === 'string' || typeof children === 'number') {
    if (href) {
      return (
        <Link href={href} scroll={false} className="inline-flex">
          <Token as="span" text={String(children)} size="large" className={clsx('cursor-pointer', className)} />
        </Link>
      );
    }
    return <Token as="span" text={String(children)} size="large" className={className} />;
  }

  const cls = clsx(
    'inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border border-[var(--borderColor-default)] bg-[var(--bgColor-neutral-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--fgColor-default)]',
    href && 'hover:border-[var(--borderColor-accent-emphasis)] hover:text-[var(--fgColor-link)]',
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

type PaginationProps = {
  page: number;
  pageCount: number;
  label?: string;
  summary?: string;
} & (
  | { hrefFor: (page: number) => string }
  | { onPage: (page: number) => void }
  | { onChange: (page: number) => void }
);

export function Pagination(props: PaginationProps) {
  const { page, pageCount, label, summary } = props;
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

  return (
    <nav aria-label={label ?? 'Phân trang'} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--borderColor-muted)] pt-3 text-xs text-[var(--fgColor-muted)]">
      <span>{infoText}</span>
      {'hrefFor' in props ? (
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
      ) : (
        <PrimerPagination
          pageCount={pageCount}
          currentPage={page}
          marginPageCount={1}
          surroundingPageCount={1}
          onPageChange={(e, n) => {
            e.preventDefault();
            handleSelect(n);
          }}
        />
      )}
    </nav>
  );
}
