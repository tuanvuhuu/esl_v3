'use client';

import { Dialog, DialogProps } from '@primer/react';
import React from 'react';
import { useCommonContext } from '@/components-ui/_adapters/commonContext';

export interface IMyModalProps extends DialogProps {
    children?: React.ReactNode;
    titleComponent?: React.ReactNode;
    onClose: () => void;
    width?: DialogProps['width'];
    isOpen?: boolean;
    className?: string;
}

const MyModal = (props: IMyModalProps) => {
    const { translate } = useCommonContext();
    return (
        <>
            {props.isOpen && (
                <Dialog
                    title={props.title ? translate(props.title?.toString()) : props.titleComponent}
                    subtitle={props.subtitle ? props.subtitle?.toString() : undefined}
                    width={props.width}
                    height={props.height}
                    className={props.className}
                    onClose={(gesture) => {
                        if (gesture === 'escape') return;
                        props.onClose();
                    }}
                    renderHeader={props.renderHeader}
                >
                    {props.children}
                </Dialog>
            )}
        </>
    );
};

export default MyModal;
