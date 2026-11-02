'use client';

import React from 'react';
import styles from './block.module.css';
import clsx from 'clsx';
interface IBlockProps {
    className?: string;
    children: React.ReactNode,
    
}
const Block = (props: IBlockProps) => {
    return (
        <div className={clsx(styles.block_box, props.className)}>
            {props.children}
        </div>
    );
};

export default Block;