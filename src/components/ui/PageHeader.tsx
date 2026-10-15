// Tiêu đề trang: tiêu đề, mô tả, và vùng nút bên phải. Đường dẫn (Đào tạo / ...) hiện trên thanh trên cùng.
import type { ReactNode } from 'react';
import { PageCrumbs } from '@/components/shell/PageCrumbs';

// titleOnTopbar: mặc định tên trang nằm trên thanh trên cùng từ 768px. Khu vực không có thanh trên (khu học sinh) đặt false để hiện tên ngay tại đầu trang.
export function PageHeader({
  crumbs,
  title,
  subtitle,
  actions,
  titleOnTopbar = true,
}: {
  crumbs: string[];
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  titleOnTopbar?: boolean;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-4 max-[767px]:mb-3">
      <PageCrumbs crumbs={crumbs} />
      <div className="min-w-0">
        {/* Từ 768px tên trang nằm trên thanh trên cùng (đường dẫn), nên tiêu đề chỉ còn cho trình đọc màn hình */}
        <h1 className={`text-h1 font-extrabold leading-tight tracking-tight text-ink ${titleOnTopbar ? 'min-[768px]:sr-only' : ''}`}>{title}</h1>
        {subtitle && <p className="mt-1 text-base text-muted max-[767px]:mt-1.5 max-[767px]:text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
