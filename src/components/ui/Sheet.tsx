'use client';

// Ngăn kéo trượt dùng Dialog (position right / bottom) chính gốc của @primer/react v38.
import { XIcon } from '@primer/octicons-react';
import { Dialog } from '@primer/react';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
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
  const dialogRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.setAttribute('aria-labelledby', labelledBy);
    }
  }, [open, labelledBy]);

  if (!open) return null;

  return (
    <Dialog
      ref={dialogRef}
      title={title}
      width="large"
      position={{ narrow: 'bottom', regular: 'right' }}
      onClose={() => onClose()}
      renderHeader={({ onClose: handleHeaderClose }) => (
        <Dialog.Header>
          <div className="flex w-full items-center justify-between gap-3">
            <Dialog.Title id={labelledBy}>{title}</Dialog.Title>
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
