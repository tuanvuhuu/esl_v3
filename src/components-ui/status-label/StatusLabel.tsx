'use client';

import { Label } from "@primer/react";
import clsx from 'clsx';
import React from "react";

interface StatusLabelProps {
  statusId: number;
  text?: string;
  className?: string;
  maxWidth?: number;
}

const StatusLabel: React.FC<StatusLabelProps> = ({
  statusId,
  text,
  className,
  maxWidth,
}) => {
  const getColorScheme = (
    id: number,
  ):
    | "default"
    | "primary"
    | "secondary"
    | "accent"
    | "success"
    | "attention"
    | "severe"
    | "danger"
    | "done"
    | "sponsors" => {
    switch (id) {
      case 1: // TẠO MỚI
        return "primary";
      case 2: // CHỜ THANH TOÁN
        return "attention";
      case 3: // CHỜ GIAO HÀNG
        return "accent";
      case 4: // HOÀN THÀNH
        return "success";
      case 5: // HỦY PHIẾU TREO
        return "danger";
      case 6: // HỦY ĐƠN HÀNG
        return "danger";
      case 7: // GIAO TRƯỚC
        return "done";
      case 8: // ĐỔI TRẢ
        return "success";
      case 10: // CART
        return "secondary";
      case 11: // CHỜ XÁC NHẬN
        return "attention";
      default:
        return "default";
    }
  };

  const getStatusText = (id: number): string => {
    const statusMap: Record<number, string> = {
      1: "Tạo mới",
      2: "Chờ thanh toán",
      3: "Chờ giao hàng",
      4: "Hoàn thành",
      5: "Hủy phiếu treo",
      6: "Hủy đơn hàng",
      7: "Giao trước",
      8: "Đổi trả",
      10: "Cart",
      11: "Chờ xác nhận thanh toán",
    };

    return statusMap[id] || "Không xác định";
  };

  const colorScheme = getColorScheme(statusId);
  const statusText = text || getStatusText(statusId);

  return (
    <Label
      style={{
        borderColor: `var(--app-${colorScheme}-muted)`,
        color: `var(--app-${colorScheme}-fg)`,
        ...(maxWidth !== undefined ? { maxWidth } : {}),
      }}
      variant="accent"
      className={clsx(className, "fw-bold fs-0")}
    >
      {statusText}
    </Label>
  );
};

export default StatusLabel;
