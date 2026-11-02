'use client';

import React from 'react';
import styles from "./DataGrid.module.css";
import clsx from 'clsx';

export type INoPaddingCellProps = React.HTMLAttributes<HTMLDivElement>;

const NoPaddingCell = (props: INoPaddingCellProps) => {
    return (
        <div
            {...props}
            className={clsx(styles.noPaddingCell, props.className)}
        />
    );
};

export default NoPaddingCell;
