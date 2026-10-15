// Nút có chữ dùng chung (docs/DESIGN.md mục 8). Cùng cỡ với ô nhập, ô chọn và chip: 32px trên máy tính, 44px trên điện thoại.
import type { ButtonHTMLAttributes, Ref } from 'react';

export const BTN_BASE =
  'inline-flex h-[var(--ctl-h)] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-ctl)] px-3 text-sm font-bold transition-colors max-[767px]:h-[var(--ctl-h-touch)] disabled:opacity-40';
export const BTN_PRIMARY = 'bg-primary text-on-primary';
export const BTN_GHOST = 'border border-line bg-surface text-ink';
export const BTN_DANGER = 'border border-blush-ink bg-surface text-blush-ink';

type Variant = 'primary' | 'ghost' | 'danger';

const VARIANT: Record<Variant, string> = { primary: BTN_PRIMARY, ghost: BTN_GHOST, danger: BTN_DANGER };

export function Btn({ variant = 'ghost', block = false, className = '', ref, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean; ref?: Ref<HTMLButtonElement> }) {
  return <button ref={ref} type="button" {...rest} className={`${BTN_BASE} ${VARIANT[variant]} ${block ? 'w-full' : ''} ${className}`} />;
}
