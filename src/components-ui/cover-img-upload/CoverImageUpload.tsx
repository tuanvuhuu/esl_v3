'use client';

import clsx from 'clsx';
import React from 'react';
import { useCommonContext } from '../_adapters/commonContext';
import { IUploadResult } from '../_adapters/upload';
import { Upload } from '../_adapters/uploadComponents';
import styles from './CoverImageUpload.module.css';

export interface ICoverImageUploadProps {
  className?: string;
  value: string;
  onValueChanged: (data?: IUploadResult) => void;
  accept?: string;
  subFolder?: string;
}

const CoverImageUpload = (props: ICoverImageUploadProps): React.JSX.Element => {
  const { value, onValueChanged, accept, subFolder } = props;
  const { translate } = useCommonContext();

  return (
    <div className={props.className}>
      {value ? (
        <div className={clsx(styles.img_container, styles.coverImageUpload_imgContainer)}>
          <img src={value} alt="cover" />
          <button
            type="button"
            className={styles.remove}
            onClick={() => onValueChanged(undefined)}
            title={translate('Base.Label.Delete')}
          >
            <em className="fas fa-times" />
          </button>
        </div>
      ) : (
        <Upload
          onUploadSuccess={(data) => {
            props.onValueChanged(data);
          }}
          accept={accept}
          subFolder={subFolder}
        />
      )}
    </div>
  );
};

export default CoverImageUpload;
