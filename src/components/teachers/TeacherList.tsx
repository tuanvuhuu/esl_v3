'use client';

import { DeviceMobileIcon, PencilIcon, PlusIcon, TrashIcon } from '@primer/octicons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { deleteTeacherAction, loadTeacherForm, type TeacherFormValues } from '@/app/(app)/giao-vien/actions';
import type { TeacherRow } from '@/lib/queries/teachers';
import { STAFF_ROLE_LABELS, TEACHER_STATUS_LABELS, type StaffRole } from '@/lib/validation/teacher';
import { formatPhone } from '@/lib/text';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Btn } from '@/components/ui/Btn';
import { Modal } from '@/components/ui/Modal';
import { PageCrumbs } from '@/components/shell/PageCrumbs';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { Avatar, EmptyState, Pill, type Tone } from '@/components/ui/primitives';
import { Toast, useToast } from '@/components/ui/Toast';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { Panel, Card } from '@/components/ui/surfaces';
import { TeacherForm, type CampusChoice } from './TeacherForm';

const STATUS_TONE: Record<TeacherRow['status'], Tone> = { active: 'mint', leave: 'butter' };
// Vai trò quyết định người này được xếp vào vị trí nào của lớp (chủ nhiệm, trợ giảng, giáo viên nước ngoài)
const ROLE_TONE: Record<StaffRole, Tone> = { teacher: 'stone', assistant: 'butter', foreign: 'lav' };
const LINK = 'text-[var(--fgColor-link)] underline underline-offset-2';

const COLUMNS: GridColumn<TeacherRow>[] = [
  { key: 'name', label: 'Giáo viên', width: 'minmax(200px,1.5fr)' },
  { key: 'role', label: 'Vai trò', width: 'minmax(150px,1fr)', sortValue: (r) => r.staffRole },
  { key: 'subject', label: 'Chuyên môn', width: 'minmax(130px,1fr)' },
  { key: 'years', label: 'Kinh nghiệm', width: 'minmax(110px,0.9fr)', sortValue: (r) => r.years },
  { key: 'status', label: 'Trạng thái', width: 'minmax(110px,0.9fr)', sortValue: (r) => r.status },
  { key: 'classes', label: 'Lớp đang dạy', width: 'minmax(180px,1.8fr)', sortValue: (r) => r.classes.length },
  { key: 'actions', label: 'Thao tác', width: '44px', align: 'end', srOnly: true },
];

