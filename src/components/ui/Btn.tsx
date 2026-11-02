'use client';

// Nút có chữ dùng chung trên nền @primer/react v38. Cao đúng chuẩn 32px trên máy tính, 44px trên điện thoại.
import { Button, type ButtonProps } from '@primer/react';
import clsx from 'clsx';
import type { ButtonHTMLAttributes, ElementType, ReactElement, Ref } from 'react';
import { BTN_BASE, BTN_DANGER, BTN_GHOST, BTN_PRIMARY } from './btn-classes';

export { BTN_BASE, BTN_DANGER, BTN_GHOST, BTN_PRIMARY };

type Variant = 'primary' | 'ghost' | 'danger' | 'invisible';

const PRIMER_VARIANT: Record<Variant, ButtonProps['variant']> = {
  primary: 'primary',
  ghost: 'default',
  danger: 'danger',
  invisible: 'invisible',
};

export type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: ButtonProps['size'];
  block?: boolean;
  loading?: boolean;
  leadingVisual?: ElementType | ReactElement | null;
  trailingVisual?: ElementType | ReactElement | null;
  ref?: Ref<HTMLButtonElement>;
};

export function Btn({
  variant = 'ghost',
  size = 'medium',
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
      size={size}
      variant={PRIMER_VARIANT[variant]}
      block={block}
      loading={loading}
      leadingVisual={leadingVisual}
      trailingVisual={trailingVisual}
      className={clsx('transition-transform duration-100 active:scale-[0.985]', className)}
    >
      {children}
    </Button>
  );
}
