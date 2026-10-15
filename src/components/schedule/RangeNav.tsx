'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { RangePicker } from './RangePicker';

// Thanh điều hướng lịch gộp một chỗ: nút lùi, nút chọn khoảng ngày, nút tiến. Ba nút cùng cỡ, cùng hàng.
// Lùi và tiến đi theo độ dài khoảng đang xem (xem một tuần thì lùi, tiến một tuần).
const ARROW =
  'grid size-[var(--icon-h)] shrink-0 place-items-center rounded-[var(--radius-ctl)] border border-line bg-surface text-ink-2 transition-colors hover:text-ink max-[767px]:size-[var(--icon-h-touch)]';

export function RangeNav({
  from,
  to,
  prevHref,
  nextHref,
  onPick,
}: {
  from: string;
  to: string;
  prevHref: string;
  nextHref: string;
  onPick: (from: string, to: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Link href={prevHref} scroll={false} aria-label="Khoảng trước" className={ARROW}>
        <ChevronLeft className="size-4" aria-hidden />
      </Link>
      <RangePicker from={from} to={to} onPick={onPick} />
      <Link href={nextHref} scroll={false} aria-label="Khoảng sau" className={ARROW}>
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
