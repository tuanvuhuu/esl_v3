'use client';

import { Label, LabelProps } from '@primer/react';
import React, { useMemo } from 'react';
import styles from './tag.module.css';
import clsx from 'clsx';

interface ITagProps extends LabelProps {
    children?: React.ReactNode
    className?: string
    style?: React.CSSProperties
}

// Cặp {nền mờ, chữ} tương ứng cho từng variant, dùng bộ màu semantic có sẵn của Primer
// (mỗi role màu đều có token `.muted` để tô nền và `.fg` để tô chữ).
const mutedColorsByVariant: Record<NonNullable<LabelProps['variant']>, { backgroundColor: string, color: string }> = {
    default: { backgroundColor: 'var(--app-neutral-muted)', color: 'var(--app-fg-default)' },
    primary: { backgroundColor: 'var(--app-neutral-muted)', color: 'var(--app-fg-default)' },
    secondary: { backgroundColor: 'var(--app-neutral-subtle)', color: 'var(--app-fg-muted)' },
    accent: { backgroundColor: 'var(--app-accent-muted)', color: 'var(--app-accent-fg)' },
    success: { backgroundColor: 'var(--app-success-muted)', color: 'var(--app-success-fg)' },
    attention: { backgroundColor: 'var(--app-attention-muted)', color: 'var(--app-attention-fg)' },
    severe: { backgroundColor: 'var(--app-severe-muted)', color: 'var(--app-severe-fg)' },
    danger: { backgroundColor: 'var(--app-danger-muted)', color: 'var(--app-danger-fg)' },
    done: { backgroundColor: 'var(--app-done-muted)', color: 'var(--app-done-fg)' },
    sponsors: { backgroundColor: 'var(--app-sponsors-muted)', color: 'var(--app-sponsors-fg)' },
};

// Nhận tham số giống hệt Label (variant, size, sx, ...) nhưng bỏ viền của Label,
// thay bằng nền màu muted tương ứng với variant.
const Tag = ({ variant = 'default', className, children, ...rest }: ITagProps) => {
    const colors = useMemo(
        () => mutedColorsByVariant[variant] ?? mutedColorsByVariant.default,
        [variant],
    );
    return (
        <Label style={{ backgroundColor: colors.backgroundColor, color: colors.color }}
            variant={variant}
            {...rest} className={clsx(styles.tag_label, className)}
        >
            {children}
        </Label>
    );
};

export default Tag;
