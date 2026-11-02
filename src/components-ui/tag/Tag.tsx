'use client';

import { Label, LabelProps } from '@primer/react';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import styles from './tag.module.css';

interface ITagProps extends LabelProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// Cặp {nền pastel sáng, chữ đậm rõ, viền mảnh} theo đúng bảng màu semantic sáng của Primer & 01. TSUKUBA.
const semanticColorsByVariant: Record<
  NonNullable<LabelProps['variant']>,
  { backgroundColor: string; color: string; borderColor: string }
> = {
  default: {
    backgroundColor: 'var(--bgColor-muted)',
    color: 'var(--fgColor-muted)',
    borderColor: 'var(--borderColor-default)',
  },
  primary: {
    backgroundColor: 'var(--bgColor-muted)',
    color: 'var(--fgColor-default)',
    borderColor: 'var(--borderColor-default)',
  },
  secondary: {
    backgroundColor: 'var(--bgColor-muted)',
    color: 'var(--fgColor-muted)',
    borderColor: 'var(--borderColor-default)',
  },
  accent: {
    backgroundColor: 'var(--app-accent-subtle)',
    color: 'var(--app-accent-fg)',
    borderColor: 'var(--app-accent-muted)',
  },
  success: {
    backgroundColor: 'var(--app-success-subtle)',
    color: 'var(--app-success-fg)',
    borderColor: 'var(--app-success-muted)',
  },
  attention: {
    backgroundColor: 'var(--app-attention-subtle)',
    color: 'var(--app-attention-fg)',
    borderColor: 'var(--app-attention-muted)',
  },
  severe: {
    backgroundColor: 'var(--app-attention-subtle)',
    color: 'var(--app-severe-fg, var(--app-attention-fg))',
    borderColor: 'var(--app-severe-muted, var(--app-attention-muted))',
  },
  danger: {
    backgroundColor: 'var(--app-danger-subtle)',
    color: 'var(--app-danger-fg)',
    borderColor: 'var(--app-danger-muted)',
  },
  done: {
    backgroundColor: 'var(--app-done-subtle, var(--app-accent-subtle))',
    color: 'var(--app-done-fg, var(--app-accent-fg))',
    borderColor: 'var(--app-done-muted, var(--app-accent-muted))',
  },
  sponsors: {
    backgroundColor: 'var(--app-sponsors-subtle, var(--app-accent-subtle))',
    color: 'var(--app-sponsors-fg, var(--app-accent-fg))',
    borderColor: 'var(--app-sponsors-muted, var(--app-accent-muted))',
  },
};

const Tag = ({ variant = 'default', className, style, children, ...rest }: ITagProps) => {
  const colors = useMemo(() => semanticColorsByVariant[variant] ?? semanticColorsByVariant.default, [variant]);
  return (
    <Label
      style={{
        backgroundColor: colors.backgroundColor,
        color: colors.color,
        borderColor: colors.borderColor,
        ...style,
      }}
      variant={variant}
      {...rest}
      className={clsx(styles.tag_label, className)}
    >
      {children}
    </Label>
  );
};

export default Tag;
