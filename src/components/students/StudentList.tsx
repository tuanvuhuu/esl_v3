'use client';

import { EyeIcon, PencilIcon, TrashIcon } from '@primer/octicons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition, type ReactNode } from 'react';
import { deleteStudentAction, loadStudentForm, type StudentFormValues } from '@/app/(app)/hoc-sinh/actions';
import type { StudentRow } from '@/lib/queries/students';
import { formatVND, formatVNDShort } from '@/lib/money';
import { studentsHref } from '@/lib/student-url';
import { PageCrumbs } from '@/components/shell/PageCrumbs';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Btn, BTN_BASE, BTN_GHOST } from '@/components/ui/Btn';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { Pagination } from '@/components/ui/controls';
import { Modal } from '@/components/ui/Modal';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { Pill, ProgressBar, type Tone } from '@/components/ui/primitives';
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { StudentFilters, StudentStatusTabs, StudentToolbarActions, type FilterState } from './StudentFilters';
import { StudentForm, type CampusChoice, type ClassOption, type ParentChoice } from './StudentForm';
import { Toast } from '@/components/ui/Toast';

const PAGE_SIZE = 15;

const STATUS_META: Record<StudentRow['status'], { label: string; tone: Tone }> = {
  active: { label: 'Đang học', tone: 'mint' },
  trial: { label: 'Học thử', tone: 'lav' },
  paused: { label: 'Bảo lưu', tone: 'stone' },
  finished: { label: 'Đã nghỉ', tone: 'blush' },
};

const TUITION_META: Record<StudentRow['tuition'], { label: string; tone: Tone }> = {
  paid: { label: 'Đã đóng', tone: 'mint' },
  partial: { label: 'Còn nợ', tone: 'butter' },
  unpaid: { label: 'Chưa đóng', tone: 'blush' },
};

// Cột của bảng máy tính, mỗi thông tin một cột riêng (không avatar). Độ rộng là lưới CSS, dùng chung cho tiêu đề và mọi dòng.
const COLUMNS: GridColumn[] = [
  { key: 'name', label: 'Họ tên', width: 'minmax(140px,1.25fr)', sortable: true },
  { key: 'code', label: 'Mã HS', width: '92px', sortable: true },
  { key: 'gender', label: 'Giới tính', width: '94px', sortable: true },
  { key: 'class', label: 'Lớp & giáo viên', width: 'minmax(148px,1.35fr)', sortable: true },
  { key: 'progress', label: 'Tiến độ', width: 'minmax(136px,1.15fr)', sortable: true },
  { key: 'attendance', label: 'Chuyên cần', width: '110px', sortable: true },
  { key: 'tuition', label: 'Học phí', width: 'minmax(176px,1.55fr)', sortable: true },
  { key: 'status', label: 'Trạng thái', width: '104px', sortable: true },
  { key: 'actions', label: 'Thao tác', width: '40px', align: 'end', srOnly: true },
];

type Props = {
  rows: StudentRow[]; // trang hiện tại, dùng cho bảng máy tính và thẻ máy tính bảng
  phoneRows: StudentRow[]; // tất cả học sinh đã tải tới lúc này, dùng cho điện thoại (Xem thêm)
  total: number;
  page: number;
  pageCount: number;
  loadedPages: number;
  filters: FilterState;
  classes: ClassOption[]; // lớp cho bộ lọc, theo cơ sở đang xem
  formClasses: ClassOption[]; // mọi lớp kèm cơ sở, cho form học sinh (form tự lọc theo cơ sở chọn)
  campuses: CampusChoice[];
  defaultCampusId: number;
  parents: ParentChoice[];
  statusCounts: Record<string, number>;
  canEdit: boolean;
  canDelete: boolean;
  drawer?: ReactNode; // hồ sơ học sinh đang mở trong ngăn kéo (máy tính), dựng sẵn trên server
};

