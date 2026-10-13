'use client';

// Hộp thoại tạo, sửa, xoá lớp dùng chung cho danh sách và trang chi tiết.
import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { deleteClassAction, loadClassForm, type ClassCoreValues } from '@/app/(app)/lop-hoc/actions';
import { todayKeyVN } from '@/lib/datetime';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Toast, useToast } from '@/components/ui/Toast';
import { ClassForm, type TeacherChoice } from './ClassForm';

export type ClassTarget = { id: number; name: string; studentCount: number };

// onDeleted: trang chi tiết truyền vào để chuyển về danh sách. Trang danh sách để mặc định là làm mới dữ liệu.
export function useClassDialogs({ teachers, onDeleted }: { teachers: TeacherChoice[]; onDeleted?: () => void }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ id: number; values: ClassCoreValues } | null>(null);
  const [toDelete, setToDelete] = useState<ClassTarget | null>(null);
  const [blocked, setBlocked] = useState<ClassTarget | null>(null);
  const { message, notify } = useToast();
  const [pending, startTransition] = useTransition();

  const onDone = useCallback(
    (text: string) => {
      setCreating(false);
      setEditing(null);
      notify(text);
      router.refresh();
    },
    [router, notify],
  );

  const openEdit = useCallback(
    (id: number) => {
      startTransition(async () => {
        const r = await loadClassForm(id);
        if (!r.ok) return notify(r.message);
        setEditing({ id, values: r.values });
      });
    },
    [notify],
  );

  // Lớp còn học sinh thì chặn ngay trên giao diện; máy chủ cũng kiểm lại
  const askDelete = useCallback((target: ClassTarget) => {
    if (target.studentCount > 0) setBlocked(target);
    else setToDelete(target);
  }, []);

  function confirmDelete() {
    if (!toDelete) return;
    const id = toDelete.id;
    startTransition(async () => {
      const r = await deleteClassAction(id);
      setToDelete(null);
      notify(r.message ?? (r.ok ? 'Đã xoá' : 'Không xoá được'));
      if (r.ok && onDeleted) onDeleted();
      else router.refresh();
    });
  }

  const dialogs = (
    <>
      <Toast message={message} />
      <Modal open={creating} title="Tạo lớp học" subtitle="Các trường có dấu * là bắt buộc. Hệ thống sẽ sinh sẵn các buổi học." onClose={() => setCreating(false)} labelledBy="class-create-title">
        <ClassForm mode="create" teachers={teachers} defaultStartDate={todayKeyVN()} onDone={onDone} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal open={!!editing} title="Sửa lớp học" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setEditing(null)} labelledBy="class-edit-title">
        {editing && <ClassForm mode="edit" classId={editing.id} initial={editing.values} teachers={teachers} defaultStartDate="" onDone={onDone} onCancel={() => setEditing(null)} />}
      </Modal>
      <ConfirmDialog
        open={!!toDelete}
        title="Xoá lớp này?"
        text={toDelete ? `Lớp ${toDelete.name} và các buổi học chưa diễn ra sẽ bị xoá. Không thể hoàn tác.` : ''}
        confirmLabel="Xoá lớp"
        pending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
      <ConfirmDialog
        open={!!blocked}
        blocked
        title="Chưa xoá được"
        text={blocked ? `Lớp ${blocked.name} còn ${blocked.studentCount} học sinh. Chuyển học sinh sang lớp khác trước khi xoá.` : ''}
        confirmLabel="Đã hiểu"
        onConfirm={() => setBlocked(null)}
        onCancel={() => setBlocked(null)}
      />
    </>
  );

  return {
    openCreate: () => setCreating(true),
    openEdit,
    askDelete,
    dialogs,
  };
}
