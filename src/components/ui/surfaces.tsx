// Khung bề mặt dùng chung theo kiến trúc Primer + dự án 01. TSUKUBA (Section, Panel, Card, StatCards, KeyValue, Callout, Notice, EmptyPanel).
import clsx from 'clsx';
import Link from 'next/link';
import type { HTMLAttributes, ReactNode } from 'react';
import { EmptyState } from './primitives';

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
        'overflow-hidden rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-[var(--shadow-resting-small,0_1px_2px_rgba(0,0,0,0.04))]',
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)]/60 px-4 py-2.5 max-[767px]:px-3.5">
          {title && <h2 className="text-base font-bold text-[var(--fgColor-default)]">{title}</h2>}
          {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={padded ? 'p-4 max-[767px]:p-3.5' : ''}>{children}</div>
    </section>
  );
}

// Tương đương Section bên dự án 01. TSUKUBA
export function Section(props: { title?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean; className?: string }) {
  return (
    <section
      className={clsx(
        'mb-3 overflow-hidden rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]',
        props.className,
      )}
    >
      {(props.title || props.actions) && (
        <div className="flex items-center justify-between gap-2 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-4 py-2.5">
          <h2 className="m-0 text-sm font-semibold text-[var(--fgColor-default)]">{props.title}</h2>
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
        'flex flex-col gap-3 rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-4 shadow-[var(--shadow-resting-small,0_1px_2px_rgba(0,0,0,0.04))] transition-colors max-[767px]:p-3.5',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Notice({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={clsx(
        'rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-3 py-2 text-sm text-[var(--fgColor-muted)]',
        className,
      )}
    >
      {children}
    </p>
  );
}

export function Callout(props: { tone?: 'info' | 'warning' | 'danger' | 'success'; children: ReactNode; className?: string }) {
  const tone = props.tone ?? 'info';
  const toneCls = {
    info: 'border-[var(--borderColor-accent-muted)] bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-default)]',
    warning: 'border-[var(--borderColor-attention-muted)] bg-[var(--bgColor-attention-muted)] text-[var(--fgColor-default)]',
    danger: 'border-[var(--borderColor-danger-muted)] bg-[var(--bgColor-danger-muted)] text-[var(--fgColor-danger)]',
    success: 'border-[var(--borderColor-success-muted)] bg-[var(--bgColor-success-muted)] text-[var(--fgColor-success)]',
  }[tone];
  return <div className={clsx('rounded-[var(--borderRadius-medium)] border px-3.5 py-2.5 text-sm', toneCls, props.className)}>{props.children}</div>;
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
            <div className="text-xs font-normal text-[var(--fgColor-muted)]">{it.label}</div>
            <div className="mt-0.5 text-2xl font-bold leading-snug text-[var(--fgColor-default)]">{it.value}</div>
            {it.sub && <div className="mt-0.5 text-xs text-[var(--fgColor-muted)]">{it.sub}</div>}
          </>
        );
        const cls =
          'block rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-4 py-3 transition-colors';
        return it.href ? (
          <Link key={it.label} href={it.href} data-card="true" className={clsx(cls, 'hover:border-[var(--borderColor-accent-emphasis)]')}>
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

export function EmptyPanel({ title, hint }: { title: string; hint?: string }) {
  return (
    <Panel padded={false}>
      <EmptyState title={title} hint={hint} />
    </Panel>
  );
}
