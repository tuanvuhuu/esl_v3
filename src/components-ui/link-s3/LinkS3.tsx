'use client';

import { Link } from '@primer/react';
import clsx from 'clsx';
import { ComponentProps, useState } from 'react';

interface ILinkS3Props extends ComponentProps<typeof Link> {
    url: string;
}

const LinkS3 = (props: ILinkS3Props) => {
    const [isMouseEnter, setIsMouseEnter] = useState(false);

    return (
        <Link
            href={props.url}
            target="_blank"
            className={clsx("d-flex", props.className)}
            onMouseEnter={() => {
                if (!isMouseEnter) {
                    setIsMouseEnter(true);
                }
            }}
        >
            {props.children}
        </Link>
    );
};

export default LinkS3;
