'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@primer/octicons-react';
import Link from 'next/link';
import { RangePicker } from './RangePicker';

// Thanh điều hướng lịch gộp một chỗ: nút lùi, nút chọn khoảng ngày, nút tiến. Ba nút cùng cỡ, cùng hàng.
// Lùi và tiến đi theo độ dài khoảng đang xem (xem một tuần thì lùi, tiến một tuần).
const ARROW =
  'grid size-[var(--icon-h)] shrink-0 place-items-center rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-muted)] transition-colors hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)] max-[767px]:size-[var(--icon-h-touch)]';

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
        <ChevronLeftIcon size={16} aria-hidden />
      </Link>
      <RangePicker from={from} to={to} onPick={onPick} />
      <Link href={nextHref} scroll={false} aria-label="Khoảng sau" className={ARROW}>
        <ChevronRightIcon size={16} aria-hidden />
      </Link>
    </div>
  );
}
