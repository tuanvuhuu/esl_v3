'use client';

// Ảnh mã QR vẽ ngay trên trình duyệt từ chuỗi dữ liệu (không gửi dữ liệu ra dịch vụ ngoài)
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

export function QrImage({ payload, size, label }: { payload: string; size: number; label: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(payload, { margin: 1, width: size * 2, errorCorrectionLevel: 'M' }).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [payload, size]);
  return (
    <div
      className="inline-grid shrink-0 place-items-center rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--qr-bg)] p-2 shadow-[var(--shadow)]"
      style={{ width: size + 16, height: size + 16 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ảnh data URL tạo tại chỗ, không qua next/image */}
      {src && <img src={src} alt={label} width={size} height={size} className="block rounded-[4px]" />}
    </div>
  );
}
