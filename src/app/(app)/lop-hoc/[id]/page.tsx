import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { AddStudentToClass } from '@/components/classes/AddStudentToClass';
import { ClassDetailActions } from '@/components/classes/ClassDetailActions';
import { ClassTrackingPanel } from '@/components/classes/ClassTrackingPanel';
import { SurveyPanel } from '@/components/classes/SurveyPanel';
import { classTracking } from '@/lib/queries/class-tracking';
import { getSurveySummary } from '@/lib/queries/surveys';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, Pill, ProgressBar, type Tone } from '@/components/ui/primitives';
import { Panel } from '@/components/ui/surfaces';
import { formatVND } from '@/lib/money';
import { TUITION_PER_SESSION } from '@/lib/tuition';
import { dateKeyLabel, vnDateTimeLabel } from '@/lib/datetime';
import { hasPermission } from '@/lib/permissions';
import { getCampusContext } from '@/lib/campus-context';
import { getClassDetail } from '@/lib/queries/classes';
import { listAssignmentsOfClass } from '@/lib/queries/assignments';
import { listLevels } from '@/lib/queries/levels';
import { listParentChoices } from '@/lib/queries/parents';
import { listClassOptions } from '@/lib/queries/students';
import { withCampusNames } from '@/lib/campus';
import { listTeacherChoices } from '@/lib/queries/teachers';
import { getCurrentPermissions } from '@/lib/session';
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
      <div className="h-9 w-64 animate-pulse rounded-lg bg-[var(--bgColor-muted)]" />
      <div className="h-[360px] animate-pulse rounded-xl bg-[var(--bgColor-muted)]" />
    </section>
  );
}

