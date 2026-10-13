// Tiêu đề trang: tiêu đề, mô tả, và vùng nút bên phải. Đường dẫn (Đào tạo / ...) hiện trên thanh trên cùng.
import type { ReactNode } from 'react';
import { PageCrumbs } from '@/components/shell/PageCrumbs';

export function PageHeader({ crumbs, title, subtitle, actions }: { crumbs: string[]; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-4 max-[767px]:mb-3">
      <PageCrumbs crumbs={crumbs} />
      <div className="min-w-0">
        <h1 className="text-h1 font-extrabold leading-tight tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-base text-muted max-[767px]:mt-1.5 max-[767px]:text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