export function TeacherList({
  teachers,
  campuses = [],
  defaultCampusId = 0,
  canManage,
}: {
  teachers: TeacherRow[];
  campuses?: CampusChoice[];
  defaultCampusId?: number;
  canManage: boolean;
}) {
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
    { kind: 'action', label: 'Sửa', icon: PencilIcon, onSelect: () => openEdit(row), disabled: !canManage, disabledHint: 'Không có quyền quản lý giáo viên' },
    { kind: 'action', label: 'Xoá', icon: TrashIcon, danger: true, onSelect: () => askDelete(row), disabled: !canManage, disabledHint: 'Không có quyền quản lý giáo viên' },
  ];

  const teaching = teachers.filter((t) => t.status === 'active').length;

  const cell = (row: TeacherRow, key: string) => {
    switch (key) {
      case 'name':
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={row.name} seed={row.id} />
            <div className="min-w-0">
              <span className="block truncate text-sm font-medium text-[var(--fgColor-default)]">{row.name}</span>
              <a href={`tel:${row.phone.replace(/\s/g, '')}`} className={`inline-flex items-center gap-1 text-xs ${LINK}`}>
                <DeviceMobileIcon size={12} aria-hidden />
                {formatPhone(row.phone)}
              </a>
            </div>
          </div>
        );
      case 'role':
        return <Pill tone={ROLE_TONE[row.staffRole]}>{STAFF_ROLE_LABELS[row.staffRole]}</Pill>;
      case 'subject':
        return <span className="text-sm text-[var(--fgColor-default)]">{row.subject}</span>;
      case 'years':
        return <span className="text-sm text-[var(--fgColor-muted)]">{row.years} năm</span>;
      case 'status':
        return <Pill tone={STATUS_TONE[row.status]}>{TEACHER_STATUS_LABELS[row.status]}</Pill>;
      case 'classes':
        return (
          <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
            {row.classes.length === 0 ? (
              <small className="text-xs text-[var(--fgColor-muted)]">Chưa dạy lớp nào</small>
            ) : (
              row.classes.map((c) => (
                <Link key={c.id} href={`/lop-hoc/${c.id}`} className={`text-sm ${LINK}`}>
                  {c.name}
                </Link>
              ))
            )}
          </div>
        );
      case 'actions':
        return (
          <div className="flex justify-end">
            <RowMenu label={`Thao tác với ${row.name}`} items={menuItems(row)} />
          </div>
        );
      default:
        return null;
    }
  };

  const card = (row: TeacherRow) => (
    <Card>
      <div className="flex items-start gap-3">
        <Avatar name={row.name} seed={row.id} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <b className="min-w-0 truncate text-base font-medium text-[var(--fgColor-default)]">{row.name}</b>
            <div className="hidden min-[768px]:block">
              <RowMenu label={`Thao tác với ${row.name}`} items={menuItems(row)} />
            </div>
          </div>
          <small className="block truncate text-xs text-[var(--fgColor-muted)]">{row.subject} · {row.years} năm kinh nghiệm</small>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Pill tone={ROLE_TONE[row.staffRole]}>{STAFF_ROLE_LABELS[row.staffRole]}</Pill>
            <Pill tone={STATUS_TONE[row.status]}>{TEACHER_STATUS_LABELS[row.status]}</Pill>
            <a href={`tel:${row.phone.replace(/\s/g, '')}`} className={`inline-flex items-center gap-1.5 text-sm ${LINK}`}>
              <DeviceMobileIcon size={14} aria-hidden />
              {formatPhone(row.phone)}
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-[var(--borderRadius-medium)] bg-[var(--bgColor-muted)] px-3 py-2.5">
        {row.classes.length === 0 ? (
          <small className="text-xs text-[var(--fgColor-muted)]">Chưa dạy lớp nào</small>
        ) : (
          row.classes.map((c) => (
            <Link key={c.id} href={`/lop-hoc/${c.id}`} className={`text-sm font-medium ${LINK}`}>
              {c.name}
            </Link>
          ))
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 min-[768px]:hidden">
        <Btn block leadingVisual={PencilIcon} onClick={() => openEdit(row)} disabled={!canManage}>
          Sửa
        </Btn>
        <Btn block variant="danger" leadingVisual={TrashIcon} onClick={() => askDelete(row)} disabled={!canManage}>
          Xoá
        </Btn>
      </div>
    </Card>
  );

  return (
    <section className="flex flex-col">
      <PageCrumbs crumbs={['Đào tạo', 'Giáo viên']} />

      <DataGrid
        label="Danh sách giáo viên"
        columns={COLUMNS}
        rows={teachers}
        rowKey={(t) => t.id}
        cell={cell}
        card={card}
        from="md"
        searchEnable
        title={
          <div className="flex items-baseline gap-2">
            <h1 className="m-0 text-base font-semibold text-[var(--fgColor-default)]">Giáo viên</h1>
            <span className="text-xs text-[var(--fgColor-muted)]">
              ({teachers.length} giáo viên · {teaching} đang dạy)
            </span>
          </div>
        }
        actionComponent={
          canManage && (
            <Btn variant="primary" leadingVisual={PlusIcon} onClick={() => setCreating(true)}>
              Thêm giáo viên
            </Btn>
          )
        }
        empty={
          <Panel padded={false}>
            <EmptyState title="Chưa có giáo viên nào" hint="Thêm giáo viên trước khi tạo lớp học." />
          </Panel>
        }
      />

      <Toast message={message} />

      <Modal
        open={creating}
        size="md"
        title="Thêm giáo viên"
        subtitle="Khai báo chuyên môn, vai trò giảng dạy và cơ sở công tác. Các trường có dấu * là bắt buộc."
        onClose={() => setCreating(false)}
        labelledBy="teacher-create-title"
      >
        <TeacherForm mode="create" campuses={campuses} defaultCampusId={defaultCampusId} onDone={onDone} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal
        open={!!editing}
        size="md"
        title="Sửa giáo viên"
        subtitle="Cập nhật hồ sơ chuyên môn, trạng thái hoặc cơ sở giảng dạy. Các trường có dấu * là bắt buộc."
        onClose={() => setEditing(null)}
        labelledBy="teacher-edit-title"
      >
        {editing && (
          <TeacherForm
            mode="edit"
            teacherId={editing.id}
            initial={editing.values}
            campuses={campuses}
            defaultCampusId={defaultCampusId}
            onDone={onDone}
            onCancel={() => setEditing(null)}
          />
        )}
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
