'use client';

import clsx from 'clsx';
import React, { useEffect, useRef } from 'react';
import styles from "./DataGrid.module.css";

interface IFocusedCellProps extends React.HTMLAttributes<HTMLDivElement> {
    onLostFocused?: () => void;
}

const FocusedCell = (props: IFocusedCellProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const { onLostFocused, ...rest } = props;
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target) return;

            // If the element has been unmounted, ignore it
            if (!document.body.contains(target)) {
                return;
            }

            // Ignore clicks inside portal overlays, menus, listboxes
            if (
                target.closest('[data-portal-root]') ||
                target.closest('[role="menu"]') ||
                target.closest('[role="listbox"]') ||
                target.closest('.primer-portal') ||
                target.closest('[class*="Overlay"]') ||
                target.closest('[class*="overlay"]')
            ) {
                return;
            }

            if (ref.current && !ref.current.contains(target)) {
                onLostFocused?.();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onLostFocused]);

    return (
        <div
            ref={ref}
            {...rest}
            className={clsx(styles.focusedCell, styles.focusedCell_focusedCell, props.className)}
        />
    );
};

export default FocusedCell;
