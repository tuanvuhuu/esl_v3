'use client';

// Hộp thoại dùng chung. Máy tính: hộp giữa màn hình, bo góc 24px. Điện thoại: toàn màn hình.
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { ActIcon } from './ActIcon';

export function Modal({ open, title, subtitle, onClose, children, footer, labelledBy }: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  labelledBy: string;
}) {
  useEffect(() => {
    if (!open) return;
    // Esc đã được xử lý trong hộp thoại (ví dụ đóng ô chọn đang mở) thì không đóng cả hộp thoại
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('overflow-hidden');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('overflow-hidden');
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-scrim p-4 max-[767px]:p-0" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className="flex max-h-[92dvh] w-[min(900px,100%)] flex-col overflow-hidden rounded-[var(--radius-panel)] bg-surface shadow-lift max-[767px]:h-full max-[767px]:max-h-none max-[767px]:w-full max-[767px]:rounded-none">
        <div className="relative shrink-0 px-6 pb-3 pt-6 max-[767px]:px-4 max-[767px]:pt-5">
          <h2 id={labelledBy} className="pr-12 text-xl font-extrabold leading-tight text-ink">{title}</h2>
          {subtitle && <p className="mt-1 pr-12 text-sm text-muted">{subtitle}</p>}
          <ActIcon label="Đóng" onClick={onClose} className="absolute right-5 top-5 max-[767px]:right-4 max-[767px]:top-4">
            <X className="size-4" aria-hidden />
          </ActIcon>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 max-[767px]:px-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-line px-6 py-4 max-[767px]:px-4 max-[767px]:pb-[calc(16px+var(--safe-b))]">{footer}</div>}
      </div>
    </div>
  );
}
