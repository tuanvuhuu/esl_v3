'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AssignmentItem, ItemGradingRow } from '@/lib/queries/assignment-items';
import type { BankQuestion } from '@/lib/queries/question-bank';
import { markGap, SKILL_LABELS } from '@/lib/assignment-scoring';
import { vnDateTimeLabel } from '@/lib/datetime';
import { Btn } from '@/components/ui/Btn';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar, Pill } from '@/components/ui/primitives';
import { Card, EmptyPanel, Notice, StatCards } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
import { usePresent } from '@/components/present/usePresent';
import { SubmissionPill } from './SubmissionPill';
import { AnswerDialog } from './AnswerDialog';
import { ItemsEditor } from './ItemsEditor';

// Có câu nào chấm chéo lệch từ hai điểm trở lên không
const hasFlaggedMark = (r: ItemGradingRow) =>
  Object.entries(r.secondMarks).some(([itemId, m]) => markGap(r.summary.points[Number(itemId)] ?? null, m.points)?.flagged);

// Chấm bài có câu hỏi: bảng học sinh với điểm tổng và điểm theo kỹ năng. Bấm Chấm bài để mở từng câu.
export function ItemGradingView({
  assignment,
  items,
  rows,
  bank,
  canManage,
  currentAccountId,
  initialStudentId = null,
}: {
  assignment: { id: number; title: string; className: string; dueAt: string; maxScore: number; description: string; levelCode: string | null };
  items: AssignmentItem[];
  rows: ItemGradingRow[];
  bank: BankQuestion[];
  canManage: boolean;
  currentAccountId: number | null;
  initialStudentId?: number | null;
}) {
  const router = useRouter();
  const { message, notify } = useToast();
  const present = usePresent(notify);
  const [editingItems, setEditingItems] = useState(false);
  // Lưu mã học sinh đang mở, để dữ liệu luôn lấy từ danh sách mới sau khi làm mới trang
  const [openId, setOpenId] = useState<number | null>(() => (initialStudentId !== null && rows.some((r) => r.studentId === initialStudentId) ? initialStudentId : null));
  const open = rows.find((r) => r.studentId === openId) ?? null;

  const counts = {
    not_submitted: rows.filter((r) => r.status === 'not_submitted').length,
    submitted: rows.filter((r) => r.status === 'submitted').length,
    graded: rows.filter((r) => r.status === 'graded').length,
  };
  const gradedRows = rows.filter((r) => r.status === 'graded');
  const maxTotalPoints = rows[0]?.summary.maxTotal ?? assignment.maxScore;
  const avgScore =
    gradedRows.length > 0
      ? `${(gradedRows.reduce((s, r) => s + r.summary.total, 0) / gradedRows.length).toFixed(1).replace(/\.0$/, '')}/${maxTotalPoints}`
      : '—';

  const skillText = (r: ItemGradingRow) => r.summary.skills.map((s) => `${SKILL_LABELS[s.skill]} ${s.raw}/${s.max}`).join(' · ');
  const scoreText = (r: ItemGradingRow) => `${r.summary.total}/${r.summary.maxTotal}${r.summary.complete ? '' : ' (chưa chấm đủ)'}`;

  const COLUMNS: GridColumn[] = [
    { key: 'student', label: 'Học sinh', width: 'minmax(180px,1.4fr)' },
    { key: 'status', label: 'Trạng thái', width: 'minmax(120px,1fr)' },
    { key: 'score', label: `Điểm /${assignment.maxScore}`, width: 'minmax(150px,1.2fr)' },
    { key: 'skills', label: 'Theo kỹ năng', width: 'minmax(200px,2fr)' },
    { key: 'action', label: 'Chấm bài', width: '120px', align: 'end', srOnly: true },
  ];

  const cell = (r: ItemGradingRow, key: string) => {
    switch (key) {
      case 'student':
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={r.fullName} seed={r.studentId} quiet size="sm" />
            <span className="min-w-0 truncate text-sm font-medium text-[var(--fgColor-default)]">{r.fullName}</span>
          </div>
        );
      case 'status':
        return <SubmissionPill status={r.status} />;
      case 'score':
        return (
          <span className="flex flex-wrap items-center gap-2 tabular-nums">
            <span className="text-sm font-medium text-[var(--fgColor-default)]">{scoreText(r)}</span>
            {hasFlaggedMark(r) && <Pill tone="blush">Chấm chéo lệch</Pill>}
          </span>
        );
      case 'skills':
        return r.summary.skills.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {r.summary.skills.map((s) => (
              <span
                key={s.skill}
                className="inline-flex items-center gap-1 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-2 py-0.5 text-xs tabular-nums text-[var(--fgColor-default)]"
              >
                <span className="text-[var(--fgColor-muted)]">{SKILL_LABELS[s.skill]}</span>
                <b className="font-medium">{s.raw}/{s.max}</b>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm text-[var(--fgColor-muted)]">—</span>
        );
      case 'action':
        return (
          <Btn variant="ghost" onClick={() => setOpenId(r.studentId)} disabled={!canManage && r.submissionId === null}>
            {canManage ? 'Chấm bài' : 'Xem bài'}
          </Btn>
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
          <>
            {/* Chiếu câu hỏi của bài lên màn lớn cho cả lớp cùng làm (35.19) */}
            <Btn variant="ghost" onClick={() => present.start('assignment', assignment.id)} disabled={present.starting}>
              Trình chiếu
            </Btn>
            {canManage && (
              <Btn variant="primary" onClick={() => setEditingItems(true)}>
                Sửa câu hỏi
              </Btn>
            )}
          </>
        }
      />

      {assignment.description && <Notice className="mb-2.5 whitespace-pre-line">{assignment.description}</Notice>}

      {rows.length === 0 ? (
        <EmptyPanel title="Lớp chưa có học sinh đang học" hint="Thêm học sinh vào lớp để chấm bài." />
      ) : (
        <>
          <div className="mb-3">
            <StatCards
              items={[
                { label: 'Đã nộp', value: `${counts.submitted + counts.graded}/${rows.length}`, sub: `${counts.not_submitted} chưa nộp` },
                { label: 'Đã chấm', value: `${counts.graded}/${rows.length}`, sub: `${counts.submitted} chờ chấm` },
                { label: 'Điểm TB', value: avgScore, sub: `${items.length} câu hỏi trong đề` },
              ]}
            />
          </div>
          <DataGrid
            label="Chấm bài theo câu"
            columns={COLUMNS}
            rows={rows}
            rowKey={(r) => r.studentId}
            cell={cell}
            from="md"
            searchEnable
            paging={{ enable: false }}
            title={
              <span className="text-xs tabular-nums text-[var(--fgColor-muted)]">
                {items.length} câu hỏi · Chưa nộp <b className="font-semibold text-[var(--fgColor-default)]">{counts.not_submitted}</b> · Đã nộp <b className="font-semibold text-[var(--fgColor-default)]">{counts.submitted}</b> · Đã chấm{' '}
                <b className="font-semibold text-[var(--fgColor-default)]">{counts.graded}</b>
              </span>
            }
            card={(r) => (
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar name={r.fullName} seed={r.studentId} quiet size="sm" />
                    <b className="min-w-0 truncate text-base text-[var(--fgColor-default)]">{r.fullName}</b>
                  </div>
                  <SubmissionPill status={r.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2 rounded-[var(--borderRadius-medium)] bg-[var(--bgColor-muted)] px-3 py-2 text-xs tabular-nums">
                  <span className="font-medium text-[var(--fgColor-default)]">Điểm {scoreText(r)}</span>
                  {hasFlaggedMark(r) && <Pill tone="blush">Chấm chéo lệch</Pill>}
                  {skillText(r) && <span className="text-[var(--fgColor-muted)]">· {skillText(r)}</span>}
                </div>
                <Btn block variant="ghost" onClick={() => setOpenId(r.studentId)}>
                  {canManage ? 'Chấm bài' : 'Xem bài'}
                </Btn>
              </Card>
            )}
          />
        </>
      )}

      <Modal
        size="xl"
        open={!!open}
        title={open ? `Bài làm của ${open.fullName}` : 'Bài làm'}
        subtitle={`${assignment.title} · ${assignment.className}`}
        onClose={() => setOpenId(null)}
        labelledBy="answer-dialog-title"
      >
        {open && (
          <AnswerDialog
            key={open.studentId}
            assignmentId={assignment.id}
            student={{ id: open.studentId, name: open.fullName }}
            items={items}
            answers={open.answers}
            savedPoints={open.summary.points}
            secondMarks={open.secondMarks}
            gradedByAccountId={open.gradedByAccountId}
            currentAccountId={currentAccountId}
            canManage={canManage}
            onSaved={(text) => {
              setOpenId(null);
              notify(text);
              router.refresh();
            }}
            onSecondMarked={(text) => {
              notify(text);
              router.refresh();
            }}
          />
        )}
      </Modal>

      <ItemsEditor
        assignmentId={assignment.id}
        levelCode={assignment.levelCode}
        initial={items}
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
