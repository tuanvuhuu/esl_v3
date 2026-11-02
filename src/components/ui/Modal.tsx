'use client';

// Hộp thoại dùng chung trên nền Dialog của @primer/react v38 (chuẩn thiết kế 01. TSUKUBA).
// Máy tính: hộp giữa màn hình với kích thước linh hoạt (sm / md / lg / xl). Điện thoại: toàn màn hình.
// Giữ nguyên aria-labelledby={labelledBy} để tương thích toàn bộ kiểm thử E2E (dialogById).
import { XIcon } from '@primer/octicons-react';
import { Dialog } from '@primer/react';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { ActIcon } from './ActIcon';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const MODAL_WIDTH: Record<ModalSize, string> = {
  sm: 'min(440px, 100%)',
  md: 'min(560px, 100%)',
  lg: 'min(760px, 100%)',
  xl: 'min(920px, 100%)',
};

export function Modal({
  open,
  title,
  subtitle,
  size = 'lg',
  onClose,
  children,
  footer,
  labelledBy,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  size?: ModalSize;
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
      style={{ width: MODAL_WIDTH[size] }}
      position={{ narrow: 'fullscreen', regular: 'center' }}
      onClose={() => onClose()}
      renderHeader={({ onClose: handleHeaderClose }) => (
        <Dialog.Header>
          <div className="flex w-full items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="h-3.5 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
                <Dialog.Title id={labelledBy}>{title}</Dialog.Title>
              </div>
              {subtitle && <Dialog.Subtitle className="pl-3">{subtitle}</Dialog.Subtitle>}
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
