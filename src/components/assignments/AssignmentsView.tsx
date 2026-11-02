'use client';

import Link from 'next/link';
import { ChecklistIcon, GraphIcon, LibraryIcon, PencilIcon, PlusIcon, SparklesFillIcon, TrashIcon } from '@primer/octicons-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { deleteAssignmentAction, loadAssignmentForm, type AssignmentFormValues } from '@/app/(app)/bai-tap/actions';
import { installSampleSetAction } from '@/app/(app)/bai-tap/sample-actions';
import { FormFooter } from '@/components/ui/Field';
import { STARTERS_SET } from '@/lib/sample-sets';
import type { AssignmentRow } from '@/lib/queries/assignments';
import { addDaysKey, todayKeyVN, vnDateTimeLabel } from '@/lib/datetime';
import { BTN_BASE, BTN_PRIMARY, Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ComboBox } from '@/components-ui';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { Pill, ProgressBar } from '@/components/ui/primitives';
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
import { AssignmentForm } from './AssignmentForm';

export function AssignmentsView({
  classes,
  lessons,
  classId,
  assignments,
  canManage,
}: {
  classes: { id: number; name: string; campusId: number }[];
  lessons: { id: number; title: string; campusIds: number[] }[];
  classId: number;
  assignments: AssignmentRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { message, notify } = useToast();
  const [creating, setCreating] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
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
    { kind: 'link', href: `/bai-tap/${row.id}`, label: 'Chấm điểm', icon: ChecklistIcon },
    { kind: 'action', label: 'Sửa', icon: PencilIcon, onSelect: () => openEdit(row), disabled: !canManage, disabledHint: 'Không có quyền quản lý bài tập' },
    { kind: 'action', label: 'Xoá', icon: TrashIcon, danger: true, onSelect: () => setToDelete(row), disabled: !canManage, disabledHint: 'Không có quyền quản lý bài tập' },
  ];

  const cls = classes.find((c) => c.id === classId);

  // Bộ bài mẫu Starters (35.21): thêm vào lớp đang chọn, bài đã có thì bỏ qua
  function installSample() {
    startTransition(async () => {
      const r = await installSampleSetAction(classId);
      setSampleOpen(false);
      notify(r.message ?? (r.ok ? 'Đã thêm' : 'Không thêm được'));
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Bài tập']}
        title="Bài tập"
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            {classes.length > 0 && (
              <ComboBox
                label="Chọn lớp"
                auto
                variant="bar"
                value={String(classId)}
                onChange={(v) => router.push(`/bai-tap?cls=${v}`, { scroll: false })}
                options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
              />
            )}
            {canManage && (
              <>
                <Btn variant="ghost" leadingVisual={GraphIcon} onClick={() => router.push(`/bao-cao-ky-nang?cls=${classId}`)} disabled={classes.length === 0}>
                  Báo cáo kỹ năng
                </Btn>
                <Btn variant="ghost" leadingVisual={LibraryIcon} onClick={() => router.push('/ngan-hang-cau-hoi')}>
                  Ngân hàng câu hỏi
                </Btn>
                {classes.length > 0 && (
                  <Btn variant="ghost" leadingVisual={SparklesFillIcon} onClick={() => setSampleOpen(true)}>
                    Bộ bài mẫu
                  </Btn>
                )}
                {classes.length > 0 && (
                  <Btn variant="primary" leadingVisual={PlusIcon} onClick={() => setCreating(true)}>
                    Thêm bài tập
                  </Btn>
                )}
              </>
            )}
          </div>
        }
      />

      {classes.length === 0 ? (
        <EmptyPanel title="Chưa có lớp nào" hint="Tạo lớp học trước khi giao bài tập." />
      ) : (
        <>
          {assignments.length === 0 ? (
            <EmptyPanel title={`Lớp ${cls?.name ?? ''} chưa có bài tập`} hint="Bấm Thêm bài tập để giao bài đầu tiên." />
          ) : (
            <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-2 min-[1200px]:grid-cols-3">
              {assignments.map((row) => (
                <Card key={row.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/bai-tap/${row.id}`} scroll={false} className="block truncate text-base font-extrabold text-[var(--fgColor-default)] hover:underline">{row.title}</Link>
                      <small className="block text-sm text-[var(--fgColor-muted)]">Hạn {vnDateTimeLabel(new Date(row.dueAt))} · tối đa {row.maxScore} điểm</small>
                      {row.lessonTitle && <small className="block truncate text-sm text-[var(--fgColor-muted)]">Bài giảng: {row.lessonTitle}</small>}
                    </div>
                    <div className="hidden min-[768px]:block">
                      <RowMenu label={`Thao tác với bài ${row.title}`} items={menuItems(row)} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {row.overdue ? <Pill tone="blush">Quá hạn</Pill> : <Pill tone="stone">{new Date(row.dueAt) > new Date() ? 'Đang nhận bài' : 'Đã đóng'}</Pill>}
                    <span className="text-sm text-[var(--fgColor-muted)]">Đã nộp {row.done}/{row.enrolled} · Đã chấm {row.graded}</span>
                  </div>
                  <ProgressBar value={row.done} max={row.enrolled} />
                  {/* Điện thoại: ba nút có chữ, bằng nhau */}
                  <div className="grid grid-cols-3 gap-2 min-[768px]:hidden">
                    <Link href={`/bai-tap/${row.id}`} scroll={false} className={`${BTN_BASE} ${BTN_PRIMARY} w-full`}>
                      <ChecklistIcon size={16} aria-hidden />
                      Chấm
                    </Link>
                    <Btn block leadingVisual={PencilIcon} onClick={() => openEdit(row)} disabled={!canManage}>
                      Sửa
                    </Btn>
                    <Btn block variant="danger" leadingVisual={TrashIcon} onClick={() => setToDelete(row)} disabled={!canManage}>
                      Xoá
                    </Btn>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Toast message={message} />

      <Modal open={creating} title="Thêm bài tập" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setCreating(false)} labelledBy="assignment-create-title">
        <AssignmentForm
          mode="create"
          classes={classes}
          lessons={lessons}
          defaultClassId={classId}
          defaultDueDate={defaultDue}
          onDone={onDone}
          onCancel={() => setCreating(false)}
        />
      </Modal>
      <Modal open={!!editing} title="Sửa bài tập" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setEditing(null)} labelledBy="assignment-edit-title">
        {editing && (
          <AssignmentForm
            mode="edit"
            assignmentId={editing.id}
            initial={editing.values}
            classes={classes}
            lessons={lessons}
            defaultClassId={classId}
            defaultDueDate={defaultDue}
            onDone={onDone}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal open={sampleOpen} title={`Thêm ${STARTERS_SET.name} vào lớp ${cls?.name ?? ''}`} subtitle={STARTERS_SET.description} onClose={() => setSampleOpen(false)} labelledBy="sample-set-title">
        <div className="flex flex-col gap-3 pb-2">
          <ul className="flex flex-col gap-1.5 text-base text-[var(--fgColor-default)]" aria-label="Nội dung bộ bài mẫu">
            {STARTERS_SET.lessons.map((l) => (
              <li key={l.title}>
                <b>{l.title}</b> <span className="text-sm text-[var(--fgColor-muted)]">· {l.items.length} câu · {l.description}</span>
              </li>
            ))}
            <li>
              <b>Danh sách từ: {STARTERS_SET.wordList.name}</b> <span className="text-sm text-[var(--fgColor-muted)]">· {STARTERS_SET.wordList.words.length} từ cho trò chơi</span>
            </li>
          </ul>
          <p className="text-sm text-[var(--fgColor-muted)]">Bài hạn nộp sau 7 ngày, sửa được như bài thường. Bài đã có trong lớp thì bỏ qua. Không gửi tin bài mới cho phụ huynh.</p>
          <FormFooter>
            <Btn onClick={() => setSampleOpen(false)} disabled={pending}>
              Huỷ
            </Btn>
            <Btn variant="primary" onClick={installSample} disabled={pending}>
              {pending ? 'Đang thêm…' : 'Thêm vào lớp'}
            </Btn>
          </FormFooter>
        </div>
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
