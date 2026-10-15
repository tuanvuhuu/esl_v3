'use client';

// Hộp xác nhận trước khi xoá. Nút Huỷ được focus mặc định. Khi bị chặn, chỉ có nút Đã hiểu.
import { useEffect, useRef, type ReactNode } from 'react';
import { Trash2, Info } from 'lucide-react';
import { Btn } from './Btn';

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
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-text" className="flex w-[min(380px,100%)] flex-col items-center gap-2 rounded-[var(--radius-panel)] bg-surface px-6 pb-5 pt-7 text-center shadow-lift">
        <span className={`mb-1 grid size-12 place-items-center rounded-[var(--radius-ctl)] ${blocked ? 'bg-primary-soft text-ink' : 'bg-blush text-blush-ink'}`}>
          {blocked ? <Info className="size-5" aria-hidden /> : <Trash2 className="size-5" aria-hidden />}
        </span>
        <h2 id="confirm-title" className="text-lg font-extrabold text-ink">{title}</h2>
        <p id="confirm-text" className="text-sm leading-relaxed text-ink-2">{text}</p>
        <div className="mt-3 flex w-full gap-2.5">
          {!blocked && (
            <Btn ref={cancelRef} block onClick={onCancel} disabled={pending}>
              Huỷ
            </Btn>
          )}
          <Btn
            ref={okRef}
            block
            variant={blocked ? 'primary' : 'danger'}
            onClick={blocked ? onCancel : onConfirm}
            disabled={pending}
          >
            {blocked ? 'Đã hiểu' : pending ? 'Đang xoá…' : confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}
