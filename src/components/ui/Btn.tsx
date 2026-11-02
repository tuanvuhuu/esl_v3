'use client';

// Nút có chữ dùng chung trên nền @primer/react v38. Cao đúng chuẩn 32px trên máy tính, 44px trên điện thoại.
import { Button, type ButtonProps } from '@primer/react';
import clsx from 'clsx';
import type { ButtonHTMLAttributes, ElementType, ReactElement, Ref } from 'react';

export const BTN_BASE =
  'inline-flex h-[var(--ctl-h)] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--borderRadius-medium)] px-3 text-sm font-medium transition-colors max-[767px]:h-[var(--ctl-h-touch)] disabled:opacity-50';
export const BTN_PRIMARY =
  'border border-[var(--button-primary-borderColor-rest)] bg-[var(--button-primary-bgColor-rest)] text-[var(--button-primary-fgColor-rest)] hover:bg-[var(--button-primary-bgColor-hover)]';
export const BTN_GHOST =
  'border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]';
export const BTN_DANGER =
  'border border-[var(--borderColor-danger-emphasis)] bg-[var(--bgColor-default)] text-[var(--fgColor-danger)] hover:bg-[var(--bgColor-danger-muted)]';

type Variant = 'primary' | 'ghost' | 'danger' | 'invisible';

const PRIMER_VARIANT: Record<Variant, ButtonProps['variant']> = {
  primary: 'primary',
  ghost: 'default',
  danger: 'danger',
  invisible: 'invisible',
};

export type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  block?: boolean;
  loading?: boolean;
  leadingVisual?: ElementType | ReactElement | null;
  trailingVisual?: ElementType | ReactElement | null;
  ref?: Ref<HTMLButtonElement>;
};

export function Btn({
  variant = 'ghost',
  block = false,
  loading = false,
  leadingVisual,
  trailingVisual,
  className = '',
  type = 'button',
  ref,
  children,
  ...rest
}: BtnProps) {
  return (
    <Button
      {...rest}
      ref={ref}
      type={type}
      variant={PRIMER_VARIANT[variant]}
      block={block}
      loading={loading}
      leadingVisual={leadingVisual}
      trailingVisual={trailingVisual}
      className={clsx(className)}
    >
      {children}
    </Button>
  );
}
