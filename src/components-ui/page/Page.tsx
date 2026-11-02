'use client';

import clsx from 'clsx';
import React from 'react';
import { useCommonContext } from '../_adapters/commonContext';
import { useWindowSize } from '../_adapters/hooks';
import styles from './Page.module.css';

export interface IPageProps {
  height?: number;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

const Page = (props: IPageProps): React.JSX.Element => {
  const { height } = useWindowSize();
  const { translate } = useCommonContext();
  const pageTitle = props.title ? translate(props.title) : '';

  return (
    <>
      {pageTitle ? <title>{pageTitle}</title> : null}
      <div
        className={clsx(styles.page, props.className)}
        style={
          {
            '--page-min-height': `${height - 54}px`,
            ...props.style,
          } as React.CSSProperties
        }
      >
        {props.children}
      </div>
    </>
  );
};

export default Page;
