// Dòng thời gian lịch sử học tập. Dùng ở hồ sơ học sinh và trang Lịch sử học tập.
// Web: cột ngày bên trái, nội dung bên phải. Điện thoại: danh sách dọc.
import { HISTORY_KIND_LABELS, type HistoryItem, type HistoryKind } from '@/lib/learning-history';
import { formatVND } from '@/lib/money';
import Link from 'next/link';
import { dateKeyLabel, vnDateKey, vnDateTimeLabel, vnTimeLabel } from '@/lib/datetime';
import { EmptyState, Pill, type Tone } from '@/components/ui/primitives';

const KIND_TONE: Record<HistoryKind, Tone> = {
  absent: 'blush',
  late: 'butter',
  graded: 'lav',
  payment: 'mint',
  note: 'stone',
  level_up: 'mint',
  exam: 'lav',
  class_change: 'butter',
  status_change: 'stone',
};

// Sự kiện chỉ có ngày (điểm danh lưu theo ngày) mang giờ 00:00: chỉ hiện ngày, không hiện "00:00" gây hiểu nhầm
function whenLabel(iso: string): string {
  const d = new Date(iso);
  return vnTimeLabel(d) === '00:00' ? dateKeyLabel(vnDateKey(d)) : vnDateTimeLabel(d);
}

export function HistoryTimeline({ items, showStudent = false }: { items: HistoryItem[]; showStudent?: boolean }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-panel)] bg-surface shadow-card">
        <EmptyState title="Chưa có lịch sử học tập" hint="Điểm danh, bài tập, học phí và ghi chú sẽ hiện ở đây." />
      </div>
    );
  }
  return (
    <ol className="flex flex-col">
      {items.map((item) => (
        <li key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 min-[768px]:grid-cols-[150px_auto_minmax(0,1fr)] min-[768px]:gap-x-4">
          <time dateTime={item.at} className="hidden pt-1 text-sm tabular-nums text-muted min-[768px]:block">{whenLabel(item.at)}</time>
          <span className="relative flex w-3 justify-center pt-2 min-[768px]:pt-2.5" aria-hidden>
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line" />
            <span className="relative mt-1.5 size-2.5 rounded-full bg-ink-2 ring-4 ring-surface" />
          </span>
          <div className="min-w-0 pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={KIND_TONE[item.kind]}>{HISTORY_KIND_LABELS[item.kind]}</Pill>
              <time dateTime={item.at} className="text-xs tabular-nums text-muted min-[768px]:hidden">{whenLabel(item.at)}</time>
            </div>
            <b className="mt-1.5 block text-base text-ink">{item.title}{item.amount !== null ? ` · ${formatVND(item.amount)}` : ''}</b>
            {(item.detail || showStudent) && (
              <small className="mt-0.5 block text-sm text-ink-2">
                {showStudent && (
                  <span>
                    <Link href={`/hoc-sinh/${item.studentId}`} className="text-link underline underline-offset-2">{item.studentName}</Link> · {item.className}
                  </span>
                )}
                {showStudent && item.detail ? ' · ' : ''}
                {item.detail}
              </small>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
