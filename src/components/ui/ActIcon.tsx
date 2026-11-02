'use client';

// Nút chỉ có icon dùng chung trên nền @primer/react v38: 36px trên máy tính, 44px trên điện thoại.
import { Button, IconButton } from '@primer/react';
import clsx from 'clsx';
import type { ButtonHTMLAttributes, ElementType, Ref } from 'react';

export function ActIcon({
  label,
  danger = false,
  icon,
  className = '',
  type = 'button',
  ref,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  danger?: boolean;
  icon?: ElementType;
  ref?: Ref<HTMLButtonElement>;
}) {
  if (icon && !children) {
    const { 'aria-labelledby': _ariaLabelledBy, 'aria-label': _ariaLabel, ...iconRest } = rest;
    void _ariaLabelledBy;
    void _ariaLabel;
    return (
      <IconButton
        {...iconRest}
        ref={ref}
        type={type}
        icon={icon}
        aria-label={label}
        title={label}
        variant={danger ? 'danger' : 'default'}
        unsafeDisableTooltip
        className={clsx('!size-[var(--icon-h)] shrink-0 max-[767px]:!size-[var(--icon-h-touch)]', className)}
      />
    );
  }
  return (
    <Button
      {...rest}
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      variant={danger ? 'danger' : 'default'}
      className={clsx(
        '!grid !size-[var(--icon-h)] !min-w-0 shrink-0 !place-items-center !p-0 max-[767px]:!size-[var(--icon-h-touch)]',
        className,
      )}
    >
      {children}
    </Button>
  );
}
