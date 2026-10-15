'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ActIcon } from '@/components/ui/ActIcon';
import { addDaysKey, dateKeyLabel, daysBetweenKeys, monthKey, monthLabel, monthStartKey, shiftMonth, todayKeyVN, weekdayLabel, weekdayOfKey } from '@/lib/datetime';

// Khoảng ngày xem tối đa 62 ngày (đồng bộ với trang Lịch học)
const MAX_SPAN_DAYS = 62;

// Nhãn ngắn trên nút: "21/10" một ngày, "19–25/10" cùng tháng, "19/10–05/11" khác tháng
export function rangeLabel(from: string, to: string): string {
  if (from === to) return dateKeyLabel(from).slice(0, 5);
  if (from.slice(0, 7) === to.slice(0, 7)) return `${from.slice(8)}–${dateKeyLabel(to).slice(0, 5)}`;
  return `${dateKeyLabel(from).slice(0, 5)}–${dateKeyLabel(to).slice(0, 5)}`;
}

// Chọn khoảng ngày bằng lịch tháng (DESIGN mục 10, Lịch học). Bấm ngày bắt đầu, rồi bấm ngày kết thúc.
// Nút hiện khoảng đang xem. Khoảng đang xem tô nhạt, hai đầu tô đậm, hôm nay có viền vàng.
export function RangePicker({ from, to, onPick }: { from: string; to: string; onPick: (from: string, to: string) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => monthKey(from));
  const [place, setPlace] = useState({ top: 0, left: 0, width: 0 });
  // Ngày bắt đầu vừa bấm, đang chờ ngày kết thúc
  const [draft, setDraft] = useState<string | null>(null);
  const label = rangeLabel(from, to);
  const span = daysBetweenKeys(from, to) + 1;

  // Bấm ra ngoài, nhấn Esc, cuộn hoặc đổi cỡ màn hình thì đóng và bỏ ngày bắt đầu đang chờ
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
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
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
      ? 'bg-primary font-bold text-on-primary'
      : `${between ? 'bg-primary-soft hover:bg-line' : 'hover:bg-stone'} ${key.startsWith(month) ? 'text-ink' : 'text-muted'}`;
    const todayRing = key === today && !active ? 'font-bold ring-1 ring-inset ring-primary-deep' : '';
    return `grid size-[var(--icon-h)] place-items-center rounded-[var(--radius-ctl)] text-sm tabular-nums transition-colors ${state} ${todayRing}`;
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Chọn khoảng ngày, đang xem ${label}`}
        onClick={toggle}
        className="inline-flex h-[var(--icon-h)] shrink-0 items-center gap-1.5 rounded-[var(--radius-ctl)] border border-line bg-surface px-3 text-sm font-bold text-ink transition-colors hover:text-ink max-[767px]:h-[var(--icon-h-touch)]"
      >
        <CalendarDays className="size-4" aria-hidden />
        <span className="tabular-nums">{label}</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Chọn khoảng ngày"
          style={{ top: place.top, left: place.left, width: place.width }}
          className="fixed z-30 rounded-[var(--radius-panel)] bg-surface p-3 shadow-card"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <ActIcon label="Tháng trước" onClick={() => setMonth(shiftMonth(month, -1))}>
              <ChevronLeft className="size-4" aria-hidden />
            </ActIcon>
            <b className="text-sm font-bold text-ink">Tháng {monthLabel(month)}</b>
            <ActIcon label="Tháng sau" onClick={() => setMonth(shiftMonth(month, 1))}>
              <ChevronRight className="size-4" aria-hidden />
            </ActIcon>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <span key={d} className="text-center text-xs font-normal text-muted">{weekdayLabel(d)}</span>
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
          <p className="mt-3 border-t border-line pt-2 text-xs text-ink-2">
            {draft === null ? (
              <>Đang xem <b className="font-bold text-ink">{dateKeyLabel(from)} – {dateKeyLabel(to)}</b> · {span} ngày</>
            ) : (
              <>Đã chọn ngày bắt đầu <b className="font-bold text-ink">{dateKeyLabel(draft)}</b>. Bấm ngày kết thúc, hoặc bấm lại ngày này để bỏ chọn. Tối đa {MAX_SPAN_DAYS} ngày.</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