export function StudentList({
  rows,
  phoneRows,
  total,
  page,
  pageCount,
  loadedPages,
  filters,
  classes,
  formClasses,
  campuses,
  defaultCampusId,
  parents,
  statusCounts,
  canEdit,
  canDelete,
  drawer,
}: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ id: number; values: StudentFormValues } | null>(null);
  const [toDelete, setToDelete] = useState<StudentRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Thông báo tự tắt sau vài giây
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 3200);
    return () => window.clearTimeout(t);
  }, [message]);

  const onDone = useCallback((text: string) => {
    setCreating(false);
    setEditing(null);
    setMessage(text);
    router.refresh();
  }, [router]);

  function openEdit(row: StudentRow) {
    startTransition(async () => {
      const result = await loadStudentForm(row.id);
      if (!result.ok) return setMessage(result.message);
      setEditing({ id: row.id, values: result.values });
    });
  }

  function confirmDelete() {
    if (!toDelete) return;
    const id = toDelete.id;
    startTransition(async () => {
      const result = await deleteStudentAction(id);
      setToDelete(null);
      setMessage(result.message ?? (result.ok ? 'Đã xoá' : 'Không xoá được'));
      router.refresh();
    });
  }

  // Máy tính mở hồ sơ trong ngăn kéo, giữ nguyên bộ lọc và trang. Điện thoại vẫn mở trang riêng (thẻ có nút Xem).
  const profileHref = (id: number) => studentsHref({ ...filters, p: page, n: loadedPages, h: String(id) });

  const rowItems = (row: StudentRow): RowMenuItem[] => [
    { kind: 'link', href: profileHref(row.id), label: 'Xem hồ sơ', icon: EyeIcon },
    { kind: 'action', label: 'Sửa', icon: PencilIcon, onSelect: () => openEdit(row), disabled: !canEdit, disabledHint: 'Không có quyền sửa' },
    { kind: 'action', label: 'Xoá', icon: TrashIcon, danger: true, onSelect: () => setToDelete(row), disabled: !canDelete, disabledHint: 'Không có quyền xoá' },
  ];

  const hasMorePhone = phoneRows.length < total;

  // Ô của bảng máy tính theo cột
  const cell = (row: StudentRow, key: string): ReactNode => {
    switch (key) {
      case 'name':
        return (
          <Link href={profileHref(row.id)} scroll={false} className="block truncate text-sm font-normal text-[var(--fgColor-link)] hover:underline">
            {row.fullName}
          </Link>
        );
      case 'code':
        return <span className="block truncate text-sm text-[var(--fgColor-muted)]">{row.code}</span>;
      case 'gender':
        return <span className="block truncate text-sm text-[var(--fgColor-muted)]">{row.gender === 'female' ? 'Nữ' : 'Nam'}</span>;
      case 'class':
        return (
          <div className="truncate text-xs" title={row.teacherName ? `${row.className} · ${row.teacherName}` : row.className}>
            <span className="text-sm text-[var(--fgColor-default)]">{row.className}</span>
            {row.teacherName && <span className="text-[var(--fgColor-muted)]"> · {row.teacherName}</span>}
          </div>
        );
      case 'progress':
        return (
          <div className="flex min-w-0 items-center gap-2">
            <ProgressBar value={row.sessionsDone} max={row.sessionsTotal} className="w-16 shrink-0" />
            <span className="truncate text-xs tabular-nums text-[var(--fgColor-muted)]">
              {row.sessionsDone}/{row.sessionsTotal} buổi
            </span>
          </div>
        );
      case 'attendance':
        return (
          <span className={`text-sm font-normal tabular-nums ${row.attendanceRate >= 75 ? 'text-[var(--fgColor-default)]' : 'text-[var(--fgColor-danger)]'}`}>
            {row.attendanceRate}%
          </span>
        );
      case 'tuition': {
        const summary = [
          row.sessionsLeft >= 0 ? `Còn ${row.sessionsLeft}/${row.sessionsBought} buổi đã đóng` : `Nợ ${-row.sessionsLeft} buổi`,
          row.debt > 0 ? `Thiếu ${formatVND(row.debt)}` : '',
          row.discount > 0 ? `Giảm trừ ${formatVND(row.discount)}` : '',
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <div className="flex min-w-0 items-center gap-1.5" title={summary}>
            <Pill tone={TUITION_META[row.tuition].tone}>{TUITION_META[row.tuition].label}</Pill>
            <span className="truncate text-xs tabular-nums text-[var(--fgColor-muted)]">
              {row.sessionsLeft >= 0 ? `${row.sessionsLeft}/${row.sessionsBought} buổi` : `Nợ ${-row.sessionsLeft} buổi`}
              {row.debt > 0 ? ` · -${formatVNDShort(row.debt)}` : ''}
            </span>
          </div>
        );
      }
      case 'status':
        return <Pill tone={STATUS_META[row.status].tone}>{STATUS_META[row.status].label}</Pill>;
      case 'actions':
        return <RowMenu label={`Thao tác với ${row.fullName}`} items={rowItems(row)} />;
      default:
        return null;
    }
  };

  const empty = (
    <EmptyPanel title="Không tìm thấy học sinh phù hợp" hint="Thử đổi từ khoá hoặc bỏ bớt bộ lọc." />
  );

  return (
    <section className="flex flex-col">
      <PageCrumbs crumbs={['Đào tạo', 'Học sinh']} />
      <h1 className="mb-1 text-lg font-semibold text-[var(--fgColor-default)] min-[768px]:sr-only">Học sinh</h1>

      <StudentFilters current={filters} classes={classes} statusCounts={statusCounts} onAdd={canEdit ? () => setCreating(true) : undefined} />

      <p className="mb-2 text-xs text-[var(--fgColor-muted)] min-[768px]:hidden">
        {total === 0 ? 'Không có học sinh phù hợp.' : `Đang hiển thị ${phoneRows.length} trên ${total} học sinh`}
      </p>

      {/* Máy tính (từ 1200px): DataGrid tích hợp 1 dòng công cụ gọn (chip trạng thái + bộ lọc & nút Thêm học sinh trong actionComponent). */}
      <div className="hidden min-[768px]:flex min-[768px]:flex-col">
        <DataGrid
          label="Danh sách học sinh"
          columns={COLUMNS}
          rows={rows}
          rowKey={(r) => r.id}
          cell={cell}
          cardsFrom="md"
          fill
          from="xl"
          title={<StudentStatusTabs current={filters} statusCounts={statusCounts} />}
          actionComponent={
            <StudentToolbarActions
              current={filters}
              classes={classes}
              onAdd={canEdit ? () => setCreating(true) : undefined}
            />
          }
          empty={empty}
          card={(row) => (
            <StudentCard row={row} viewHref={profileHref(row.id)} canEdit={canEdit} canDelete={canDelete} onEdit={() => openEdit(row)} onDelete={() => setToDelete(row)} />
          )}
          footer={
            <Pagination page={page} pageCount={pageCount} pageSize={PAGE_SIZE} totalCount={total} hrefFor={(p) => studentsHref({ ...filters, p })} label="Phân trang" />
          }
        />
      </div>

      {/* Điện thoại: thẻ, bấm Xem thêm để tải tiếp */}
      <div className="flex flex-col gap-3 min-[768px]:hidden">
        {phoneRows.length === 0 ? (
          empty
        ) : (
          phoneRows.map((row) => <StudentCard key={row.id} row={row} viewHref={`/hoc-sinh/${row.id}`} canEdit={canEdit} canDelete={canDelete} onEdit={() => openEdit(row)} onDelete={() => setToDelete(row)} />)
        )}
      </div>
      {hasMorePhone && (
        <Link href={studentsHref({ ...filters, n: loadedPages + 1 })} scroll={false} className={`${BTN_BASE} ${BTN_GHOST} mt-3 w-full min-[768px]:hidden`}>
          Xem thêm {Math.min(PAGE_SIZE, total - phoneRows.length)} học sinh (còn {total - phoneRows.length})
        </Link>
      )}

      {/* Ngăn kéo hồ sơ (máy tính, từ 768px). Nội dung do máy chủ dựng khi có ?h= */}
      {drawer && (
        <aside
          aria-label="Hồ sơ học sinh"
          className="fixed inset-y-0 right-0 z-[65] hidden w-[min(560px,100%)] overflow-y-auto border-l border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-5 shadow-[var(--shadow-floating-large,var(--lift))] min-[768px]:block"
        >
          {drawer}
        </aside>
      )}

      <Toast message={message} />

      <Modal open={creating} title="Thêm học sinh mới" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setCreating(false)} labelledBy="create-title">
        <StudentForm
          mode="create"
          classes={formClasses}
          campuses={campuses}
          defaultCampusId={defaultCampusId}
          parents={parents}
          onDone={onDone}
          onCancel={() => setCreating(false)}
        />
      </Modal>

      <Modal open={!!editing} title="Sửa thông tin học sinh" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setEditing(null)} labelledBy="edit-title">
        {editing && (
          <StudentForm
            mode="edit"
            studentId={editing.id}
            initial={editing.values}
            classes={formClasses}
            campuses={campuses}
            defaultCampusId={defaultCampusId}
            parents={parents}
            onDone={onDone}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Xoá học sinh này?"
        text={toDelete ? `${toDelete.fullName} (${toDelete.code}) sẽ bị xoá khỏi danh sách, kèm lịch sử điểm danh và học phí. Không thể hoàn tác.` : ''}
        confirmLabel="Xoá học sinh"
        pending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}

// Thẻ học sinh (máy tính bảng và điện thoại): tên và trạng thái, lớp, tiến độ, chuyên cần và học phí, hàng nút Xem, Sửa, Xoá
function StudentCard({
  row,
  viewHref,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  row: StudentRow;
  viewHref: string;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link href={viewHref} scroll={false} className="min-w-0 truncate text-sm font-semibold text-[var(--fgColor-link)] underline underline-offset-2">
            {row.fullName}
          </Link>
          <Pill tone={STATUS_META[row.status].tone}>{STATUS_META[row.status].label}</Pill>
        </div>
        <small className="block truncate text-xs text-[var(--fgColor-muted)]">{row.code} · {row.gender === 'female' ? 'Nữ' : 'Nam'}</small>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-[var(--borderRadius-medium)] bg-[var(--bgColor-muted)] px-3 py-2">
        <b className="text-sm font-semibold text-[var(--fgColor-default)]">{row.className}</b>
        <small className="truncate text-xs text-[var(--fgColor-muted)]">{row.teacherName}</small>
      </div>

      <div>
        <ProgressBar value={row.sessionsDone} max={row.sessionsTotal} />
        <small className="mt-1.5 block text-xs text-[var(--fgColor-muted)]">Đã học {row.sessionsDone}/{row.sessionsTotal} buổi</small>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className={`text-sm font-semibold tabular-nums ${row.attendanceRate >= 75 ? 'text-[var(--fgColor-default)]' : 'text-[var(--fgColor-danger)]'}`}>
            {row.attendanceRate}%
          </span>
          <small className="ml-1.5 text-xs text-[var(--fgColor-muted)]">chuyên cần</small>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Pill tone={TUITION_META[row.tuition].tone}>{TUITION_META[row.tuition].label}</Pill>
          <small className="text-xs text-[var(--fgColor-default)]">
            {row.sessionsLeft >= 0 ? `Còn ${row.sessionsLeft}/${row.sessionsBought} buổi đã đóng` : `Nợ ${-row.sessionsLeft} buổi`}
          </small>
          {row.debt > 0 && <small className="text-xs text-[var(--fgColor-muted)]">Thiếu {formatVNDShort(row.debt)}</small>}
          {row.discount > 0 && <small className="text-xs text-[var(--fgColor-muted)]">Giảm trừ {formatVNDShort(row.discount)}</small>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Link href={viewHref} scroll={false} className={`${BTN_BASE} ${BTN_GHOST} w-full`}>
          <EyeIcon size={16} aria-hidden />
          Xem
        </Link>
        <Btn block leadingVisual={PencilIcon} onClick={onEdit} disabled={!canEdit}>
          Sửa
        </Btn>
        <Btn block variant="danger" leadingVisual={TrashIcon} onClick={onDelete} disabled={!canDelete}>
          Xoá
        </Btn>
      </div>
    </Card>
  );
}
