'use client';

import clsx from 'clsx';
import React from 'react';
import styles from "./ModalActions.module.css";
interface IModalActionsProps {
    children?: React.ReactNode
    className?: string
}
const ModalActions = (props: IModalActionsProps) => {
    return (
        <div className={clsx(styles.actions, props.className)}>
            {props.children}
        </div>
    );
};

export default ModalActions;
