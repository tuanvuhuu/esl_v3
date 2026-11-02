'use client';

import { AnchoredOverlay } from '@primer/react';
import React, { useRef, useState } from 'react';
import styles from './quick-view-hover.module.css';
import clsx from 'clsx';
interface IQuickViewHoverProps {
    renderAnchor: (isOpen?: boolean) => React.ReactNode,
    renderOverlay: () => React.ReactNode,

}
const QuickViewHover = (props: IQuickViewHoverProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const closeTimeoutRef = useRef<number | null>(null);

    const clearCloseTimeout = () => {
        if (closeTimeoutRef.current) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    };

    const scheduleClose = () => {
        clearCloseTimeout();
        closeTimeoutRef.current = window.setTimeout(() => {
            setIsOpen(false);
        }, 150);
    };
    return (
        <AnchoredOverlay
            open={isOpen}
            onClose={() => {
                setIsOpen(false)
            }}
            overlayProps={{
                role: 'dialog',
                'aria-modal': true,
                'aria-label': 'Preview',
                onMouseEnter: clearCloseTimeout,
                onMouseLeave: scheduleClose

            }}
            focusZoneSettings={{
                disabled: true
            }}
            side="outside-left"
            align="start"
            renderAnchor={(anchorProps) => {

                return (
                    <div
                        {...anchorProps}
                        onMouseEnter={() => {
                            clearCloseTimeout();
                            setIsOpen(true);
                        }}
                        onMouseLeave={scheduleClose}
                        onKeyDown={undefined}
                        onClick={() => {
                            setIsOpen(true)
                        }}
                        className={clsx("cursor-pointer d-flex items-center justify-center", isOpen && styles.quickViewHover_box_isOpen)}
                    >
                        {props.renderAnchor(isOpen)}
                    </div>
                );
            }}

        >
            {props.renderOverlay()}
        </AnchoredOverlay >
    );
};

export default QuickViewHover;