// Ô nhập dùng chung cho form. Lỗi hiện ngay dưới ô, ô sai có viền đỏ (docs/DESIGN.md mục 7).
import type { ReactNode } from 'react';

export function Field({ label, error, wide, hint, children }: { label: string; error?: string; wide?: boolean; hint?: string; children: ReactNode }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 text-sm font-bold text-ink-2 ${wide ? 'min-[768px]:col-span-full' : ''}`}>
      {label}
      {children}
      {error ? <span className="text-sm font-semibold text-blush-ink">{error}</span> : hint ? <span className="text-sm font-medium text-muted">{hint}</span> : null}
    </label>
  );
}

// Class của ô nhập. Điện thoại dùng cỡ chữ --fs-input (16px) để iOS không phóng to.
export function inputClass(error?: string) {
  return `h-11 w-full min-w-0 rounded-[14px] border bg-bg px-3.5 text-input font-medium text-ink outline-none focus:border-primary-deep focus:bg-surface ${error ? 'border-blush-ink' : 'border-transparent'}`;
}

// Nút chính và nút phụ của form, cùng một cỡ
export const FORM_BTN_CANCEL = 'h-11 rounded-xl border border-line bg-surface px-5 text-base font-bold text-ink';
export const FORM_BTN_SUBMIT = 'h-11 rounded-xl bg-primary px-5 text-base font-bold text-on-primary disabled:opacity-60';
