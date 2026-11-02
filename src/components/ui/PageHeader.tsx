'use client';

// Tiêu đề trang chuẩn ui.module.css (.pageHeader / .pageTitle / .pageCode / .pageDesc) của dự án 01. TSUKUBA.
import type { ReactNode } from 'react';
import { PageCrumbs } from '@/components/shell/PageCrumbs';

export function PageHeader({
  crumbs,
  title,
  code,
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
  void _legacyTitleOnTopbar;
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3 max-[767px]:mb-2">
      <PageCrumbs crumbs={crumbs} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="m-0 text-lg font-semibold leading-snug tracking-tight text-[var(--fgColor-default)]">{title}</h1>
          {code && (
            <span className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-1.5 py-0.5 font-mono text-xs text-[var(--fgColor-muted)]">
              {code}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-0.5 text-[13px] text-[var(--fgColor-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="ml-auto flex flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}
