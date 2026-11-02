'use client';

import React from 'react';
import clsx from 'clsx';

export type ICardProps = React.HTMLAttributes<HTMLDivElement>;

const Card = (props: ICardProps) => {
    return (
        <div
            {...props}
            className={clsx("rounded-3 p-3 border", props.className)}
        >
            {props.children}
        </div>
    );
};

export default Card;
