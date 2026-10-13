// Nút chỉ có icon (docs/DESIGN.md mục 8): 38px trên máy tính, 44px trên điện thoại. Icon xoá luôn có viền đỏ nhạt.
import type { ButtonHTMLAttributes } from 'react';

export function ActIcon({ label, danger = false, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={`grid size-[38px] place-items-center rounded-xl border bg-surface transition-colors max-[767px]:size-11 disabled:opacity-40 ${danger ? 'border-blush-ink text-blush-ink' : 'border-line text-ink-2 hover:text-ink'} ${className}`}
    />
  );
}
