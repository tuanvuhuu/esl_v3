'use client';

// Tiêu đề trang sạch sẽ, tối giản, dễ đọc.
import type { ReactNode } from 'react';
import { PageCrumbs } from '@/components/shell/PageCrumbs';

export function PageHeader({
  crumbs,
  title,
  code: _legacyCode,
  subtitle,
  actions,
  titleOnTopbar: _legacyTitleOnTopbar,
}: {
  crumbs: string[];
  title: string;
  code?: string;
  subtitle?: string;
  actions?: ReactNode;
  titleOnTopbar?: boolean;
}) {
  void _legacyCode;
  void _legacyTitleOnTopbar;
  return (
    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-4 py-2.5 shadow-[var(--shadow)] max-[767px]:mb-2 max-[767px]:px-3">
      <PageCrumbs crumbs={crumbs} />
      <div className="min-w-0">
        <h1 className="m-0 truncate text-base font-bold leading-snug tracking-tight text-[var(--fgColor-default)] min-[768px]:text-lg">
          {title}
        </h1>
        {subtitle && <p className="m-0 truncate text-xs text-[var(--fgColor-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="ml-auto flex flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}
