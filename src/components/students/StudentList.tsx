'use client';

import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition, type ReactNode } from 'react';
import { deleteStudentAction, loadStudentForm, type StudentFormValues } from '@/app/(app)/hoc-sinh/actions';
import type { StudentRow } from '@/lib/queries/students';
import { formatVND, formatVNDShort } from '@/lib/money';
import { studentsHref } from '@/lib/student-url';
import { PageCrumbs } from '@/components/shell/PageCrumbs';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { Avatar, EmptyState, Pill, ProgressBar, type Tone } from '@/components/ui/primitives';
import { StudentFilters, type FilterState } from './StudentFilters';
import { StudentForm, type ClassOption, type ParentChoice } from './StudentForm';

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

type Props = {
  rows: StudentRow[]; // trang hiện tại, dùng cho bảng máy tính và thẻ máy tính bảng
  phoneRows: StudentRow[]; // tất cả học sinh đã tải tới lúc này, dùng cho điện thoại (Xem thêm)
  total: number;
  page: number;
  pageCount: number;
  loadedPages: number;
  filters: FilterState;
  classes: ClassOption[];
  parents: ParentChoice[];
  statusCounts: Record<string, number>;
  canEdit: boolean;
  canDelete: boolean;
  drawer?: ReactNode; // hồ sơ học sinh đang mở trong ngăn kéo (máy tính), dựng sẵn trên server
};

