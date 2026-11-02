'use client';

// Ngăn kéo trượt dùng Dialog (position right / bottom) chính gốc của @primer/react v38 (chuẩn 01. TSUKUBA).
import { XIcon } from '@primer/octicons-react';
import { Dialog } from '@primer/react';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { ActIcon } from './ActIcon';

export function Sheet({
  open,
  title,
  subtitle,
  labelledBy,
  size = 'md',
  onClose,
  footer,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  labelledBy: string;
  size?: 'md' | 'lg';
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
      subtitle={subtitle}
      width="large"
      style={{ width: size === 'lg' ? 'min(660px, 100vw)' : 'min(520px, 100vw)' }}
      position={{ narrow: 'bottom', regular: 'right' }}
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
