// Ô nhập dùng chung cho form. Lỗi hiện ngay dưới ô, ô sai có viền đỏ (docs/DESIGN.md mục 7, 9).
// Nhãn không đậm (DESIGN mục 1): chữ 400.
import type { ReactNode } from 'react';
import { BTN_BASE, BTN_GHOST, BTN_PRIMARY } from './Btn';
import { CTL_FIELD } from './controls';

export function Field({ label, error, wide, hint, children }: { label: string; error?: string; wide?: boolean; hint?: string; children: ReactNode }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 text-sm font-normal text-ink-2 ${wide ? 'min-[768px]:col-span-full' : ''}`}>
      {label}
      {children}
      {error ? <span className="text-sm font-medium text-blush-ink">{error}</span> : hint ? <span className="text-sm text-muted">{hint}</span> : null}
    </label>
  );
}

// Class của ô nhập: cùng cỡ với ô chọn và nút
export function inputClass(error?: string) {
  return `${CTL_FIELD} ${error ? 'border-blush-ink' : ''}`;
}

// Ô nhiều dòng: cùng khung với ô nhập, chiều cao theo nội dung
export function textareaClass(error?: string) {
  return `w-full min-w-0 rounded-[var(--radius-ctl)] border bg-surface px-2.5 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-primary-deep max-[767px]:text-input ${error ? 'border-blush-ink' : 'border-line'}`;
}

// Hàng nút cuối form: nút phụ bên trái, nút chính bên phải. Trên điện thoại hai nút bằng nhau.
export function FormFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mt-1 flex justify-end gap-2.5 max-[767px]:[&>button]:flex-1 ${className}`}>{children}</div>;
}

// Ô chọn tệp dùng chung: nút chọn tệp có cùng kiểu ở mọi nơi. Chọn xong gọi onFile.
export function FileInput({ label, accept, disabled = false, onFile }: { label: string; accept: string; disabled?: boolean; onFile: (file: File | undefined) => void }) {
  return (
    <input
      type="file"
      accept={accept}
      aria-label={label}
      disabled={disabled}
      onChange={(e) => onFile(e.target.files?.[0])}
      className="h-[var(--ctl-h)] max-w-full text-sm text-ink-2 file:mr-3 file:h-full file:rounded-[var(--radius-ctl)] file:border file:border-line file:bg-surface file:px-3 file:text-sm file:font-semibold file:text-ink max-[767px]:h-[var(--ctl-h-touch)]"
    />
  );
}

// Nút chính và nút phụ của form: cùng cỡ với mọi nút khác
export const FORM_BTN_CANCEL = `${BTN_BASE} ${BTN_GHOST}`;
export const FORM_BTN_SUBMIT = `${BTN_BASE} ${BTN_PRIMARY}`;
