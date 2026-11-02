'use client';

import { useRouter } from 'next/navigation';
import { MonthYearPicker } from '@/components-ui';

// Bộ chọn tháng/năm nhanh cho trang Báo cáo doanh thu (điều hướng URL ?m=YYYY-MM).
export function ReportMonthFilter({ month }: { month: string }) {
  const router = useRouter();
  return (
    <MonthYearPicker
      value={month}
      onValueChanged={(nextMonth) => {
        router.push(`/bao-cao?m=${nextMonth}`);
      }}
    />
  );
}
