'use client';

import Link from 'next/link';
import { ClipboardCheck, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { deleteAssignmentAction, loadAssignmentForm, type AssignmentFormValues } from '@/app/(app)/bai-tap/actions';
import type { AssignmentRow } from '@/lib/queries/assignments';
import { addDaysKey, todayKeyVN, vnDateTimeLabel } from '@/lib/datetime';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { EmptyState, Pill, ProgressBar } from '@/components/ui/primitives';
import { Toast, useToast } from '@/components/ui/Toast';
import { AssignmentForm } from './AssignmentForm';

export function AssignmentsView({
  classes,
  classId,
  assignments,
  canManage,
}: {
  classes: { id: number; name: string }[];
  classId: number;
  assignments: AssignmentRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { message, notify } = useToast();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ id: number; values: AssignmentFormValues } | null>(null);
  const [toDelete, setToDelete] = useState<AssignmentRow | null>(null);
  const [pending, startTransition] = useTransition();
  const defaultDue = addDaysKey(todayKeyVN(), 7);

  const onDone = useCallback(
    (text: string) => {
      setCreating(false);
      setEditing(null);
      notify(text);
      router.refresh();
    },
    [router, notify],
  );

  function openEdit(row: AssignmentRow) {
    startTransition(async () => {
      const r = await loadAssignmentForm(row.id);
      if (!r.ok) return notify(r.message);
      setEditing({ id: row.id, values: r.values });
    });
  }

  function confirmDelete() {
    if (!toDelete) return;
    const id = toDelete.id;
    startTransition(async () => {
      const r = await deleteAssignmentAction(id);
      setToDelete(null);
      notify(r.message ?? (r.ok ? 'Đã xoá' : 'Không xoá được'));
      router.refresh();
    });
  }

  const menuItems = (row: AssignmentRow): RowMenuItem[] => [
    { kind: 'link', href: `/bai-tap/${row.id}`, label: 'Chấm điểm', icon: ClipboardCheck },
    { kind: 'action', label: 'Sửa', icon: Pencil, onSelect: () => openEdit(row), disabled: !canManage, disabledHint: 'Không có quyền quản lý bài tập' },
    { kind: 'action', label: 'Xoá', icon: Trash2, danger: true, onSelect: () => setToDelete(row), disabled: !canManage, disabledHint: 'Không có quyền quản lý bài tập' },
  ];

  const cls = classes.find((c) => c.id === classId);

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Bài tập']}
        title="Bài tập"
        subtitle="Bài tập theo lớp. Bấm Chấm điểm để ghi trạng thái nộp và điểm của từng học sinh."
        actions={
          canManage && classes.length > 0 && (
            <button type="button" onClick={() => setCreating(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-base font-bold text-on-primary max-[767px]:h-11">
              <Plus className="size-4" aria-hidden />
              Thêm bài tập
            </button>
          )
        }
      />

      {classes.length === 0 ? (
        <div className="rounded-[24px] bg-surface shadow-card">
          <EmptyState title="Chưa có lớp nào" hint="Tạo lớp học trước khi giao bài tập." />
        </div>
      ) : (
        <>
          <div className="mb-4">
            <select
              aria-label="Chọn lớp"
              value={classId}
              onChange={(e) => router.push(`/bai-tap?cls=${e.target.value}`, { scroll: false })}
              className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-base font-semibold text-ink min-[768px]:max-w-sm"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {assignments.length === 0 ? (
            <div className="rounded-[24px] bg-surface shadow-card">
              <EmptyState title={`Lớp ${cls?.name ?? ''} chưa có bài tập`} hint="Bấm Thêm bài tập để giao bài đầu tiên." />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-2 min-[768px]:gap-4 min-[1200px]:grid-cols-3">
              {assignments.map((row) => (
                <article key={row.id} className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-3.5 shadow-card min-[768px]:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/bai-tap/${row.id}`} className="block truncate text-base font-extrabold text-ink hover:underline">{row.title}</Link>
                      <small className="block text-sm text-muted">Hạn {vnDateTimeLabel(new Date(row.dueAt))} · tối đa {row.maxScore} điểm</small>
                    </div>
                    <div className="hidden min-[768px]:block">
                      <RowMenu label={`Thao tác với bài ${row.title}`} items={menuItems(row)} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {row.overdue ? <Pill tone="blush">Quá hạn</Pill> : <Pill tone="stone">{new Date(row.dueAt) > new Date() ? 'Đang nhận bài' : 'Đã đóng'}</Pill>}
                    <span className="text-sm text-ink-2">Đã nộp {row.done}/{row.enrolled} · Đã chấm {row.graded}</span>
                  </div>
                  <ProgressBar value={row.done} max={row.enrolled} />
                  {/* Điện thoại: ba nút có chữ, bằng nhau */}
                  <div className="grid grid-cols-3 gap-2 min-[768px]:hidden">
                    <Link href={`/bai-tap/${row.id}`} className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-bold text-on-primary">
                      <ClipboardCheck className="size-4" aria-hidden />
                      Chấm
                    </Link>
                    <button type="button" onClick={() => openEdit(row)} disabled={!canManage} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-sm font-bold text-ink disabled:opacity-40">
                      <Pencil className="size-4" aria-hidden />
                      Sửa
                    </button>
                    <button type="button" onClick={() => setToDelete(row)} disabled={!canManage} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-blush-ink bg-surface text-sm font-bold text-blush-ink disabled:opacity-40">
                      <Trash2 className="size-4" aria-hidden />
                      Xoá
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <Toast message={message} />

      <Modal open={creating} title="Thêm bài tập" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setCreating(false)} labelledBy="assignment-create-title">
        <AssignmentForm mode="create" classes={classes} defaultClassId={classId} defaultDueDate={defaultDue} onDone={onDone} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal open={!!editing} title="Sửa bài tập" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setEditing(null)} labelledBy="assignment-edit-title">
        {editing && <AssignmentForm mode="edit" assignmentId={editing.id} initial={editing.values} classes={classes} defaultClassId={classId} defaultDueDate={defaultDue} onDone={onDone} onCancel={() => setEditing(null)} />}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Xoá bài tập này?"
        text={toDelete ? `Bài "${toDelete.title}" và ${toDelete.done} bài đã nộp hoặc đã chấm sẽ bị xoá. Không thể hoàn tác.` : ''}
        confirmLabel="Xoá bài tập"
        pending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}
