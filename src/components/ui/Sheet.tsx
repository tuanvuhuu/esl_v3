'use client';

// Bảng trượt từ đáy (điện thoại), dùng cho bộ lọc trên nền Primer + Octicons.
import { XIcon } from '@primer/octicons-react';
import { useEffect, type ReactNode } from 'react';
import { ActIcon } from './ActIcon';

export function Sheet({
  open,
  title,
  labelledBy,
  onClose,
  footer,
  children,
}: {
  open: boolean;
  title: string;
  labelledBy: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end bg-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="flex max-h-[84dvh] w-full flex-col rounded-t-2xl border-t border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-lift"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-[var(--borderColor-default)]" aria-hidden />
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--borderColor-muted)] px-5 pb-2.5 pt-2.5">
          <h2 id={labelledBy} className="text-base font-bold text-[var(--fgColor-default)]">
            {title}
          </h2>
          <ActIcon label="Đóng" icon={XIcon} onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-[var(--borderColor-muted)] px-5 py-3.5 pb-[calc(14px+var(--safe-b))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
