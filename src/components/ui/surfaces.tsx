// Khung dùng chung (docs/DESIGN.md mục 8): Panel cho khối lớn, Card cho thẻ trong lưới, EmptyPanel cho trang trống.
// Bo góc 24px và bóng có viền mảnh (token --shadow) ở mọi nơi. Không dùng viền riêng.
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
    <section className={`rounded-[var(--radius-panel)] bg-surface shadow-card ${padded ? 'p-5 max-[767px]:p-4' : ''} ${className}`}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-lg font-extrabold text-ink">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

// Thẻ trong lưới (phụ huynh, giáo viên, lớp, bài tập trên màn hẹp). as="section" khi thẻ là một mục có tên (trình đọc màn hình đọc được)
export function Card({
  children,
  className = '',
  as = 'article',
  ...rest
}: { children: ReactNode; className?: string; as?: 'article' | 'section' } & HTMLAttributes<HTMLElement>) {
  const Tag = as;
  return <Tag {...rest} className={`flex flex-col gap-3 rounded-[var(--radius-panel)] bg-surface p-4 shadow-card max-[767px]:p-3.5 ${className}`}>{children}</Tag>;
}

// Ghi chú trong khung nền nhạt: đoạn đọc, mô tả, thông báo trống. Không dùng khung riêng.
export function Notice({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`rounded-[var(--radius-ctl)] bg-stone px-3 py-2.5 text-sm text-stone-ink ${className}`}>{children}</p>;
}

export function EmptyPanel({ title, hint }: { title: string; hint?: string }) {
  return (
    <Panel padded={false}>
      <EmptyState title={title} hint={hint} />
    </Panel>
  );
}
