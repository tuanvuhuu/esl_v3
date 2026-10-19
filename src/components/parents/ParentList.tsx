'use client';

import { Pencil, Phone, Plus, Search, Send, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteParentAction, loadParentForm, type ParentFormValues } from '@/app/(app)/phu-huynh/actions';
import { createParentLinkAction } from '@/app/(app)/tin-nhan/actions';
import { TelegramLinkDialog } from '@/components/telegram/TelegramLinkDialog';
import type { ParentRow, StudentChoice } from '@/lib/queries/parents';
import { PARENT_RELATION_LABELS } from '@/lib/parent-labels';
import { normalizeSearch } from '@/lib/text';
import { sortRows } from '@/lib/sort';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { PageCrumbs } from '@/components/shell/PageCrumbs';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { Avatar } from '@/components/ui/primitives';
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
import { DataGrid, type GridColumn, type GridSort } from '@/components/ui/datagrid';
import { Btn, BTN_BASE, BTN_GHOST } from '@/components/ui/Btn';
import { Pagination, TextInput } from '@/components/ui/controls';
import { ParentForm } from './ParentForm';

const PAGE_SIZE = 10;

const COLUMNS: GridColumn<ParentRow>[] = [
  { key: 'fullName', label: 'Phụ huynh', width: 'minmax(200px,1.6fr)', sortable: true },
  { key: 'phone', label: 'Số điện thoại', width: 'minmax(130px,1fr)', sortable: true },
  {
    key: 'children',
    label: 'Con',
    width: 'minmax(200px,2fr)',
    sortable: true,
    sortValue: (r) => r.children.map((c) => c.studentName).join(', '),
  },
  { key: 'actions', label: 'Thao tác', width: '44px', align: 'end', srOnly: true },
];

