'use client';

import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@primer/octicons-react';
import { useEffect, useRef, useState } from 'react';
import { ActIcon } from '@/components/ui/ActIcon';
import {
  addDaysKey,
  dateKeyLabel,
  daysBetweenKeys,
  monthKey,
  monthLabel,
  monthStartKey,
  shiftMonth,
  todayKeyVN,
  weekdayLabel,
  weekdayOfKey,
} from '@/lib/datetime';

// Khoảng ngày xem tối đa 62 ngày (đồng bộ với trang Lịch học)
const MAX_SPAN_DAYS = 62;

// Nhãn ngắn trên nút: "21/10" một ngày, "19–25/10" cùng tháng, "19/10–05/11" khác tháng
export function rangeLabel(from: string, to: string): string {
  if (from === to) return dateKeyLabel(from).slice(0, 5);
  if (from.slice(0, 7) === to.slice(0, 7)) return `${from.slice(8)}–${dateKeyLabel(to).slice(0, 5)}`;
  return `${dateKeyLabel(from).slice(0, 5)}–${dateKeyLabel(to).slice(0, 5)}`;
}

// Chọn khoảng ngày bằng lịch tháng (DESIGN mục 10, Lịch học). Bấm ngày bắt đầu, rồi bấm ngày kết thúc.
// Nút hiện khoảng đang xem. Khoảng đang xem tô nhạt, hai đầu tô đậm, hôm nay có viền điểm nhấn.
export function RangePicker({ from, to, onPick }: { from: string; to: string; onPick: (from: string, to: string) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => monthKey(from));
  const [place, setPlace] = useState({ top: 0, left: 0, width: 0 });
  // Ngày bắt đầu vừa bấm, đang chờ ngày kết thúc
  const [draft, setDraft] = useState<string | null>(null);
  const label = rangeLabel(from, to);
  const span = daysBetweenKeys(from, to) + 1;

  // Bấm ra ngoài, nhấn Esc, cuộn trang hoặc đổi cỡ màn hình thì đóng và bỏ ngày bắt đầu đang chờ.
  // Chỉ đóng khi phần cuộn chứa nút chọn (bảng sẽ lệch khỏi nút); lưới lịch tự cuộn bên cạnh thì giữ bảng mở.
  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      setDraft(null);
    };
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onScroll = (e: Event) => {
      const target = e.target;
      if (target === document || (target instanceof Node && rootRef.current && target.contains(rootRef.current))) close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      setDraft(null);
      return;
    }
    // Bảng đặt ngay dưới nút. Trên điện thoại bảng co theo màn hình, không tràn ra mép
    const r = rootRef.current?.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 32);
    const top = (r?.bottom ?? 0) + 8;
    const left = Math.max(16, Math.min(r?.left ?? 16, window.innerWidth - width - 16));
    setPlace({ top, left, width });
    setMonth(monthKey(from));
    setDraft(null);
    setOpen(true);
  }

  // Bấm lần đầu là ngày bắt đầu, bấm lần hai là ngày kết thúc (đổi chỗ nếu bấm lùi).
  // Bấm lại ngày bắt đầu để bỏ chọn.
  function pickDay(key: string) {
    if (draft === null) {
      setDraft(key);
      return;
    }
    if (key === draft) {
      setDraft(null);
      return;
    }
    const start = key < draft ? key : draft;
    let end = key < draft ? draft : key;
    if (daysBetweenKeys(start, end) >= MAX_SPAN_DAYS) end = addDaysKey(start, MAX_SPAN_DAYS - 1);
    setDraft(null);
    setOpen(false);
    onPick(start, end);
  }

  // 42 ô (sáu tuần) để chiều cao không đổi khi đổi tháng. Tuần bắt đầu từ thứ Hai.
  const first = monthStartKey(month);
  const lead = (weekdayOfKey(first) + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => addDaysKey(first, i - lead));
  const today = todayKeyVN();

  // Kiểu một ô. Khi đang chờ ngày kết thúc chỉ hiện ngày bắt đầu, không hiện khoảng cũ.
  function dayClass(key: string): string {
    const active = draft !== null ? key === draft : key === from || key === to;
    const between = draft === null && key > from && key < to;
    const state = active
      ? 'bg-[var(--button-primary-bgColor-rest,var(--primary))] font-semibold text-[var(--button-primary-fgColor-rest,var(--on-primary))]'
      : `${between ? 'bg-[var(--primary-soft)] text-[var(--primary-deep)] hover:bg-[var(--bgColor-neutral-muted)]' : 'hover:bg-[var(--bgColor-muted)]'} ${key.startsWith(month) ? 'text-[var(--fgColor-default)]' : 'text-[var(--fgColor-muted)]/70'}`;
    const todayRing = key === today && !active ? 'font-semibold ring-1 ring-inset ring-[var(--primary)]' : '';
    return `grid size-[var(--icon-h)] place-items-center rounded-[var(--borderRadius-medium)] text-sm tabular-nums transition-colors ${state} ${todayRing}`;
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Chọn khoảng ngày, đang xem ${label}`}
        onClick={toggle}
        className="inline-flex h-[var(--icon-h)] shrink-0 items-center gap-1.5 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-3 text-sm font-medium text-[var(--fgColor-default)] transition-colors hover:border-[var(--borderColor-accent-emphasis)] hover:bg-[var(--bgColor-muted)] max-[767px]:h-[var(--icon-h-touch)]"
      >
        <CalendarIcon size={15} className="text-[var(--fgColor-muted)]" aria-hidden />
        <span className="font-mono text-[13px] font-semibold tabular-nums">{label}</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Chọn khoảng ngày"
          style={{ top: place.top, left: place.left, width: place.width }}
          className="fixed z-30 overflow-hidden rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-[var(--lift)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-2.5 py-2">
            <ActIcon quiet label="Tháng trước" icon={ChevronLeftIcon} onClick={() => setMonth(shiftMonth(month, -1))} />
            <b className="text-sm font-semibold tabular-nums text-[var(--fgColor-default)]">Tháng {monthLabel(month)}</b>
            <ActIcon quiet label="Tháng sau" icon={ChevronRightIcon} onClick={() => setMonth(shiftMonth(month, 1))} />
          </div>
          <div className="p-3">
            <div className="mb-1.5 grid grid-cols-7 gap-1">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <span key={d} className="text-center text-[11px] font-medium uppercase text-[var(--fgColor-muted)]">
                  {weekdayLabel(d)}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-label={dateKeyLabel(key)}
                  aria-pressed={draft !== null ? key === draft : key >= from && key <= to}
                  aria-current={key === today ? 'date' : undefined}
                  onClick={() => pickDay(key)}
                  className={dayClass(key)}
                >
                  {Number(key.slice(8))}
                </button>
              ))}
            </div>
            <p className="m-0 mt-3 border-t border-[var(--borderColor-muted)] pt-2 text-xs leading-relaxed text-[var(--fgColor-muted)]">
              {draft === null ? (
                <>
                  Đang xem{' '}
                  <b className="font-semibold tabular-nums text-[var(--fgColor-default)]">
                    {dateKeyLabel(from)} – {dateKeyLabel(to)}
                  </b>{' '}
                  · {span} ngày
                </>
              ) : (
                <>
                  Đã chọn ngày bắt đầu{' '}
                  <b className="font-semibold tabular-nums text-[var(--fgColor-default)]">{dateKeyLabel(draft)}</b>. Bấm ngày kết thúc, hoặc bấm lại ngày này để bỏ chọn. Tối đa {MAX_SPAN_DAYS} ngày.
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
