'use client';

// Bảng trượt từ đáy (điện thoại), dùng cho bộ lọc. Đóng khi bấm nền, nhấn Esc hoặc bấm nút đóng (docs/DESIGN.md mục 3).
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

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
    <div className="fixed inset-0 z-[70] flex items-end bg-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className="flex max-h-[84dvh] w-full flex-col rounded-t-[28px] bg-surface shadow-lift">
        <div className="mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-line" aria-hidden />
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-3">
          <h2 id={labelledBy} className="text-xl font-extrabold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink-2">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-line px-5 py-4 pb-[calc(16px+var(--safe-b))]">{footer}</div>}
      </div>
    </div>
  );
}
