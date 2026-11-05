'use client';

// Màn Phụ huynh chuẩn CRM hiện đại (Linear / Attio):
// - Thanh lọc phân đoạn ngay trên đầu bảng: Tất cả · Đã nối Telegram · Chưa nối · Nhiều con.
// - 5 cột CRM giàu thông tin, không còn các cột Học sinh 1/2/3/Email trống trải:
//   Phụ huynh (kèm email phụ nếu có) · Liên hệ (SĐT + chip Zalo) · Con đang học (gom chung 1 cột dạng chip tương tác) · Telegram · Ghi chú.
import {
  CheckIcon,
  CommentDiscussionIcon,
  DeviceMobileIcon,
  MailIcon,
  PaperAirplaneIcon,
  PencilIcon,
  PersonAddIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from '@primer/octicons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition, type MouseEvent } from 'react';
import {
  deleteParentAction,
  loadParentForm,
  updateParentFieldAction,
  type ParentFormValues,
} from '@/app/(app)/phu-huynh/actions';
import { createParentLinkAction } from '@/app/(app)/tin-nhan/actions';
import { TelegramLinkDialog } from '@/components/telegram/TelegramLinkDialog';
import type { ParentRow, StudentChoice } from '@/lib/queries/parents';
import { PARENT_RELATION_LABELS } from '@/lib/parent-labels';
import { formatPhone, normalizeSearch } from '@/lib/text';
import { sortRows } from '@/lib/sort';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { PageCrumbs } from '@/components/shell/PageCrumbs';
import { InitialBadge, Pill } from '@/components/ui/primitives';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
import { DataGrid, type GridColumn, type GridSort } from '@/components/ui/datagrid';
import { TextInput } from '@/components-ui';
import { Btn } from '@/components/ui/Btn';
import { Chip, ChipGroup, Pagination } from '@/components/ui/controls';
import { ZaloLink } from '@/components/ui/ZaloLink';
import { ChildEditor } from './ChildEditor';
import { InlineText } from './InlineText';
import { ParentAssignForm } from './ParentAssignForm';
import { ParentForm } from './ParentForm';

const PAGE_SIZE = 10;
const NO_RIGHT = 'Không có quyền quản lý phụ huynh';

type Child = ParentRow['children'][number];
type ParentFilter = 'all' | 'linked' | 'unlinked' | 'multi';

const CHILD_DOT_COLORS = [
  'bg-[#ea580c]',
  'bg-[#2563eb]',
  'bg-[#16a34a]',
  'bg-[#7c3aed]',
  'bg-[#0891b2]',
  'bg-[#db2777]',
] as const;

const COLUMNS: GridColumn<ParentRow>[] = [
  { key: 'fullName', label: 'Phụ huynh', width: '228px', sortable: true, sortValue: (r) => r.fullName },
  { key: 'phone', label: 'Liên hệ', width: '184px', sortable: true, sortValue: (r) => r.phone },
  {
    key: 'children',
    label: 'Con đang học',
    width: 'minmax(360px,1fr)',
    sortable: true,
    sortValue: (r) => r.children.length,
  },
  {
    key: 'telegram',
    label: 'Telegram',
    width: '148px',
    sortable: true,
    sortValue: (r) => (r.telegramLinked ? 1 : 0),
  },
  { key: 'note', label: 'Ghi chú', width: '156px', sortable: true, sortValue: (r) => r.note },
  { key: 'actions', label: 'Thao tác', width: '44px', align: 'end', srOnly: true },
];

function relationText(c: Child): string {
  return PARENT_RELATION_LABELS[c.relation];
}

export function ParentList(props: { parents: ParentRow[]; students?: StudentChoice[]; canManage: boolean }) {
  const { parents, students = [], canManage } = props;
  const router = useRouter();
  const [q, setQ] = useState('');
  const [segment, setSegment] = useState<ParentFilter>('all');
  const [page, setPage] = useState(1);
  const [phoneCount, setPhoneCount] = useState(PAGE_SIZE);
  const [sort, setSort] = useState<GridSort | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ id: number; values: ParentFormValues } | null>(null);
  const [toDelete, setToDelete] = useState<ParentRow | null>(null);
  const [telegramFor, setTelegramFor] = useState<ParentRow | null>(null);
  const [assigning, setAssigning] = useState<ParentRow | null>(null);
  const [childEdit, setChildEdit] = useState<{ parentId: number; studentId: number; anchor: DOMRect } | null>(null);
  const { message, notify } = useToast();
  const [pending, startTransition] = useTransition();

  const counts = useMemo(() => {
    let linked = 0;
    let multi = 0;
    for (const p of parents) {
      if (p.telegramLinked) linked++;
      if (p.children.length >= 2) multi++;
    }
    return {
      all: parents.length,
      linked,
      unlinked: parents.length - linked,
      multi,
    };
  }, [parents]);

  const needle = normalizeSearch(q);
  const shown = useMemo(() => {
    return parents.filter((p) => {
      if (segment === 'linked' && !p.telegramLinked) return false;
      if (segment === 'unlinked' && p.telegramLinked) return false;
      if (segment === 'multi' && p.children.length < 2) return false;
      if (!needle) return true;
      return normalizeSearch(`${p.fullName} ${p.phone} ${p.email} ${p.note} ${p.children.map((c) => c.studentName).join(' ')}`).includes(needle);
    });
  }, [parents, segment, needle]);

  const sorted = useMemo(() => {
    if (!sort) return shown;
    const col = COLUMNS.find((c) => c.key === sort.column);
    return sortRows(shown, sort.column, sort.direction, col?.sortValue);
  }, [shown, sort]);

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

  const selectSegment = useCallback((next: ParentFilter) => {
    setSegment(next);
    setPage(1);
    setPhoneCount(PAGE_SIZE);
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
    { kind: 'action', label: 'Gán học sinh', icon: PersonAddIcon, onSelect: () => setAssigning(row), disabled: !canManage, disabledHint: NO_RIGHT },
    { kind: 'action', label: 'Sửa', icon: PencilIcon, onSelect: () => openEdit(row), disabled: !canManage, disabledHint: NO_RIGHT },
    { kind: 'action', label: 'Kết nối Telegram', icon: PaperAirplaneIcon, onSelect: () => setTelegramFor(row), disabled: !canManage, disabledHint: NO_RIGHT },
    { kind: 'action', label: 'Xoá', icon: TrashIcon, danger: true, onSelect: () => setToDelete(row), disabled: !canManage, disabledHint: NO_RIGHT },
  ];

  const deleteText = toDelete
    ? toDelete.children.length > 0
      ? `${toDelete.fullName} sẽ bị xoá khỏi ${toDelete.children.length} học sinh (${toDelete.children.map((c) => c.studentName).join(', ')}). Học sinh vẫn được giữ lại.`
      : `${toDelete.fullName} sẽ bị xoá. Không có học sinh nào liên kết.`
    : '';

  const renderChildrenCell = (row: ParentRow) => {
    const kids = row.children;
    if (kids.length === 0) {
      return canManage ? (
        <button
          type="button"
          data-link="true"
          aria-label="+ Thêm"
          onClick={() => setAssigning(row)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-[6px] border border-dashed border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-2 py-1 text-xs font-medium text-[var(--fgColor-muted)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]/50 hover:text-[var(--primary-deep)]"
        >
          <PlusIcon size={12} aria-hidden />
          <span>Gán học sinh</span>
        </button>
      ) : (
        <span className="text-xs text-[var(--fgColor-muted)]">Chưa gán học sinh</span>
      );
    }

    return (
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {kids.map((child) => {
          const dotColor = CHILD_DOT_COLORS[Math.abs(child.studentId) % CHILD_DOT_COLORS.length];
          return (
            <button
              key={child.studentId}
              type="button"
              data-link="true"
              onClick={(e: MouseEvent<HTMLButtonElement>) =>
                setChildEdit({ parentId: row.id, studentId: child.studentId, anchor: e.currentTarget.getBoundingClientRect() })
              }
              aria-label={`Sửa ${child.studentName}, ${relationText(child)}${child.isPrimary ? ', liên hệ chính' : ''}`}
              className="group/kid inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-[6px] border border-[var(--borderColor-default)] bg-[#f8fafc] px-2 py-0.5 text-left transition-all hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]/55 dark:bg-[var(--bgColor-muted)]"
            >
              <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${dotColor}`} />
              <span className="truncate text-[12.5px] font-semibold text-[var(--fgColor-default)] group-hover/kid:text-[var(--primary-deep)]">
                {child.studentName}
              </span>
              <span className="shrink-0 rounded-[4px] bg-black/[0.045] px-1 py-0 text-[10.5px] font-medium text-[var(--ink-2)] dark:bg-white/[0.08]">
                {relationText(child)}
              </span>
              {child.isPrimary && (
                <CheckIcon size={11} className="shrink-0 text-[#16a34a] dark:text-[#3fb950]" aria-hidden />
              )}
            </button>
          );
        })}
        {canManage && (
          <button
            type="button"
            data-link="true"
            aria-label="+ Thêm"
            onClick={() => setAssigning(row)}
            className="inline-flex cursor-pointer items-center gap-0.5 rounded-[5px] border border-dashed border-[var(--borderColor-default)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--fgColor-muted)] opacity-0 transition-all hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-deep)] focus-visible:opacity-100 group-hover:opacity-100"
          >
            <PlusIcon size={11} aria-hidden />
            <span>Thêm</span>
          </button>
        )}
      </div>
    );
  };

  const cell = (row: ParentRow, key: string) => {
    switch (key) {
      case 'fullName':
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <InitialBadge name={row.fullName} seed={row.id} />
            <div className="min-w-0 flex-1">
              <InlineText
                value={row.fullName}
                label="họ tên"
                placeholder="Thêm họ tên"
                canEdit={canManage}
                className="text-[13.5px] font-semibold text-[var(--fgColor-default)]"
                onSave={(next) => updateParentFieldAction(row.id, 'fullName', next)}
              />
              {row.email.trim() !== '' && (
                <span className="flex min-w-0 items-center gap-1 text-[11.5px] text-[var(--fgColor-muted)]" title={row.email}>
                  <MailIcon size={11} className="shrink-0 opacity-75" aria-hidden />
                  <span className="truncate">{row.email}</span>
                </span>
              )}
            </div>
          </div>
        );
      case 'phone':
        return canManage ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <DeviceMobileIcon size={13} className="shrink-0 text-[var(--fgColor-muted)]" aria-hidden />
            <InlineText
              value={row.phone}
              label="số điện thoại"
              placeholder="Thêm SĐT"
              inputType="tel"
              canEdit
              className="font-mono text-[13px] font-medium tabular-nums text-[var(--fgColor-default)]"
              onSave={(next) => updateParentFieldAction(row.id, 'phone', next)}
            />
            <ZaloLink phone={row.phone} name={row.fullName} variant="link" />
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-1.5">
            <DeviceMobileIcon size={13} className="shrink-0 text-[var(--fgColor-muted)]" aria-hidden />
            <a
              href={`tel:${row.phone}`}
              data-link="true"
              className="font-mono text-[13px] font-medium tabular-nums text-[var(--fgColor-default)] no-underline transition-colors hover:text-[var(--primary)]"
            >
              {formatPhone(row.phone)}
            </a>
            <ZaloLink phone={row.phone} name={row.fullName} variant="link" />
          </div>
        );
      case 'children':
        return renderChildrenCell(row);
      case 'telegram':
        if (row.telegramLinked) {
          return (
            <div className="flex items-center gap-1.5">
              <Pill tone="mint">Đã kết nối</Pill>
              <Link
                href={`/tin-nhan?p=${row.id}`}
                data-link="true"
                aria-label={`Nhắn Telegram với ${row.fullName}`}
                title="Mở hội thoại Telegram"
                className="inline-flex size-6 items-center justify-center rounded-[5px] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--ink-2)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-deep)]"
              >
                <CommentDiscussionIcon size={12} aria-hidden />
              </Link>
            </div>
          );
        }
        return canManage ? (
          <button
            type="button"
            data-link="true"
            onClick={() => setTelegramFor(row)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-[5px] border border-[var(--borderColor-default)] bg-[#f8fafc] px-2 py-1 text-xs font-medium text-[var(--ink-2)] transition-colors hover:border-[#0284c7] hover:bg-[#f0f9ff] hover:text-[#0369a1] dark:bg-[var(--bgColor-muted)] dark:hover:border-[#38bdf8] dark:hover:bg-[#082f49] dark:hover:text-[#7dd3fc]"
          >
            <PaperAirplaneIcon size={11} aria-hidden />
            <span>Tạo mã nối</span>
          </button>
        ) : (
          <Pill tone="stone">Chưa nối</Pill>
        );
      case 'note':
        return (
          <InlineText
            value={row.note}
            label="ghi chú"
            placeholder="Ghi chú"
            multiline
            canEdit={canManage}
            className="text-xs leading-tight text-[var(--ink-2)]"
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

  const empty = <EmptyPanel title="Không có phụ huynh phù hợp" hint="Thử đổi bộ lọc, từ khoá khác hoặc thêm phụ huynh mới." />;

  const editRow = childEdit ? parents.find((p) => p.id === childEdit.parentId) : undefined;
  const editChild = childEdit ? editRow?.children.find((c) => c.studentId === childEdit.studentId) : undefined;

  const filterTabs = (
    <ChipGroup label="Lọc phụ huynh">
      <Chip selected={segment === 'all'} count={counts.all} onClick={() => selectSegment('all')}>
        Tất cả
      </Chip>
      <Chip selected={segment === 'linked'} count={counts.linked} onClick={() => selectSegment('linked')}>
        Đã nối Telegram
      </Chip>
      <Chip selected={segment === 'unlinked'} count={counts.unlinked} onClick={() => selectSegment('unlinked')}>
        Chưa nối
      </Chip>
      <Chip selected={segment === 'multi'} count={counts.multi} onClick={() => selectSegment('multi')}>
        Nhiều con
      </Chip>
    </ChipGroup>
  );

  const toolbarActions = (
    <>
      <div className="w-60 max-w-full">
        <label htmlFor="parent-search" className="sr-only">
          Tìm phụ huynh
        </label>
        <TextInput
          block
          id="parent-search"
          type="search"
          leadingVisual={SearchIcon}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
            setPhoneCount(PAGE_SIZE);
          }}
          placeholder="Tìm tên, SĐT hoặc tên con…"
          autoComplete="off"
          className="[&::-webkit-search-cancel-button]:hidden"
        />
      </div>
      {canManage && (
        <Btn variant="primary" leadingVisual={PlusIcon} onClick={() => setCreating(true)} className="shrink-0">
          Thêm phụ huynh
        </Btn>
      )}
    </>
  );

  return (
    <section className="flex flex-col min-[768px]:min-h-0 min-[768px]:flex-1">
      <PageCrumbs crumbs={['Đào tạo', 'Phụ huynh']} />
      <h1 className="mb-1 text-lg font-semibold text-[var(--fgColor-default)] min-[768px]:sr-only">Phụ huynh</h1>

      <div className="mb-2.5 flex flex-col gap-2 min-[768px]:hidden">
        <div className="flex items-center gap-2">{toolbarActions}</div>
        <div className="overflow-x-auto pb-0.5">{filterTabs}</div>
        <p className="text-xs text-[var(--fgColor-muted)]">
          {sorted.length === 0 ? 'Không có phụ huynh phù hợp.' : `Đang hiển thị ${phoneRows.length} trên ${sorted.length} phụ huynh`}
        </p>
      </div>

      {/* Từ 768px: Bảng CRM 1 dòng công cụ gọn (bộ lọc phân đoạn bên trái + tìm kiếm & Thêm phụ huynh bên phải). */}
      <div className="hidden min-[768px]:flex min-[768px]:min-h-0 min-[768px]:flex-1 min-[768px]:flex-col">
        <DataGrid
          label="Danh sách phụ huynh"
          columns={COLUMNS}
          rows={pagedRows}
          rowKey={(r) => r.id}
          cell={cell}
          from="md"
          fill
          stickyEnd
          sort={sort}
          onSort={handleSort}
          title={filterTabs}
          actionComponent={toolbarActions}
          empty={empty}
          footer={
            pageCount > 1 ? (
              <Pagination page={currentPage} pageCount={pageCount} totalCount={sorted.length} onPage={setPage} label="Phân trang" />
            ) : undefined
          }
        />
      </div>

      {/* Điện thoại: thẻ CRM gọn đẹp, bấm Xem thêm để tiếp */}
      <div className="flex flex-col gap-3 min-[768px]:hidden">
        {sorted.length === 0 ? empty : phoneRows.map((row) => <div key={row.id}>{card(row)}</div>)}
      </div>
      {hasMorePhone && (
        <Btn block onClick={() => setPhoneCount((n) => n + PAGE_SIZE)} className="mt-3 min-[768px]:hidden">
          Xem thêm {Math.min(PAGE_SIZE, sorted.length - phoneRows.length)} phụ huynh (còn {sorted.length - phoneRows.length})
        </Btn>
      )}

      <Toast message={message} />

      <Modal
        open={creating}
        size="md"
        title="Thêm phụ huynh"
        subtitle="Nhập thông tin liên hệ và gán học sinh đang theo học (nếu có). Các trường có dấu * là bắt buộc."
        onClose={() => setCreating(false)}
        labelledBy="parent-create-title"
      >
        <ParentForm mode="create" students={students} onDone={onDone} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal
        open={!!editing}
        size="md"
        title="Sửa phụ huynh"
        subtitle="Cập nhật họ tên, số điện thoại, email hoặc ghi chú liên hệ. Các trường có dấu * là bắt buộc."
        onClose={() => setEditing(null)}
        labelledBy="parent-edit-title"
      >
        {editing && <ParentForm mode="edit" parentId={editing.id} initial={editing.values} onDone={onDone} onCancel={() => setEditing(null)} />}
      </Modal>
      <Modal
        open={!!assigning}
        size="md"
        title={`Gán học sinh · ${assigning?.fullName ?? ''}`}
        subtitle="Chọn một hoặc nhiều học sinh để liên kết. Học sinh đã liên kết được bỏ qua."
        onClose={() => setAssigning(null)}
        labelledBy="parent-assign-title"
      >
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
      <div className="flex items-start gap-3">
        <InitialBadge name={row.fullName} seed={row.id} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <b className="min-w-0 break-words text-sm font-semibold text-[var(--fgColor-default)]">{row.fullName}</b>
            <Pill tone={row.telegramLinked ? 'mint' : 'stone'}>
              {row.telegramLinked ? 'Đã nối Telegram' : 'Chưa nối'}
            </Pill>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <a
              href={`tel:${row.phone}`}
              data-link="true"
              className="inline-flex items-center gap-1.5 font-mono text-[13px] font-medium tabular-nums text-[var(--fgColor-default)] hover:text-[var(--primary)]"
            >
              <DeviceMobileIcon size={14} className="text-[var(--fgColor-muted)]" aria-hidden />
              {formatPhone(row.phone)}
            </a>
            <ZaloLink phone={row.phone} name={row.fullName} variant="link" />
          </div>
          {row.email && <small className="mt-0.5 block break-words text-xs text-[var(--fgColor-muted)]">{row.email}</small>}
        </div>
      </div>

      {row.children.length === 0 ? (
        <small className="text-xs text-[var(--fgColor-muted)]">Chưa liên kết học sinh nào</small>
      ) : (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label={`Học sinh của ${row.fullName}`}>
          {row.children.map((c) => (
            <li
              key={c.studentId}
              className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--borderColor-default)] bg-[#f8fafc] px-2.5 py-1 dark:bg-[var(--bgColor-muted)]"
            >
              <Link
                href={`/hoc-sinh/${c.studentId}`}
                data-link="true"
                className="min-w-0 break-words text-[13px] font-semibold text-[var(--fgColor-default)] no-underline transition-colors hover:text-[var(--primary)]"
              >
                {c.studentName}
              </Link>
              <span className="inline-flex items-center gap-1 text-xs text-[var(--ink-2)]">
                <span className="rounded-[4px] bg-black/[0.045] px-1.5 py-0 text-[11px] font-medium text-[var(--ink-2)] dark:bg-white/[0.08]">
                  {relationText(c)}
                </span>
                {c.isPrimary && (
                  <>
                    <CheckIcon size={12} className="text-[#16a34a] dark:text-[#3fb950]" aria-hidden />
                    <span className="sr-only">liên hệ chính</span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <button
          type="button"
          data-link="true"
          onClick={onAssign}
          className="inline-flex min-h-[var(--ctl-h)] items-center gap-1.5 self-start text-sm font-medium text-[var(--primary-deep)] hover:underline max-[767px]:min-h-[var(--ctl-h-touch)]"
        >
          <PersonAddIcon size={16} aria-hidden />
          Gán học sinh
        </button>
      )}
      {row.note && <p className="m-0 break-words text-sm text-[var(--fgColor-muted)]">{row.note}</p>}
      <div className="grid grid-cols-3 gap-2">
        <Btn block leadingVisual={PencilIcon} onClick={onEdit} disabled={!canManage}>
          Sửa
        </Btn>
        <Btn block variant="danger" leadingVisual={TrashIcon} onClick={onDelete} disabled={!canManage}>
          Xoá
        </Btn>
        <Btn block leadingVisual={PaperAirplaneIcon} onClick={onTelegram} disabled={!canManage}>
          Telegram
        </Btn>
      </div>
    </Card>
  );
}
