// Dòng thời gian lịch sử học tập theo chuẩn 01. TSUKUBA. Dùng ở hồ sơ học sinh và trang Lịch sử học tập.
// Web: cột nhãn ngày bên trái, trục dọc + chấm màu ngữ nghĩa ở giữa, thẻ sự kiện bên phải. Điện thoại: trục dọc gọn.
import Link from 'next/link';
import { EmptyState, Pill, type Tone } from '@/components/ui/primitives';
import { dateKeyLabel, vnDateKey, vnDateTimeLabel, vnTimeLabel } from '@/lib/datetime';
import { HISTORY_KIND_LABELS, type HistoryItem, type HistoryKind } from '@/lib/learning-history';
import { formatVND } from '@/lib/money';

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

const KIND_DOT: Record<HistoryKind, string> = {
  absent: 'bg-[#dc2626]',
  late: 'bg-[#d97706]',
  graded: 'bg-[#2563eb]',
  payment: 'bg-[#16a34a]',
  note: 'bg-[#64748b]',
  level_up: 'bg-[#16a34a]',
  exam: 'bg-[#2563eb]',
  class_change: 'bg-[#d97706]',
  status_change: 'bg-[#64748b]',
};

const KIND_BORDER: Record<HistoryKind, string> = {
  absent: 'border-l-[#dc2626]',
  late: 'border-l-[#d97706]',
  graded: 'border-l-[#2563eb]',
  payment: 'border-l-[#16a34a]',
  note: 'border-l-[#64748b]',
  level_up: 'border-l-[#16a34a]',
  exam: 'border-l-[#2563eb]',
  class_change: 'border-l-[#d97706]',
  status_change: 'border-l-[#64748b]',
};

// Sự kiện chỉ có ngày (điểm danh lưu theo ngày) mang giờ 00:00: chỉ hiện ngày, không hiện "00:00" gây hiểu nhầm
function whenLabel(iso: string): string {
  const d = new Date(iso);
  return vnTimeLabel(d) === '00:00' ? dateKeyLabel(vnDateKey(d)) : vnDateTimeLabel(d);
}

export function HistoryTimeline({ items, showStudent = false }: { items: HistoryItem[]; showStudent?: boolean }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]">
        <EmptyState title="Chưa có lịch sử học tập" hint="Điểm danh, bài tập, học phí và ghi chú sẽ hiện ở đây." />
      </div>
    );
  }
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <li
            key={item.id}
            className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-3 min-[768px]:grid-cols-[152px_20px_minmax(0,1fr)] min-[768px]:gap-x-3.5"
          >
            <div className="hidden pt-1 text-right min-[768px]:block">
              <time
                dateTime={item.at}
                className="inline-block rounded-[5px] border border-[var(--borderColor-default)] bg-[#f8fafc] px-2 py-0.5 font-mono text-xs tabular-nums text-[var(--ink-2)] dark:bg-[var(--bgColor-muted)]"
              >
                {whenLabel(item.at)}
              </time>
            </div>
            <span className="relative flex justify-center" aria-hidden>
              {!isLast && (
                <span className="absolute top-3 bottom-0 left-1/2 w-[2px] -translate-x-1/2 bg-[var(--borderColor-muted)]" />
              )}
              <span
                className={`relative z-[1] mt-2.5 size-2.5 shrink-0 rounded-full ring-4 ring-[var(--bgColor-default)] ${KIND_DOT[item.kind]}`}
              />
            </span>
            <div className={`min-w-0 ${isLast ? 'pb-0' : 'pb-3.5'}`}>
              <div
                className={`rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] border-l-[3px] ${KIND_BORDER[item.kind]} bg-[var(--bgColor-default)] px-3.5 py-2.5 shadow-2xs transition-colors hover:border-[var(--borderColor-accent-emphasis)]`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Pill tone={KIND_TONE[item.kind]}>{HISTORY_KIND_LABELS[item.kind]}</Pill>
                  <time
                    dateTime={item.at}
                    className="rounded-[5px] border border-[var(--borderColor-default)] bg-[#f8fafc] px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-[var(--ink-2)] dark:bg-[var(--bgColor-muted)] min-[768px]:hidden"
                  >
                    {whenLabel(item.at)}
                  </time>
                </div>
                <b className="mt-1.5 block text-sm font-semibold text-[var(--fgColor-default)]">
                  {item.title}
                  {item.amount !== null ? <span className="tabular-nums"> · {formatVND(item.amount)}</span> : ''}
                </b>
                {(item.detail || showStudent) && (
                  <small className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs leading-relaxed text-[var(--fgColor-muted)]">
                    {showStudent && (
                      <>
                        <Link
                          href={`/hoc-sinh/${item.studentId}`}
                          data-link="true"
                          className="font-semibold text-[var(--fgColor-link)] hover:underline"
                        >
                          {item.studentName}
                        </Link>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center rounded-[5px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--primary-deep)]">
                          {item.className}
                        </span>
                      </>
                    )}
                    {showStudent && item.detail ? <span aria-hidden>·</span> : null}
                    {item.detail ? <span className="text-[var(--ink-2)]">{item.detail}</span> : null}
                  </small>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
