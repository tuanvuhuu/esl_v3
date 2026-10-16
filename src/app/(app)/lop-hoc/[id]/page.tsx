import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { ClassDetailActions } from '@/components/classes/ClassDetailActions';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar, EmptyState, Pill, ProgressBar, type Tone } from '@/components/ui/primitives';
import { formatVND } from '@/lib/money';
import { dateKeyLabel, vnDateTimeLabel } from '@/lib/datetime';
import { hasPermission } from '@/lib/permissions';
import { getCampusContext } from '@/lib/campus-context';
import { getClassDetail } from '@/lib/queries/classes';
import { listAssignmentsOfClass } from '@/lib/queries/assignments';
import { listTeacherChoices } from '@/lib/queries/teachers';
import { getCurrentPermissions } from '@/lib/session';
import { Panel } from '@/components/ui/surfaces';
import { passes, requireClassAccess } from '@/lib/campus-access';

const STATUS_META: Record<'active' | 'trial' | 'paused' | 'finished', { label: string; tone: Tone }> = {
  active: { label: 'Đang học', tone: 'mint' },
  trial: { label: 'Học thử', tone: 'lav' },
  paused: { label: 'Bảo lưu', tone: 'stone' },
  finished: { label: 'Đã nghỉ', tone: 'blush' },
};

export default function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ClassSkeleton />}>
      <ClassData params={params} />
    </Suspense>
  );
}

function ClassSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải lớp học" className="flex flex-col gap-4">
      <div className="h-9 w-64 animate-pulse rounded-xl bg-stone" />
      <div className="h-[360px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />
    </section>
  );
}

async function ClassData({ params }: { params: Promise<{ id: string }> }) {
  // Bài tập quá hạn tính theo giờ hiện tại, chỉ tính lúc có yêu cầu (docs: connection())
  await connection();
  const { id: raw } = await params;
  if (!/^\d+$/.test(raw)) notFound();
  const id = Number(raw);

  const granted = new Set(await getCurrentPermissions());
  // Lớp ở cơ sở ngoài phạm vi: coi như không có (P32)
  if (!(await passes(() => requireClassAccess(Number(raw))))) notFound();
  if (!hasPermission(granted, 'students.view')) return <NoAccess title="Lớp học" />;

  const [cls, teachers, assignments, { campuses, scope }] = await Promise.all([
    getClassDetail(id),
    listTeacherChoices(null),
    listAssignmentsOfClass(id),
    getCampusContext(),
  ]);
  if (!cls) notFound();

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Lớp học', cls.name]}
        title={cls.name}
        subtitle={cls.course}
        actions={
          <ClassDetailActions
            classId={cls.id}
            name={cls.name}
            studentCount={cls.studentCount}
            teachers={teachers.map((t) => ({ id: t.id, name: t.name, subject: t.subject, staffRole: t.staffRole, campusIds: t.campusIds }))}
            campuses={campuses}
            defaultCampusId={scope ?? campuses[0]?.id ?? 0}
            canManage={hasPermission(granted, 'classes.manage')}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 min-[1200px]:grid-cols-2">
        {/* Cột trái: thông tin lớp và học sinh */}
        <div className="flex flex-col gap-4">
          <Panel title="Thông tin lớp">
            <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-base max-[767px]:grid-cols-[104px_minmax(0,1fr)] max-[767px]:text-sm">
              <dt className="text-muted">GV chủ nhiệm</dt>
              <dd className="font-bold text-ink">{cls.teacherName}</dd>
              <dt className="text-muted">Trợ giảng</dt>
              <dd className="text-ink">{cls.assistantName ?? <span className="text-muted">Chưa có</span>}</dd>
              <dt className="text-muted">GV nước ngoài</dt>
              <dd className="text-ink">{cls.foreignTeacherName ?? <span className="text-muted">Chưa có</span>}</dd>
              <dt className="text-muted">Lịch học</dt>
              <dd className="font-bold text-ink">{cls.schedule}</dd>
              <dt className="text-muted">Ngày khai giảng</dt>
              <dd className="text-ink">{cls.startDateKey ? dateKeyLabel(cls.startDateKey) : '—'}</dd>
              <dt className="text-muted">Phòng</dt>
              <dd className="text-ink">{cls.room || '—'}</dd>
              <dt className="text-muted">Học phí</dt>
              <dd className="font-bold text-ink">{formatVND(cls.fee)}</dd>
              <dt className="text-muted">Buổi đã huỷ</dt>
              <dd className="text-ink">{cls.cancelledCount}</dd>
            </dl>
            <div className="mt-4 grid gap-3 min-[768px]:grid-cols-2">
              <div>
                <ProgressBar value={cls.studentCount} max={cls.capacity} />
                <small className="mt-1.5 block text-xs text-muted">Sĩ số {cls.studentCount}/{cls.capacity}</small>
              </div>
              <div>
                <ProgressBar value={cls.sessionsDone} max={cls.sessionsTotal} />
                <small className="mt-1.5 block text-xs text-muted">Đã học {cls.sessionsDone}/{cls.sessionsTotal} buổi</small>
              </div>
            </div>
          </Panel>

          <Panel title={`Học sinh (${cls.students.length})`}>
            {cls.students.length === 0 ? (
              <EmptyState title="Chưa có học sinh" hint="Thêm học sinh vào lớp ở màn Học sinh." />
            ) : (
              <ul className="-mx-1 flex flex-col divide-y divide-line">
                {cls.students.map((s) => (
                  <li key={s.id}>
                    <Link href={`/hoc-sinh/${s.id}`} className="flex items-center gap-3 px-1 py-2.5 hover:bg-row-hover">
                      <Avatar name={s.fullName} seed={s.id} />
                      <span className="min-w-0 flex-1 truncate text-base font-bold text-ink">{s.fullName}</span>
                      <small className="text-xs text-muted">{s.sessionsDone} buổi</small>
                      <Pill tone={STATUS_META[s.status].tone}>{STATUS_META[s.status].label}</Pill>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Cột phải: buổi học sắp tới và bài tập */}
        <div className="flex flex-col gap-4">
          <Panel
            title="Buổi học sắp tới"
            action={<Link href={`/lich-hoc?cls=${cls.id}`} className="text-sm font-bold text-ink underline underline-offset-4">Xem trên lịch</Link>}
          >
            {cls.upcoming.length === 0 ? (
              <EmptyState title="Không còn buổi nào chưa học" hint="Có thể đã học hết hoặc đang chờ thêm buổi." />
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {cls.upcoming.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <b className="block text-base text-ink">Buổi {s.sessionNo} · {vnDateTimeLabel(new Date(s.startsAt))}</b>
                      <small className="block truncate text-xs text-muted">{s.teacherName}{s.room ? ` · ${s.room}` : ''}{s.topic ? ` · ${s.topic}` : ''}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Bài tập">
            {assignments.length === 0 ? (
              <EmptyState title="Lớp chưa có bài tập" hint="Giao bài ở màn Bài tập." />
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {assignments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/bai-tap/${a.id}`} className="min-w-0 hover:underline">
                      <b className="block truncate text-base text-ink">{a.title}</b>
                      <small className="block text-xs text-muted">Hạn {vnDateTimeLabel(new Date(a.dueAt))} · đã nộp {a.done}/{a.enrolled}</small>
                    </Link>
                    {a.overdue ? <Pill tone="blush">Quá hạn</Pill> : <Pill tone="stone">{a.graded} đã chấm</Pill>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </section>
  );
}

