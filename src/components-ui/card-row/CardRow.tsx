'use client';

import clsx from 'clsx';
import React from 'react';
import styles from './card-row.module.css';

interface ICardRowProps extends React.HTMLAttributes<HTMLDivElement> {
    label?: string | React.ReactNode;
    labelWidth?: number;
}

const CardRow = (props: ICardRowProps) => {
    const { label, labelWidth, ...restProps } = props;
    return (
        <div
            {...restProps}
            className={clsx(styles.cardRow, "pt-2 pb-2 border-b d-flex gap-3", props.className)}
        >
            {label && (
                <div style={{ width: labelWidth }} className="text-muted">
                    {label}
                </div>
            )}
            <div className="flex-1 fw-semibold">
                {props.children}
            </div>
        </div>
    );
};

export default CardRow;
