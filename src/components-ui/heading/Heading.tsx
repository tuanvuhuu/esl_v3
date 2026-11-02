'use client';

import clsx from 'clsx';
import Text from '../text';
import styles from './heading.module.css';
interface IHeadingProps {
    className?: string;
    size?: "small" | "medium" | "large" | undefined,
    text: string
}
const MyHeading = (props: IHeadingProps) => {
    return (
        <div className={clsx(styles.myHeading_heading, props.className)}
        >
            <Text text={props.text} className={props.className} />
        </div>
    );
};

export default MyHeading;