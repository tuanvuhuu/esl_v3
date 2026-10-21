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
import { Pill } from '@/components/ui/primitives';
import { Card, EmptyPanel, Notice } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
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
}: {
  assignment: { id: number; title: string; className: string; dueAt: string; maxScore: number; description: string; levelCode: string | null };
  items: AssignmentItem[];
  rows: ItemGradingRow[];
  bank: BankQuestion[];
  canManage: boolean;
  currentAccountId: number | null;
}) {
  const router = useRouter();
  const { message, notify } = useToast();
  const [editingItems, setEditingItems] = useState(false);
  // Lưu mã học sinh đang mở, để dữ liệu luôn lấy từ danh sách mới sau khi làm mới trang
  const [openId, setOpenId] = useState<number | null>(null);
  const open = rows.find((r) => r.studentId === openId) ?? null;

  const counts = {
    not_submitted: rows.filter((r) => r.status === 'not_submitted').length,
    submitted: rows.filter((r) => r.status === 'submitted').length,
    graded: rows.filter((r) => r.status === 'graded').length,
  };

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
        return <span className="min-w-0 truncate text-base font-bold text-ink">{r.fullName}</span>;
      case 'status':
        return <SubmissionPill status={r.status} />;
      case 'score':
        return (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base text-ink">{scoreText(r)}</span>
            {hasFlaggedMark(r) && <Pill tone="blush">Chấm chéo lệch</Pill>}
          </span>
        );
      case 'skills':
        return <span className="text-sm text-ink-2">{skillText(r) || '—'}</span>;
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
          canManage && (
            <Btn variant="primary" onClick={() => setEditingItems(true)}>
              Sửa câu hỏi
            </Btn>
          )
        }
      />

      {assignment.description && <Notice className="mb-4 whitespace-pre-line">{assignment.description}</Notice>}

      <p className="mb-3 text-sm text-ink-2">
        {items.length} câu hỏi · Chưa nộp <b className="font-normal text-ink">{counts.not_submitted}</b> · Đã nộp <b className="font-normal text-ink">{counts.submitted}</b> · Đã chấm{' '}
        <b className="font-normal text-ink">{counts.graded}</b>
      </p>

      {rows.length === 0 ? (
        <EmptyPanel title="Lớp chưa có học sinh đang học" hint="Thêm học sinh vào lớp để chấm bài." />
      ) : (
        <>
          {/* Điện thoại: thẻ của DataGrid, mỗi học sinh một thẻ với tổng điểm và nút Chấm bài */}
          <DataGrid
            label="Chấm bài theo câu"
            columns={COLUMNS}
            rows={rows}
            rowKey={(r) => r.studentId}
            cell={cell}
            from="md"
            card={(r) => (
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <b className="min-w-0 truncate text-base text-ink">{r.fullName}</b>
                  <SubmissionPill status={r.status} />
                </div>
                <small className="block text-sm text-ink-2">Điểm {scoreText(r)}</small>
                {hasFlaggedMark(r) && <Pill tone="blush">Chấm chéo lệch</Pill>}
                {skillText(r) && <small className="block text-sm text-muted">{skillText(r)}</small>}
                <Btn block variant="ghost" onClick={() => setOpenId(r.studentId)}>
                  {canManage ? 'Chấm bài' : 'Xem bài'}
                </Btn>
              </Card>
            )}
          />
        </>
      )}

      <Modal
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
