'use client';

import React from 'react';
import styles from './status-label-small.module.css';

interface StatusLabelProps {
  statusId?: number;
}

const StatusLabelSmall: React.FC<StatusLabelProps> = ({ statusId }) => {
  let text = '';
  let color = '';
  let bgColor = '';

  switch (statusId) {
    case 1:
      text = 'Tạo mới';
      color = '#fff';
      bgColor = '#0969da';
      break;
    case 2:
      text = 'Chờ thanh toán';
      color = '#fff';
      bgColor = '#bf8700';
      break;
    case 3:
      text = 'Chờ giao hàng';
      color = '#fff';
      bgColor = '#9a6700';
      break;
    case 4:
      text = 'Hoàn thành';
      color = '#fff';
      bgColor = '#1a7f37';
      break;
    case 5:
      text = 'Hủy phiếu treo';
      color = '#fff';
      bgColor = '#cf222e';
      break;
    case 6:
      text = 'Hủy đơn hàng';
      color = '#fff';
      bgColor = '#cf222e';
      break;
    case 7:
      text = 'Giao trước';
      color = '#fff';
      bgColor = '#8250df';
      break;
    case 10:
      text = 'Cart';
      color = '#fff';
      bgColor = '#6e7781';
      break;
    case 11:
      text = 'Chờ xác nhận thanh toán';
      color = '#fff';
      bgColor = '#bf8700';
      break;
    default:
      text = 'Không xác định';
      color = '#fff';
      bgColor = '#6e7781';
  }

  return (
    <div style={{ color: color, backgroundColor: bgColor }}
      className={styles.statusLabelSmall_box}
    >
      {text}
    </div>
  );
};

export default StatusLabelSmall;
