// Chuỗi class dùng chung cho nút có chữ (không có 'use client' để dùng an toàn trong cả Server Component và Client Component).
export const BTN_BASE =
  'inline-flex h-[var(--ctl-h)] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--borderRadius-medium)] px-3 text-[13px] font-medium transition-colors max-[767px]:h-[var(--ctl-h-touch)] disabled:opacity-50';
export const BTN_PRIMARY =
  'border border-[var(--button-primary-borderColor-rest)] bg-[var(--button-primary-bgColor-rest)] text-[var(--button-primary-fgColor-rest)] shadow-[0_1px_0_rgba(31,35,40,0.08)] hover:bg-[var(--button-primary-bgColor-hover)]';
export const BTN_GHOST =
  'border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] font-normal text-[var(--fgColor-default)] shadow-[0_1px_0_rgba(31,35,40,0.03)] hover:bg-[var(--bgColor-muted)]';
export const BTN_DANGER =
  'border border-[var(--borderColor-danger-emphasis)] bg-[var(--bgColor-default)] text-[var(--fgColor-danger)] hover:bg-[var(--bgColor-danger-muted)]';
