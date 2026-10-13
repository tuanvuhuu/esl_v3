'use client';

import { Pencil, Phone, Plus, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteParentAction, loadParentForm, type ParentFormValues } from '@/app/(app)/phu-huynh/actions';
import type { ParentRow } from '@/lib/queries/parents';
import { PARENT_RELATION_LABELS } from '@/lib/parent-labels';
import { normalizeSearch } from '@/lib/text';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { Avatar, EmptyState } from '@/components/ui/primitives';
import { Toast, useToast } from '@/components/ui/Toast';
import { ParentForm } from './ParentForm';

export function ParentList({ parents, canManage }: { parents: ParentRow[]; canManage: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ id: number; values: ParentFormValues } | null>(null);
  const [toDelete, setToDelete] = useState<ParentRow | null>(null);
  const { message, notify } = useToast();
  const [pending, startTransition] = useTransition();

  const needle = normalizeSearch(q);
  const shown = useMemo(
    () =>
      needle
        ? parents.filter((p) => normalizeSearch(`${p.fullName} ${p.phone} ${p.children.map((c) => c.studentName).join(' ')}`).includes(needle))
        : parents,
    [parents, needle],
  );

  const onDone = useCallback(
    (text: string) => {
      setCreating(false);
      setEditing(null);
      notify(text);
      router.refresh();
    },
    [router, notify],
  );

  function openEdit(row: ParentRow) {
    startTransition(async () => {
      const r = await loadParentForm(row.id);
      if (!r.ok) return notify(r.message);
      setEditing({ id: row.id, values: r.values });
    });
  }

  function confirmDelete() {
    if (!toDelete) return;
    const id = toDelete.id;
    startTransition(async () => {
      const r = await deleteParentAction(id);
      setToDelete(null);
      notify(r.message ?? (r.ok ? 'Đã xoá' : 'Không xoá được'));
      router.refresh();
    });
  }

  const menuItems = (row: ParentRow): RowMenuItem[] => [
    { kind: 'action', label: 'Sửa', icon: Pencil, onSelect: () => openEdit(row), disabled: !canManage, disabledHint: 'Không có quyền quản lý phụ huynh' },
    { kind: 'action', label: 'Xoá', icon: Trash2, danger: true, onSelect: () => setToDelete(row), disabled: !canManage, disabledHint: 'Không có quyền quản lý phụ huynh' },
  ];

  const deleteText = toDelete
    ? toDelete.children.length > 0
      ? `${toDelete.fullName} sẽ bị xoá khỏi ${toDelete.children.length} học sinh (${toDelete.children.map((c) => c.studentName).join(', ')}). Học sinh vẫn được giữ lại.`
      : `${toDelete.fullName} sẽ bị xoá. Không có học sinh nào liên kết.`
    : '';

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Phụ huynh']}
        title="Phụ huynh"
        subtitle={`${parents.length} phụ huynh. Xoá phụ huynh chỉ gỡ liên kết, học sinh vẫn được giữ lại.`}
        actions={
          canManage && (
            <button type="button" onClick={() => setCreating(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-base font-bold text-on-primary max-[767px]:h-11">
              <Plus className="size-4" aria-hidden />
              Thêm phụ huynh
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Tìm phụ huynh</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên, số điện thoại hoặc tên con"
            className="h-11 w-full rounded-[14px] border border-line bg-surface px-3.5 text-input text-ink outline-none placeholder:text-muted focus:border-primary-deep"
          />
        </label>
        <small className="text-sm text-muted">{shown.length} trên {parents.length} phụ huynh</small>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-[24px] bg-surface shadow-card">
          <EmptyState title="Không có phụ huynh phù hợp" hint="Thử từ khoá khác hoặc thêm phụ huynh mới." />
        </div>
      ) : (
        <>
          {/* Máy tính bảng và máy tính: bảng */}
          <div className="hidden overflow-hidden rounded-[24px] bg-surface shadow-card min-[768px]:block">
            <div role="table" aria-label="Danh sách phụ huynh">
              <div role="row" className="grid grid-cols-[minmax(200px,1.6fr)_minmax(130px,1fr)_minmax(200px,2fr)_44px] gap-x-3 border-b border-line px-4 py-2.5 text-xs font-semibold text-muted">
                <span role="columnheader">Phụ huynh</span>
                <span role="columnheader">Số điện thoại</span>
                <span role="columnheader">Con</span>
                <span role="columnheader" className="sr-only">Thao tác</span>
              </div>
              {shown.map((row) => (
                <div key={row.id} role="row" className="grid grid-cols-[minmax(200px,1.6fr)_minmax(130px,1fr)_minmax(200px,2fr)_44px] items-center gap-x-3 border-b border-line px-4 py-3.5 last:border-0 hover:bg-row-hover">
                  <div role="cell" className="flex min-w-0 items-center gap-3">
                    <Avatar name={row.fullName} seed={row.id} />
                    <div className="min-w-0">
                      <b className="block truncate text-base text-ink">{row.fullName}</b>
                      <small className="block truncate text-xs text-muted">{row.email || 'Chưa có email'}</small>
                    </div>
                  </div>
                  <div role="cell">
                    <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1.5 text-base font-bold text-ink hover:underline">
                      <Phone className="size-3.5" aria-hidden />
                      {row.phone}
                    </a>
                  </div>
                  <div role="cell" className="flex min-w-0 flex-wrap gap-1.5">
                    <ChildChips row={row} />
                  </div>
                  <div role="cell" className="flex justify-end">
                    <RowMenu label={`Thao tác với ${row.fullName}`} items={menuItems(row)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Điện thoại: thẻ, hai nút có chữ */}
          <div className="flex flex-col gap-3 min-[768px]:hidden">
            {shown.map((row) => (
              <article key={row.id} className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-3.5 shadow-card">
                <div className="flex items-start gap-3">
                  <Avatar name={row.fullName} seed={row.id} />
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-base text-ink">{row.fullName}</b>
                    <a href={`tel:${row.phone}`} className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-bold text-ink">
                      <Phone className="size-3.5" aria-hidden />
                      {row.phone}
                    </a>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <ChildChips row={row} />
                </div>
                <div className="grid grid-cols-2 gap-2">
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
        </>
      )}

      <Toast message={message} />

      <Modal open={creating} title="Thêm phụ huynh" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setCreating(false)} labelledBy="parent-create-title">
        <ParentForm mode="create" onDone={onDone} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal open={!!editing} title="Sửa phụ huynh" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setEditing(null)} labelledBy="parent-edit-title">
        {editing && <ParentForm mode="edit" parentId={editing.id} initial={editing.values} onDone={onDone} onCancel={() => setEditing(null)} />}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Xoá phụ huynh này?"
        text={deleteText}
        confirmLabel="Xoá phụ huynh"
        pending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}

function ChildChips({ row }: { row: ParentRow }) {
  if (row.children.length === 0) return <small className="text-sm text-muted">Chưa liên kết học sinh nào</small>;
  return (
    <>
      {row.children.map((c) => (
        <Link key={c.studentId} href={`/hoc-sinh/${c.studentId}`} className="inline-flex items-center gap-1.5 rounded-full bg-bg px-2.5 py-1 text-sm font-semibold text-ink hover:underline">
          <Users className="size-3.5 text-ink-2" aria-hidden />
          {c.studentName}
          <span className="text-xs text-muted">· {PARENT_RELATION_LABELS[c.relation]}{c.isPrimary ? ' · chính' : ''}</span>
        </Link>
      ))}
    </>
  );
}
