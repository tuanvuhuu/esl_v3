'use client';

// Tiêu đề trang gọn gàng theo chuẩn Primer + 01. TSUKUBA: 1 dòng duy nhất gồm tiêu đề + nút thao tác bên phải.
import { Label } from '@primer/react';
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
    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--borderColor-muted)] pb-2 max-[767px]:mb-2">
      <PageCrumbs crumbs={crumbs} />
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <h1 className="m-0 text-base font-bold leading-snug text-[var(--fgColor-default)]">{title}</h1>
        {code && (
          <Label variant="secondary" className="font-mono !font-normal">
            {code}
          </Label>
        )}
        {subtitle && <span className="text-xs text-[var(--fgColor-muted)]">{subtitle}</span>}
      </div>
      {actions && <div className="ml-auto flex flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}
