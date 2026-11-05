'use client';

// Danh sách cơ sở với hộp thoại thêm, sửa, xoá. Mỗi lớp thuộc đúng một cơ sở nên cơ sở còn lớp thì không xoá được.
import { LocationIcon, OrganizationIcon, PencilIcon, PlusIcon, TrashIcon } from '@primer/octicons-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteCampusAction } from '@/app/(app)/co-so/actions';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pill } from '@/components/ui/primitives';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
import { CampusForm } from './CampusForm';

export type CampusRowView = { id: number; name: string; address: string; classCount: number };

const CAMPUS_ACCENTS = [
  {
    border: 'border-l-[var(--primary)]',
    icon: 'border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] text-[var(--primary-deep)]',
  },
  {
    border: 'border-l-[#0284c7]',
    icon: 'border-[#bae6fd] bg-[#f0f9ff] text-[#0369a1] dark:border-[#075985] dark:bg-[#082f49] dark:text-[#7dd3fc]',
  },
  {
    border: 'border-l-[#059669]',
    icon: 'border-[#a7f3d0] bg-[#ecfdf5] text-[#047857] dark:border-[#065f46] dark:bg-[#064e3b] dark:text-[#6ee7b7]',
  },
  {
    border: 'border-l-[#7c3aed]',
    icon: 'border-[#ddd6fe] bg-[#f5f3ff] text-[#6d28d9] dark:border-[#5b21b6] dark:bg-[#2e1065] dark:text-[#c4b5fd]',
  },
] as const;

export function CampusList({
  campuses,
  canManage,
  canAddRemove = true,
}: {
  campuses: CampusRowView[];
  canManage: boolean;
  canAddRemove?: boolean;
}) {
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
    {
      kind: 'action',
      label: 'Sửa',
      icon: PencilIcon,
      onSelect: () => setEditing(row),
      disabled: !canManage,
      disabledHint: 'Không có quyền quản lý cơ sở',
    },
    {
      kind: 'action',
      label: 'Xoá',
      icon: TrashIcon,
      danger: true,
      onSelect: () => askDelete(row),
      disabled: !canManage || !canAddRemove,
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
          canManage &&
          canAddRemove && (
            <Btn variant="primary" leadingVisual={PlusIcon} onClick={() => setCreating(true)}>
              Thêm cơ sở
            </Btn>
          )
        }
      />

      {campuses.length === 0 ? (
        <EmptyPanel title="Chưa có cơ sở nào" hint="Thêm cơ sở đầu tiên để xếp lớp học vào." />
      ) : (
        <div className="tsukuba-rise grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[1200px]:grid-cols-3">
          {campuses.map((row, idx) => {
            const accent = CAMPUS_ACCENTS[idx % CAMPUS_ACCENTS.length];
            return (
              <Card
                key={row.id}
                className={`border-l-[3px] ${accent.border} hover:-translate-y-0.5 hover:border-[var(--borderColor-accent-emphasis)]`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-[var(--borderRadius-medium)] border ${accent.icon}`}
                    >
                      <OrganizationIcon size={16} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <b className="block truncate text-base font-semibold text-[var(--fgColor-default)]">{row.name}</b>
                      <small className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--fgColor-muted)]">
                        <LocationIcon size={12} className="shrink-0" aria-hidden />
                        <span className="truncate">{row.address || 'Chưa cập nhật địa chỉ'}</span>
                      </small>
                    </div>
                  </div>
                  <div className="hidden shrink-0 min-[768px]:block">
                    <RowMenu label={`Thao tác với cơ sở ${row.name}`} items={menuItems(row)} />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-muted)] bg-[#f8fafc] px-3 py-2 text-xs dark:bg-[var(--bgColor-muted)]/60">
                  <span className="font-medium text-[var(--fgColor-muted)]">Quy mô vận hành</span>
                  <div className="flex items-center gap-2">
                    <Pill tone={row.classCount > 0 ? 'mint' : 'stone'}>{row.classCount} lớp</Pill>
                    <span className="font-medium text-[var(--ink-2)]">{row.classCount > 0 ? 'Đang có lớp' : 'Chưa xếp lớp'}</span>
                  </div>
                </div>

                {/* Điện thoại: hai nút có chữ, bằng nhau */}
                <div className="grid grid-cols-2 gap-2 min-[768px]:hidden">
                  <Btn block leadingVisual={PencilIcon} onClick={() => setEditing(row)} disabled={!canManage}>
                    Sửa
                  </Btn>
                  <Btn
                    block
                    variant="danger"
                    leadingVisual={TrashIcon}
                    onClick={() => askDelete(row)}
                    disabled={!canManage || !canAddRemove}
                  >
                    Xoá
                  </Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Toast message={message} />
      <Modal
        open={creating}
        size="md"
        title="Thêm cơ sở"
        subtitle="Thiết lập tên gọi và địa chỉ chi nhánh trung tâm. Các trường có dấu * là bắt buộc."
        onClose={() => setCreating(false)}
        labelledBy="campus-create-title"
      >
        <CampusForm onDone={onDone} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal
        open={!!editing}
        size="md"
        title="Sửa cơ sở"
        subtitle="Cập nhật tên gọi hoặc địa chỉ chi nhánh. Các trường có dấu * là bắt buộc."
        onClose={() => setEditing(null)}
        labelledBy="campus-edit-title"
      >
        {editing && (
          <CampusForm
            campusId={editing.id}
            initial={{ name: editing.name, address: editing.address }}
            onDone={onDone}
            onCancel={() => setEditing(null)}
          />
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
