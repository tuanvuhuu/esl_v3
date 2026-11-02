'use client';

import React from 'react';
import UserAvatar from '../user-avatar';
import styles from './nhan-vien.module.css';

export interface INhanVienShortInfoProps {
  avatar?: string;
  ho_ten?: string;
  dien_thoai?: string;
  email?: string;
  label?: string;
}

const NhanVienShortInfo = (props: INhanVienShortInfoProps): React.JSX.Element | null => {
  const { avatar, ho_ten = '', dien_thoai, email, label } = props;

  if (!ho_ten) return null;

  return (
    <div className="d-flex items-start gap-2">
      <div className={styles.nhanVienShortInfo_box2}>
        <UserAvatar url={avatar} fullName={ho_ten} size="large" />
      </div>

      <div className="d-grid flex-1 min-w-0">
        {label && <div className={styles.nhanVienShortInfo_box4}>{label}</div>}
        <div className="fw-bold text-default overflow-hidden text-ellipsis whitespace-nowrap">
          {ho_ten}
        </div>
        {dien_thoai && <div className="fs-0 text-muted">{dien_thoai}</div>}
        {email && <div className="fs-0 text-muted">{email}</div>}
      </div>
    </div>
  );
};

export default NhanVienShortInfo;
