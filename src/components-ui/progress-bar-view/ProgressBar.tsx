'use client';

import { ProgressBar, ProgressBarProps } from '@primer/react';
import React from 'react';
interface IProgressBarViewProps extends ProgressBarProps {
    leadingVisual?: string | React.ReactNode;
    trailingVisual?: string | React.ReactNode;
}
const ProgressBarView = (props: IProgressBarViewProps) => {
    return (
        <div className="d-grid gap-2">
            <div>
                <ProgressBar {...props} />
            </div>
            {(props.leadingVisual || props.trailingVisual) &&
                <div className="d-flex">
                    <div className="flex-1">
                        {props.leadingVisual}
                    </div>
                    {props.trailingVisual}
                </div>
            }
        </div>
    );
};

export default ProgressBarView;