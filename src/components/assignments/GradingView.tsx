'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useTransition } from 'react';
import { saveSubmissionsAction } from '@/app/(app)/bai-tap/actions';
import type { GradingRow } from '@/lib/queries/assignments';
import { vnDateTimeLabel } from '@/lib/datetime';
import { SUBMISSION_LABELS, SUBMISSION_STATUSES } from '@/lib/validation/assignment';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, Avatar, Pill, type Tone } from '@/components/ui/primitives';
import { Toast, useToast } from '@/components/ui/Toast';

type Status = (typeof SUBMISSION_STATUSES)[number];
type Draft = { status: Status; score: string; feedback: string };

const STATUS_TONE: Record<Status, Tone> = { not_submitted: 'blush', submitted: 'butter', graded: 'mint' };

// Chấm điểm một bài tập. Web: bảng nhập nhanh. Điện thoại: từng học sinh một, có nút Đã nộp và ô điểm.
export function GradingView({
  assignment,
  rows,
  canManage,
}: {
  assignment: { id: number; title: string; className: string; dueAt: string; maxScore: number; description: string };
  rows: GradingRow[];
  canManage: boolean;
}) {
  const { message, notify } = useToast();
  const [pending, startTransition] = useTransition();
  const [index, setIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() =>
    Object.fromEntries(rows.map((r) => [r.studentId, { status: r.status, score: r.score === null ? '' : String(r.score), feedback: r.feedback }])),
  );

  const counts = SUBMISSION_STATUSES.reduce<Record<Status, number>>(
    (acc, s) => ({ ...acc, [s]: rows.filter((r) => drafts[r.studentId]?.status === s).length }),
    { not_submitted: 0, submitted: 0, graded: 0 },
  );

  function patch(studentId: number, next: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...next } }));
  }

  // Chọn Đã chấm mà chưa có điểm: để ô điểm trống, máy chủ sẽ báo
  function setStatus(studentId: number, status: Status) {
    patch(studentId, { status, ...(status !== 'graded' ? { score: '' } : {}) });
  }

  function save() {
    const payload: { studentId: number; status: Status; score: number | null; feedback: string }[] = [];
    for (const r of rows) {
      const d = drafts[r.studentId];
      if (!d) continue;
      const score = d.score.trim() === '' ? null : Number(d.score);
      if (score !== null && (!Number.isInteger(score) || score < 0 || score > assignment.maxScore)) {
        notify(`Điểm của ${r.fullName} phải là số nguyên từ 0 đến ${assignment.maxScore}.`);
        return;
      }
      if (d.status === 'graded' && score === null) {
        notify(`Chấm điểm cho ${r.fullName} thì cần nhập điểm.`);
        return;
      }
      payload.push({ studentId: r.studentId, status: d.status, score, feedback: d.feedback });
    }
    startTransition(async () => {
      const r = await saveSubmissionsAction(assignment.id, payload);
      notify(r.message ?? (r.ok ? 'Đã lưu' : 'Không lưu được'));
    });
  }

  if (rows.length === 0) {
    return (
      <section className="flex flex-col">
        <PageHeader crumbs={['Đào tạo', 'Bài tập', assignment.title]} title={assignment.title} subtitle={assignment.className} />
        <div className="rounded-[24px] bg-surface shadow-card">
          <EmptyState title="Lớp chưa có học sinh đang học" hint="Thêm học sinh vào lớp để chấm bài." />
        </div>
      </section>
    );
  }

  const current = rows[Math.min(index, rows.length - 1)];
  const currentDraft = drafts[current.studentId];

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Bài tập', assignment.title]}
        title={assignment.title}
        subtitle={`${assignment.className} · hạn ${vnDateTimeLabel(new Date(assignment.dueAt))} · tối đa ${assignment.maxScore} điểm`}
        actions={
          canManage && (
            <button type="button" onClick={save} disabled={pending} className="h-10 rounded-xl bg-primary px-4 text-base font-bold text-on-primary disabled:opacity-60 max-[767px]:h-11">
              {pending ? 'Đang lưu…' : 'Lưu tất cả'}
            </button>
          )
        }
      />

      {assignment.description && <p className="mb-4 whitespace-pre-line rounded-[18px] bg-stone px-4 py-3 text-base text-stone-ink">{assignment.description}</p>}

      <div className="mb-3 flex flex-wrap gap-3 text-sm font-bold text-ink-2">
        <span>Chưa nộp {counts.not_submitted}</span>
        <span>Đã nộp {counts.submitted}</span>
        <span>Đã chấm {counts.graded}</span>
      </div>

      {/* Máy tính bảng và máy tính: bảng nhập nhanh */}
      <div className="hidden overflow-hidden rounded-[24px] bg-surface shadow-card min-[768px]:block">
        <div role="table" aria-label="Chấm điểm bài tập">
          <div role="row" className="grid grid-cols-[minmax(180px,1.2fr)_minmax(150px,1fr)_110px_minmax(180px,2fr)] gap-x-3 border-b border-line px-4 py-2.5 text-xs font-semibold text-muted">
            <span role="columnheader">Học sinh</span>
            <span role="columnheader">Trạng thái</span>
            <span role="columnheader">Điểm /{assignment.maxScore}</span>
            <span role="columnheader">Nhận xét</span>
          </div>
          {rows.map((r) => {
            const d = drafts[r.studentId];
            return (
              <div key={r.studentId} role="row" className="grid grid-cols-[minmax(180px,1.2fr)_minmax(150px,1fr)_110px_minmax(180px,2fr)] items-center gap-x-3 border-b border-line px-4 py-2.5 last:border-0">
                <span role="cell" className="min-w-0 truncate text-base font-bold text-ink">{r.fullName}</span>
                <div role="cell">
                  <select aria-label={`Trạng thái của ${r.fullName}`} value={d.status} onChange={(e) => setStatus(r.studentId, e.target.value as Status)} disabled={!canManage} className="h-10 w-full rounded-xl border border-line bg-surface px-2.5 text-base font-semibold text-ink disabled:opacity-40">
                    {SUBMISSION_STATUSES.map((s) => (
                      <option key={s} value={s}>{SUBMISSION_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div role="cell">
                  <input aria-label={`Điểm của ${r.fullName}`} type="number" inputMode="numeric" min={0} max={assignment.maxScore} step={1} value={d.score} onChange={(e) => patch(r.studentId, { score: e.target.value, status: e.target.value !== '' && d.status === 'not_submitted' ? 'graded' : d.status })} disabled={!canManage || d.status !== 'graded'} className="h-10 w-full rounded-xl border border-line bg-bg px-2.5 text-base font-bold text-ink disabled:opacity-40" />
                </div>
                <div role="cell">
                  <input aria-label={`Nhận xét cho ${r.fullName}`} value={d.feedback} onChange={(e) => patch(r.studentId, { feedback: e.target.value })} disabled={!canManage} placeholder="Nhận xét ngắn" className="h-10 w-full rounded-xl border border-line bg-bg px-2.5 text-base text-ink disabled:opacity-40" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Điện thoại: từng học sinh một */}
      <div className="flex flex-col gap-3 min-[768px]:hidden">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} aria-label="Học sinh trước" className="grid size-11 place-items-center rounded-xl border border-line bg-surface text-ink disabled:opacity-40">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <small className="text-sm font-bold text-ink-2">{index + 1} / {rows.length}</small>
          <button type="button" onClick={() => setIndex((i) => Math.min(rows.length - 1, i + 1))} disabled={index >= rows.length - 1} aria-label="Học sinh sau" className="grid size-11 place-items-center rounded-xl border border-line bg-surface text-ink disabled:opacity-40">
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>

        <article className="flex flex-col gap-3.5 rounded-[20px] border border-line bg-surface p-4 shadow-card">
          <div className="flex items-center gap-3">
            <Avatar name={current.fullName} seed={current.studentId} />
            <div className="min-w-0 flex-1">
              <b className="block truncate text-base text-ink">{current.fullName}</b>
              <Pill tone={STATUS_TONE[currentDraft.status]}>{SUBMISSION_LABELS[currentDraft.status]}</Pill>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {SUBMISSION_STATUSES.map((s) => (
              <button key={s} type="button" onClick={() => setStatus(current.studentId, s)} disabled={!canManage} aria-pressed={currentDraft.status === s} className={`flex h-11 items-center justify-center rounded-xl border text-sm font-bold disabled:opacity-40 ${currentDraft.status === s ? 'border-primary-deep bg-primary text-on-primary' : 'border-line bg-surface text-ink-2'}`}>
                {SUBMISSION_LABELS[s]}
              </button>
            ))}
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-bold text-ink-2">
            Điểm (tối đa {assignment.maxScore})
            <input type="number" inputMode="numeric" min={0} max={assignment.maxScore} step={1} value={currentDraft.score} disabled={!canManage || currentDraft.status !== 'graded'} onChange={(e) => patch(current.studentId, { score: e.target.value })} className="h-11 w-full rounded-[14px] border border-transparent bg-bg px-3.5 text-input font-bold text-ink disabled:opacity-40" />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-bold text-ink-2">
            Nhận xét
            <input value={currentDraft.feedback} disabled={!canManage} onChange={(e) => patch(current.studentId, { feedback: e.target.value })} placeholder="Nhận xét ngắn" className="h-11 w-full rounded-[14px] border border-transparent bg-bg px-3.5 text-input text-ink disabled:opacity-40" />
          </label>
        </article>
      </div>

      <Toast message={message} />
    </section>
  );
}
