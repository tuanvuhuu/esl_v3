'use client';

// Màn Danh sách từ (35.14): web là bảng có ⋯ (Sửa, Xoá), điện thoại là thẻ có nút chữ. Xoá luôn qua hộp xác nhận.
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteWordListAction, loadWordListAction } from '@/app/(app)/tu-vung/actions';
import type { WordListItem, WordListRow } from '@/lib/queries/word-lists';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
import { WordListForm } from './WordListForm';

const COLUMNS: GridColumn<WordListRow>[] = [
  { key: 'name', label: 'Danh sách', width: 'minmax(220px,2fr)', sortValue: (r) => r.name },
  { key: 'link', label: 'Gắn với', width: 'minmax(160px,1.2fr)' },
  { key: 'count', label: 'Số từ', width: 'minmax(80px,0.5fr)', sortValue: (r) => r.wordCount },
  { key: 'actions', label: 'Thao tác', width: '44px', align: 'end', srOnly: true },
];

const linkText = (r: WordListRow) => [r.className ? `Lớp ${r.className}` : '', r.lessonTitle ? `Bài giảng ${r.lessonTitle}` : ''].filter(Boolean).join(' · ') || 'Dùng chung';

export function WordListsView({ lists, classes, lessons, canManage }: { lists: WordListRow[]; classes: { id: number; name: string }[]; lessons: { id: number; title: string }[]; canManage: boolean }) {
  const router = useRouter();
  const { message, notify } = useToast();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ row: WordListRow; items: WordListItem[] } | null>(null);
  const [toDelete, setToDelete] = useState<WordListRow | null>(null);
  const [pending, startTransition] = useTransition();

  function openEdit(row: WordListRow) {
    startTransition(async () => {
      const r = await loadWordListAction(row.id);
      if (!r.ok) return notify(r.message);
      setEditing({ row, items: r.items });
    });
  }

  function confirmDelete() {
    if (!toDelete) return;
    const id = toDelete.id;
    startTransition(async () => {
      const r = await deleteWordListAction(id);
      setToDelete(null);
      notify(r.message ?? (r.ok ? 'Đã xoá' : 'Không xoá được'));
      router.refresh();
    });
  }

  function done(text: string) {
    setCreating(false);
    setEditing(null);
    notify(text);
    router.refresh();
  }

  const menu = (r: WordListRow): RowMenuItem[] => [
    { kind: 'action', label: 'Sửa', icon: Pencil, onSelect: () => openEdit(r), disabled: !canManage, disabledHint: 'Không có quyền soạn bài' },
    { kind: 'action', label: 'Xoá', icon: Trash2, danger: true, onSelect: () => setToDelete(r), disabled: !canManage, disabledHint: 'Không có quyền soạn bài' },
  ];

  const cell = (r: WordListRow, key: string) => {
    switch (key) {
      case 'name':
        return (
          <div className="min-w-0">
            <button type="button" onClick={() => openEdit(r)} className="text-left text-base font-normal text-link underline underline-offset-2">{r.name}</button>
            <small className="block truncate text-xs text-muted">{r.preview}</small>
          </div>
        );
      case 'link':
        return <span className="text-sm text-ink-2">{linkText(r)}</span>;
      case 'count':
        return <span className="text-base tabular-nums text-ink">{r.wordCount}</span>;
      case 'actions':
        return (
          <div className="flex justify-end">
            <RowMenu label={`Thao tác với ${r.name}`} items={menu(r)} />
          </div>
        );
      default:
        return null;
    }
  };

  const card = (r: WordListRow) => (
    <Card>
      <div className="min-w-0">
        <b className="block break-words text-base text-ink">{r.name}</b>
        <small className="block text-sm text-muted">{linkText(r)} · {r.wordCount} từ</small>
        {r.preview && <small className="mt-1 block text-sm text-ink-2">{r.preview}</small>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Btn block onClick={() => openEdit(r)} disabled={!canManage || pending}>
          <Pencil className="size-4" aria-hidden />
          Sửa
        </Btn>
        <Btn block variant="danger" onClick={() => setToDelete(r)} disabled={!canManage}>
          <Trash2 className="size-4" aria-hidden />
          Xoá
        </Btn>
      </div>
    </Card>
  );

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Danh sách từ']}
        title="Danh sách từ"
        subtitle="Bộ từ (tranh, âm thanh, nghĩa) gắn với lớp hoặc bài giảng, dùng lại cho các trò chơi từ vựng."
        actions={
          canManage ? (
            <Btn variant="primary" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden />
              Thêm danh sách
            </Btn>
          ) : null
        }
      />

      <DataGrid
        label="Danh sách từ"
        columns={COLUMNS}
        rows={lists}
        rowKey={(r) => r.id}
        cell={cell}
        card={card}
        from="md"
        empty={<EmptyPanel title="Chưa có danh sách từ" hint={canManage ? 'Bấm Thêm danh sách, gõ từ hoặc lấy từ kho từ vựng.' : 'Giáo viên tạo danh sách từ để dùng cho trò chơi.'} />}
      />

      <Modal open={creating} title="Thêm danh sách từ" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setCreating(false)} labelledBy="word-list-create-title">
        {creating && <WordListForm mode="create" classes={classes} lessons={lessons} onDone={done} onCancel={() => setCreating(false)} />}
      </Modal>
      <Modal open={!!editing} title={editing ? `Sửa danh sách · ${editing.row.name}` : 'Sửa danh sách'} subtitle="Các trường có dấu * là bắt buộc." onClose={() => setEditing(null)} labelledBy="word-list-edit-title">
        {editing && (
          <WordListForm
            mode="edit"
            listId={editing.row.id}
            initial={{ name: editing.row.name, classId: editing.row.classId, lessonId: editing.row.lessonId, items: editing.items }}
            classes={classes}
            lessons={lessons}
            onDone={done}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={!!toDelete}
        title="Xoá danh sách từ?"
        text={toDelete ? `Danh sách ${toDelete.name} (${toDelete.wordCount} từ) sẽ bị xoá. Không thể hoàn tác.` : ''}
        confirmLabel="Xoá danh sách"
        pending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
      <Toast message={message} />
    </section>
  );
}
