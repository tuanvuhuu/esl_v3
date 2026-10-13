'use client';

import { Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { deleteTeacherAction, loadTeacherForm, type TeacherFormValues } from '@/app/(app)/giao-vien/actions';
import type { TeacherRow } from '@/lib/queries/teachers';
import { TEACHER_STATUS_LABELS } from '@/lib/validation/teacher';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Btn } from '@/components/ui/Btn';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { Avatar, EmptyState, Pill, type Tone } from '@/components/ui/primitives';
import { Toast, useToast } from '@/components/ui/Toast';
import { TeacherForm } from './TeacherForm';

const STATUS_TONE: Record<TeacherRow['status'], Tone> = { active: 'mint', leave: 'butter' };

export function TeacherList({ teachers, canManage }: { teachers: TeacherRow[]; canManage: boolean }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ id: number; values: TeacherFormValues } | null>(null);
  const [toDelete, setToDelete] = useState<TeacherRow | null>(null);
  const [blocked, setBlocked] = useState<TeacherRow | null>(null);
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

  function openEdit(row: TeacherRow) {
    startTransition(async () => {
      const r = await loadTeacherForm(row.id);
      if (!r.ok) return notify(r.message);
      setEditing({ id: row.id, values: r.values });
    });
  }

  // Chặn xoá ngay trên giao diện khi còn lớp, máy chủ cũng kiểm lại
  function askDelete(row: TeacherRow) {
    if (row.classes.length > 0) setBlocked(row);
    else setToDelete(row);
  }

  function confirmDelete() {
    if (!toDelete) return;
    const id = toDelete.id;
    startTransition(async () => {
      const r = await deleteTeacherAction(id);
      setToDelete(null);
      notify(r.message ?? (r.ok ? 'Đã xoá' : 'Không xoá được'));
      router.refresh();
    });
  }

  const menuItems = (row: TeacherRow): RowMenuItem[] => [
    { kind: 'action', label: 'Sửa', icon: Pencil, onSelect: () => openEdit(row), disabled: !canManage, disabledHint: 'Không có quyền quản lý giáo viên' },
    { kind: 'action', label: 'Xoá', icon: Trash2, danger: true, onSelect: () => askDelete(row), disabled: !canManage, disabledHint: 'Không có quyền quản lý giáo viên' },
  ];

  const teaching = teachers.filter((t) => t.status === 'active').length;

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Giáo viên']}
        title="Giáo viên"
        subtitle={`${teachers.length} giáo viên, ${teaching} đang dạy. Đổi tên giáo viên sẽ cập nhật ở các lớp.`}
        actions={
          canManage && (
            <button type="button" onClick={() => setCreating(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-base font-bold text-on-primary max-[767px]:h-11">
              <Plus className="size-4" aria-hidden />
              Thêm giáo viên
            </button>
          )
        }
      />

      {teachers.length === 0 ? (
        <div className="rounded-[24px] bg-surface shadow-card">
          <EmptyState title="Chưa có giáo viên nào" hint="Thêm giáo viên trước khi tạo lớp học." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-2 min-[768px]:gap-4 min-[1200px]:grid-cols-3">
          {teachers.map((row) => (
            <article key={row.id} className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-3.5 shadow-card min-[768px]:p-4">
              <div className="flex items-start gap-3">
                <Avatar name={row.name} seed={row.id} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <b className="min-w-0 truncate text-lg text-ink">{row.name}</b>
                    <div className="hidden min-[768px]:block">
                      <RowMenu label={`Thao tác với ${row.name}`} items={menuItems(row)} />
                    </div>
                  </div>
                  <small className="block truncate text-sm text-muted">{row.subject} · {row.years} năm kinh nghiệm</small>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Pill tone={STATUS_TONE[row.status]}>{TEACHER_STATUS_LABELS[row.status]}</Pill>
                    <a href={`tel:${row.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2">
                      <Phone className="size-3.5" aria-hidden />
                      {row.phone}
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 rounded-xl bg-bg px-3 py-2.5">
                {row.classes.length === 0 ? (
                  <small className="text-sm text-muted">Chưa dạy lớp nào</small>
                ) : (
                  row.classes.map((c) => (
                    <Link key={c.id} href={`/lop-hoc/${c.id}`} className="rounded-full bg-surface px-2.5 py-1 text-sm font-bold text-ink hover:underline">
                      {c.name}
                    </Link>
                  ))
                )}
              </div>

              {/* Điện thoại: hai nút có chữ, bằng nhau */}
              <div className="grid grid-cols-2 gap-2 min-[768px]:hidden">
                <Btn block onClick={() => openEdit(row)} disabled={!canManage}>
                  <Pencil className="size-4" aria-hidden />
                  Sửa
                </Btn>
                <Btn block variant="danger" onClick={() => askDelete(row)} disabled={!canManage}>
                  <Trash2 className="size-4" aria-hidden />
                  Xoá
                </Btn>
              </div>
            </article>
          ))}
        </div>
      )}

      <Toast message={message} />

      <Modal open={creating} title="Thêm giáo viên" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setCreating(false)} labelledBy="teacher-create-title">
        <TeacherForm mode="create" onDone={onDone} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal open={!!editing} title="Sửa giáo viên" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setEditing(null)} labelledBy="teacher-edit-title">
        {editing && <TeacherForm mode="edit" teacherId={editing.id} initial={editing.values} onDone={onDone} onCancel={() => setEditing(null)} />}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Xoá giáo viên này?"
        text={toDelete ? `${toDelete.name} sẽ bị xoá khỏi danh sách. Tài khoản đăng nhập liên kết (nếu có) sẽ mất liên kết giáo viên.` : ''}
        confirmLabel="Xoá giáo viên"
        pending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
      <ConfirmDialog
        open={!!blocked}
        blocked
        title="Chưa xoá được"
        text={blocked ? `${blocked.name} còn ${blocked.classes.length} lớp (${blocked.classes.map((c) => c.name).join(', ')}). Chuyển các lớp sang giáo viên khác trước.` : ''}
        confirmLabel="Đã hiểu"
        onConfirm={() => setBlocked(null)}
        onCancel={() => setBlocked(null)}
      />
    </section>
  );
}
