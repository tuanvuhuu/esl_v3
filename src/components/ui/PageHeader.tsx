// Tiêu đề trang theo mẫu Primer + 01. TSUKUBA: tiêu đề, mã chức năng tuỳ chọn, mô tả và cụm nút bên phải.
import type { ReactNode } from 'react';
import { PageCrumbs } from '@/components/shell/PageCrumbs';

export function PageHeader({
  crumbs,
  title,
  code,
  subtitle,
  actions,
  titleOnTopbar = true,
}: {
  crumbs: string[];
  title: string;
  code?: string;
  subtitle?: string;
  actions?: ReactNode;
  titleOnTopbar?: boolean;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-3 max-[767px]:mb-3">
      <PageCrumbs crumbs={crumbs} />
      <div className="min-w-0">
        <h1
          className={`flex items-center gap-2 text-h1 font-bold leading-tight tracking-tight text-[var(--fgColor-default)] ${
            titleOnTopbar ? 'min-[768px]:sr-only' : ''
          }`}
        >
          <span>{title}</span>
          {code && (
            <span className="rounded-[var(--borderRadius-small)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-1.5 py-0.5 font-mono text-xs font-normal text-[var(--fgColor-muted)]">
              {code}
            </span>
          )}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--fgColor-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
