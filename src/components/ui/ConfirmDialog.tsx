'use client';

// Hộp xác nhận chuẩn GitHub Primer v38 dùng Dialog (role="alertdialog") + footerButtons gốc của @primer/react.
import { Dialog, type DialogButtonProps } from '@primer/react';
import { useLayoutEffect, useRef, type ReactNode } from 'react';

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
      dialogRef.current.setAttribute('aria-describedby', 'confirm-text');
    }
  }, [open]);

  if (!open) return null;

  const buttons: DialogButtonProps[] = blocked
    ? [
        {
          ref: okRef,
          buttonType: 'primary',
          content: 'Đã hiểu',
          autoFocus: true,
          onClick: onCancel,
        },
      ]
    : [
        {
          ref: cancelRef,
          buttonType: 'default',
          content: 'Huỷ',
          autoFocus: true,
          disabled: pending,
          onClick: onCancel,
        },
        {
          ref: okRef,
          buttonType: tone === 'primary' ? 'primary' : 'danger',
          content: pending ? 'Đang xử lý…' : confirmLabel,
          disabled: pending,
          onClick: onConfirm,
        },
      ];

  return (
    <Dialog
      ref={dialogRef}
      role="alertdialog"
      title={title}
      width="medium"
      style={{ width: 'min(420px, 100%)' }}
      initialFocusRef={blocked ? okRef : cancelRef}
      onClose={() => {
        if (!pending) onCancel();
      }}
      footerButtons={buttons}
    >
      <div id="confirm-text" className="text-sm leading-relaxed text-[var(--fgColor-default)]">
        {text}
      </div>
    </Dialog>
  );
}
