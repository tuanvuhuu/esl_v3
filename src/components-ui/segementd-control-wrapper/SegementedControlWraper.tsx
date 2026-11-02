'use client';

import clsx from 'clsx';
import React from 'react';
export type ISegementedControlWraperProps = React.HTMLAttributes<HTMLDivElement>;
const SegementedControlWraper = (props: ISegementedControlWraperProps) => {
    return (
        <div
            {...props}
            className={clsx("segment", props.className)}>

        </div>
    );
};

export default SegementedControlWraper;