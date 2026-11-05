'use client';

// Màn Danh sách từ (35.14): web là bảng có ⋯ (Chơi thử, Trình chiếu, Sửa, Xoá), điện thoại là thẻ có nút chữ. Xoá luôn qua hộp xác nhận.
import { BroadcastIcon, PencilIcon, PlayIcon, PlusIcon, TrashIcon } from '@primer/octicons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteWordListAction, loadWordListAction } from '@/app/(app)/tu-vung/actions';
import type { WordListItem, WordListRow } from '@/lib/queries/word-lists';
import { usePresent } from '@/components/present/usePresent';
import { Btn, BTN_BASE, BTN_PRIMARY } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Chip, ChipGroup } from '@/components/ui/controls';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { Modal } from '@/components/ui/Modal';
import { PageCrumbs } from '@/components/shell/PageCrumbs';
import { Pill } from '@/components/ui/primitives';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
import { WordListForm } from './WordListForm';

type WordListSegment = 'all' | 'class' | 'shared';

const COLUMNS: GridColumn<WordListRow>[] = [
  { key: 'name', label: 'Danh sách & từ mẫu', width: 'minmax(240px,2.2fr)', sortValue: (r) => r.name },
  { key: 'link', label: 'Phạm vi gắn', width: 'minmax(168px,1.3fr)' },
  { key: 'count', label: 'Số từ', width: '104px', sortValue: (r) => r.wordCount },
  { key: 'quick', label: 'Luyện & trình chiếu', width: '196px', sortable: false },
  { key: 'actions', label: 'Thao tác', width: '44px', align: 'end', srOnly: true },
];

const linkText = (r: WordListRow) => [r.className ? `Lớp ${r.className}` : '', r.lessonTitle ? `Bài giảng ${r.lessonTitle}` : ''].filter(Boolean).join(' · ') || 'Dùng chung';

