'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@primer/octicons-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveSubmissionsAction } from '@/app/(app)/bai-tap/actions';
import type { GradingRow } from '@/lib/queries/assignments';
import type { BankQuestion } from '@/lib/queries/question-bank';
import { vnDateTimeLabel } from '@/lib/datetime';
import { SUBMISSION_LABELS, SUBMISSION_STATUSES } from '@/lib/validation/assignment';
import { SelectBox, TextAreaAutoHeight, TextInput, TextInputNumber } from '@/components-ui';
import { ActIcon } from '@/components/ui/ActIcon';
import { Btn } from '@/components/ui/Btn';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/primitives';
import { Card, EmptyPanel, Notice } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
import { ItemsEditor } from './ItemsEditor';
import { SubmissionPill } from './SubmissionPill';

type Status = (typeof SUBMISSION_STATUSES)[number];
type Draft = { status: Status; score: string; feedback: string };

// Chấm điểm một bài tập. Web: bảng nhập nhanh. Điện thoại: từng học sinh một, có nút Đã nộp và ô điểm.
export function GradingView({
  assignment,
  rows,
  bank,
  canManage,
}: {
  assignment: { id: number; title: string; className: string; dueAt: string; maxScore: number; description: string; levelCode: string | null };
  rows: GradingRow[];
  bank: BankQuestion[];
  canManage: boolean;
}) {
  const { message, notify } = useToast();
  const router = useRouter();
  const [editingItems, setEditingItems] = useState(false);
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
        <EmptyPanel title="Lớp chưa có học sinh đang học" hint="Thêm học sinh vào lớp để chấm bài." />
      </section>
    );
  }

  const current = rows[Math.min(index, rows.length - 1)];
  const currentDraft = drafts[current.studentId];

  // Cột của bảng máy tính
  const COLUMNS: GridColumn[] = [
    { key: 'student', label: 'Học sinh', width: 'minmax(180px,1.2fr)' },
    { key: 'status', label: 'Trạng thái', width: 'minmax(150px,1fr)' },
    { key: 'score', label: `Điểm /${assignment.maxScore}`, width: '110px' },
    { key: 'feedback', label: 'Nhận xét', width: 'minmax(180px,2fr)' },
  ];

  const cell = (r: GradingRow, key: string) => {
    const d = drafts[r.studentId];
    switch (key) {
      case 'student':
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={r.fullName} seed={r.studentId} quiet />
            <span className="min-w-0 truncate text-sm font-medium text-[var(--fgColor-default)]">{r.fullName}</span>
          </div>
        );
      case 'status':
        return (
          <SelectBox
            label={`Trạng thái của ${r.fullName}`}
            value={d.status}
            onChange={(v) => setStatus(r.studentId, v as Status)}
            options={SUBMISSION_STATUSES.map((s) => ({ value: s, label: SUBMISSION_LABELS[s] }))}
            disabled={!canManage}
            block
          />
        );
      case 'score':
        return (
          <TextInputNumber
            aria-label={`Điểm của ${r.fullName}`}
            thousandSeparator={false}
            decimalScale={0}
            value={d.score}
            onTextChange={(raw) =>
              patch(r.studentId, {
                score: raw,
                status: raw !== '' && d.status === 'not_submitted' ? 'graded' : d.status,
              })
            }
            disabled={!canManage || d.status !== 'graded'}
          />
        );
      case 'feedback':
        return (
          <TextInput
            aria-label={`Nhận xét cho ${r.fullName}`}
            value={d.feedback}
            onChange={(e) => patch(r.studentId, { feedback: e.target.value })}
            disabled={!canManage}
            placeholder="Nhận xét ngắn"
            block
            className="!min-w-0"
          />
        );
      default:
        return null;
    }
  };

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Bài tập', assignment.title]}
        title={assignment.title}
        subtitle={`${assignment.className} · hạn ${vnDateTimeLabel(new Date(assignment.dueAt))} · tối đa ${assignment.maxScore} điểm`}
        actions={
          canManage && (
            <div className="flex flex-wrap gap-2">
              <Btn variant="ghost" onClick={() => setEditingItems(true)}>
                Soạn câu hỏi
              </Btn>
              <Btn variant="primary" onClick={save} disabled={pending}>
                {pending ? 'Đang lưu…' : 'Lưu tất cả'}
              </Btn>
            </div>
          )
        }
      />

      {assignment.description && <Notice className="mb-2.5 whitespace-pre-line">{assignment.description}</Notice>}

      {/* Máy tính bảng và máy tính: bảng nhập nhanh kèm thống kê gọn trên thanh công cụ DataGrid */}
      <DataGrid
        label="Chấm điểm bài tập"
        columns={COLUMNS}
        rows={rows}
        rowKey={(r) => r.studentId}
        cell={cell}
        from="md"
        searchEnable
        paging={{ enable: false }}
        title={
          <div className="flex flex-wrap gap-3 text-xs text-[var(--fgColor-muted)]">
            <span>Chưa nộp <b className="font-semibold text-[var(--fgColor-default)]">{counts.not_submitted}</b></span>
            <span>Đã nộp <b className="font-semibold text-[var(--fgColor-default)]">{counts.submitted}</b></span>
            <span>Đã chấm <b className="font-semibold text-[var(--fgColor-default)]">{counts.graded}</b></span>
          </div>
        }
      />

      {/* Điện thoại: từng học sinh một */}
      <div className="flex flex-col gap-3 min-[768px]:hidden">
        <div className="flex items-center justify-between gap-2">
          <ActIcon label="Học sinh trước" icon={ChevronLeftIcon} onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} />
          <small className="text-sm text-[var(--fgColor-muted)]">{index + 1} / {rows.length}</small>
          <ActIcon label="Học sinh sau" icon={ChevronRightIcon} onClick={() => setIndex((i) => Math.min(rows.length - 1, i + 1))} disabled={index >= rows.length - 1} />
        </div>

        <Card>
          <div className="flex items-center gap-3">
            <Avatar name={current.fullName} seed={current.studentId} quiet />
            <div className="min-w-0 flex-1">
              <b className="block truncate text-base text-[var(--fgColor-default)]">{current.fullName}</b>
              <SubmissionPill status={currentDraft.status} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {SUBMISSION_STATUSES.map((s) => (
              <Btn key={s} block variant={currentDraft.status === s ? 'primary' : 'ghost'} onClick={() => setStatus(current.studentId, s)} disabled={!canManage} aria-pressed={currentDraft.status === s}>
                {SUBMISSION_LABELS[s]}
              </Btn>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 text-sm font-normal text-[var(--fgColor-muted)]">
            <span>Điểm (tối đa {assignment.maxScore})</span>
            <TextInputNumber
              aria-label={`Điểm của ${current.fullName}`}
              thousandSeparator={false}
              decimalScale={0}
              value={currentDraft.score}
              disabled={!canManage || currentDraft.status !== 'graded'}
              onTextChange={(raw) => patch(current.studentId, { score: raw })}
            />
          </div>

          <div className="flex flex-col gap-1.5 text-sm font-normal text-[var(--fgColor-muted)]">
            <span>Nhận xét</span>
            <TextAreaAutoHeight
              aria-label={`Nhận xét cho ${current.fullName}`}
              rows={2}
              value={currentDraft.feedback}
              disabled={!canManage}
              onChange={(e) => patch(current.studentId, { feedback: e.target.value })}
              placeholder="Nhận xét ngắn"
            />
          </div>
        </Card>
      </div>

      <ItemsEditor
        assignmentId={assignment.id}
        levelCode={assignment.levelCode}
        initial={[]}
        bank={bank}
        open={editingItems}
        onClose={() => setEditingItems(false)}
        onDone={(text) => {
          setEditingItems(false);
          notify(text);
          router.refresh();
        }}
      />

      <Toast message={message} />
    </section>
  );
}
