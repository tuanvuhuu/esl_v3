'use client';

// Màn Phụ huynh (docs/DESIGN.md mục 155). Từ 1200px: bảng, mỗi phụ huynh một dòng, mỗi học sinh một cột,
// sửa tên, email, số điện thoại, ghi chú tại ô. Dưới 1200px: thẻ (máy tính bảng theo trang, điện thoại bấm Xem thêm).
import { Check, Pencil, Phone, Plus, Search, Send, Trash2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState, useTransition, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { deleteParentAction, loadParentForm, updateParentFieldAction, type ParentFormValues } from '@/app/(app)/phu-huynh/actions';
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
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
import { DataGrid, type GridColumn, type GridSort } from '@/components/ui/datagrid';
import { Btn, BTN_BASE, BTN_GHOST } from '@/components/ui/Btn';
import { Pagination, TextInput } from '@/components/ui/controls';
import { ChildEditor } from './ChildEditor';
import { InlineText } from './InlineText';
import { ZaloLink } from '@/components/ui/ZaloLink';
import { ParentAssignForm } from './ParentAssignForm';
import { ParentForm } from './ParentForm';

const PAGE_SIZE = 10;
const MAX_CHILD_COLUMNS = 4;
const NO_RIGHT = 'Không có quyền quản lý phụ huynh';

type Child = ParentRow['children'][number];

// Cột học sinh theo phụ huynh có nhiều con nhất, tối đa 4. Độ rộng tối thiểu cộng lại vừa khít bảng ở 1440px với 4 cột học sinh.
function buildColumns(childColumns: number): GridColumn<ParentRow>[] {
  return [
    { key: 'fullName', label: 'Họ tên', width: 'minmax(140px,1.3fr)', sortable: true },
    { key: 'email', label: 'Email', width: 'minmax(150px,1.3fr)', sortable: true },
    { key: 'phone', label: 'Số điện thoại', width: '176px', sortable: true },
    ...Array.from({ length: childColumns }, (_, i) => ({ key: `child${i}`, label: `Học sinh ${i + 1}`, width: 'minmax(116px,1fr)', sortable: false })),
    { key: 'note', label: 'Ghi chú', width: 'minmax(120px,1fr)', sortable: true },
    { key: 'actions', label: 'Thao tác', width: '64px', align: 'end', srOnly: true },
  ];
}

function relationText(c: Child): string {
  return PARENT_RELATION_LABELS[c.relation];
}

export function ParentList(props: { parents: ParentRow[]; students?: StudentChoice[]; canManage: boolean }) {
  const { parents, students = [], canManage } = props;
  const router = useRouter();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [phoneCount, setPhoneCount] = useState(PAGE_SIZE);
  const [sort, setSort] = useState<GridSort | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ id: number; values: ParentFormValues } | null>(null);
  const [toDelete, setToDelete] = useState<ParentRow | null>(null);
  const [telegramFor, setTelegramFor] = useState<ParentRow | null>(null);
  const [assigning, setAssigning] = useState<ParentRow | null>(null);
  // Thẻ sửa quan hệ mở dưới ô học sinh vừa bấm
  const [childEdit, setChildEdit] = useState<{ parentId: number; studentId: number; anchor: DOMRect } | null>(null);
  const { message, notify } = useToast();
  const [pending, startTransition] = useTransition();

  const childColumns = useMemo(
    () => Math.min(MAX_CHILD_COLUMNS, Math.max(1, ...parents.map((p) => p.children.length))),
    [parents],
  );
  const columns = useMemo(() => buildColumns(childColumns), [childColumns]);

  const needle = normalizeSearch(q);
  const shown = useMemo(
    () =>
      needle
        ? parents.filter((p) =>
            normalizeSearch(`${p.fullName} ${p.phone} ${p.email} ${p.children.map((c) => c.studentName).join(' ')}`).includes(needle),
          )
        : parents,
    [parents, needle],
  );

  const sorted = useMemo(() => {
    if (!sort) return shown;
    const col = columns.find((c) => c.key === sort.column);
    return sortRows(shown, sort.column, sort.direction, col?.sortValue);
  }, [shown, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedRows = useMemo(() => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [sorted, currentPage]);
  const phoneRows = useMemo(() => sorted.slice(0, phoneCount), [sorted, phoneCount]);
  const hasMorePhone = phoneCount < sorted.length;

  const handleSort = useCallback((columnKey: string) => {
    setSort((prev: GridSort | null) => {
      if (prev?.column === columnKey) return prev.direction === 'asc' ? { column: columnKey, direction: 'desc' } : null;
      return { column: columnKey, direction: 'asc' };
    });
    setPage(1);
  }, []);

  const onDone = useCallback(
    (text: string) => {
      setCreating(false);
      setEditing(null);
      setAssigning(null);
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
    { kind: 'action', label: 'Gán học sinh', icon: UserPlus, onSelect: () => setAssigning(row), disabled: !canManage, disabledHint: NO_RIGHT },
    { kind: 'action', label: 'Sửa', icon: Pencil, onSelect: () => openEdit(row), disabled: !canManage, disabledHint: NO_RIGHT },
    { kind: 'action', label: 'Kết nối Telegram', icon: Send, onSelect: () => setTelegramFor(row), disabled: !canManage, disabledHint: NO_RIGHT },
    { kind: 'action', label: 'Xoá', icon: Trash2, danger: true, onSelect: () => setToDelete(row), disabled: !canManage, disabledHint: NO_RIGHT },
  ];

  const deleteText = toDelete
    ? toDelete.children.length > 0
      ? `${toDelete.fullName} sẽ bị xoá khỏi ${toDelete.children.length} học sinh (${toDelete.children.map((c) => c.studentName).join(', ')}). Học sinh vẫn được giữ lại.`
      : `${toDelete.fullName} sẽ bị xoá. Không có học sinh nào liên kết.`
    : '';

  // Ô học sinh thứ i: học sinh, "+N học sinh khác" ở ô cuối khi dư, "+ Thêm" ở ô trống đầu tiên
  function childCell(row: ParentRow, i: number) {
    const kids = row.children;
    const overflow = kids.length > childColumns;
    if (overflow && i === childColumns - 1) {
      const rest = kids.slice(i);
      return <MoreChildren names={rest.map((c) => c.studentName)} />;
    }
    const child = kids[i];
    if (child) {
      return (
        <button
          type="button"
          onClick={(e: MouseEvent<HTMLButtonElement>) => setChildEdit({ parentId: row.id, studentId: child.studentId, anchor: e.currentTarget.getBoundingClientRect() })}
          aria-label={`Sửa ${child.studentName}, ${relationText(child)}${child.isPrimary ? ', liên hệ chính' : ''}`}
          data-link="true"
          className="-mx-1 flex min-w-0 max-w-full flex-col items-start rounded-[var(--radius-ctl)] px-1 py-0.5 text-left hover:bg-stone"
        >
          <span className="break-words text-base text-link underline underline-offset-2">{child.studentName}</span>
          <span className="inline-flex items-center gap-1 text-sm text-relation">
            {relationText(child)}
            {child.isPrimary && <Check className="size-3.5" aria-hidden />}
          </span>
        </button>
      );
    }
    if (i === kids.length && canManage) {
      // Chữ chỉ hiện khi rê chuột hoặc Tab vào (DESIGN.md mục 12)
      return (
        <button
          type="button"
          onClick={() => setAssigning(row)}
          className="-mx-1 h-[var(--ctl-h)] rounded-[var(--radius-ctl)] px-1 text-sm text-link underline underline-offset-2 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
        >
          + Thêm
        </button>
      );
    }
    return null;
  }

  const cell = (row: ParentRow, key: string) => {
    if (key.startsWith('child')) return childCell(row, Number(key.slice(5)));
    switch (key) {
      case 'fullName':
        return (
          <div className="min-w-0">
            <InlineText
              value={row.fullName}
              label="họ tên"
              placeholder="Thêm họ tên"
              canEdit={canManage}
              className="text-base font-bold text-ink"
              onSave={(next) => updateParentFieldAction(row.id, 'fullName', next)}
            />
            {row.telegramLinked && <small className="block text-xs text-muted">Đã kết nối Telegram</small>}
          </div>
        );
      case 'email':
        return (
          <InlineText
            value={row.email}
            label="email"
            placeholder="Thêm email"
            inputType="email"
            canEdit={canManage}
            className="text-sm text-ink-2"
            onSave={(next) => updateParentFieldAction(row.id, 'email', next)}
          />
        );
      case 'phone':
        return canManage ? (
          <span className="flex min-w-0 items-center gap-2">
            <InlineText
              value={row.phone}
              label="số điện thoại"
              placeholder="Thêm số điện thoại"
              inputType="tel"
              canEdit
              className="text-base text-ink"
              onSave={(next) => updateParentFieldAction(row.id, 'phone', next)}
            />
            <ZaloLink phone={row.phone} name={row.fullName} variant="link" />
          </span>
        ) : (
          <span className="flex flex-wrap items-center gap-2">
            <a href={`tel:${row.phone}`} className="text-base text-link underline underline-offset-2">
              {row.phone}
            </a>
            <ZaloLink phone={row.phone} name={row.fullName} variant="link" />
          </span>
        );
      case 'note':
        return (
          <InlineText
            value={row.note}
            label="ghi chú"
            placeholder="Thêm ghi chú"
            multiline
            canEdit={canManage}
            className="text-xs leading-tight text-ink-2"
            wrap
            onSave={(next) => updateParentFieldAction(row.id, 'note', next)}
          />
        );
      case 'actions':
        return <RowMenu label={`Thao tác với ${row.fullName}`} items={menuItems(row)} />;
      default:
        return null;
    }
  };

  const card = (row: ParentRow) => (
    <ParentCard
      row={row}
      canManage={canManage}
      onEdit={() => openEdit(row)}
      onDelete={() => setToDelete(row)}
      onTelegram={() => setTelegramFor(row)}
      onAssign={() => setAssigning(row)}
    />
  );

  const empty = <EmptyPanel title="Không có phụ huynh phù hợp" hint="Thử từ khoá khác hoặc thêm phụ huynh mới." />;

  // Thẻ sửa quan hệ đọc dòng mới nhất sau router.refresh; liên kết đã gỡ thì đóng
  const editRow = childEdit ? parents.find((p) => p.id === childEdit.parentId) : undefined;
  const editChild = childEdit ? editRow?.children.find((c) => c.studentId === childEdit.studentId) : undefined;

  return (
    <section className="flex flex-col min-[1200px]:min-h-0 min-[1200px]:flex-1">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4 max-[767px]:mb-3">
        <div className="min-w-0">
          <PageCrumbs crumbs={['Đào tạo', 'Phụ huynh']} />
          <h1 className="text-h1 font-extrabold leading-tight tracking-tight text-ink min-[768px]:sr-only">Phụ huynh</h1>
          <p className="mt-1 text-base text-muted max-[767px]:mt-1.5 max-[767px]:text-sm">
            {parents.length} phụ huynh. Xoá phụ huynh chỉ gỡ liên kết, học sinh vẫn được giữ lại.
          </p>
        </div>
      </header>

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative min-w-0 flex-1 min-[768px]:max-w-sm">
              <label htmlFor="parent-search" className="sr-only">
                Tìm phụ huynh
              </label>
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
            <span className="hidden whitespace-nowrap text-sm text-muted min-[768px]:inline">
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

      {/* Từ 1200px: bảng, thân tự cuộn, cột Thao tác dính mép phải. 768–1199px: thẻ theo trang. */}
      {sorted.length === 0 ? (
        <div className="hidden min-[768px]:block">{empty}</div>
      ) : (
        <DataGrid
          label="Danh sách phụ huynh"
          columns={columns}
          rows={pagedRows}
          rowKey={(r) => r.id}
          cell={cell}
          card={card}
          cardsFrom="md"
          from="xl"
          fill
          stickyEnd
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
      )}

      {/* Điện thoại: thẻ, bấm Xem thêm để tiếp */}
      <div className="flex flex-col gap-3 min-[768px]:hidden">{sorted.length === 0 ? empty : phoneRows.map((row) => <div key={row.id}>{card(row)}</div>)}</div>
      {hasMorePhone && (
        <button type="button" onClick={() => setPhoneCount((n) => n + PAGE_SIZE)} className={`${BTN_BASE} ${BTN_GHOST} mt-3 w-full min-[768px]:hidden`}>
          Xem thêm {Math.min(PAGE_SIZE, sorted.length - phoneRows.length)} phụ huynh (còn {sorted.length - phoneRows.length})
        </button>
      )}

      <Toast message={message} />

      <Modal open={creating} title="Thêm phụ huynh" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setCreating(false)} labelledBy="parent-create-title">
        <ParentForm mode="create" students={students} onDone={onDone} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal open={!!editing} title="Sửa phụ huynh" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setEditing(null)} labelledBy="parent-edit-title">
        {editing && <ParentForm mode="edit" parentId={editing.id} initial={editing.values} onDone={onDone} onCancel={() => setEditing(null)} />}
      </Modal>
      <Modal open={!!assigning} title={`Gán học sinh · ${assigning?.fullName ?? ''}`} subtitle="Học sinh đã liên kết được bỏ qua." onClose={() => setAssigning(null)} labelledBy="parent-assign-title">
        {assigning && <ParentAssignForm parentId={assigning.id} students={students} onDone={onDone} onCancel={() => setAssigning(null)} />}
      </Modal>

      {childEdit && editRow && editChild && (
        <ChildEditor
          parentId={editRow.id}
          parentName={editRow.fullName}
          child={editChild}
          anchor={childEdit.anchor}
          canManage={canManage}
          onClose={() => setChildEdit(null)}
        />
      )}

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

// Thẻ dưới 1200px: không avatar, học sinh căn thành cột (tên, quan hệ, liên hệ chính), ghi chú, hàng nút có chữ
function ParentCard({
  row,
  canManage,
  onEdit,
  onDelete,
  onTelegram,
  onAssign,
}: {
  row: ParentRow;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTelegram: () => void;
  onAssign: () => void;
}) {
  return (
    <Card>
      <div className="min-w-0">
        <b className="block break-words text-base text-ink">{row.fullName}</b>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1.5 text-base text-link underline underline-offset-2">
            <Phone className="size-3.5" aria-hidden />
            {row.phone}
          </a>
          <ZaloLink phone={row.phone} name={row.fullName} variant="link" />
        </div>
        {row.email && <small className="block break-words text-sm text-muted">{row.email}</small>}
        {row.telegramLinked && <small className="block text-xs text-muted">Đã kết nối Telegram</small>}
      </div>
      {row.children.length === 0 ? (
        <small className="text-sm text-muted">Chưa liên kết học sinh nào</small>
      ) : (
        <ul className="grid grid-cols-[minmax(0,max-content)_auto] justify-start gap-x-3 gap-y-1.5" aria-label={`Học sinh của ${row.fullName}`}>
          {row.children.map((c) => (
            <li key={c.studentId} className="contents">
              <Link href={`/hoc-sinh/${c.studentId}`} className="min-w-0 break-words text-base text-link underline underline-offset-2">
                {c.studentName}
              </Link>
              <span className="inline-flex items-center gap-1 text-sm text-relation">
                {relationText(c)}
                {c.isPrimary && (
                  <>
                    <Check className="size-3.5" aria-hidden />
                    <span className="sr-only">liên hệ chính</span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {/* "+ Gán học sinh" là liên kết ngay dưới danh sách con, giống ô "+ Thêm" trên bảng; hàng nút chỉ còn Sửa, Xoá, Telegram (DESIGN.md mục 74) */}
      {canManage && (
        <button type="button" onClick={onAssign} className="inline-flex min-h-[var(--ctl-h-touch)] items-center gap-1.5 self-start text-base text-link underline underline-offset-2">
          <UserPlus className="size-4" aria-hidden />
          Gán học sinh
        </button>
      )}
      {row.note && <p className="break-words text-sm text-ink-2">{row.note}</p>}
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

// Phụ huynh có nhiều con hơn số cột học sinh: bấm để xem đủ tên (không dựa vào rê chuột nên dùng được trên cảm ứng)
function MoreChildren({ names }: { names: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink">
        {open ? 'Ẩn bớt' : `+${names.length} học sinh khác`}
      </button>
      {open && (
        <ul className="flex flex-col gap-0.5 text-sm text-ink-2">
          {names.map((n, i) => (
            <li key={`${i}-${n}`}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
