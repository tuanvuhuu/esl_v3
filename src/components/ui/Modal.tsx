'use client';

import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

// Hộp thoại dùng chung. Máy tính: hộp giữa màn hình. Điện thoại: toàn màn hình.
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className="flex max-h-[92dvh] w-[min(900px,100%)] flex-col overflow-hidden rounded-[28px] bg-surface shadow-lift max-[767px]:h-full max-[767px]:max-h-none max-[767px]:w-full max-[767px]:rounded-none">
        <div className="relative shrink-0 px-6 pb-3 pt-6 max-[767px]:px-4 max-[767px]:pt-5">
          <h2 id={labelledBy} className="pr-12 text-2xl font-extrabold leading-tight text-ink max-[767px]:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 pr-12 text-base text-muted">{subtitle}</p>}
          <button type="button" onClick={onClose} aria-label="Đóng" className="absolute right-5 top-5 grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink-2 max-[767px]:right-4 max-[767px]:top-4">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 max-[767px]:px-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-line px-6 py-4 max-[767px]:px-4 max-[767px]:pb-[calc(16px+var(--safe-b))]">{footer}</div>}
      </div>
    </div>
  );
}
