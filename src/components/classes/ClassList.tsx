'use client';

import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { ClassRow } from '@/lib/queries/classes';
import { formatVND } from '@/lib/money';
import { vnDateTimeLabel } from '@/lib/datetime';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { EmptyState, ProgressBar } from '@/components/ui/primitives';
import { type TeacherChoice } from './ClassForm';
import { useClassDialogs } from './useClassDialogs';

export function ClassList({ classes, teachers, canManage }: { classes: ClassRow[]; teachers: TeacherChoice[]; canManage: boolean }) {
  const dlg = useClassDialogs({ teachers });

  const menuItems = (row: ClassRow): RowMenuItem[] => [
    { kind: 'link', href: `/lop-hoc/${row.id}`, label: 'Xem chi tiết', icon: Eye },
    { kind: 'action', label: 'Sửa', icon: Pencil, onSelect: () => dlg.openEdit(row.id), disabled: !canManage, disabledHint: 'Không có quyền quản lý lớp' },
    {
      kind: 'action',
      label: 'Xoá',
      icon: Trash2,
      danger: true,
      onSelect: () => dlg.askDelete({ id: row.id, name: row.name, studentCount: row.studentCount }),
      disabled: !canManage,
      disabledHint: 'Không có quyền quản lý lớp',
    },
  ];

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Lớp học']}
        title="Lớp học"
        subtitle={`${classes.length} lớp. Lịch học từng buổi xem ở màn Lịch học.`}
        actions={
          canManage && (
            <button type="button" onClick={dlg.openCreate} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-base font-bold text-on-primary max-[767px]:h-11">
              <Plus className="size-4" aria-hidden />
              Tạo lớp học
            </button>
          )
        }
      />

      {classes.length === 0 ? (
        <div className="rounded-[24px] bg-surface shadow-card">
          <EmptyState title="Chưa có lớp học nào" hint="Tạo lớp để hệ thống sinh sẵn các buổi học." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-2 min-[768px]:gap-4 min-[1200px]:grid-cols-3">
          {classes.map((row) => (
            <article key={row.id} className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-3.5 shadow-card min-[768px]:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/lop-hoc/${row.id}`} className="block truncate text-lg font-extrabold text-ink hover:underline">{row.name}</Link>
                  <small className="block truncate text-sm text-muted">{row.course}</small>
                </div>
                <div className="hidden min-[768px]:block">
                  <RowMenu label={`Thao tác với lớp ${row.name}`} items={menuItems(row)} />
                </div>
              </div>

              <div className="flex flex-col gap-1 rounded-xl bg-bg px-3 py-2.5 text-sm">
                <span className="font-bold text-ink">{row.schedule}</span>
                <span className="truncate text-ink-2">
                  {row.teacherName}{row.room ? ` · ${row.room}` : ''} · {formatVND(row.fee)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <ProgressBar value={row.studentCount} max={row.capacity} />
                  <small className="mt-1.5 block text-xs text-muted">Sĩ số {row.studentCount}/{row.capacity}</small>
                </div>
                <div>
                  <ProgressBar value={row.sessionsDone} max={row.sessionsTotal} />
                  <small className="mt-1.5 block text-xs text-muted">Đã học {row.sessionsDone}/{row.sessionsTotal} buổi</small>
                </div>
              </div>

              <small className="text-sm text-ink-2">
                {row.nextSessionAt ? `Buổi tiếp theo: ${vnDateTimeLabel(new Date(row.nextSessionAt))}` : 'Không còn buổi chưa học'}
              </small>

              {/* Điện thoại: ba nút có chữ, bằng nhau */}
              <div className="grid grid-cols-3 gap-2 min-[768px]:hidden">
                <Link href={`/lop-hoc/${row.id}`} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-sm font-bold text-ink">
                  <Eye className="size-4" aria-hidden />
                  Xem
                </Link>
                <button type="button" onClick={() => dlg.openEdit(row.id)} disabled={!canManage} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-sm font-bold text-ink disabled:opacity-40">
                  <Pencil className="size-4" aria-hidden />
                  Sửa
                </button>
                <button type="button" onClick={() => dlg.askDelete({ id: row.id, name: row.name, studentCount: row.studentCount })} disabled={!canManage} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-blush-ink bg-surface text-sm font-bold text-blush-ink disabled:opacity-40">
                  <Trash2 className="size-4" aria-hidden />
                  Xoá
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {dlg.dialogs}
    </section>
  );
}
