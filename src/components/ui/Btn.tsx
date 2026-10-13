// Nút có chữ dùng chung (docs/DESIGN.md mục 8): cao 40px trên máy tính, 44px trên điện thoại.
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary',
  ghost: 'border border-line bg-surface text-ink',
  danger: 'border border-blush-ink bg-surface text-blush-ink',
};

export function Btn({ variant = 'ghost', block = false, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-base font-bold transition-colors max-[767px]:h-11 disabled:opacity-40 ${VARIANT[variant]} ${block ? 'w-full' : ''} ${className}`}
    />
  );
}
