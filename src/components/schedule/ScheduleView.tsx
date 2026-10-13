'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SessionRow } from '@/lib/queries/sessions';
import { addDaysKey, dateKeyLabel, weekdayLabel, weekdayOfKey } from '@/lib/datetime';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, Pill, type Tone } from '@/components/ui/primitives';
import { SessionDialog } from './SessionDialog';

export type ScheduleFilters = { cls: string; teacher: string };

// Trạng thái buổi học: nhãn và màu theo docs/DESIGN.md
export function sessionState(s: SessionRow): { label: string; tone: Tone } {
  if (s.status === 'cancelled') return { label: 'Đã huỷ', tone: 'blush' };
  if (s.status === 'done') return { label: 'Đã học', tone: 'stone' };
  if (s.isPast) return { label: 'Chưa điểm danh', tone: 'butter' };
  return { label: 'Sắp học', tone: 'mint' };
}

export function ScheduleView({
  weekStart,
  sessions,
  classes,
  teachers,
  filters,
  canManage,
  prevHref,
  nextHref,
  todayHref,
}: {
  weekStart: string;
  sessions: SessionRow[];
  classes: { id: number; name: string }[];
  teachers: { id: number; name: string; subject: string }[];
  filters: ScheduleFilters;
  canManage: boolean;
  prevHref: string;
  nextHref: string;
  todayHref: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<SessionRow | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDaysKey(weekStart, i));
  const byDay = new Map<string, SessionRow[]>(days.map((d) => [d, []]));
  for (const s of sessions) byDay.get(s.dateKey)?.push(s);

  // Đổi bộ lọc: giữ tuần đang xem, thay lớp hoặc giáo viên
  function applyFilter(next: Partial<ScheduleFilters>) {
    const f = { ...filters, ...next };
    const params = new URLSearchParams({ w: weekStart });
    if (f.cls) params.set('cls', f.cls);
    if (f.teacher) params.set('teacher', f.teacher);
    router.push(`/lich-hoc?${params.toString()}`, { scroll: false });
  }

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Lịch học']}
        title="Lịch học"
        subtitle={`Tuần ${dateKeyLabel(weekStart)} – ${dateKeyLabel(days[6])}. Bấm vào buổi để xem hoặc sửa.`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Link href={prevHref} scroll={false} aria-label="Tuần trước" className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-lg font-bold text-ink">‹</Link>
          <Link href={todayHref} scroll={false} className="inline-flex h-10 items-center rounded-xl border border-line bg-surface px-4 text-base font-bold text-ink">Tuần này</Link>
          <Link href={nextHref} scroll={false} aria-label="Tuần sau" className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-lg font-bold text-ink">›</Link>
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 max-[767px]:w-full">
          <select
            aria-label="Lọc theo lớp"
            value={filters.cls}
            onChange={(e) => applyFilter({ cls: e.target.value })}
            className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-base font-semibold text-ink max-[767px]:h-11 min-[768px]:flex-none"
          >
            <option value="">Mọi lớp</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            aria-label="Lọc theo giáo viên"
            value={filters.teacher}
            onChange={(e) => applyFilter({ teacher: e.target.value })}
            className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-base font-semibold text-ink max-[767px]:h-11 min-[768px]:flex-none"
          >
            <option value="">Mọi giáo viên</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-[24px] bg-surface shadow-card">
          <EmptyState title="Không có buổi học nào trong tuần này" hint="Đổi bộ lọc hoặc sang tuần khác." />
        </div>
      ) : (
        <>
          {/* Máy tính bảng và máy tính: bảng tuần, mỗi ngày một cột. Cột cuộn ngang trong khung khi màn hẹp. */}
          <div className="hidden overflow-x-auto rounded-[24px] bg-surface p-3 shadow-card min-[768px]:block">
            <div className="grid min-w-[840px] grid-cols-7 gap-2">
              {days.map((day) => {
                const list = byDay.get(day) ?? [];
                return (
                  <div key={day} className="flex min-w-0 flex-col gap-2">
                    <header className="rounded-xl bg-bg px-2.5 py-2 text-center">
                      <b className="block text-sm text-ink">{weekdayLabel(weekdayOfKey(day))}</b>
                      <small className="text-xs text-muted">{dateKeyLabel(day).slice(0, 5)} · {list.length} buổi</small>
                    </header>
                    {list.length === 0 && <div className="rounded-xl border border-dashed border-line px-2 py-6 text-center text-xs text-muted">Trống</div>}
                    {list.map((s) => (
                      <SessionBlock key={s.id} session={s} onOpen={() => setOpen(s)} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Điện thoại: danh sách dọc theo ngày, ngày không có buổi thì bỏ qua */}
          <div className="flex flex-col gap-4 min-[768px]:hidden">
            {days.filter((d) => (byDay.get(d) ?? []).length > 0).map((day) => (
              <section key={day} aria-label={`Buổi học ${dateKeyLabel(day)}`} className="flex flex-col gap-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted">
                  {weekdayLabel(weekdayOfKey(day))} · {dateKeyLabel(day)}
                </h2>
                {(byDay.get(day) ?? []).map((s) => (
                  <SessionBlock key={s.id} session={s} onOpen={() => setOpen(s)} wide />
                ))}
              </section>
            ))}
          </div>
        </>
      )}

      <SessionDialog session={open} teachers={teachers} canManage={canManage} onClose={() => setOpen(null)} />
    </section>
  );
}

function SessionBlock({ session: s, onOpen, wide = false }: { session: SessionRow; onOpen: () => void; wide?: boolean }) {
  const state = sessionState(s);
  const cancelled = s.status === 'cancelled';
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full flex-col gap-1 rounded-xl border border-line bg-surface px-2.5 py-2 text-left transition-colors hover:border-ink-2 ${wide ? 'px-3.5 py-3' : ''} ${cancelled ? 'opacity-70' : ''}`}
    >
      <span className={`text-sm font-extrabold text-ink ${cancelled ? 'line-through' : ''}`}>{s.timeLabel}</span>
      <span className={`truncate text-sm font-bold text-ink ${cancelled ? 'line-through' : ''}`}>{s.className}</span>
      <span className="truncate text-xs text-muted">{s.teacherName}{s.room ? ` · ${s.room}` : ''}</span>
      <span className="mt-0.5">
        <Pill tone={state.tone}>{state.label}</Pill>
      </span>
      {cancelled && s.cancelReason && <small className="text-xs text-blush-ink">Lý do: {s.cancelReason}</small>}
    </button>
  );
}
