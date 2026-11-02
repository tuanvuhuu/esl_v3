'use client';

// Hộp xác nhận trước khi xoá hoặc thay đổi quan trọng, dùng Dialog (role="alertdialog") của @primer/react v38.
// Nút Huỷ được focus mặc định. Khi bị chặn, chỉ có nút Đã hiểu.
import { ClockIcon, InfoIcon, TrashIcon } from '@primer/octicons-react';
import { Dialog } from '@primer/react';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Btn } from './Btn';

export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  blocked = false,
  pending = false,
  tone = 'danger',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  text: ReactNode;
  confirmLabel: string;
  blocked?: boolean;
  pending?: boolean;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    if (dialogRef.current) {
      dialogRef.current.setAttribute('aria-labelledby', 'confirm-title');
      dialogRef.current.setAttribute('aria-describedby', 'confirm-text');
    }
    (blocked ? okRef.current : cancelRef.current)?.focus();
  }, [open, blocked]);

  if (!open) return null;

  return (
    <Dialog
      ref={dialogRef}
      role="alertdialog"
      title={title}
      width="large"
      style={{ width: 'min(400px, 100%)' }}
      initialFocusRef={blocked ? okRef : cancelRef}
      onClose={() => {
        if (!pending) onCancel();
      }}
      renderHeader={() => <span className="hidden" aria-hidden />}
      renderBody={() => (
        <div className="flex flex-col items-center gap-2.5 px-6 pb-5 pt-6 text-center">
          <span
            className={`mb-1 grid size-12 place-items-center rounded-[var(--borderRadius-medium)] ${
              blocked || tone === 'primary'
                ? 'bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)]'
                : 'bg-[var(--bgColor-danger-muted)] text-[var(--fgColor-danger)]'
            }`}
          >
            {blocked ? (
              <InfoIcon size={20} aria-hidden />
            ) : tone === 'primary' ? (
              <ClockIcon size={20} aria-hidden />
            ) : (
              <TrashIcon size={20} aria-hidden />
            )}
          </span>
          <h2 id="confirm-title" className="text-lg font-bold text-[var(--fgColor-default)]">
            {title}
          </h2>
          <div id="confirm-text" className="text-sm leading-relaxed text-[var(--fgColor-muted)]">
            {text}
          </div>
          <div className="mt-3 flex w-full gap-2.5">
            {!blocked && (
              <Btn ref={cancelRef} block onClick={onCancel} disabled={pending}>
                Huỷ
              </Btn>
            )}
            <Btn
              ref={okRef}
              block
              loading={pending}
              variant={blocked || tone === 'primary' ? 'primary' : 'danger'}
              onClick={blocked ? onCancel : onConfirm}
              disabled={pending}
            >
              {blocked ? 'Đã hiểu' : pending ? 'Đang xoá…' : confirmLabel}
            </Btn>
          </div>
        </div>
      )}
    />
  );
}
