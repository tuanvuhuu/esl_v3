'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveAttendanceAction } from '@/app/(app)/diem-danh/actions';
import type { RosterRow, Mark } from '@/lib/queries/attendance';
import type { SessionRow } from '@/lib/queries/sessions';
import { dateKeyLabel } from '@/lib/datetime';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, Pill, type Tone } from '@/components/ui/primitives';
import { Toast, useToast } from '@/components/ui/Toast';

const MARK_META: Record<Mark, { label: string; on: string }> = {
  present: { label: 'Có mặt', on: 'border-mint-ink bg-mint text-mint-ink' },
  late: { label: 'Trễ', on: 'border-butter-ink bg-butter text-butter-ink' },
  absent: { label: 'Vắng', on: 'border-blush-ink bg-blush text-blush-ink' },
};
const MARKS: Mark[] = ['present', 'late', 'absent'];

// Trạng thái buổi cho người điểm danh
function sessionStatus(s: SessionRow): { label: string; tone: Tone } {
  if (s.status === 'cancelled') return { label: 'Đã huỷ', tone: 'blush' };
  if (s.status === 'done') return { label: 'Đã điểm danh', tone: 'mint' };
  if (s.isPast) return { label: 'Chưa điểm danh', tone: 'butter' };
  return { label: 'Chưa đến giờ', tone: 'stone' };
}

// Màn điểm danh. Web: bảng, điện thoại: thẻ. Cùng một danh sách và cùng một action lưu.
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
  const unmarked = roster.length - Object.values(marks).filter((v) => v !== null).length;
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

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Điểm danh']}
        title="Điểm danh"
        subtitle="Chọn lớp và buổi học, rồi đánh dấu từng học sinh. Chỉ điểm danh được buổi đã bắt đầu."
      />

      <div className="mb-4 grid grid-cols-1 gap-2.5 min-[768px]:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <select aria-label="Chọn lớp" value={classId} onChange={(e) => go({ cls: Number(e.target.value), s: null })} className="h-11 rounded-xl border border-line bg-surface px-3 text-base font-semibold text-ink">
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          aria-label="Chọn buổi học"
          value={session?.id ?? ''}
          onChange={(e) => go({ s: Number(e.target.value) })}
          className="h-11 rounded-xl border border-line bg-surface px-3 text-base font-semibold text-ink"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id} disabled={s.status === 'cancelled'}>
              Buổi {s.sessionNo} · {dateKeyLabel(s.dateKey)} {s.timeLabel}{s.status === 'cancelled' ? ' (đã huỷ)' : ''}
            </option>
          ))}
        </select>
      </div>

      {!session ? (
        <div className="rounded-[24px] bg-surface shadow-card">
          <EmptyState title="Lớp này chưa có buổi học" hint="Tạo lịch học cho lớp ở màn Lịch học." />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-[20px] bg-surface p-4 shadow-card">
            <Pill tone={sessionStatus(session).tone}>{sessionStatus(session).label}</Pill>
            <b className="text-base text-ink">Buổi {session.sessionNo} · {dateKeyLabel(session.dateKey)} · {session.timeLabel}</b>
            <span className="text-base text-muted">{session.teacherName}{session.room ? ` · ${session.room}` : ''}</span>
          </div>

          {!session.isPast && session.status !== 'cancelled' && (
            <p className="mb-4 rounded-[18px] bg-stone px-4 py-3 text-base text-stone-ink">Buổi này chưa diễn ra nên chưa điểm danh được.</p>
          )}
          {session.status === 'cancelled' && (
            <p className="mb-4 rounded-[18px] bg-blush px-4 py-3 text-base text-blush-ink">Buổi đã huỷ{session.cancelReason ? `: ${session.cancelReason}` : ''}. Không điểm danh.</p>
          )}

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3 text-sm font-bold text-ink-2">
              <span>Có mặt {counts.present}</span>
              <span>Trễ {counts.late}</span>
              <span>Vắng {counts.absent}</span>
              <span className="text-muted">Chưa điểm danh {unmarked}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={markAllPresent} disabled={!canMark} className="h-10 rounded-xl border border-line bg-surface px-3.5 text-base font-bold text-ink disabled:opacity-40 max-[767px]:h-11">
                Có mặt cả lớp
              </button>
              <button type="button" onClick={save} disabled={!canMark || pending} className="h-10 rounded-xl bg-primary px-4 text-base font-bold text-on-primary disabled:opacity-40 max-[767px]:h-11">
                {pending ? 'Đang lưu…' : 'Lưu điểm danh'}
              </button>
            </div>
          </div>

          {roster.length === 0 ? (
            <div className="rounded-[24px] bg-surface shadow-card">
              <EmptyState title="Lớp chưa có học sinh đang học" hint="Thêm học sinh vào lớp ở màn Học sinh." />
            </div>
          ) : (
            <>
              {/* Máy tính bảng và máy tính: bảng với ba nút trạng thái */}
              <div className="hidden overflow-hidden rounded-[24px] bg-surface shadow-card min-[768px]:block">
                <div role="table" aria-label="Điểm danh học sinh">
                  <div role="row" className="grid grid-cols-[minmax(180px,1fr)_minmax(220px,auto)_120px] gap-x-3 border-b border-line px-4 py-2.5 text-xs font-semibold text-muted">
                    <span role="columnheader">Học sinh</span>
                    <span role="columnheader">Điểm danh</span>
                    <span role="columnheader">Số buổi đã học</span>
                  </div>
                  {roster.map((r) => (
                    <div key={r.id} role="row" className="grid grid-cols-[minmax(180px,1fr)_minmax(220px,auto)_120px] items-center gap-x-3 border-b border-line px-4 py-3 last:border-0">
                      <span role="cell" className="min-w-0 truncate text-base font-bold text-ink">{r.fullName}</span>
                      <div role="cell" className="flex flex-wrap gap-1.5">
                        {MARKS.map((m) => (
                          <button key={m} type="button" onClick={() => setMark(r.id, m)} disabled={!canMark} aria-pressed={marks[r.id] === m} className={`h-9 rounded-lg border px-3 text-sm font-bold disabled:opacity-40 ${marks[r.id] === m ? MARK_META[m].on : 'border-line bg-surface text-ink-2'}`}>
                            {MARK_META[m].label}
                          </button>
                        ))}
                      </div>
                      <small role="cell" className="text-sm text-muted">{r.sessionsDone} buổi</small>
                    </div>
                  ))}
                </div>
              </div>

              {/* Điện thoại: thẻ, ba nút có chữ, bằng nhau */}
              <div className="flex flex-col gap-2.5 min-[768px]:hidden">
                {roster.map((r) => (
                  <article key={r.id} className="flex flex-col gap-2.5 rounded-[20px] border border-line bg-surface p-3.5 shadow-card">
                    <div className="flex items-center justify-between gap-2">
                      <b className="min-w-0 truncate text-base text-ink">{r.fullName}</b>
                      <small className="shrink-0 text-xs text-muted">{r.sessionsDone} buổi</small>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {MARKS.map((m) => (
                        <button key={m} type="button" onClick={() => setMark(r.id, m)} disabled={!canMark} aria-pressed={marks[r.id] === m} className={`flex h-11 items-center justify-center rounded-xl border text-sm font-bold disabled:opacity-40 ${marks[r.id] === m ? MARK_META[m].on : 'border-line bg-surface text-ink-2'}`}>
                          {MARK_META[m].label}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <Toast message={message} />
      <span className="sr-only" aria-live="polite">{canRecord ? '' : 'Bạn không có quyền điểm danh.'}</span>
    </section>
  );
}
