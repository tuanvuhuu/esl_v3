'use client';

import { Flash, FlashProps } from "@primer/react";
import styles from './empty-warning.module.css';
import clsx from 'clsx';

export interface IEmptyWarningProps extends FlashProps {
  icon?: React.ReactNode;
  caption?: string;
  description?: string;
}

const EmptyWarning = (props: IEmptyWarningProps) => {
  return (
    <Flash
      variant="warning"
      {...props}
      className={clsx(styles.emptyWarning_flash, props.className)}
    >
      <div
        className={clsx("d-grid gap-2", props.icon ? styles.emptyWarning_box_icon : styles.emptyWarning_box_notIcon)}
      >
        {props.icon && <div>{props.icon}</div>}
        <div>
          <div className={styles.emptyWarning_box2}>{props.caption}</div>
          <div>{props.description}</div>
        </div>
      </div>
    </Flash>
  );
};
export default EmptyWarning;