export function WordListsView({ lists, classes, lessons, canManage }: { lists: WordListRow[]; classes: { id: number; name: string }[]; lessons: { id: number; title: string }[]; canManage: boolean }) {
  const router = useRouter();
  const { message, notify } = useToast();
  const present = usePresent(notify);
  const [segment, setSegment] = useState<WordListSegment>('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ row: WordListRow; items: WordListItem[] } | null>(null);
  const [toDelete, setToDelete] = useState<WordListRow | null>(null);
  const [pending, startTransition] = useTransition();

  const shownLists = lists.filter((r) => {
    if (segment === 'class') return Boolean(r.className || r.lessonTitle);
    if (segment === 'shared') return !r.className && !r.lessonTitle;
    return true;
  });

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
    { kind: 'link', label: 'Chơi thử', icon: PlayIcon, href: `/tu-vung/${r.id}` },
    { kind: 'action', label: 'Trình chiếu', icon: BroadcastIcon, onSelect: () => present.start('word_list', r.id), disabled: present.starting },
    { kind: 'action', label: 'Sửa', icon: PencilIcon, onSelect: () => openEdit(r), disabled: !canManage, disabledHint: 'Không có quyền soạn bài' },
    { kind: 'action', label: 'Xoá', icon: TrashIcon, danger: true, onSelect: () => setToDelete(r), disabled: !canManage, disabledHint: 'Không có quyền soạn bài' },
  ];

  const cell = (r: WordListRow, key: string) => {
    switch (key) {
      case 'name':
        return (
          <div className="min-w-0">
            <button
              type="button"
              data-link="true"
              onClick={() => openEdit(r)}
              className="cursor-pointer text-left text-[13.5px] font-semibold text-[var(--fgColor-default)] transition-colors hover:text-[var(--primary)] hover:underline"
            >
              {r.name}
            </button>
            {r.preview && (
              <small className="mt-0.5 block truncate text-xs text-[var(--fgColor-muted)]">{r.preview}</small>
            )}
          </div>
        );
      case 'link':
        if (!r.className && !r.lessonTitle) {
          return <Pill tone="stone">Dùng chung</Pill>;
        }
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {r.className && (
              <span className="inline-flex items-center rounded-[5px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] px-1.5 py-0.5 text-[11.5px] font-semibold text-[var(--primary-deep)]">
                {r.className}
              </span>
            )}
            {r.lessonTitle && (
              <span className="inline-flex items-center rounded-[5px] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-1.5 py-0.5 text-[11.5px] font-medium text-[var(--ink-2)]">
                {r.lessonTitle}
              </span>
            )}
          </div>
        );
      case 'count':
        return (
          <span className="inline-flex items-center rounded-[5px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-[var(--primary-deep)]">
            {r.wordCount} từ
          </span>
        );
      case 'quick':
        return (
          <div className="flex items-center gap-1.5">
            <Link
              href={`/tu-vung/${r.id}`}
              data-link="true"
              className="inline-flex items-center gap-1 rounded-[5px] border border-[var(--borderColor-default)] bg-[#f8fafc] px-2 py-0.5 text-xs font-medium text-[var(--fgColor-default)] no-underline transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-deep)] dark:bg-[var(--bgColor-muted)]"
            >
              <PlayIcon size={11} aria-hidden />
              <span>Chơi thử</span>
            </Link>
            <button
              type="button"
              data-link="true"
              disabled={present.starting}
              onClick={() => present.start('word_list', r.id)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-[5px] border border-[var(--borderColor-default)] bg-[#f8fafc] px-2 py-0.5 text-xs font-medium text-[var(--ink-2)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-deep)] disabled:opacity-50 dark:bg-[var(--bgColor-muted)]"
            >
              <BroadcastIcon size={11} aria-hidden />
              <span>Chiếu</span>
            </button>
          </div>
        );
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
    <Card className="tsukuba-rise">
      <div className="min-w-0">
        <b className="block break-words text-base font-semibold text-[var(--fgColor-default)]">{r.name}</b>
        <small className="mt-0.5 block text-xs tabular-nums text-[var(--fgColor-muted)]">{linkText(r)} · {r.wordCount} từ</small>
        {r.preview && (
          <small className="mt-2 block truncate rounded-lg border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-2.5 py-1.5 text-xs text-[var(--fgColor-muted)]">
            {r.preview}
          </small>
        )}
      </div>
      <Link href={`/tu-vung/${r.id}`} className={`${BTN_BASE} ${BTN_PRIMARY} w-full`}>
        <PlayIcon size={16} aria-hidden />
        Chơi thử
      </Link>
      <div className="grid grid-cols-2 gap-2">
        <Btn block leadingVisual={PencilIcon} onClick={() => openEdit(r)} disabled={!canManage || pending}>
          Sửa
        </Btn>
        <Btn block variant="danger" leadingVisual={TrashIcon} onClick={() => setToDelete(r)} disabled={!canManage}>
          Xoá
        </Btn>
      </div>
    </Card>
  );

  return (
    <section className="flex flex-col">
      <PageCrumbs crumbs={['Đào tạo', 'Danh sách từ']} />

      <DataGrid
        label="Danh sách từ"
        columns={COLUMNS}
        rows={shownLists}
        rowKey={(r) => r.id}
        cell={cell}
        card={card}
        from="md"
        fill
        stickyEnd
        searchEnable
        title={
          <ChipGroup label="Lọc danh sách từ">
            <Chip selected={segment === 'all'} count={lists.length} onClick={() => setSegment('all')}>
              Tất cả
            </Chip>
            <Chip
              selected={segment === 'class'}
              count={lists.filter((r) => Boolean(r.className || r.lessonTitle)).length}
              onClick={() => setSegment('class')}
            >
              Theo lớp / bài
            </Chip>
            <Chip
              selected={segment === 'shared'}
              count={lists.filter((r) => !r.className && !r.lessonTitle).length}
              onClick={() => setSegment('shared')}
            >
              Dùng chung
            </Chip>
          </ChipGroup>
        }
        actionComponent={
          canManage ? (
            <Btn variant="primary" leadingVisual={PlusIcon} onClick={() => setCreating(true)}>
              Thêm danh sách
            </Btn>
          ) : null
        }
        empty={<EmptyPanel title="Chưa có danh sách từ" hint={canManage ? 'Bấm Thêm danh sách, gõ từ hoặc lấy từ kho từ vựng.' : 'Giáo viên tạo danh sách từ để dùng cho trò chơi.'} />}
      />

      <Modal open={creating} size="lg" title="Thêm danh sách từ" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setCreating(false)} labelledBy="word-list-create-title">
        {creating && <WordListForm mode="create" classes={classes} lessons={lessons} onDone={done} onCancel={() => setCreating(false)} />}
      </Modal>
      <Modal open={!!editing} size="lg" title={editing ? `Sửa danh sách · ${editing.row.name}` : 'Sửa danh sách'} subtitle="Các trường có dấu * là bắt buộc." onClose={() => setEditing(null)} labelledBy="word-list-edit-title">
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
