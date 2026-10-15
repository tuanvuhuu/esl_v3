'use client';

import { Eye, Pencil, Trash2 } from 'lucide-react';
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
import { StudentFilters, type FilterState } from './StudentFilters';
import { StudentForm, type CampusChoice, type ClassOption, type ParentChoice } from './StudentForm';
import { Toast } from '@/components/ui/Toast';

const PAGE_SIZE = 8;

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
  { key: 'name', label: 'Họ tên', width: 'minmax(128px,1.6fr)', sortable: true },
  { key: 'code', label: 'Mã HS', width: 'minmax(72px,0.7fr)', sortable: true },
  { key: 'gender', label: 'Giới tính', width: 'minmax(74px,0.7fr)', sortable: true },
  { key: 'class', label: 'Lớp & giáo viên', width: 'minmax(110px,1.1fr)', sortable: true },
  { key: 'progress', label: 'Tiến độ', width: 'minmax(104px,1.2fr)', sortable: true },
  { key: 'attendance', label: 'Chuyên cần', width: 'minmax(88px,0.8fr)', sortable: true },
  { key: 'tuition', label: 'Học phí', width: 'minmax(110px,1.3fr)', sortable: true },
  { key: 'status', label: 'Trạng thái', width: 'minmax(96px,1fr)', sortable: true },
  { key: 'actions', label: 'Thao tác', width: '44px', align: 'end', srOnly: true },
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
    { kind: 'link', href: profileHref(row.id), label: 'Xem hồ sơ', icon: Eye },
    { kind: 'action', label: 'Sửa', icon: Pencil, onSelect: () => openEdit(row), disabled: !canEdit, disabledHint: 'Không có quyền sửa' },
    { kind: 'action', label: 'Xoá', icon: Trash2, danger: true, onSelect: () => setToDelete(row), disabled: !canDelete, disabledHint: 'Không có quyền xoá' },
  ];

  const hasMorePhone = phoneRows.length < total;

  // Ô của bảng máy tính theo cột
  const cell = (row: StudentRow, key: string): ReactNode => {
    switch (key) {
      case 'name':
        return (
          <Link href={profileHref(row.id)} scroll={false} className="block truncate text-base text-link underline underline-offset-2">
            {row.fullName}
          </Link>
        );
      case 'code':
        return <span className="block truncate text-sm text-ink-2">{row.code}</span>;
      case 'gender':
        return <span className="block truncate text-sm text-ink-2">{row.gender === 'female' ? 'Nữ' : 'Nam'}</span>;
      case 'class':
        return (
          <>
            <b className="block truncate text-base text-ink">{row.className}</b>
            <small className="block truncate text-xs text-muted">{row.teacherName}</small>
          </>
        );
      case 'progress':
        return (
          <>
            <ProgressBar value={row.sessionsDone} max={row.sessionsTotal} className="max-w-[140px]" />
            <small className="mt-1.5 block text-xs text-muted">{row.sessionsDone}/{row.sessionsTotal} buổi</small>
          </>
        );
      case 'attendance':
        return <span className={`text-md font-normal ${row.attendanceRate >= 75 ? 'text-ink' : 'text-blush-ink'}`}>{row.attendanceRate}%</span>;
      case 'tuition':
        return (
          <>
            <Pill tone={TUITION_META[row.tuition].tone}>{TUITION_META[row.tuition].label}</Pill>
            {row.debt > 0 && <small className="mt-1.5 block truncate text-xs text-muted">Thiếu {formatVND(row.debt)}</small>}
          </>
        );
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
    <section className="flex flex-col min-[1200px]:min-h-0 min-[1200px]:flex-1">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4 max-[767px]:mb-3">
        <div className="min-w-0">
          <PageCrumbs crumbs={['Đào tạo', 'Học sinh']} />
          {/* Từ 768px tên trang nằm trên thanh trên cùng (đường dẫn), nên tiêu đề chỉ còn cho trình đọc màn hình */}
          <h1 className="text-h1 font-extrabold leading-tight tracking-tight text-ink min-[768px]:sr-only">Học sinh</h1>
          <p className="mt-1 text-base text-muted max-[767px]:mt-1.5 max-[767px]:text-sm">Quản lý hồ sơ, tiến độ học và học phí của từng học viên.</p>
        </div>
      </header>

      <StudentFilters current={filters} classes={classes} statusCounts={statusCounts} onAdd={canEdit ? () => setCreating(true) : undefined} />

      <p className="mb-3 text-sm text-muted min-[768px]:hidden">
        {total === 0 ? 'Không có học sinh phù hợp.' : `Đang hiển thị ${phoneRows.length} trên ${total} học sinh`}
      </p>

      {/* Máy tính (từ 1200px): bảng 9 cột, thân bảng tự cuộn. Máy tính bảng (768–1199px): thẻ theo số trang. */}
      {rows.length === 0 ? (
        <div className="hidden min-[768px]:block">{empty}</div>
      ) : (
        <DataGrid
          label="Danh sách học sinh"
          columns={COLUMNS}
          rows={rows}
          rowKey={(r) => r.id}
          cell={cell}
          cardsFrom="md"
          fill
          from="xl"
          card={(row) => (
            <StudentCard row={row} viewHref={profileHref(row.id)} canEdit={canEdit} canDelete={canDelete} onEdit={() => openEdit(row)} onDelete={() => setToDelete(row)} />
          )}
          footer={
            <div className="hidden min-[768px]:block">
              <Pagination page={page} pageCount={pageCount} hrefFor={(p) => studentsHref({ ...filters, p })} label="Phân trang" />
            </div>
          }
        />
      )}

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
        <aside aria-label="Hồ sơ học sinh" className="fixed inset-y-0 right-0 z-[65] hidden w-[min(560px,100%)] overflow-y-auto border-l border-line bg-bg p-5 shadow-lift min-[768px]:block">
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
function StudentCard({ row, viewHref, canEdit, canDelete, onEdit, onDelete }: { row: StudentRow; viewHref: string; canEdit: boolean; canDelete: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link href={viewHref} scroll={false} className="min-w-0 truncate text-base text-link underline underline-offset-2">{row.fullName}</Link>
          <Pill tone={STATUS_META[row.status].tone}>{STATUS_META[row.status].label}</Pill>
        </div>
        <small className="block truncate text-xs text-muted">{row.code} · {row.gender === 'female' ? 'Nữ' : 'Nam'}</small>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-[var(--radius-ctl)] bg-bg px-3 py-2">
        <b className="text-base text-ink">{row.className}</b>
        <small className="truncate text-xs text-muted">{row.teacherName}</small>
      </div>

      <div>
        <ProgressBar value={row.sessionsDone} max={row.sessionsTotal} />
        <small className="mt-1.5 block text-xs text-muted">{row.sessionsDone}/{row.sessionsTotal} buổi</small>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className={`text-md font-normal ${row.attendanceRate >= 75 ? 'text-ink' : 'text-blush-ink'}`}>{row.attendanceRate}%</span>
          <small className="ml-1.5 text-xs text-muted">chuyên cần</small>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Pill tone={TUITION_META[row.tuition].tone}>{TUITION_META[row.tuition].label}</Pill>
          {row.debt > 0 && <small className="text-xs text-muted">Thiếu {formatVNDShort(row.debt)}</small>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Link href={viewHref} scroll={false} className={`${BTN_BASE} ${BTN_GHOST} w-full`}>
          <Eye className="size-4" aria-hidden />
          Xem
        </Link>
        <Btn block onClick={onEdit} disabled={!canEdit}>
          <Pencil className="size-4" aria-hidden />
          Sửa
        </Btn>
        <Btn block variant="danger" onClick={onDelete} disabled={!canDelete}>
          <Trash2 className="size-4" aria-hidden />
          Xoá
        </Btn>
      </div>
    </Card>
  );
}