export function ParentList(props: {
  parents: ParentRow[];
  students?: StudentChoice[];
  canManage: boolean;
}) {
  const { parents, canManage } = props;
  const router = useRouter();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [phoneCount, setPhoneCount] = useState(PAGE_SIZE);
  const [sort, setSort] = useState<GridSort | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ id: number; values: ParentFormValues } | null>(null);
  const [toDelete, setToDelete] = useState<ParentRow | null>(null);
  const [telegramFor, setTelegramFor] = useState<ParentRow | null>(null);
  const { message, notify } = useToast();
  const [pending, startTransition] = useTransition();

  const needle = normalizeSearch(q);
  const shown = useMemo(
    () =>
      needle
        ? parents.filter((p) =>
            normalizeSearch(`${p.fullName} ${p.phone} ${p.children.map((c) => c.studentName).join(' ')}`).includes(needle),
          )
        : parents,
    [parents, needle],
  );

  const sorted = useMemo(() => {
    if (!sort) return shown;
    const col = COLUMNS.find((c) => c.key === sort.column);
    return sortRows(shown, sort.column, sort.direction, col?.sortValue);
  }, [shown, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedRows = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage],
  );
  const phoneRows = useMemo(() => sorted.slice(0, phoneCount), [sorted, phoneCount]);
  const hasMorePhone = phoneCount < sorted.length;

  const handleSort = useCallback((columnKey: string) => {
    setSort((prev: GridSort | null) => {
      if (prev?.column === columnKey) {
        if (prev.direction === 'asc') return { column: columnKey, direction: 'desc' };
        return null;
      }
      return { column: columnKey, direction: 'asc' };
    });
    setPage(1);
  }, []);

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
    { kind: 'action', label: 'Kết nối Telegram', icon: Send, onSelect: () => setTelegramFor(row), disabled: !canManage, disabledHint: 'Không có quyền quản lý phụ huynh' },
    { kind: 'action', label: 'Xoá', icon: Trash2, danger: true, onSelect: () => setToDelete(row), disabled: !canManage, disabledHint: 'Không có quyền quản lý phụ huynh' },
  ];

  const deleteText = toDelete
    ? toDelete.children.length > 0
      ? `${toDelete.fullName} sẽ bị xoá khỏi ${toDelete.children.length} học sinh (${toDelete.children.map((c) => c.studentName).join(', ')}). Học sinh vẫn được giữ lại.`
      : `${toDelete.fullName} sẽ bị xoá. Không có học sinh nào liên kết.`
    : '';

  const cell = (row: ParentRow, key: string) => {
    switch (key) {
      case 'fullName':
        return (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={row.fullName} seed={row.id} />
            <div className="min-w-0">
              <b className="block truncate text-base text-ink">{row.fullName}</b>
          {row.telegramLinked && <small className="block text-xs text-muted">Đã kết nối Telegram</small>}
              <small className="block truncate text-xs text-muted">{row.email || 'Chưa có email'}</small>
            </div>
          </div>
        );
      case 'phone':
        return (
          <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1.5 text-base font-bold text-ink hover:underline">
            <Phone className="size-3.5" aria-hidden />
            {row.phone}
          </a>
        );
      case 'children':
        return (
          <div className="flex min-w-0 flex-wrap gap-1.5">
            <ChildChips row={row} />
          </div>
        );
      case 'actions':
        return (
          <div className="flex justify-end">
            <RowMenu label={`Thao tác với ${row.fullName}`} items={menuItems(row)} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section className="flex flex-col">
      {/* Tiêu đề trang chuẩn như trang Học sinh: thanh breadcrumbs, h1 sr-only trên desktop */}
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4 max-[767px]:mb-3">
        <div className="min-w-0">
          <PageCrumbs crumbs={['Đào tạo', 'Phụ huynh']} />
          <h1 className="text-h1 font-extrabold leading-tight tracking-tight text-ink min-[768px]:sr-only">Phụ huynh</h1>
          <p className="mt-1 text-base text-muted max-[767px]:mt-1.5 max-[767px]:text-sm">
            {parents.length} phụ huynh. Xoá phụ huynh chỉ gỡ liên kết, học sinh vẫn được giữ lại.
          </p>
        </div>
      </header>

      {/* Thanh điều khiển: tìm kiếm và nút Thêm phụ huynh đồng bộ kích thước chuẩn (32px máy tính, 44px điện thoại) */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3 min-w-0">
            <div className="relative min-w-0 flex-1 min-[768px]:max-w-sm">
              <label htmlFor="parent-search" className="sr-only">Tìm phụ huynh</label>
              <TextInput
                id="parent-search"
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                  setPhoneCount(PAGE_SIZE);
                }}
                placeholder="Tìm theo tên, SĐT hoặc tên con"
                autoComplete="off"
                className="pl-8 [&::-webkit-search-cancel-button]:hidden"
              />
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            </div>
            <span className="hidden text-sm text-muted whitespace-nowrap min-[768px]:inline">
              Đang hiển thị {sorted.length === 0 ? 0 : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, sorted.length)}`} trên {sorted.length} phụ huynh
            </span>
          </div>

          {canManage && (
            <Btn variant="primary" onClick={() => setCreating(true)} className="shrink-0">
              <Plus className="size-4" aria-hidden />
              Thêm phụ huynh
            </Btn>
          )}
        </div>

        <p className="text-sm text-muted min-[768px]:hidden">
          {sorted.length === 0 ? 'Không có phụ huynh phù hợp.' : `Đang hiển thị ${phoneRows.length} trên ${sorted.length} phụ huynh`}
        </p>
      </div>

      {sorted.length === 0 ? (
        <EmptyPanel title="Không có phụ huynh phù hợp" hint="Thử từ khoá khác hoặc thêm phụ huynh mới." />
      ) : (
        <>
          <DataGrid
            label="Danh sách phụ huynh"
            columns={COLUMNS}
            rows={pagedRows}
            rowKey={(r) => r.id}
            cell={cell}
            from="md"
            sort={sort}
            onSort={handleSort}
            footer={
              pageCount > 1 ? (
                <div className="hidden min-[768px]:block">
                  <Pagination page={currentPage} pageCount={pageCount} onPage={setPage} label="Phân trang" />
                </div>
              ) : undefined
            }
          />

          {/* Điện thoại: thẻ dùng Card chuẩn, hai nút Sửa / Xoá chuẩn */}
          <div className="flex flex-col gap-3 min-[768px]:hidden">
            {phoneRows.map((row) => (
              <ParentCard
                key={row.id}
                row={row}
                canManage={canManage}
                onEdit={() => openEdit(row)}
                onDelete={() => setToDelete(row)}
                onTelegram={() => setTelegramFor(row)}
              />
            ))}
          </div>

          {hasMorePhone && (
            <button
              type="button"
              onClick={() => setPhoneCount((n) => n + PAGE_SIZE)}
              className={`${BTN_BASE} ${BTN_GHOST} mt-3 w-full min-[768px]:hidden`}
            >
              Xem thêm {Math.min(PAGE_SIZE, sorted.length - phoneRows.length)} phụ huynh (còn {sorted.length - phoneRows.length})
            </button>
          )}
        </>
      )}

      <Toast message={message} />

      <Modal open={creating} title="Thêm phụ huynh" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setCreating(false)} labelledBy="parent-create-title">
        <ParentForm mode="create" onDone={onDone} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal open={!!editing} title="Sửa phụ huynh" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setEditing(null)} labelledBy="parent-edit-title">
        {editing && <ParentForm mode="edit" parentId={editing.id} initial={editing.values} onDone={onDone} onCancel={() => setEditing(null)} />}
      </Modal>

      <TelegramLinkDialog
        open={telegramFor !== null}
        title={`Kết nối Telegram · ${telegramFor?.fullName ?? ''}`}
        subtitle="Phụ huynh nhận lịch học, học phí, bài tập và trao đổi với trung tâm qua bot."
        linked={telegramFor?.telegramLinked ?? false}
        create={() => createParentLinkAction(telegramFor!.id)}
        onClose={() => {
          setTelegramFor(null);
          router.refresh();
        }}
      />

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

function ParentCard({
  row,
  canManage,
  onEdit,
  onDelete,
  onTelegram,
}: {
  row: ParentRow;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTelegram: () => void;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <Avatar name={row.fullName} seed={row.id} />
        <div className="min-w-0 flex-1">
          <b className="block truncate text-base text-ink">{row.fullName}</b>
          <a href={`tel:${row.phone}`} className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-bold text-ink hover:underline">
            <Phone className="size-3.5" aria-hidden />
            {row.phone}
          </a>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <ChildChips row={row} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Btn block onClick={onEdit} disabled={!canManage}>
          <Pencil className="size-4" aria-hidden />
          Sửa
        </Btn>
        <Btn block variant="danger" onClick={onDelete} disabled={!canManage}>
          <Trash2 className="size-4" aria-hidden />
          Xoá
        </Btn>
        <Btn block onClick={onTelegram} disabled={!canManage}>
          <Send className="size-4" aria-hidden />
          Telegram
        </Btn>
      </div>
    </Card>
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
