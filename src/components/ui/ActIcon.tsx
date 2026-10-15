// Nút chỉ có icon dùng chung (docs/DESIGN.md mục 8): 36px trên máy tính, 44px trên điện thoại. Icon xoá có viền đỏ nhạt.
import type { ButtonHTMLAttributes } from 'react';

export function ActIcon({ label, danger = false, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={`grid size-[var(--icon-h)] place-items-center rounded-[var(--radius-ctl)] border bg-surface transition-colors max-[767px]:size-[var(--icon-h-touch)] disabled:opacity-40 ${danger ? 'border-blush-ink text-blush-ink' : 'border-line text-ink-2 hover:text-ink'} ${className}`}
    />
  );
}
