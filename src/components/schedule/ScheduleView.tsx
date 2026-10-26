'use client';

import { DndContext, KeyboardSensor, PointerSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CSS } from '@dnd-kit/utilities';
import { Filter, Plus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { startTransition, useEffect, useOptimistic, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { SessionRow } from '@/lib/queries/sessions';
import { addDaysKey, dateKeyLabel, daysBetweenKeys, weekdayLabel, weekdayOfKey, weekStartKey } from '@/lib/datetime';
import { listParam } from '@/lib/list-param';
import { PageHeader } from '@/components/ui/PageHeader';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { Pill, type Tone } from '@/components/ui/primitives';
import { EmptyPanel } from '@/components/ui/surfaces';
import { Btn } from '@/components/ui/Btn';
import { useToast } from '@/components/ui/Toast';
import { AddSessionDialog, type ClassPick } from './AddSessionDialog';
import { RangeNav } from './RangeNav';
import { SessionDialog } from './SessionDialog';
import { moveSessionAction } from '@/app/(app)/lich-hoc/actions';
import { draggedStart, hhmm } from '@/lib/schedule-drag';

export type ScheduleFilters = { cls: string; teacher: string };

// Trạng thái buổi học: nhãn và màu theo docs/DESIGN.md
export function sessionState(s: SessionRow): { label: string; tone: Tone } {
  if (s.status === 'cancelled') return { label: 'Đã huỷ', tone: 'blush' };
  if (s.status === 'done') return { label: 'Đã học', tone: 'stone' };
  if (s.isPast) return { label: 'Chưa điểm danh', tone: 'butter' };
  return { label: 'Sắp học', tone: 'mint' };
}

// Màu nền và viền theo lớp (năm màu nhẹ, cố định theo id lớp). Chữ luôn là màu chữ chính.
const CLASS_TONE: { bg: string; edge: string }[] = [
  { bg: 'bg-mint', edge: 'border-mint-ink' },
  { bg: 'bg-lav', edge: 'border-lav-ink' },
  { bg: 'bg-butter', edge: 'border-butter-ink' },
  { bg: 'bg-blush', edge: 'border-blush-ink' },
  { bg: 'bg-stone', edge: 'border-stone-ink' },
];
const toneOf = (classId: number) => CLASS_TONE[Math.abs(classId) % CLASS_TONE.length];

// Phút trong ngày theo giờ Việt Nam (UTC+7) của một mốc thời gian
function minutesOfDay(iso: string): number {
  const vn = new Date(new Date(iso).getTime() + 7 * 3_600_000);
  return vn.getUTCHours() * 60 + vn.getUTCMinutes();
}

// Xếp các buổi trùng giờ trong một ngày thành nhiều làn để không đè lên nhau
function placeLanes(list: SessionRow[]): { s: SessionRow; start: number; end: number; lane: number; lanes: number }[] {
  const items = list
    .map((s) => ({ s, start: minutesOfDay(s.startsAt), end: minutesOfDay(s.endsAt) }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const laneEnds: number[] = [];
  const placed = items.map((it) => {
    let lane = laneEnds.findIndex((end) => end <= it.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(it.end);
    } else {
      laneEnds[lane] = it.end;
    }
    return { ...it, lane, lanes: 0 };
  });
  const total = Math.max(1, laneEnds.length);
  return placed.map((p) => ({ ...p, lanes: total }));
}

// Lưới giờ: cột giờ và độ rộng tối thiểu của mỗi ngày (px). Lưới chỉ dùng khi khoảng có tối đa 7 ngày.
const TIME_COL = '3.5rem';
const TIME_COL_PX = 56;
const DAY_COL_MIN_PX = 150;
// Danh sách theo ngày: trên điện thoại luôn hiện; trên máy tính chỉ hiện khi khoảng dài hơn 7 ngày.
const AGENDA_PHONE = 'flex flex-col gap-5 min-[768px]:hidden';
const AGENDA_ALL = 'flex flex-col gap-5';

export function ScheduleView({
  rangeFrom,
  rangeTo,
  sessions,
  classes,
  teachers,
  filters,
  canManage,
  prevHref,
  nextHref,
  today,
}: {
  rangeFrom: string;
  rangeTo: string;
  sessions: SessionRow[];
  classes: ClassPick[];
  teachers: { id: number; name: string; subject: string }[];
  filters: ScheduleFilters;
  today: string;
  canManage: boolean;
  prevHref: string;
  nextHref: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<SessionRow | null>(null);
  const [adding, setAdding] = useState(false);
  // Thông báo dùng chung kho của Toast (SessionDialog đã vẽ khung thông báo), nên chỉ cần notify
  const { notify } = useToast();

  // Các ngày trong khoảng đang xem, từ ngày bắt đầu đến ngày kết thúc
  const days = Array.from({ length: daysBetweenKeys(rangeFrom, rangeTo) + 1 }, (_, i) => addDaysKey(rangeFrom, i));
  const longRange = days.length > 7;
  const isWeek = days.length === 7 && weekStartKey(rangeFrom) === rangeFrom;
  const byDay = new Map<string, SessionRow[]>(days.map((d) => [d, []]));
  for (const s of sessions) byDay.get(s.dateKey)?.push(s);

  // Khung giờ của lịch: từ giờ sớm nhất đến giờ muộn nhất, tối thiểu tám giờ
  const starts = sessions.map((s) => minutesOfDay(s.startsAt));
  const ends = sessions.map((s) => minutesOfDay(s.endsAt));
  const hourStart = starts.length ? Math.floor(Math.min(...starts) / 60) : 7;
  let hourEnd = ends.length ? Math.ceil(Math.max(...ends) / 60) : 21;
  if (hourEnd - hourStart < 8) hourEnd = Math.min(24, hourStart + 8);
  const hours = Array.from({ length: hourEnd - hourStart }, (_, i) => hourStart + i);
  const gridHeight = `calc(${hours.length} * var(--cal-hour-h))`;
  const hourTop = (h: number) => `calc(${h - hourStart} * var(--cal-hour-h))`;

  // Mở lịch tuần thì cuộn tới chỗ cần xem: buổi chưa học sớm nhất của hôm nay, không có thì khung giờ nhiều buổi nhất
  // (lớp buổi tối không bị khuất dưới 08:00). Lưới cuộn trong khung riêng, hàng tên ngày dính trên cùng.
  const gridScroll = useRef<HTMLDivElement>(null);
  const todayUpcoming = sessions.filter((s) => s.dateKey === today && !s.isPast && s.status !== 'cancelled').map((s) => minutesOfDay(s.startsAt));
  const startCount = new Map<number, number>();
  for (const m of starts) startCount.set(Math.floor(m / 60), (startCount.get(Math.floor(m / 60)) ?? 0) + 1);
  const busiestHour = [...startCount.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? hourStart;
  const focusHour = Math.max(hourStart, (todayUpcoming.length ? Math.floor(Math.min(...todayUpcoming) / 60) : busiestHour) - 1);
  useEffect(() => {
    const box = gridScroll.current;
    const line = box?.querySelector<HTMLElement>(`[data-hour="${focusHour}"]`);
    // Người dùng đã tự cuộn khung (kể cả trước khi trang tải xong) thì không cuộn đè lên, tránh bấm hụt buổi đang nhắm
    if (box && line && box.scrollTop === 0) box.scrollTop = line.offsetTop;
  }, [focusHour, rangeFrom]);

  // Lớp và giáo viên hiện ngay khi chọn, không chờ trang tải lại (chọn liên tiếp không mất mục)
  const [clsView, setClsView] = useOptimistic(filters.cls);
  const [teacherView, setTeacherView] = useOptimistic(filters.teacher);

  // Đổi bộ lọc: giữ khoảng ngày đang xem, thay lớp hoặc giáo viên
  function applyFilter(next: Partial<ScheduleFilters>) {
    const f = { cls: next.cls ?? clsView, teacher: next.teacher ?? teacherView };
    startTransition(() => {
      setClsView(f.cls);
      setTeacherView(f.teacher);
      const params = new URLSearchParams({ w: rangeFrom, to: rangeTo });
      if (f.cls) params.set('cls', f.cls);
      if (f.teacher) params.set('teacher', f.teacher);
      router.push(`/lich-hoc?${params.toString()}`, { scroll: false });
    });
  }

  // Chọn khoảng ngày trên lịch: giữ bộ lọc
  function pickRange(from: string, to: string) {
    const params = new URLSearchParams({ w: from, to });
    if (clsView) params.set('cls', clsView);
    if (teacherView) params.set('teacher', teacherView);
    router.push(`/lich-hoc?${params.toString()}`, { scroll: false });
  }

  const subtitle = isWeek
    ? `Tuần ${dateKeyLabel(rangeFrom)} – ${dateKeyLabel(rangeTo)}. Bấm vào buổi để xem hoặc sửa.`
    : `Từ ${dateKeyLabel(rangeFrom)} đến ${dateKeyLabel(rangeTo)} (${days.length} ngày). Bấm vào buổi để xem hoặc sửa.`;


  // Kéo buổi trên lưới tuần để dời (người quản lý lớp). Thả xong giờ mới làm tròn 15 phút, kiểm trùng ở máy chủ.
  const dragging = useRef(false);
  const [pendingMove, setPendingMove] = useState<{ session: SessionRow; day: string; start: number } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  function onDragStart() {
    dragging.current = true;
  }
  function onDragCancel() {
    dragging.current = false;
  }
  function onDragEnd(e: DragEndEvent) {
    setTimeout(() => {
      dragging.current = false;
    }, 0);
    const s = e.active.data.current?.session as SessionRow | undefined;
    const day = e.over?.data.current?.day as string | undefined;
    if (!s || !day || !e.over) return;
    const from = minutesOfDay(s.startsAt);
    const duration = minutesOfDay(s.endsAt) - from;
    const next = draggedStart(from, e.delta.y, e.over.rect.height, hours.length, hourStart * 60, hourEnd * 60, duration);
    if (day === s.dateKey && next === from) return;
    // Chưa dời ngay: hỏi xác nhận trước, vì dời buổi sẽ báo phụ huynh và giáo viên
    setPendingMove({ session: s, day, start: next });
  }

  function confirmMove() {
    if (!pendingMove) return;
    const { session: s, day, start } = pendingMove;
    setPendingMove(null);
    startTransition(async () => {
      const r = await moveSessionAction(s.id, day, hhmm(start));
      notify(r.message ?? (r.ok ? 'Đã dời buổi' : 'Không dời được'));
      if (r.ok) router.refresh();
    });
  }

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Lịch học']}
        title="Lịch học"
        subtitle={subtitle}
        actions={
          canManage && classes.length > 0 ? (
            <Btn variant="primary" onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden />
              Thêm buổi
            </Btn>
          ) : null
        }
      />
      {adding && (
        <AddSessionDialog
          open
          classes={classes}
          teachers={teachers}
          defaultDate={today >= rangeFrom && today <= rangeTo ? today : rangeFrom}
          defaultClassId={listParam(clsView).length === 1 ? Number(listParam(clsView)[0]) : null}
          onClose={() => setAdding(false)}
          onDone={(text) => {
            setAdding(false);
            notify(text);
            router.refresh();
          }}
        />
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <RangeNav from={rangeFrom} to={rangeTo} prevHref={prevHref} nextHref={nextHref} onPick={pickRange} />
        <div className="flex min-w-0 flex-wrap items-center gap-2 max-[767px]:w-full min-[768px]:flex-1">
          <SelectPanel
            multiple
            label="Lọc theo lớp"
            icon={<Users className="size-3.5 text-muted" aria-hidden />}
            values={listParam(clsView)}
            onChange={(vs) => applyFilter({ cls: vs.join(',') })}
            options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder="Mọi lớp"
            className="min-w-0 flex-1 min-[768px]:flex-none"
          />
          <SelectPanel
            multiple
            label="Lọc theo giáo viên"
            icon={<Filter className="size-3.5 text-muted" aria-hidden />}
            values={listParam(teacherView)}
            onChange={(vs) => applyFilter({ teacher: vs.join(',') })}
            options={teachers.map((t) => ({ value: String(t.id), label: t.name }))}
            placeholder="Mọi giáo viên"
            className="min-w-0 flex-1 min-[768px]:flex-none"
          />
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyPanel title="Không có buổi học nào trong khoảng này" hint="Đổi bộ lọc hoặc chọn khoảng ngày khác." />
      ) : (
        <>
          {/* Máy tính bảng và máy tính: lưới giờ, mỗi ngày một cột. Chỉ dùng khi khoảng có tối đa 7 ngày. */}
          {!longRange && (
            <div className="hidden overflow-hidden rounded-[var(--radius-panel)] bg-surface shadow-card min-[768px]:block">
              <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragCancel={onDragCancel} onDragEnd={onDragEnd}>
              <div ref={gridScroll} data-testid="week-grid" className="relative max-h-[calc(100dvh-13rem)] min-h-[24rem] overflow-auto">
                <div style={{ minWidth: `${TIME_COL_PX + days.length * DAY_COL_MIN_PX}px` }}>
                  {/* Tiêu đề ngày: dính trên cùng khi cuộn; hôm nay tô màu */}
                  <div className="sticky top-0 z-10 grid border-b border-line bg-surface" style={{ gridTemplateColumns: `${TIME_COL} repeat(${days.length}, minmax(0, 1fr))` }}>
                    <div />
                    {days.map((day) => (
                      <div key={day} aria-current={day === today ? 'date' : undefined} className={`px-2 py-2.5 text-center ${day === today ? 'bg-primary-soft' : ''}`}>
                        <b className="block text-sm font-bold text-ink">
                          {weekdayLabel(weekdayOfKey(day))}
                          {day === today && <span className="ml-1 font-normal text-ink-2">· Hôm nay</span>}
                        </b>
                        <small className="text-xs text-muted">{dateKeyLabel(day).slice(0, 5)} · {(byDay.get(day) ?? []).length} buổi</small>
                      </div>
                    ))}
                  </div>

                  {/* Lưới giờ */}
                  <div className="grid" style={{ gridTemplateColumns: `${TIME_COL} repeat(${days.length}, minmax(0, 1fr))` }}>
                    <div className="relative" style={{ height: gridHeight }}>
                      {hours.map((h) => (
                        <span key={h} data-hour={h} className="absolute right-2 -translate-y-1/2 text-xs tabular-nums text-muted" style={{ top: hourTop(h) }}>
                          {String(h).padStart(2, '0')}:00
                        </span>
                      ))}
                    </div>
                    {days.map((day) => (
                      <DayColumn key={day} day={day} today={today} height={gridHeight}>
                        {hours.map((h) => (
                          <div key={h} className="absolute inset-x-0 border-t border-line" style={{ top: hourTop(h) }} />
                        ))}
                        {placeLanes(byDay.get(day) ?? []).map((p) => (
                          <CalendarBlock
                            key={p.s.id}
                            placed={p}
                            style={{
                              top: `calc(${(p.start - hourStart * 60) / 60} * var(--cal-hour-h) + 2px)`,
                              height: `calc(${(p.end - p.start) / 60} * var(--cal-hour-h) - 4px)`,
                              left: `calc(${(p.lane / p.lanes) * 100}% + 2px)`,
                              width: `calc(${100 / p.lanes}% - 4px)`,
                            }}
                            onOpen={() => { if (!dragging.current) setOpen(p.s); }}
                            canDrag={canManage}
                          />
                        ))}
                      </DayColumn>
                    ))}
                  </div>
                </div>
              </div>
              </DndContext>
            </div>
          )}

          {/* Điện thoại: lịch theo ngày, có trục thời gian; ngày không có buổi thì bỏ qua. Khoảng dài hơn một tuần: hiện cả trên máy tính. */}
          <div className={longRange ? AGENDA_ALL : AGENDA_PHONE}>
            {days.filter((d) => (byDay.get(d) ?? []).length > 0).map((day) => (
              <section key={day} aria-label={`Buổi học ${dateKeyLabel(day)}`} className="flex flex-col gap-3">
                <header className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-ctl)] bg-primary text-base font-extrabold text-on-primary">
                    {day.slice(8, 10)}
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-ink">{weekdayLabel(weekdayOfKey(day))}</h2>
                    <small className="text-xs text-muted">{dateKeyLabel(day)} · {(byDay.get(day) ?? []).length} buổi</small>
                  </div>
                </header>
                <ul className="ml-[1.15rem] flex flex-col gap-2.5 border-l-2 border-line pl-4">
                  {(byDay.get(day) ?? []).map((s) => (
                    <li key={s.id}>
                      <AgendaCard session={s} onOpen={() => setOpen(s)} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      <SessionDialog session={open} teachers={teachers} canManage={canManage} onClose={() => setOpen(null)} />
      <ConfirmDialog
        open={!!pendingMove}
        title="Dời buổi học?"
        tone="primary"
        confirmLabel="Dời buổi"
        text={
          pendingMove
            ? `${pendingMove.session.className}, buổi ${pendingMove.session.sessionNo}: từ ${pendingMove.session.timeLabel} (${dateKeyLabel(pendingMove.session.dateKey)}) sang ${hhmm(pendingMove.start)} ${dateKeyLabel(pendingMove.day)}. Phụ huynh và giáo viên sẽ nhận tin báo lịch mới.`
            : ''
        }
        onConfirm={confirmMove}
        onCancel={() => setPendingMove(null)}
      />
    </section>
  );
}

// Khối một buổi trên lưới tuần. Luôn hiện đủ giờ, lớp, giáo viên và trạng thái.
// Khi buổi trùng giờ làn hẹp, chữ xuống dòng chứ không cắt.
function CalendarBlock({ placed, style, onOpen, canDrag }: { placed: { s: SessionRow; start: number; end: number }; style: CSSProperties; onOpen: () => void; canDrag: boolean }) {
  const s = placed.s;
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({ id: `session-${s.id}`, data: { session: s }, disabled: !canDrag });
  const state = sessionState(s);
  const cancelled = s.status === 'cancelled';
  const tone = toneOf(s.classId);
  // Chấm màu theo trạng thái, chữ trạng thái vẫn hiện ngay bên cạnh
  const dot = state.tone === 'mint' ? 'bg-mint-ink' : state.tone === 'butter' ? 'bg-butter-ink' : state.tone === 'blush' ? 'bg-blush-ink' : 'bg-stone-ink';
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      data-card="true"
      onClick={onOpen}
      style={{ ...style, transform: CSS.Translate.toString(transform), zIndex: isDragging ? 20 : undefined, cursor: canDrag ? 'grab' : undefined, touchAction: canDrag ? 'none' : undefined }}
      className={`absolute flex flex-col overflow-hidden rounded-[var(--radius-ctl)] border-l-4 px-1 py-0.5 text-left leading-tight transition-shadow hover:shadow-card ${tone.bg} ${tone.edge} ${cancelled ? 'opacity-60' : ''}`}
    >
      <span className={`text-2xs font-bold tabular-nums tracking-tight text-ink ${cancelled ? 'line-through' : ''}`}>{s.timeLabel}</span>
      <span className={`break-words text-xs font-bold text-ink ${cancelled ? 'line-through' : ''}`}>{s.className}</span>
      <span className="break-words text-2xs text-ink-2">{s.teacherName}{s.room ? ` · ${s.room}` : ''}</span>
      <span className="mt-auto flex items-center gap-1 pt-0.5 text-2xs text-ink-2">
        <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${dot}`} />
        {state.label}
      </span>
    </button>
  );
}

// Cột một ngày trên lưới tuần: vùng thả buổi đang kéo
function DayColumn({ day, today, height, children }: { day: string; today: string; height: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}`, data: { day } });
  return (
    <div ref={setNodeRef} data-day={day} className={`relative border-l border-line ${day === today ? 'bg-primary-soft/40' : ''} ${isOver ? 'bg-primary-soft/70' : ''}`} style={{ height }}>
      {children}
    </div>
  );
}

// Thẻ một buổi trong lịch theo ngày (điện thoại)
function AgendaCard({ session: s, onOpen }: { session: SessionRow; onOpen: () => void }) {
  const state = sessionState(s);
  const cancelled = s.status === 'cancelled';
  const tone = toneOf(s.classId);
  return (
    <button
      type="button"
      data-card="true"
      onClick={onOpen}
      className={`flex w-full flex-col gap-1 rounded-[var(--radius-ctl)] border-l-4 px-3 py-2.5 text-left transition-colors ${tone.bg} ${tone.edge} ${cancelled ? 'opacity-70' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-extrabold tabular-nums text-ink ${cancelled ? 'line-through' : ''}`}>{s.timeLabel}</span>
        <Pill tone={state.tone}>{state.label}</Pill>
      </div>
      <span className={`truncate text-base font-bold text-ink ${cancelled ? 'line-through' : ''}`}>{s.className}</span>
      <span className="truncate text-xs text-ink-2">{s.teacherName}{s.room ? ` · ${s.room}` : ''}</span>
      {cancelled && s.cancelReason && <small className="text-xs text-blush-ink">Lý do: {s.cancelReason}</small>}
    </button>
  );
}