export function StudentList({ rows, phoneRows, total, page, pageCount, loadedPages, filters, classes, parents, statusCounts, canEdit, canDelete, drawer }: Props) {
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

  return (
    <section className="flex flex-col">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 max-[767px]:mb-3">
        <div className="min-w-0">
          <PageCrumbs crumbs={['Đào tạo', 'Học sinh']} />
          <h1 className="text-h1 font-extrabold leading-tight tracking-tight text-ink">Học sinh</h1>
          <p className="mt-2 text-base text-muted max-[767px]:mt-1.5 max-[767px]:text-sm">Quản lý hồ sơ, tiến độ học và học phí của từng học viên.</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 max-[767px]:hidden">
            <button type="button" onClick={() => setCreating(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-base font-bold text-on-primary">
              <Plus className="size-4" aria-hidden />
              Thêm học sinh
            </button>
          </div>
        )}
      </header>

      <StudentFilters current={filters} classes={classes} statusCounts={statusCounts} onAdd={canEdit ? () => setCreating(true) : undefined} />

      <p className="mb-3 hidden text-sm text-muted min-[768px]:block">
        {total === 0 ? 'Không có học sinh phù hợp.' : `Hiển thị ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} trên ${total} học sinh`}
      </p>
      <p className="mb-3 text-sm text-muted min-[768px]:hidden">
        {total === 0 ? 'Không có học sinh phù hợp.' : `Đang hiển thị ${phoneRows.length} trên ${total} học sinh`}
      </p>

      {/* Máy tính (từ 1200px): bảng 7 cột */}
      <div className="hidden overflow-hidden rounded-[24px] bg-surface shadow-card min-[1200px]:block">
        {rows.length === 0 ? (
          <EmptyState title="Không tìm thấy học sinh phù hợp" hint="Thử đổi từ khoá hoặc bỏ bớt bộ lọc." />
        ) : (
          <div role="table" aria-label="Danh sách học sinh">
            <div role="row" className="grid grid-cols-[minmax(170px,2.2fr)_minmax(110px,1.1fr)_minmax(120px,1.2fr)_64px_minmax(120px,1.3fr)_minmax(104px,1fr)_44px] gap-x-3 border-b border-line px-4 py-2.5 text-xs font-semibold text-muted">
              <span role="columnheader">Học sinh</span>
              <span role="columnheader">Lớp & giáo viên</span>
              <span role="columnheader">Tiến độ</span>
              <span role="columnheader">Chuyên cần</span>
              <span role="columnheader">Học phí</span>
              <span role="columnheader">Trạng thái</span>
              <span role="columnheader" className="sr-only">Thao tác</span>
            </div>
            {rows.map((row) => (
              <div key={row.id} role="row" className="grid grid-cols-[minmax(170px,2.2fr)_minmax(110px,1.1fr)_minmax(120px,1.2fr)_64px_minmax(120px,1.3fr)_minmax(104px,1fr)_44px] items-center gap-x-3 border-b border-line px-4 py-3.5 transition-colors last:border-0 hover:bg-row-hover">
                <div role="cell" className="flex min-w-0 items-center gap-3">
                  <Avatar name={row.fullName} seed={row.id} />
                  <div className="min-w-0">
                    <Link href={profileHref(row.id)} scroll={false} className="block truncate text-base font-bold text-ink hover:underline">{row.fullName}</Link>
                    <small className="block truncate text-xs text-muted">{row.code} · {row.gender === 'female' ? 'Nữ' : 'Nam'}</small>
                  </div>
                </div>
                <div role="cell" className="min-w-0">
                  <b className="block truncate text-base text-ink">{row.className}</b>
                  <small className="block truncate text-xs text-muted">{row.teacherName}</small>
                </div>
                <div role="cell" className="min-w-0">
                  <ProgressBar value={row.sessionsDone} max={row.sessionsTotal} className="max-w-[140px]" />
                  <small className="mt-1.5 block text-xs text-muted">{row.sessionsDone}/{row.sessionsTotal} buổi</small>
                </div>
                <div role="cell">
                  <span className={`text-md font-extrabold ${row.attendanceRate >= 90 ? 'text-accent' : row.attendanceRate >= 75 ? 'text-ink' : 'text-blush-ink'}`}>{row.attendanceRate}%</span>
                </div>
                <div role="cell" className="min-w-0">
                  <Pill tone={TUITION_META[row.tuition].tone}>{TUITION_META[row.tuition].label}</Pill>
                  {row.debt > 0 && <small className="mt-1.5 block truncate text-xs text-muted">Thiếu {formatVND(row.debt)}</small>}
                </div>
                <div role="cell">
                  <Pill tone={STATUS_META[row.status].tone}>{STATUS_META[row.status].label}</Pill>
                </div>
                <div role="cell" className="flex justify-end">
                  <RowMenu label={`Thao tác với ${row.fullName}`} items={rowItems(row)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Máy tính bảng và điện thoại (dưới 1200px): thẻ học sinh */}
      {/* Máy tính bảng: thẻ theo số trang */}
      <div className="hidden flex-col gap-3 min-[768px]:flex min-[1200px]:hidden">
        {rows.length === 0 ? (
          <div className="rounded-[24px] bg-surface shadow-card">
            <EmptyState title="Không tìm thấy học sinh phù hợp" hint="Thử đổi từ khoá hoặc bỏ bớt bộ lọc." />
          </div>
        ) : (
          rows.map((row) => <StudentCard key={row.id} row={row} viewHref={profileHref(row.id)} canEdit={canEdit} canDelete={canDelete} onEdit={() => openEdit(row)} onDelete={() => setToDelete(row)} />)
        )}
      </div>

      {/* Điện thoại: thẻ, bấm Xem thêm để tải tiếp */}
      <div className="flex flex-col gap-3 min-[768px]:hidden">
        {phoneRows.length === 0 ? (
          <div className="rounded-[24px] bg-surface shadow-card">
            <EmptyState title="Không tìm thấy học sinh phù hợp" hint="Thử đổi từ khoá hoặc bỏ bớt bộ lọc." />
          </div>
        ) : (
          phoneRows.map((row) => <StudentCard key={row.id} row={row} viewHref={`/hoc-sinh/${row.id}`} canEdit={canEdit} canDelete={canDelete} onEdit={() => openEdit(row)} onDelete={() => setToDelete(row)} />)
        )}
      </div>

      {/* Phân trang: số trang (máy tính bảng và máy tính), Xem thêm (điện thoại) */}
      {pageCount > 1 && (
        <nav aria-label="Phân trang" className="mt-4 hidden flex-wrap items-center justify-between gap-3 min-[768px]:flex">
          <small className="text-sm text-muted">Trang {page} / {pageCount}</small>
          <div className="flex items-center gap-1.5">
            <PageLink disabled={page <= 1} href={studentsHref({ ...filters, p: page - 1 })} label="Trang trước">‹</PageLink>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
              <PageLink key={p} href={studentsHref({ ...filters, p })} current={p === page} label={`Trang ${p}`}>{p}</PageLink>
            ))}
            <PageLink disabled={page >= pageCount} href={studentsHref({ ...filters, p: page + 1 })} label="Trang sau">›</PageLink>
          </div>
        </nav>
      )}
      {hasMorePhone && (
        <Link href={studentsHref({ ...filters, n: loadedPages + 1 })} scroll={false} className="mt-3 flex h-12 items-center justify-center rounded-[14px] border border-line bg-surface text-base font-bold text-ink min-[768px]:hidden">
          Xem thêm {Math.min(PAGE_SIZE, total - phoneRows.length)} học sinh (còn {total - phoneRows.length})
        </Link>
      )}

      {/* Ngăn kéo hồ sơ (máy tính, từ 768px). Nội dung do máy chủ dựng khi có ?h= */}
      {drawer && (
        <aside aria-label="Hồ sơ học sinh" className="fixed inset-y-0 right-0 z-[65] hidden w-[min(560px,100%)] overflow-y-auto border-l border-line bg-bg p-5 shadow-lift min-[768px]:block">
          {drawer}
        </aside>
      )}

      {message && (
        <div role="status" className="fixed inset-x-0 bottom-[calc(96px+var(--safe-b))] z-[95] mx-auto w-fit max-w-[calc(100%-32px)] rounded-full border border-line bg-surface px-4 py-2.5 text-center text-base font-semibold text-ink shadow-lift min-[768px]:bottom-6">
          {message}
        </div>
      )}

      <Modal open={creating} title="Thêm học sinh mới" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setCreating(false)} labelledBy="create-title">
        <StudentForm mode="create" classes={classes} parents={parents} onDone={onDone} onCancel={() => setCreating(false)} />
      </Modal>

      <Modal open={!!editing} title="Sửa thông tin học sinh" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setEditing(null)} labelledBy="edit-title">
        {editing && <StudentForm mode="edit" studentId={editing.id} initial={editing.values} classes={classes} parents={parents} onDone={onDone} onCancel={() => setEditing(null)} />}
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

// Thẻ học sinh: tên và trạng thái, lớp, tiến độ, chuyên cần và học phí, hàng nút Xem, Sửa, Xoá
function StudentCard({ row, viewHref, canEdit, canDelete, onEdit, onDelete }: { row: StudentRow; viewHref: string; canEdit: boolean; canDelete: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-3.5 shadow-card min-[768px]:p-4">
      <div className="flex items-start gap-3">
        <Avatar name={row.fullName} seed={row.id} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={viewHref} scroll={false} className="min-w-0 truncate text-base font-bold text-ink">{row.fullName}</Link>
            <Pill tone={STATUS_META[row.status].tone}>{STATUS_META[row.status].label}</Pill>
          </div>
          <small className="block truncate text-xs text-muted">{row.code} · {row.gender === 'female' ? 'Nữ' : 'Nam'}</small>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2">
        <b className="text-base text-ink">{row.className}</b>
        <small className="truncate text-xs text-muted">{row.teacherName}</small>
      </div>

      <div>
        <ProgressBar value={row.sessionsDone} max={row.sessionsTotal} />
        <small className="mt-1.5 block text-xs text-muted">{row.sessionsDone}/{row.sessionsTotal} buổi</small>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className={`text-md font-extrabold ${row.attendanceRate >= 90 ? 'text-accent' : row.attendanceRate >= 75 ? 'text-ink' : 'text-blush-ink'}`}>{row.attendanceRate}%</span>
          <small className="ml-1.5 text-xs text-muted">chuyên cần</small>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Pill tone={TUITION_META[row.tuition].tone}>{TUITION_META[row.tuition].label}</Pill>
          {row.debt > 0 && <small className="text-xs text-muted">Thiếu {formatVNDShort(row.debt)}</small>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Link href={viewHref} scroll={false} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-sm font-bold text-ink">
          <Eye className="size-4" aria-hidden />
          Xem
        </Link>
        <button type="button" onClick={onEdit} disabled={!canEdit} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-sm font-bold text-ink disabled:opacity-40">
          <Pencil className="size-4" aria-hidden />
          Sửa
        </button>
        <button type="button" onClick={onDelete} disabled={!canDelete} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-blush-ink bg-surface text-sm font-bold text-blush-ink disabled:opacity-40">
          <Trash2 className="size-4" aria-hidden />
          Xoá
        </button>
      </div>
    </article>
  );
}

function PageLink({ href, label, children, current = false, disabled = false }: { href: string; label: string; children: React.ReactNode; current?: boolean; disabled?: boolean }) {
  const base = 'grid h-9 min-w-9 place-items-center rounded-[10px] border px-2.5 text-sm font-bold transition-colors';
  if (disabled) return <span aria-label={label} className={`${base} border-line text-muted opacity-40`}>{children}</span>;
  return (
    <Link href={href} aria-label={label} aria-current={current ? 'page' : undefined} scroll={false} className={`${base} ${current ? 'border-primary-deep bg-primary text-on-primary' : 'border-line bg-surface text-ink hover:border-ink-2'}`}>
      {children}
    </Link>
  );
}
