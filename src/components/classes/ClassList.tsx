'use client';

import {
  CalendarIcon,
  ClockIcon,
  EyeIcon,
  LocationIcon,
  PencilIcon,
  PersonIcon,
  PlusIcon,
  TrashIcon,
} from '@primer/octicons-react';
import clsx from 'clsx';
import Link from 'next/link';
import type { ClassRow } from '@/lib/queries/classes';
import { classTone } from '@/lib/class-tone';
import { vnDateTimeLabel } from '@/lib/datetime';
import { BTN_BASE, BTN_GHOST, Btn } from '@/components/ui/Btn';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { ProgressBar } from '@/components/ui/primitives';
import { EmptyPanel } from '@/components/ui/surfaces';
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
        <div className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[1200px]:grid-cols-3">
          {classes.map((row, idx) => {
            const tone = classTone(row.id);
            return (
              <article
                key={row.id}
                style={{ animationDelay: `${Math.min(idx, 8) * 28}ms` }}
                className="tsukuba-rise group flex flex-col overflow-hidden rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-[var(--shadow)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--borderColor-accent-emphasis)] hover:shadow-[var(--lift)]"
              >
                <div aria-hidden className={clsx('h-[3px] w-full shrink-0', tone.ink)} />

                <div className="flex flex-1 flex-col gap-3 p-4 max-[767px]:p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/lop-hoc/${row.id}`}
                          scroll={false}
                          data-card="true"
                          className="truncate text-[15px] font-semibold text-[var(--fgColor-default)] transition-colors group-hover:text-[var(--primary)] hover:underline"
                        >
                          {row.name}
                        </Link>
                        {row.levelCode && (
                          <span className="shrink-0 rounded-[5px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--primary-deep)]">
                            Trình độ {row.levelCode}
                          </span>
                        )}
                        {showCampus && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-[5px] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--ink-2)]">
                            <LocationIcon size={11} aria-hidden />
                            {row.campusName}
                          </span>
                        )}
                      </div>
                      <p className="m-0 mt-0.5 truncate text-xs text-[var(--fgColor-muted)]">{row.course}</p>
                    </div>
                    <div className="hidden shrink-0 min-[768px]:block">
                      <RowMenu label={`Thao tác với lớp ${row.name}`} items={menuItems(row)} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-muted)] bg-[#f8fafc] px-3 py-2.5 text-[13px] dark:bg-[var(--bgColor-muted)]/60">
                    <div className="flex items-center justify-between gap-2 font-semibold tabular-nums text-[var(--fgColor-default)]">
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <CalendarIcon size={13} className="shrink-0 text-[var(--primary)]" aria-hidden />
                        <span className="truncate">{row.schedule}</span>
                      </span>
                      {row.room && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-[5px] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[var(--ink-2)]">
                          <LocationIcon size={10} className="text-[var(--fgColor-muted)]" aria-hidden />
                          {row.room}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-2 gap-y-1 border-t border-[var(--borderColor-muted)]/80 pt-2 text-xs">
                      <span className="inline-flex items-center gap-1 text-[var(--fgColor-muted)]">
                        <PersonIcon size={12} aria-hidden />
                        GV chủ nhiệm
                      </span>
                      <span className="truncate font-semibold text-[var(--fgColor-default)]">
                        {row.teacherName}
                      </span>

                      <span className="text-[var(--fgColor-muted)]">Trợ giảng</span>
                      <span className="truncate font-medium text-[var(--ink-2)]">
                        {row.assistantName ?? <span className="font-normal text-[var(--fgColor-muted)]">chưa có</span>}
                      </span>

                      <span className="text-[var(--fgColor-muted)]">GV nước ngoài</span>
                      <span className="truncate font-medium text-[var(--ink-2)]">
                        {row.foreignTeacherName ?? <span className="font-normal text-[var(--fgColor-muted)]">chưa có</span>}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-0.5">
                    <div>
                      <div className="mb-1.5 flex items-baseline justify-between gap-1 text-xs">
                        <span className="font-medium text-[var(--ink-2)]">
                          Sĩ số {row.studentCount}/{row.capacity}
                        </span>
                        <span className="font-mono text-[11px] font-medium tabular-nums text-[var(--fgColor-muted)]">
                          {row.capacity > 0 ? `${Math.round((row.studentCount / row.capacity) * 100)}%` : '0%'}
                        </span>
                      </div>
                      <ProgressBar value={row.studentCount} max={row.capacity} />
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-baseline justify-between gap-1 text-xs">
                        <span className="font-medium text-[var(--ink-2)]">
                          Đã học {row.sessionsDone}/{row.sessionsTotal} buổi
                        </span>
                        <span className="font-mono text-[11px] font-medium tabular-nums text-[var(--fgColor-muted)]">
                          {row.sessionsTotal > 0 ? `${Math.round((row.sessionsDone / row.sessionsTotal) * 100)}%` : '0%'}
                        </span>
                      </div>
                      <ProgressBar value={row.sessionsDone} max={row.sessionsTotal} />
                    </div>
                  </div>

                  <div className="mt-auto flex items-center gap-1.5 border-t border-[var(--borderColor-muted)] pt-2.5 text-xs text-[var(--fgColor-muted)]">
                    <ClockIcon size={12} className="shrink-0 text-[var(--fgColor-muted)]" aria-hidden />
                    <span className={clsx('truncate tabular-nums', row.nextSessionAt && 'font-medium text-[var(--ink-2)]')}>
                      {row.nextSessionAt
                        ? `Buổi tiếp theo: ${vnDateTimeLabel(new Date(row.nextSessionAt))}`
                        : 'Không còn buổi chưa học'}
                    </span>
                  </div>

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
                </div>
              </article>
            );
          })}
        </div>
      )}

      {dlg.dialogs}
    </section>
  );
}
