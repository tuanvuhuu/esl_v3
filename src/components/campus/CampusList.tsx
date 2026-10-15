'use client';

// Danh sách cơ sở với hộp thoại thêm, sửa, xoá. Mỗi lớp thuộc đúng một cơ sở nên cơ sở còn lớp thì không xoá được.
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteCampusAction } from '@/app/(app)/co-so/actions';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { Toast, useToast } from '@/components/ui/Toast';
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { CampusForm } from './CampusForm';

export type CampusRowView = { id: number; name: string; address: string; classCount: number };

export function CampusList({ campuses, canManage }: { campuses: CampusRowView[]; canManage: boolean }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CampusRowView | null>(null);
  const [toDelete, setToDelete] = useState<CampusRowView | null>(null);
  const [blocked, setBlocked] = useState<{ title: string; text: string } | null>(null);
  const { message, notify } = useToast();
  const [pending, startTransition] = useTransition();

  function onDone(text: string) {
    setCreating(false);
    setEditing(null);
    notify(text);
    router.refresh();
  }

  // Cơ sở cuối cùng và cơ sở còn lớp thì chặn ngay trên giao diện; máy chủ cũng kiểm lại
  function askDelete(row: CampusRowView) {
    if (campuses.length <= 1) {
      setBlocked({ title: 'Chưa xoá được', text: 'Cần giữ ít nhất một cơ sở.' });
    } else if (row.classCount > 0) {
      setBlocked({
        title: 'Chưa xoá được',
        text: `${row.name} còn ${row.classCount} lớp. Chuyển các lớp sang cơ sở khác trước khi xoá.`,
      });
    } else {
      setToDelete(row);
    }
  }

  function confirmDelete() {
    if (!toDelete) return;
    const id = toDelete.id;
    startTransition(async () => {
      const r = await deleteCampusAction(id);
      setToDelete(null);
      notify(r.message ?? (r.ok ? 'Đã xoá' : 'Không xoá được'));
      router.refresh();
    });
  }

  const menuItems = (row: CampusRowView): RowMenuItem[] => [
    { kind: 'action', label: 'Sửa', icon: Pencil, onSelect: () => setEditing(row), disabled: !canManage, disabledHint: 'Không có quyền quản lý cơ sở' },
    {
      kind: 'action',
      label: 'Xoá',
      icon: Trash2,
      danger: true,
      onSelect: () => askDelete(row),
      disabled: !canManage,
      disabledHint: 'Không có quyền quản lý cơ sở',
    },
  ];

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Hệ thống', 'Cơ sở']}
        title="Cơ sở"
        subtitle={`${campuses.length} cơ sở. Mỗi lớp thuộc đúng một cơ sở.`}
        actions={
          canManage && (
            <Btn variant="primary" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden />
              Thêm cơ sở
            </Btn>
          )
        }
      />

      {campuses.length === 0 ? (
        <EmptyPanel title="Chưa có cơ sở nào" hint="Thêm cơ sở đầu tiên để xếp lớp học vào." />
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-2 min-[1200px]:grid-cols-3">
          {campuses.map((row) => (
            <Card key={row.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <b className="block truncate text-lg font-extrabold text-ink">{row.name}</b>
                  <small className="block truncate text-sm text-muted">{row.address || 'Chưa có địa chỉ'}</small>
                </div>
                <div className="hidden min-[768px]:block">
                  <RowMenu label={`Thao tác với cơ sở ${row.name}`} items={menuItems(row)} />
                </div>
              </div>

              <div className="rounded-[var(--radius-ctl)] bg-bg px-3 py-2.5 text-sm">
                <span className="font-bold text-ink">{row.classCount} lớp</span>
                <span className="text-ink-2">{row.classCount > 0 ? ' · đang có lớp học' : ' · chưa có lớp'}</span>
              </div>

              {/* Điện thoại: hai nút có chữ, bằng nhau */}
              <div className="grid grid-cols-2 gap-2 min-[768px]:hidden">
                <Btn block onClick={() => setEditing(row)} disabled={!canManage}>
                  <Pencil className="size-4" aria-hidden />
                  Sửa
                </Btn>
                <Btn block variant="danger" onClick={() => askDelete(row)} disabled={!canManage}>
                  <Trash2 className="size-4" aria-hidden />
                  Xoá
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Toast message={message} />
      <Modal open={creating} title="Thêm cơ sở" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setCreating(false)} labelledBy="campus-create-title">
        <CampusForm onDone={onDone} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal open={!!editing} title="Sửa cơ sở" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setEditing(null)} labelledBy="campus-edit-title">
        {editing && (
          <CampusForm campusId={editing.id} initial={{ name: editing.name, address: editing.address }} onDone={onDone} onCancel={() => setEditing(null)} />
        )}
      </Modal>
      <ConfirmDialog
        open={!!toDelete}
        title="Xoá cơ sở này?"
        text={toDelete ? `${toDelete.name} sẽ bị xoá. Không thể hoàn tác.` : ''}
        confirmLabel="Xoá cơ sở"
        pending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
      <ConfirmDialog
        open={!!blocked}
        blocked
        title={blocked?.title ?? ''}
        text={blocked?.text ?? ''}
        confirmLabel="Đã hiểu"
        onConfirm={() => setBlocked(null)}
        onCancel={() => setBlocked(null)}
      />
    </section>
  );
}
