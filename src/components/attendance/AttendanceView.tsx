'use client';

import { CalendarDays, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type CSSProperties } from 'react';
import { saveAttendanceAction } from '@/app/(app)/diem-danh/actions';
import type { RosterRow, Mark } from '@/lib/queries/attendance';
import type { SessionRow } from '@/lib/queries/sessions';
import { dateKeyLabel, weekdayLabel, weekdayOfKey } from '@/lib/datetime';
import { Btn } from '@/components/ui/Btn';
import { Chip } from '@/components/ui/controls';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pill, type Tone } from '@/components/ui/primitives';
import { Card, EmptyPanel, Panel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';

// Ba trạng thái điểm danh: nhãn, màu nền khi được chọn, màu chấm để tổng hợp
const MARK_META: Record<Mark, { label: string; on: string; tone: Tone; dot: string }> = {
  present: { label: 'Có mặt', on: 'bg-mint text-mint-ink', tone: 'mint', dot: 'bg-accent' },
  late: { label: 'Trễ', on: 'bg-butter text-butter-ink', tone: 'butter', dot: 'bg-primary-deep' },
  absent: { label: 'Vắng', on: 'bg-blush text-blush-ink', tone: 'blush', dot: 'bg-blush-ink' },
};
const MARKS: Mark[] = ['present', 'late', 'absent'];

// Trạng thái buổi cho người điểm danh
function sessionStatus(s: SessionRow): { label: string; tone: Tone; dot: string } {
  if (s.status === 'cancelled') return { label: 'Đã huỷ', tone: 'blush', dot: 'bg-blush-ink' };
  if (s.status === 'done') return { label: 'Đã điểm danh', tone: 'mint', dot: 'bg-accent' };
  if (s.isPast) return { label: 'Chưa điểm danh', tone: 'butter', dot: 'bg-primary-deep' };
  return { label: 'Chưa đến giờ', tone: 'stone', dot: 'bg-stone-ink' };
}

// Tỉ lệ phần trăm an toàn cho thanh tổng hợp
const pct = (n: number, total: number) => (total === 0 ? '0%' : `${(n / total) * 100}%`);

// Màn điểm danh. Dải buổi học, thẻ tiến độ buổi và lưới thẻ học sinh có điều khiển ba trạng thái.
// Web và điện thoại cùng một danh sách và cùng một action lưu.
export function AttendanceView({
  classes,
  classId,
  sessions,
  session,
  roster,
  canRecord,
}: {
  classes: { id: number; name: string }[];
  classId: number;
  sessions: SessionRow[];
  session: SessionRow | null;
  roster: RosterRow[];
  canRecord: boolean;
}) {
  const router = useRouter();
  const { message, notify } = useToast();
  const [pending, startTransition] = useTransition();
  const [marks, setMarks] = useState<Record<number, Mark | null>>(() => Object.fromEntries(roster.map((r) => [r.id, r.mark])));

  const counts = MARKS.reduce<Record<Mark, number>>((acc, m) => ({ ...acc, [m]: Object.values(marks).filter((v) => v === m).length }), { present: 0, late: 0, absent: 0 });
  const marked = Object.values(marks).filter((v) => v !== null).length;
  const unmarked = roster.length - marked;
  const canMark = canRecord && !!session && session.status !== 'cancelled' && session.isPast;

  function go(next: { cls?: number; s?: number | null }) {
    const params = new URLSearchParams({ cls: String(next.cls ?? classId) });
    const sid = next.s === undefined ? session?.id : next.s;
    if (sid) params.set('s', String(sid));
    router.push(`/diem-danh?${params.toString()}`, { scroll: false });
  }

  function setMark(studentId: number, mark: Mark) {
    setMarks((prev) => ({ ...prev, [studentId]: prev[studentId] === mark ? null : mark }));
  }

  function markAllPresent() {
    setMarks(Object.fromEntries(roster.map((r) => [r.id, 'present' as Mark])));
  }

  function save() {
    if (!session) return;
    const entries = roster.flatMap((r) => (marks[r.id] ? [{ studentId: r.id, mark: marks[r.id] as Mark }] : []));
    startTransition(async () => {
      const r = await saveAttendanceAction(session.id, entries);
      notify(r.message ?? (r.ok ? 'Đã lưu điểm danh' : 'Không lưu được'));
      if (r.ok) router.refresh();
    });
  }

  const status = session ? sessionStatus(session) : null;

  return (
    <section className="flex flex-col gap-4">
      <PageHeader
        crumbs={['Đào tạo', 'Điểm danh']}
        title="Điểm danh"
        subtitle="Chọn lớp và buổi học, rồi đánh dấu từng học sinh. Chỉ điểm danh được buổi đã bắt đầu."
      />

      {/* Chọn lớp, rồi dải buổi học của lớp: bấm để chuyển buổi */}
      <div className="flex flex-col gap-3">
        <SelectPanel
          label="Chọn lớp"
          icon={<Users className="size-3.5 text-muted" aria-hidden />}
          value={String(classId)}
          onChange={(v) => go({ cls: Number(v), s: null })}
          options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
          auto
        />

        {sessions.length > 0 && (
          <div role="tablist" aria-label="Buổi học" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {sessions.map((s) => {
              const st = sessionStatus(s);
              const on = s.id === session?.id;
              return (
                <Chip key={s.id} tab selected={on} onClick={() => go({ s: s.id })} className={s.status === 'cancelled' ? 'opacity-70 line-through' : ''}>
                  <span className={`size-1.5 shrink-0 rounded-full ${on ? 'bg-on-primary' : st.dot}`} aria-hidden />
                  Buổi {s.sessionNo}
                  <span className="text-xs font-normal opacity-80">{dateKeyLabel(s.dateKey).slice(0, 5)}</span>
                </Chip>
              );
            })}
          </div>
        )}
      </div>

      {!session ? (
        <EmptyPanel title="Lớp này chưa có buổi học" hint="Tạo lịch học cho lớp ở màn Lịch học." />
      ) : (
        <>
          {/* Thẻ buổi: ngày, giờ, giáo viên, trạng thái, tỉ lệ điểm danh và nút hành động */}
          <Panel>
            <div className="flex flex-col gap-4 min-[768px]:flex-row min-[768px]:items-center min-[768px]:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid size-14 shrink-0 place-items-center rounded-[var(--radius-ctl)] bg-primary text-on-primary">
                  <div className="text-center leading-none">
                    <span className="block text-lg font-extrabold">{session.dateKey.slice(8, 10)}</span>
                    <span className="mt-0.5 block text-xs font-normal">{weekdayLabel(weekdayOfKey(session.dateKey))}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-lg font-extrabold text-ink">Buổi {session.sessionNo} · {session.timeLabel}</b>
                    {status && <Pill tone={status.tone}>{status.label}</Pill>}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    {session.className} · {session.teacherName}{session.room ? ` · ${session.room}` : ''}{session.topic ? ` · ${session.topic}` : ''}
                  </p>
                </div>
              </div>

              {canRecord && (
                <div className="grid grid-cols-2 gap-2 min-[768px]:flex">
                  <Btn onClick={markAllPresent} disabled={!canMark}>Có mặt cả lớp</Btn>
                  <Btn variant="primary" onClick={save} disabled={!canMark || pending}>
                    <CalendarDays className="size-4" aria-hidden />
                    {pending ? 'Đang lưu…' : 'Lưu điểm danh'}
                  </Btn>
                </div>
              )}
            </div>

            {/* Tỉ lệ điểm danh của buổi: thanh chia màu theo ba trạng thái và số đếm */}
            {roster.length > 0 && (
              <div className="mt-4">
                <div className="flex h-2 overflow-hidden rounded-full bg-stone">
                  <span className="h-full bg-accent" style={{ width: pct(counts.present, roster.length) } as CSSProperties} />
                  <span className="h-full bg-primary-deep" style={{ width: pct(counts.late, roster.length) } as CSSProperties} />
                  <span className="h-full bg-blush-ink" style={{ width: pct(counts.absent, roster.length) } as CSSProperties} />
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
                  <Legend dot="bg-accent" label="Có mặt" value={counts.present} />
                  <Legend dot="bg-primary-deep" label="Trễ" value={counts.late} />
                  <Legend dot="bg-blush-ink" label="Vắng" value={counts.absent} />
                  <Legend dot="bg-stone-ink" label="Chưa điểm danh" value={unmarked} />
                  <span className="ml-auto text-muted">Đã điểm danh {marked}/{roster.length}</span>
                </div>
              </div>
            )}

            {session.status === 'cancelled' && (
              <p className="mt-4 rounded-[var(--radius-ctl)] bg-blush px-3 py-2 text-sm text-blush-ink">Buổi đã huỷ{session.cancelReason ? `: ${session.cancelReason}` : ''}. Không điểm danh.</p>
            )}
            {!session.isPast && session.status !== 'cancelled' && (
              <p className="mt-4 rounded-[var(--radius-ctl)] bg-stone px-3 py-2 text-sm text-stone-ink">Buổi này chưa diễn ra nên chưa điểm danh được.</p>
            )}
          </Panel>

          {/* Lưới học sinh: mỗi thẻ có ba nút trạng thái */}
          {roster.length === 0 ? (
            <EmptyPanel title="Lớp chưa có học sinh đang học" hint="Thêm học sinh vào lớp ở màn Học sinh." />
          ) : (
            <ul className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-2 min-[1200px]:grid-cols-3 min-[1440px]:grid-cols-4">
              {roster.map((r) => {
                const mark = marks[r.id];
                const shown = mark ? MARK_META[mark] : null;
                return (
                  <li key={r.id}>
                    <Card>
                      {/* Không avatar, tên đủ và xuống dòng khi dài; trạng thái nằm dưới tên để không chiếm chỗ của tên */}
                      <div className="min-w-0">
                        <b className="block break-words text-base text-ink">{r.fullName}</b>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Pill tone={shown ? shown.tone : 'stone'}>{shown ? shown.label : 'Chưa điểm danh'}</Pill>
                          <small className="text-xs text-muted">{r.sessionsDone} buổi đã học</small>
                        </div>
                      </div>
                      {/* Nền khung xám, nút chưa chọn nền trắng có viền: nhìn rõ là ba nút bấm */}
                      <div role="group" aria-label={`Điểm danh ${r.fullName}`} className="grid grid-cols-3 gap-1 rounded-[var(--radius-ctl)] bg-stone p-1">
                        {MARKS.map((m) => {
                          const on = mark === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              aria-pressed={on}
                              disabled={!canMark}
                              onClick={() => setMark(r.id, m)}
                              className={`h-[var(--ctl-h)] rounded-[calc(var(--radius-ctl)-4px)] text-sm font-semibold transition-colors max-[767px]:h-[var(--ctl-h-touch)] disabled:opacity-40 ${on ? MARK_META[m].on : 'border border-line bg-surface text-ink-2 hover:text-ink'}`}
                            >
                              {MARK_META[m].label}
                            </button>
                          );
                        })}
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* Thanh hành động dính dưới trên điện thoại (P15.6) */}
      {canRecord && session && session.isPast && session.status !== 'cancelled' && (
        <aside
          aria-label="Thao tác điểm danh nhanh"
          className="sticky bottom-[calc(68px+var(--safe-b))] z-30 -mx-4 -mb-2 mt-4 flex items-center justify-between gap-3 border-t border-line bg-surface/95 px-4 py-2.5 shadow-lg backdrop-blur-md min-[768px]:hidden"
        >
          <span className="text-xs text-muted">
            Đã điểm danh <b className="font-semibold text-ink">{marked}/{roster.length}</b>
          </span>
          <div className="flex items-center gap-2">
            <Btn onClick={markAllPresent} disabled={!canMark} className="h-[var(--chip-h-touch)] px-3 text-xs">
              Có mặt cả lớp
            </Btn>
            <Btn variant="primary" onClick={save} disabled={!canMark || pending} className="h-[var(--chip-h-touch)] px-3 text-xs">
              <CalendarDays className="size-3.5" aria-hidden />
              {pending ? 'Đang lưu…' : 'Lưu'}
            </Btn>
          </div>
        </aside>
      )}

      <Toast message={message} />
      <span className="sr-only" aria-live="polite">{canRecord ? '' : 'Bạn không có quyền điểm danh.'}</span>
    </section>
  );
}

function Legend({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden />
      {label} <b className="font-normal text-ink">{value}</b>
    </span>
  );
}
