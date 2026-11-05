'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ClockIcon, FilterIcon, LocationIcon, PeopleIcon, PlusIcon } from '@primer/octicons-react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { startTransition, useEffect, useOptimistic, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { SessionRow } from '@/lib/queries/sessions';
import { addDaysKey, dateKeyLabel, daysBetweenKeys, weekdayLabel, weekdayOfKey, weekStartKey } from '@/lib/datetime';
import { listParam } from '@/lib/list-param';
import { ComboBox } from '@/components-ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
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

function isMakeupSession(s: SessionRow): boolean {
  return /bù/i.test(s.topic);
}

// Màu thanh bên trái 3px + nền chuẩn Portal.module.css (.cal / .day) của 01. TSUKUBA
function sessionVisual(s: SessionRow): { bar: string; surface: string; dot: string } {
  if (s.status === 'cancelled') {
    return {
      bar: 'border-l-[var(--blush-ink)]',
      surface: 'bg-[var(--blush)]',
      dot: 'bg-[#dc2626]',
    };
  }
  if (isMakeupSession(s) && s.status !== 'done') {
    return {
      bar: 'border-l-[var(--lav-ink)]',
      surface: 'bg-[var(--lav)]',
      dot: 'bg-[#2563eb]',
    };
  }
  if (s.status === 'done') {
    return {
      bar: 'border-l-[var(--stone-ink)]',
      surface: 'bg-[var(--stone)]',
      dot: 'bg-[#64748b]',
    };
  }
  if (s.isPast) {
    return {
      bar: 'border-l-[var(--butter-ink)]',
      surface: 'bg-[var(--butter)]',
      dot: 'bg-[#d97706]',
    };
  }
  return {
    bar: 'border-l-[var(--mint-ink)]',
    surface: 'bg-[var(--mint)]',
    dot: 'bg-[#16a34a]',
  };
}

// Phút trong ngày theo giờ Việt Nam (UTC+7) của một mốc thời gian
function minutesOfDay(iso: string): number {
  const vn = new Date(new Date(iso).getTime() + 7 * 3_600_000);
  return vn.getUTCHours() * 60 + vn.getUTCMinutes();
}

// Xếp các buổi trùng giờ thành làn để không đè lên nhau. Làn tính theo từng cụm buổi nối tiếp nhau trùng giờ,
// nên một cụm đông không làm hẹp các buổi ở cụm khác trong cùng ngày.
function placeLanes(list: SessionRow[]): { s: SessionRow; start: number; end: number; lane: number; lanes: number }[] {
  const items = list
    .map((s) => ({ s, start: minutesOfDay(s.startsAt), end: minutesOfDay(s.endsAt) }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const out: { s: SessionRow; start: number; end: number; lane: number; lanes: number }[] = [];
  let cluster: typeof out = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const total = Math.max(1, laneEnds.length);
    for (const p of cluster) out.push({ ...p, lanes: total });
    cluster = [];
    laneEnds = [];
  };
  for (const it of items) {
    if (cluster.length > 0 && it.start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= it.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(it.end);
    } else {
      laneEnds[lane] = it.end;
    }
    cluster.push({ ...it, lane, lanes: 0 });
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  if (cluster.length > 0) flush();
  return out;
}

// Lưới giờ: cột giờ và độ rộng tối thiểu của mỗi ngày (px). Lưới chỉ dùng khi khoảng có tối đa 7 ngày.
const TIME_COL = '3.75rem';
const TIME_COL_PX = 60;
const DAY_COL_MIN_PX = 152;
// Mỗi làn cần đủ rộng để đọc được tên lớp và giờ; ngày nhiều buổi trùng giờ thì lưới rộng ra và cuộn ngang
const LANE_MIN_PX = 84;
// Danh sách theo ngày: trên điện thoại luôn hiện; trên máy tính chỉ hiện khi khoảng dài hơn 7 ngày.
const AGENDA_PHONE = 'flex flex-col gap-4 min-[768px]:hidden';
const AGENDA_ALL = 'flex flex-col gap-4';

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
  // Làn và độ rộng cột tính sau khi đã có đủ buổi của từng ngày
  const placedByDay = new Map(days.map((d) => [d, placeLanes(byDay.get(d) ?? [])]));
  const dayWidth = (d: string) => Math.max(DAY_COL_MIN_PX, Math.max(1, ...(placedByDay.get(d) ?? []).map((p) => p.lanes)) * LANE_MIN_PX);
  const dayColumns = days.map((d) => `minmax(${dayWidth(d)}px, 1fr)`).join(' ');
  const gridWidth = TIME_COL_PX + days.reduce((sum, d) => sum + dayWidth(d), 0);

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

  const subtitle = isWeek
    ? `Tuần ${dateKeyLabel(rangeFrom)} – ${dateKeyLabel(rangeTo)}`
    : `Từ ${dateKeyLabel(rangeFrom)} đến ${dateKeyLabel(rangeTo)} (${days.length} ngày)`;

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Lịch học']}
        title="Lịch học"
        subtitle={subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <RangeNav from={rangeFrom} to={rangeTo} prevHref={prevHref} nextHref={nextHref} onPick={pickRange} />
            <ComboBox
              multiple
              auto
              variant="bar"
              label="Lọc theo lớp"
              icon={<PeopleIcon size={14} className="text-[var(--fgColor-muted)]" aria-hidden />}
              values={listParam(clsView)}
              onChange={(vs) => applyFilter({ cls: vs.join(',') })}
              options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
              placeholder="Mọi lớp"
            />
            <ComboBox
              multiple
              auto
              variant="bar"
              label="Lọc theo giáo viên"
              icon={<FilterIcon size={14} className="text-[var(--fgColor-muted)]" aria-hidden />}
              values={listParam(teacherView)}
              onChange={(vs) => applyFilter({ teacher: vs.join(',') })}
              options={teachers.map((t) => ({ value: String(t.id), label: t.name }))}
              placeholder="Mọi giáo viên"
            />
            {canManage && classes.length > 0 && (
              <Btn variant="primary" leadingVisual={PlusIcon} onClick={() => setAdding(true)}>
                Thêm buổi
              </Btn>
            )}
          </div>
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

      {sessions.length === 0 ? (
        <EmptyPanel title="Không có buổi học nào trong khoảng này" hint="Đổi bộ lọc hoặc chọn khoảng ngày khác." />
      ) : (
        <>
          {/* Tsukuba .calLegend strip */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-3.5 py-2.5 text-xs text-[var(--ink-2)] shadow-[var(--shadow)]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="inline-flex items-center rounded-[5px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] px-2 py-0.5 font-semibold tabular-nums text-[var(--primary-deep)]">
                Tổng {sessions.length} buổi học
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span aria-hidden className="size-2.5 rounded-full bg-[#16a34a]" />
                Sắp học
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span aria-hidden className="size-2.5 rounded-full bg-[#64748b]" />
                Đã học
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span aria-hidden className="size-2.5 rounded-full bg-[#d97706]" />
                Chưa điểm danh
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span aria-hidden className="size-2.5 rounded-full bg-[#2563eb]" />
                Học bù
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span aria-hidden className="size-2.5 rounded-full bg-[#dc2626]" />
                Đã huỷ
              </span>
            </div>
            {canManage && !longRange && (
              <span className="hidden text-[11px] text-[var(--fgColor-muted)] min-[900px]:inline">
                Kéo thả buổi học sang ô khác để dời lịch
              </span>
            )}
          </div>

          {/* Máy tính bảng và máy tính: lưới giờ chuẩn 01. TSUKUBA (.cal / .day), mỗi ngày một cột */}
          {!longRange && (
            <div className="tsukuba-rise hidden overflow-hidden rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-[var(--shadow)] min-[768px]:block">
              <DndContext id="schedule-dnd" sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragCancel={onDragCancel} onDragEnd={onDragEnd}>
                <div ref={gridScroll} data-testid="week-grid" className="relative max-h-[calc(100dvh-14.5rem)] min-h-[24rem] overflow-auto">
                  <div style={{ minWidth: `${gridWidth}px` }}>
                    {/* Tiêu đề ngày #f8fafc: dính trên cùng khi cuộn; hôm nay có nhãn điểm nhấn */}
                    <div
                      className="sticky top-0 z-10 grid border-b border-[var(--borderColor-default)] bg-[#f8fafc] dark:bg-[var(--bgColor-muted)]"
                      style={{ gridTemplateColumns: `${TIME_COL} ${dayColumns}` }}
                    >
                      <div className="flex items-center justify-center px-1 py-2 font-mono text-[10px] font-medium text-[var(--fgColor-muted)]">
                        GMT+7
                      </div>
                      {days.map((day) => {
                        const isToday = day === today;
                        const count = (byDay.get(day) ?? []).length;
                        return (
                          <div
                            key={day}
                            aria-current={isToday ? 'date' : undefined}
                            className={clsx(
                              'border-l border-[var(--borderColor-default)] px-2 py-2 text-center',
                              isToday && 'bg-[var(--primary-soft)]/65',
                            )}
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              <b className="text-xs font-semibold uppercase tracking-wide text-[var(--fgColor-default)]">
                                {weekdayLabel(weekdayOfKey(day))}
                              </b>
                              {isToday && (
                                <span className="rounded-[5px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--primary-deep)]">
                                  Hôm nay
                                </span>
                              )}
                            </div>
                            <small className="mt-0.5 block font-mono text-[11px] tabular-nums text-[var(--fgColor-muted)]">
                              {dateKeyLabel(day).slice(0, 5)} · {count} buổi
                            </small>
                          </div>
                        );
                      })}
                    </div>

                    {/* Lưới giờ */}
                    <div className="grid" style={{ gridTemplateColumns: `${TIME_COL} ${dayColumns}` }}>
                      <div className="relative bg-[#fcfdff] dark:bg-[var(--bgColor-muted)]/35" style={{ height: gridHeight }}>
                        {hours.map((h) => (
                          <span
                            key={h}
                            data-hour={h}
                            className="absolute right-2 -translate-y-1/2 font-mono text-[11px] tabular-nums text-[var(--fgColor-muted)]"
                            style={{ top: hourTop(h) }}
                          >
                            {String(h).padStart(2, '0')}:00
                          </span>
                        ))}
                      </div>
                      {days.map((day) => (
                        <DayColumn key={day} day={day} today={today} height={gridHeight}>
                          {hours.map((h) => (
                            <div
                              key={h}
                              className="absolute inset-x-0 border-t border-[var(--borderColor-muted)]"
                              style={{ top: hourTop(h) }}
                            />
                          ))}
                          {(placedByDay.get(day) ?? []).map((p) => (
                            <CalendarBlock
                              key={p.s.id}
                              placed={p}
                              style={{
                                top: `calc(${(p.start - hourStart * 60) / 60} * var(--cal-hour-h) + 2px)`,
                                height: `calc(${(p.end - p.start) / 60} * var(--cal-hour-h) - 4px)`,
                                left: `calc(${(p.lane / p.lanes) * 100}% + 3px)`,
                                width: `calc(${100 / p.lanes}% - 6px)`,
                              }}
                              onOpen={() => {
                                if (!dragging.current) setOpen(p.s);
                              }}
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

          {/* Điện thoại hoặc khoảng dài hơn 7 ngày: danh sách theo ngày chuẩn .dateBox của 01. TSUKUBA */}
          <div className={longRange ? AGENDA_ALL : AGENDA_PHONE}>
            {days
              .filter((d) => (byDay.get(d) ?? []).length > 0)
              .map((day) => {
                const isToday = day === today;
                return (
                  <section
                    key={day}
                    aria-label={`Buổi học ${dateKeyLabel(day)}`}
                    className="overflow-hidden rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-[var(--shadow)]"
                  >
                    <header className="flex items-center justify-between gap-3 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-default)] px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={clsx(
                            'grid size-9 shrink-0 place-items-center rounded-[var(--borderRadius-medium)] font-mono text-sm font-semibold tabular-nums shadow-2xs',
                            isToday
                              ? 'bg-gradient-to-br from-[var(--primary)] to-[var(--primary-deep)] text-[var(--on-primary)]'
                              : 'border border-[var(--borderColor-default)] bg-[#f8fafc] text-[var(--fgColor-default)] dark:bg-[var(--bgColor-muted)]',
                          )}
                        >
                          {day.slice(8, 10)}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h2 className="m-0 text-sm font-semibold text-[var(--fgColor-default)]">{weekdayLabel(weekdayOfKey(day))}</h2>
                            {isToday && (
                              <span className="rounded-[5px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--primary-deep)]">
                                Hôm nay
                              </span>
                            )}
                          </div>
                          <small className="block font-mono text-xs tabular-nums text-[var(--fgColor-muted)]">
                            {dateKeyLabel(day)} · {(byDay.get(day) ?? []).length} buổi
                          </small>
                        </div>
                      </div>
                    </header>
                    <ul className="m-0 flex list-none flex-col gap-2 p-3">
                      {(byDay.get(day) ?? []).map((s) => (
                        <li key={s.id}>
                          <AgendaCard session={s} onOpen={() => setOpen(s)} />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
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

// Tên giáo viên rút gọn cho khối buổi: bỏ chức danh (Cô, Thầy, GV), lấy tên cuối (tên gọi)
function shortTeacher(name: string): string {
  const parts = name.replace(/^(Cô|Thầy|GV|Ms\.?|Mr\.?)\s+/i, '').trim().split(/\s+/);
  return parts[parts.length - 1] ?? '';
}

// Khối một buổi trên lưới tuần: thanh semantic 3px bên trái, giờ tabular-nums, lớp, giáo viên/phòng và trạng thái.
function CalendarBlock({
  placed,
  style,
  onOpen,
  canDrag,
}: {
  placed: { s: SessionRow; start: number; end: number };
  style: CSSProperties;
  onOpen: () => void;
  canDrag: boolean;
}) {
  const s = placed.s;
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: `session-${s.id}`,
    data: { session: s },
    disabled: !canDrag,
  });
  const state = sessionState(s);
  const cancelled = s.status === 'cancelled';
  const visual = sessionVisual(s);
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      data-card="true"
      onClick={onOpen}
      style={{
        ...style,
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 20 : undefined,
        cursor: canDrag ? 'grab' : undefined,
        touchAction: canDrag ? 'none' : undefined,
      }}
      title={`${s.className} · ${s.timeLabel} · ${s.teacherName}${s.room ? ` · ${s.room}` : ''} · ${state.label}`}
      className={clsx(
        'absolute flex flex-col overflow-hidden rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] border-l-[3px] px-2 py-1 text-left leading-tight shadow-2xs transition-all duration-150 hover:border-[var(--borderColor-accent-emphasis)] hover:shadow-sm',
        visual.surface,
        visual.bar,
        cancelled && 'opacity-65',
        isDragging && 'shadow-md ring-2 ring-[var(--primary)]/35',
      )}
    >
      <span className={clsx('block truncate font-mono text-[11px] font-medium tabular-nums text-[var(--ink-2)]', cancelled && 'line-through')}>
        {s.timeLabel}
      </span>
      <span className={clsx('mt-0.5 block truncate text-[13px] font-semibold leading-tight text-[var(--fgColor-default)]', cancelled && 'line-through')}>
        {s.className}
      </span>
      <span className="mt-0.5 block truncate text-[11px] text-[var(--ink-2)]">
        {shortTeacher(s.teacherName)}
        {s.room ? ` · ${s.room}` : ''}
      </span>
      <span className="mt-auto flex items-center gap-1 pt-0.5 whitespace-nowrap text-[11px] font-medium text-[var(--ink-2)]">
        <span aria-hidden className={clsx('size-1.5 shrink-0 rounded-full', visual.dot)} />
        {state.label}
      </span>
    </button>
  );
}

// Cột một ngày trên lưới tuần: vùng thả buổi đang kéo
function DayColumn({ day, today, height, children }: { day: string; today: string; height: string; children: ReactNode }) {
  // Ngày đã qua không nhận buổi được thả
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}`, data: { day }, disabled: day < today });
  return (
    <div
      ref={setNodeRef}
      data-day={day}
      className={clsx(
        'relative border-l border-[var(--borderColor-default)] transition-colors',
        day === today && 'bg-[var(--primary-soft)]/25',
        isOver && 'bg-[var(--primary-soft)]/60',
      )}
      style={{ height }}
    >
      {children}
    </div>
  );
}

// Thẻ một buổi trong lịch theo ngày (điện thoại hoặc khoảng dài)
function AgendaCard({ session: s, onOpen }: { session: SessionRow; onOpen: () => void }) {
  const state = sessionState(s);
  const cancelled = s.status === 'cancelled';
  const visual = sessionVisual(s);
  return (
    <button
      type="button"
      data-card="true"
      onClick={onOpen}
      className={clsx(
        'flex w-full flex-col gap-1 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] border-l-[3px] px-3 py-2.5 text-left shadow-2xs transition-all duration-150 hover:border-[var(--borderColor-accent-emphasis)] hover:shadow-sm',
        visual.surface,
        visual.bar,
        cancelled && 'opacity-70',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={clsx('inline-flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums text-[var(--fgColor-default)]', cancelled && 'line-through')}>
          <ClockIcon size={12} className="text-[var(--ink-2)]" aria-hidden />
          {s.timeLabel}
        </span>
        <Pill tone={state.tone}>{state.label}</Pill>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={clsx('truncate text-sm font-semibold text-[var(--fgColor-default)]', cancelled && 'line-through')}>
          {s.className}
        </span>
        <span className="shrink-0 font-mono text-[11px] font-medium tabular-nums text-[var(--ink-2)]">Buổi {s.sessionNo}</span>
      </div>
      <span className="inline-flex items-center gap-1.5 truncate text-xs text-[var(--ink-2)]">
        <span>{s.teacherName}</span>
        {s.room && (
          <>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-0.5 font-mono">
              <LocationIcon size={11} aria-hidden />
              {s.room}
            </span>
          </>
        )}
        {s.topic && (
          <>
            <span aria-hidden>·</span>
            <span className="truncate">{s.topic}</span>
          </>
        )}
      </span>
      {cancelled && s.cancelReason && <small className="text-xs text-blush-ink">Lý do: {s.cancelReason}</small>}
    </button>
  );
}
