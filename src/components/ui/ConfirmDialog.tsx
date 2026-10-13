'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Trash2, Info } from 'lucide-react';

// Hộp xác nhận trước khi xoá. Nút Huỷ được focus mặc định. Khi bị chặn, chỉ có nút Đã hiểu.
export function ConfirmDialog({ open, title, text, confirmLabel, blocked = false, pending = false, onConfirm, onCancel }: {
  open: boolean;
  title: string;
  text: ReactNode;
  confirmLabel: string;
  blocked?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onCancel();
    };
    document.addEventListener('keydown', onKey);
    (blocked ? okRef.current : cancelRef.current)?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, blocked, pending, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-scrim p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !pending) onCancel(); }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-text" className="flex w-[min(380px,100%)] flex-col items-center gap-2 rounded-[24px] bg-surface px-6 pb-5 pt-7 text-center shadow-lift">
        <span className={`mb-1 grid size-13 place-items-center rounded-[18px] ${blocked ? 'bg-primary-soft text-ink' : 'bg-blush text-blush-ink'}`}>
          {blocked ? <Info className="size-6" aria-hidden /> : <Trash2 className="size-6" aria-hidden />}
        </span>
        <h2 id="confirm-title" className="text-xl font-extrabold text-ink">{title}</h2>
        <p id="confirm-text" className="text-base leading-relaxed text-ink-2">{text}</p>
        <div className="mt-3 flex w-full gap-2.5">
          {!blocked && (
            <button ref={cancelRef} type="button" onClick={onCancel} disabled={pending} className="flex h-11 flex-1 items-center justify-center rounded-xl border border-line bg-surface text-base font-bold text-ink disabled:opacity-50">
              Huỷ
            </button>
          )}
          <button
            ref={okRef}
            type="button"
            onClick={blocked ? onCancel : onConfirm}
            disabled={pending}
            className={`flex h-11 flex-1 items-center justify-center rounded-xl text-base font-bold disabled:opacity-60 ${blocked ? 'bg-primary text-on-primary' : 'bg-blush text-blush-ink'}`}
          >
            {blocked ? 'Đã hiểu' : pending ? 'Đang xoá…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
