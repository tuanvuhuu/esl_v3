'use client';

import { CalendarIcon, EyeIcon, PencilIcon, PlusIcon, TrashIcon } from '@primer/octicons-react';
import Link from 'next/link';
import type { ClassRow } from '@/lib/queries/classes';
import { vnDateTimeLabel } from '@/lib/datetime';
import { BTN_BASE, BTN_GHOST, Btn } from '@/components/ui/Btn';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { ProgressBar } from '@/components/ui/primitives';
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { type CampusChoice, type LevelChoice, type TeacherChoice } from './ClassForm';
import { useClassDialogs } from './useClassDialogs';

// showCampus: hiện tên cơ sở trên từng lớp khi đang xem tất cả cơ sở
export function ClassList({
  classes,
  teachers,
  campuses,
  levels,
  defaultCampusId,
  showCampus,
  canManage,
}: {
  classes: ClassRow[];
  teachers: TeacherChoice[];
  campuses: CampusChoice[];
  levels?: LevelChoice[];
  defaultCampusId: number;
  showCampus: boolean;
  canManage: boolean;
}) {
  const dlg = useClassDialogs({ teachers, campuses, levels, defaultCampusId });

  const menuItems = (row: ClassRow): RowMenuItem[] => [
    { kind: 'link', href: `/lop-hoc/${row.id}`, label: 'Xem chi tiết', icon: EyeIcon },
    { kind: 'action', label: 'Sửa', icon: PencilIcon, onSelect: () => dlg.openEdit(row.id), disabled: !canManage, disabledHint: 'Không có quyền quản lý lớp' },
    { kind: 'action', label: 'Xếp lại lịch', icon: CalendarIcon, onSelect: () => dlg.openReschedule(row.id), disabled: !canManage, disabledHint: 'Không có quyền quản lý lớp' },
    {
      kind: 'action',
      label: 'Xoá',
      icon: TrashIcon,
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
            <Btn variant="primary" leadingVisual={PlusIcon} onClick={dlg.openCreate}>
              Tạo lớp học
            </Btn>
          )
        }
      />

      {classes.length === 0 ? (
        <EmptyPanel title="Chưa có lớp học nào" hint="Tạo lớp để hệ thống sinh sẵn các buổi học." />
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-2 min-[1200px]:grid-cols-3">
          {classes.map((row) => (
            <Card key={row.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/lop-hoc/${row.id}`} scroll={false} className="block truncate text-base font-bold text-[var(--fgColor-link)] hover:underline">
                    {row.name}
                  </Link>
                  <small className="block truncate text-xs text-[var(--fgColor-muted)]">
                    {showCampus ? `${row.course} · ${row.campusName}` : row.course}
                    {row.levelCode ? ` · Trình độ ${row.levelCode}` : ''}
                  </small>
                </div>
                <div className="hidden min-[768px]:block">
                  <RowMenu label={`Thao tác với lớp ${row.name}`} items={menuItems(row)} />
                </div>
              </div>

              <div className="flex flex-col gap-1 rounded-[var(--borderRadius-medium)] bg-[var(--bgColor-muted)] px-3 py-2.5 text-sm">
                <span className="font-semibold text-[var(--fgColor-default)]">{row.schedule}</span>
                <span className="truncate text-[var(--fgColor-default)]">
                  <span className="text-[var(--fgColor-muted)]">GV chủ nhiệm </span>
                  {row.teacherName}{row.room ? ` · ${row.room}` : ''}
                </span>
                <span className="truncate text-[var(--fgColor-default)]">
                  <span className="text-[var(--fgColor-muted)]">Trợ giảng </span>
                  {row.assistantName ?? <span className="text-[var(--fgColor-muted)]">chưa có</span>}
                </span>
                <span className="truncate text-[var(--fgColor-default)]">
                  <span className="text-[var(--fgColor-muted)]">GV nước ngoài </span>
                  {row.foreignTeacherName ?? <span className="text-[var(--fgColor-muted)]">chưa có</span>}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <ProgressBar value={row.studentCount} max={row.capacity} />
                  <small className="mt-1.5 block text-xs text-[var(--fgColor-muted)]">Sĩ số {row.studentCount}/{row.capacity}</small>
                </div>
                <div>
                  <ProgressBar value={row.sessionsDone} max={row.sessionsTotal} />
                  <small className="mt-1.5 block text-xs text-[var(--fgColor-muted)]">Đã học {row.sessionsDone}/{row.sessionsTotal} buổi</small>
                </div>
              </div>

              <small className="text-xs text-[var(--fgColor-muted)]">
                {row.nextSessionAt ? `Buổi tiếp theo: ${vnDateTimeLabel(new Date(row.nextSessionAt))}` : 'Không còn buổi chưa học'}
              </small>

              {/* Điện thoại: ba nút có chữ, bằng nhau */}
              <div className="grid grid-cols-3 gap-2 min-[768px]:hidden">
                <Link href={`/lop-hoc/${row.id}`} scroll={false} className={`${BTN_BASE} ${BTN_GHOST} w-full`}>
                  <EyeIcon size={16} aria-hidden />
                  Xem
                </Link>
                <Btn block leadingVisual={PencilIcon} onClick={() => dlg.openEdit(row.id)} disabled={!canManage}>
                  Sửa
                </Btn>
                <Btn
                  block
                  variant="danger"
                  leadingVisual={TrashIcon}
                  onClick={() => dlg.askDelete({ id: row.id, name: row.name, studentCount: row.studentCount })}
                  disabled={!canManage}
                >
                  Xoá
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {dlg.dialogs}
    </section>
  );
}
