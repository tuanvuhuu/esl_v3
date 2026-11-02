'use client';

// Hộp thoại dùng chung trên nền Dialog của @primer/react v38.
// Máy tính: hộp giữa màn hình. Điện thoại: toàn màn hình (position.narrow = 'fullscreen').
// Giữ nguyên aria-labelledby={labelledBy} để tương thích toàn bộ kiểm thử E2E (dialogById).
import { XIcon } from '@primer/octicons-react';
import { Dialog } from '@primer/react';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { ActIcon } from './ActIcon';

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  labelledBy,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  labelledBy: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !dialogRef.current) return;
    dialogRef.current.setAttribute('aria-labelledby', labelledBy);
    const id = window.requestAnimationFrame(() => {
      const firstInput = dialogRef.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), textarea:not([disabled])',
      );
      firstInput?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, labelledBy]);

  if (!open) return null;

  return (
    <Dialog
      ref={dialogRef}
      title={title}
      subtitle={subtitle}
      width="xlarge"
      style={{ width: 'min(900px, 100%)' }}
      position={{ narrow: 'fullscreen', regular: 'center' }}
      onClose={() => onClose()}
      renderHeader={({ onClose: handleHeaderClose }) => (
        <Dialog.Header>
          <div className="flex w-full items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Dialog.Title id={labelledBy}>{title}</Dialog.Title>
              {subtitle && <Dialog.Subtitle>{subtitle}</Dialog.Subtitle>}
            </div>
            <ActIcon quiet label="Đóng" icon={XIcon} onClick={() => handleHeaderClose('close-button')} />
          </div>
        </Dialog.Header>
      )}
      renderFooter={footer ? () => <Dialog.Footer>{footer}</Dialog.Footer> : undefined}
    >
      {children}
    </Dialog>
  );
}
