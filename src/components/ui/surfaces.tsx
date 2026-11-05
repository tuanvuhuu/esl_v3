'use client';

// Khung bề mặt sạch sẽ, tối giản, nhất quán một tông màu chủ đề (Section, Panel, Card, StatCards, KeyValue, Callout, Notice, EmptyPanel).
import { InboxIcon } from '@primer/octicons-react';
import { Banner } from '@primer/react';
import { Blankslate } from '@primer/react/experimental';
import clsx from 'clsx';
import Link from 'next/link';
import type { HTMLAttributes, ReactNode } from 'react';

export function Panel({
  title,
  action,
  children,
  padded = true,
  className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={clsx(
        'overflow-hidden rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-[var(--shadow)]',
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--borderColor-muted)] px-4 py-3 max-[767px]:px-3.5">
          {title && <h2 className="m-0 truncate text-sm font-semibold text-[var(--fgColor-default)]">{title}</h2>}
          {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={padded ? 'p-4 max-[767px]:p-3.5' : ''}>{children}</div>
    </section>
  );
}

export function Section(props: { title?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean; className?: string }) {
  return (
    <section
      className={clsx(
        'mb-3 overflow-hidden rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-[var(--shadow)]',
        props.className,
      )}
    >
      {(props.title || props.actions) && (
        <div className="flex items-center justify-between gap-2 border-b border-[var(--borderColor-muted)] px-4 py-3">
          <h2 className="m-0 truncate text-sm font-semibold text-[var(--fgColor-default)]">{props.title}</h2>
          {props.actions && <div className="flex flex-wrap items-center gap-2">{props.actions}</div>}
        </div>
      )}
      <div className={props.flush ? undefined : 'p-4 max-[767px]:p-3.5'}>{props.children}</div>
    </section>
  );
}

export function Card({
  children,
  className = '',
  as = 'article',
  ...rest
}: { children: ReactNode; className?: string; as?: 'article' | 'section' } & HTMLAttributes<HTMLElement>) {
  const Tag = as;
  return (
    <Tag
      {...rest}
      className={clsx(
        'flex flex-col gap-3 rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-4 shadow-[var(--shadow)] transition-all duration-150 max-[767px]:p-3.5',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Notice({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <Banner
      title="Ghi chú"
      hideTitle
      variant="info"
      layout="compact"
      description={children}
      className={className}
    />
  );
}

export function Callout(props: { tone?: 'info' | 'warning' | 'danger' | 'success'; children: ReactNode; className?: string }) {
  const variant = {
    info: 'info' as const,
    warning: 'warning' as const,
    danger: 'critical' as const,
    success: 'success' as const,
  }[props.tone ?? 'info'];
  return (
    <Banner
      title="Thông báo"
      hideTitle
      variant={variant}
      layout="compact"
      description={props.children}
      className={props.className}
    />
  );
}

export function KeyValue(props: { items: Array<[label: string, value: ReactNode]> }) {
  return (
    <dl className="m-0 grid grid-cols-[minmax(8rem,max-content)_1fr] gap-x-4 gap-y-1.5 text-sm">
      {props.items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-[var(--fgColor-muted)]">{k}</dt>
          <dd className="m-0 text-[var(--fgColor-default)]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StatCards(props: { items: Array<{ label: string; value: ReactNode; sub?: ReactNode; href?: string }> }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2.5">
      {props.items.map((it) => {
        const inner = (
          <>
            <div className="truncate text-xs font-medium text-[var(--fgColor-muted)]">{it.label}</div>
            <div className="mt-1 text-2xl font-bold leading-tight tabular-nums text-[var(--fgColor-default)]">
              {it.value}
            </div>
            {it.sub && <div className="mt-0.5 text-xs text-[var(--fgColor-muted)]">{it.sub}</div>}
          </>
        );
        const cls =
          'block rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-4 py-3 text-[var(--fgColor-default)] shadow-[var(--shadow)] transition-all duration-150';
        return it.href ? (
          <Link
            key={it.label}
            href={it.href}
            data-card="true"
            className={clsx(cls, 'hover:border-[var(--borderColor-accent-emphasis)] hover:bg-[var(--row-hover)]')}
          >
            {inner}
          </Link>
        ) : (
          <div key={it.label} className={cls}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

export function EmptyPanel({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-[var(--shadow)]">
      <Blankslate spacious>
        <Blankslate.Visual>
          <span className="inline-flex size-11 items-center justify-center rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] text-[var(--primary)]">
            <InboxIcon size={22} />
          </span>
        </Blankslate.Visual>
        <Blankslate.Heading as="h3">{title}</Blankslate.Heading>
        {hint && <Blankslate.Description>{hint}</Blankslate.Description>}
        {action && <div className="mt-3 flex justify-center">{action}</div>}
      </Blankslate>
    </div>
  );
}