async function ClassData({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id: raw } = await params;
  if (!/^\d+$/.test(raw)) notFound();
  const id = Number(raw);

  const granted = new Set(await getCurrentPermissions());
  // Lớp ở cơ sở ngoài phạm vi: coi như không có (P32)
  if (!(await passes(() => requireClassAccess(Number(raw))))) notFound();
  if (!hasPermission(granted, 'students.view')) return <NoAccess title="Lớp học" />;

  const canAddStudent = hasPermission(granted, 'students.edit');
  const [cls, teachers, assignments, levels, { campuses, scope }, classOptions, parents, survey, tracking] = await Promise.all([
    getClassDetail(id),
    listTeacherChoices(null),
    listAssignmentsOfClass(id),
    listLevels(),
    getCampusContext(),
    canAddStudent ? listClassOptions(null) : Promise.resolve([]),
    canAddStudent ? listParentChoices() : Promise.resolve([]),
    getSurveySummary(id),
    classTracking(id),
  ]);
  if (!cls) notFound();
  const ownCampusId = classOptions.find((c) => c.id === id)?.campusId ?? scope ?? campuses[0]?.id ?? 0;

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Lớp học', cls.name]}
        title={cls.name}
        subtitle={cls.levelCode ? `${cls.course} · Trình độ ${cls.levelCode}` : cls.course}
        actions={
          <ClassDetailActions
            classId={cls.id}
            name={cls.name}
            studentCount={cls.studentCount}
            teachers={teachers.map((t) => ({ id: t.id, name: t.name, subject: t.subject, staffRole: t.staffRole, campusIds: t.campusIds }))}
            campuses={campuses}
            levels={levels.map((l) => ({ id: l.id, code: l.code, name: l.name }))}
            defaultCampusId={scope ?? campuses[0]?.id ?? 0}
            canManage={hasPermission(granted, 'classes.manage')}
          />
        }
      />

      {/* Theo dõi lớp (35.20): ai chưa làm, cả lớp hay sai gì, bài nói chờ chấm */}
      <div className="mb-4">
        <ClassTrackingPanel data={tracking} />
      </div>

      <div className="grid grid-cols-1 gap-4 min-[1200px]:grid-cols-2">
        {/* Cột trái: thông tin lớp và học sinh */}
        <div className="flex flex-col gap-4">
          <Panel title="Thông tin lớp">
            <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm max-[767px]:grid-cols-[104px_minmax(0,1fr)]">
              <dt className="text-[var(--fgColor-muted)]">GV chủ nhiệm</dt>
              <dd className="font-semibold text-[var(--fgColor-default)]">{cls.teacherName}</dd>
              <dt className="text-[var(--fgColor-muted)]">Trợ giảng</dt>
              <dd className="text-[var(--fgColor-default)]">{cls.assistantName ?? <span className="text-[var(--fgColor-muted)]">Chưa có</span>}</dd>
              <dt className="text-[var(--fgColor-muted)]">GV nước ngoài</dt>
              <dd className="text-[var(--fgColor-default)]">{cls.foreignTeacherName ?? <span className="text-[var(--fgColor-muted)]">Chưa có</span>}</dd>
              <dt className="text-[var(--fgColor-muted)]">Trình độ CEFR</dt>
              <dd className="text-[var(--fgColor-default)]">{cls.levelCode ? `${cls.levelCode} · ${cls.levelName}` : <span className="text-[var(--fgColor-muted)]">Không áp dụng</span>}</dd>
              <dt className="text-[var(--fgColor-muted)]">Lịch học</dt>
              <dd className="font-semibold text-[var(--fgColor-default)]">{cls.schedule}</dd>
              <dt className="text-[var(--fgColor-muted)]">Ngày khai giảng</dt>
              <dd className="text-[var(--fgColor-default)]">{cls.startDateKey ? dateKeyLabel(cls.startDateKey) : '—'}</dd>
              <dt className="text-[var(--fgColor-muted)]">Phòng</dt>
              <dd className="text-[var(--fgColor-default)]">{cls.room || '—'}</dd>
              <dt className="text-[var(--fgColor-muted)]">Học phí</dt>
              <dd className="font-semibold text-[var(--fgColor-default)]">{formatVND(TUITION_PER_SESSION)} / buổi</dd>
              <dt className="text-[var(--fgColor-muted)]">Buổi đã huỷ</dt>
              <dd className="text-[var(--fgColor-default)]">{cls.cancelledCount}</dd>
            </dl>
            <div className="mt-4 grid gap-3 min-[768px]:grid-cols-2">
              <div>
                <ProgressBar value={cls.studentCount} max={cls.capacity} />
                <small className="mt-1.5 block text-xs text-[var(--fgColor-muted)]">Sĩ số {cls.studentCount}/{cls.capacity}</small>
              </div>
              <div>
                <ProgressBar value={cls.sessionsDone} max={cls.sessionsTotal} />
                <small className="mt-1.5 block text-xs text-[var(--fgColor-muted)]">Đã học {cls.sessionsDone}/{cls.sessionsTotal} buổi</small>
              </div>
            </div>
          </Panel>

          <Panel
            title={`Học sinh (${cls.students.length})`}
            action={
              canAddStudent ? (
                <AddStudentToClass
                  classId={cls.id}
                  campusId={ownCampusId}
                  classes={withCampusNames(classOptions, false)}
                  campuses={campuses}
                  parents={parents}
                />
              ) : undefined
            }
          >
            {cls.students.length === 0 ? (
              <EmptyState title="Chưa có học sinh" hint={canAddStudent ? 'Bấm Thêm học sinh để xếp học sinh vào lớp.' : 'Lớp chưa có học sinh nào.'} />
            ) : (
              <ul className="-mx-1 flex flex-col divide-y divide-[var(--borderColor-muted)]">
                {cls.students.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/hoc-sinh/${s.id}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--bgColor-accent-muted)]/45"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--fgColor-link)]">{s.fullName}</span>
                      <small className="text-xs text-[var(--fgColor-muted)]">{s.sessionsDone} buổi</small>
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
            action={
              <Link href={`/lich-hoc?cls=${cls.id}`} className="text-xs font-semibold text-[var(--fgColor-link)] underline underline-offset-4">
                Xem trên lịch
              </Link>
            }
          >
            {cls.upcoming.length === 0 ? (
              <EmptyState title="Không còn buổi nào chưa học" hint="Có thể đã học hết hoặc đang chờ thêm buổi." />
            ) : (
              <ul className="flex flex-col divide-y divide-[var(--borderColor-muted)]">
                {cls.upcoming.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <b className="block text-sm font-semibold text-[var(--fgColor-default)]">Buổi {s.sessionNo} · {vnDateTimeLabel(new Date(s.startsAt))}</b>
                      <small className="block truncate text-xs text-[var(--fgColor-muted)]">
                        {s.teacherName}{s.room ? ` · ${s.room}` : ''}{s.topic ? ` · ${s.topic}` : ''}
                      </small>
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
              <ul className="flex flex-col divide-y divide-[var(--borderColor-muted)]">
                {assignments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/bai-tap/${a.id}`} className="min-w-0 hover:underline">
                      <b className="block truncate text-sm font-semibold text-[var(--fgColor-link)]">{a.title}</b>
                      <small className="block text-xs text-[var(--fgColor-muted)]">
                        Hạn {vnDateTimeLabel(new Date(a.dueAt))} · đã nộp {a.done}/{a.enrolled}
                      </small>
                    </Link>
                    {a.overdue ? <Pill tone="blush">Quá hạn</Pill> : <Pill tone="stone">{a.graded} đã chấm</Pill>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <SurveyPanel classId={cls.id} className={cls.name} summary={survey} canManage={hasPermission(granted, 'classes.manage')} />
        </div>
      </div>
    </section>
  );
}
