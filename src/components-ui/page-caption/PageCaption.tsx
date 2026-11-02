'use client';

import Text from '../text';
import { IMyTextProps } from '../text/Text';
import styles from './page-caption.module.css';
import clsx from 'clsx';

export type IPageCaptionProps = IMyTextProps;

const PageCaption = (props: IPageCaptionProps) => {
    return (
        <Text
            {...props}
            className={clsx(styles.pageCaption_text, props.className)}
        />
    );
};

export default PageCaption;
