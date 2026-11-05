import { CalendarIcon, CheckCircleIcon, ClockIcon, CreditCardIcon, LocationIcon, MortarBoardIcon, PeopleIcon } from '@primer/octicons-react';
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
import { Avatar, EmptyState, Pill, ProgressBar, type Tone } from '@/components/ui/primitives';
import { Panel } from '@/components/ui/surfaces';
import { formatVND } from '@/lib/money';
import { TUITION_PER_SESSION } from '@/lib/tuition';
import { dateKeyLabel, vnDateKey, vnDateTimeLabel } from '@/lib/datetime';
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
      <div className="h-9 w-64 animate-pulse rounded-md bg-[var(--bgColor-muted)]" />
      <div className="h-24 animate-pulse rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]" />
      <div className="grid grid-cols-2 gap-2.5 min-[900px]:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]"
          />
        ))}
      </div>
      <div className="h-[320px] animate-pulse rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]" />
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

      {/* Tsukuba .hero summary banner */}
      <div className="tsukuba-rise mb-3.5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] border-l-4 border-l-[var(--primary)] bg-[var(--bgColor-default)] px-4 py-3.5 shadow-[var(--shadow)] max-[767px]:px-3.5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold text-[var(--fgColor-default)]">{cls.course}</span>
            <span className="inline-flex items-center gap-1 rounded-[5px] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-2 py-0.5 font-mono text-[11.5px] font-medium text-[var(--ink-2)]">
              <LocationIcon size={12} className="text-[var(--fgColor-muted)]" aria-hidden />
              {cls.campusName}
            </span>
            {cls.levelCode && (
              <span className="rounded-[5px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] px-2 py-0.5 font-mono text-[11.5px] font-semibold text-[var(--primary-deep)]">
                CEFR {cls.levelCode}
              </span>
            )}
            {cls.room && (
              <span className="rounded-[5px] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-2 py-0.5 font-mono text-[11.5px] font-medium text-[var(--ink-2)]">
                {cls.room}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--fgColor-muted)]">
            <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums text-[var(--fgColor-default)]">
              <CalendarIcon size={13} className="text-[var(--primary)]" aria-hidden />
              {cls.schedule}
            </span>
            <span className="inline-flex items-center gap-1.5 tabular-nums text-[var(--ink-2)]">
              <ClockIcon size={13} className="text-[var(--fgColor-muted)]" aria-hidden />
              {cls.nextSessionAt ? `Buổi tiếp theo: ${vnDateTimeLabel(new Date(cls.nextSessionAt))}` : 'Không còn buổi chưa học'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Link
            href={`/diem-danh?cls=${cls.id}`}
            data-link="true"
            className="inline-flex items-center gap-1 font-semibold text-[var(--fgColor-link)] hover:underline"
          >
            <CheckCircleIcon size={13} aria-hidden />
            Điểm danh lớp
          </Link>
          <span aria-hidden className="text-[var(--borderColor-default)]">·</span>
          <Link
            href={`/lich-hoc?cls=${cls.id}`}
            data-link="true"
            className="inline-flex items-center gap-1 font-semibold text-[var(--fgColor-link)] hover:underline"
          >
            <CalendarIcon size={13} aria-hidden />
            Lịch học lớp
          </Link>
        </div>
      </div>

      {/* KPI Stat Strip */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 min-[900px]:grid-cols-4">
        <div className="flex flex-col justify-between rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] border-l-[3px] border-l-[var(--primary)] bg-[var(--bgColor-default)] px-4 py-3 shadow-[var(--shadow)]">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--fgColor-muted)]">
              <PeopleIcon size={13} className="text-[var(--primary)]" aria-hidden />
              Sĩ số hiện tại
            </div>
            <div className="mt-0.5 text-xl font-semibold leading-tight tabular-nums text-[var(--fgColor-default)]">
              {cls.studentCount}/{cls.capacity}
            </div>
          </div>
          <div className="mt-2">
            <ProgressBar value={cls.studentCount} max={cls.capacity} />
            <small className="mt-1 block text-[11px] tabular-nums text-[var(--fgColor-muted)]">
              Sĩ số {cls.studentCount}/{cls.capacity}
            </small>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] border-l-[3px] border-l-[#1baf7a] bg-[var(--bgColor-default)] px-4 py-3 shadow-[var(--shadow)]">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--fgColor-muted)]">
              <CalendarIcon size={13} className="text-[#1baf7a]" aria-hidden />
              Tiến độ buổi học
            </div>
            <div className="mt-0.5 text-xl font-semibold leading-tight tabular-nums text-[var(--fgColor-default)]">
              {cls.sessionsDone}/{cls.sessionsTotal}
            </div>
          </div>
          <div className="mt-2">
            <ProgressBar value={cls.sessionsDone} max={cls.sessionsTotal} />
            <small className="mt-1 block text-[11px] tabular-nums text-[var(--fgColor-muted)]">
              Đã học {cls.sessionsDone}/{cls.sessionsTotal} buổi
            </small>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] border-l-[3px] border-l-[#2a78d6] bg-[var(--bgColor-default)] px-4 py-3 shadow-[var(--shadow)]">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--fgColor-muted)]">
            <CreditCardIcon size={13} className="text-[#2a78d6]" aria-hidden />
            Đơn giá học phí
          </div>
          <div className="mt-0.5 text-xl font-semibold leading-tight tabular-nums text-[var(--fgColor-default)]">
            {formatVND(TUITION_PER_SESSION)}
          </div>
          <div className="mt-2 text-xs text-[var(--fgColor-muted)]">Thu theo từng buổi thực học</div>
        </div>

        <div className="flex flex-col justify-between rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] border-l-[3px] border-l-[#8250df] bg-[var(--bgColor-default)] px-4 py-3 shadow-[var(--shadow)]">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--fgColor-muted)]">
            <MortarBoardIcon size={13} className="text-[#8250df]" aria-hidden />
            Giáo viên phụ trách
          </div>
          <div className="mt-0.5 truncate text-base font-semibold leading-snug text-[var(--fgColor-default)]">
            {cls.teacherName}
          </div>
          <div className="mt-2 truncate text-xs text-[var(--fgColor-muted)]">
            {cls.assistantName ? `TG: ${cls.assistantName}` : 'Chưa có trợ giảng'}
            {cls.foreignTeacherName ? ` · GVNN: ${cls.foreignTeacherName}` : ''}
          </div>
        </div>
      </div>

      {/* Theo dõi lớp (35.20): ai chưa làm, cả lớp hay sai gì, bài nói chờ chấm */}
      <div className="mb-4">
        <ClassTrackingPanel data={tracking} />
      </div>

      <div className="grid grid-cols-1 gap-4 min-[1200px]:grid-cols-2">
        {/* Cột trái: thông tin lớp và học sinh */}
        <div className="flex flex-col gap-4">
          <Panel title="Thông tin lớp">
            <dl className="m-0 grid grid-cols-[128px_minmax(0,1fr)] gap-x-4 divide-y divide-[var(--borderColor-muted)]/60 text-sm max-[767px]:grid-cols-[108px_minmax(0,1fr)] [&>dd]:py-2 [&>dt]:py-2 [&>dd:first-of-type]:pt-0 [&>dt:first-of-type]:pt-0 [&>dd:last-of-type]:pb-0 [&>dt:last-of-type]:pb-0">
              <dt className="text-[var(--fgColor-muted)]">GV chủ nhiệm</dt>
              <dd className="m-0 font-semibold text-[var(--fgColor-default)]">{cls.teacherName}</dd>
              <dt className="text-[var(--fgColor-muted)]">Trợ giảng</dt>
              <dd className="m-0 text-[var(--fgColor-default)]">{cls.assistantName ?? <span className="text-[var(--fgColor-muted)]">Chưa có</span>}</dd>
              <dt className="text-[var(--fgColor-muted)]">GV nước ngoài</dt>
              <dd className="m-0 text-[var(--fgColor-default)]">{cls.foreignTeacherName ?? <span className="text-[var(--fgColor-muted)]">Chưa có</span>}</dd>
              <dt className="text-[var(--fgColor-muted)]">Trình độ CEFR</dt>
              <dd className="m-0 text-[var(--fgColor-default)]">
                {cls.levelCode ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="rounded-[5px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] px-1.5 py-0.5 font-mono text-xs font-semibold text-[var(--primary-deep)]">
                      {cls.levelCode}
                    </span>
                    <span>· {cls.levelName}</span>
                  </span>
                ) : (
                  <span className="text-[var(--fgColor-muted)]">Không áp dụng</span>
                )}
              </dd>
              <dt className="text-[var(--fgColor-muted)]">Lịch học</dt>
              <dd className="m-0 font-semibold tabular-nums text-[var(--fgColor-default)]">{cls.schedule}</dd>
              <dt className="text-[var(--fgColor-muted)]">Ngày khai giảng</dt>
              <dd className="m-0 tabular-nums text-[var(--fgColor-default)]">{cls.startDateKey ? dateKeyLabel(cls.startDateKey) : '—'}</dd>
              <dt className="text-[var(--fgColor-muted)]">Phòng</dt>
              <dd className="m-0 font-mono text-xs text-[var(--fgColor-default)]">{cls.room || '—'}</dd>
              <dt className="text-[var(--fgColor-muted)]">Học phí</dt>
              <dd className="m-0 font-semibold tabular-nums text-[var(--fgColor-default)]">{formatVND(TUITION_PER_SESSION)} / buổi</dd>
              <dt className="text-[var(--fgColor-muted)]">Buổi đã huỷ</dt>
              <dd className="m-0 tabular-nums text-[var(--fgColor-default)]">{cls.cancelledCount}</dd>
            </dl>
          </Panel>

          <Panel
            title={`Học sinh (${cls.students.length})`}
            padded={cls.students.length === 0}
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
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="border-b border-[var(--borderColor-muted)] bg-[#f8fafc] text-xs text-[var(--fgColor-muted)] dark:bg-[var(--bgColor-muted)]/55">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left font-normal">Học sinh</th>
                      <th scope="col" className="px-3 py-2 text-right font-normal">Đã học</th>
                      <th scope="col" className="px-4 py-2 text-right font-normal">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--borderColor-muted)]">
                    {cls.students.map((s) => (
                      <tr key={s.id} className="transition-colors hover:bg-[#f8fafc] dark:hover:bg-[var(--bgColor-muted)]/40">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={s.fullName} seed={s.id} size="sm" quiet />
                            <Link
                              href={`/hoc-sinh/${s.id}`}
                              data-link="true"
                              className="font-medium text-[var(--fgColor-default)] transition-colors hover:text-[var(--primary)] hover:underline"
                            >
                              {s.fullName}
                            </Link>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-xs tabular-nums text-[var(--ink-2)]">
                          {s.sessionsDone} buổi
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          <Pill tone={STATUS_META[s.status].tone}>{STATUS_META[s.status].label}</Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {/* Cột phải: buổi học sắp tới và bài tập */}
        <div className="flex flex-col gap-4">
          <Panel
            title="Buổi học sắp tới"
            padded={cls.upcoming.length === 0}
            action={
              <Link
                href={`/lich-hoc?cls=${cls.id}`}
                data-link="true"
                className="text-xs font-semibold text-[var(--fgColor-link)] underline underline-offset-4"
              >
                Xem trên lịch
              </Link>
            }
          >
            {cls.upcoming.length === 0 ? (
              <EmptyState title="Không còn buổi nào chưa học" hint="Có thể đã học hết hoặc đang chờ thêm buổi." />
            ) : (
              <ul className="m-0 flex list-none flex-col divide-y divide-[var(--borderColor-muted)] p-0">
                {cls.upcoming.map((s) => {
                  const dt = new Date(s.startsAt);
                  const dKey = vnDateKey(dt);
                  const ddmm = dateKeyLabel(dKey).slice(0, 5);
                  return (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#f8fafc] dark:hover:bg-[var(--bgColor-muted)]/40 max-[767px]:px-3.5"
                    >
                      <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)]/60 py-1 text-center shadow-2xs">
                        <span className="text-[10px] font-medium uppercase leading-none text-[var(--primary-deep)]">
                          B.{s.sessionNo}
                        </span>
                        <span className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-[var(--fgColor-default)]">
                          {ddmm}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <b className="block text-sm font-semibold tabular-nums text-[var(--fgColor-default)]">
                          Buổi {s.sessionNo} · {vnDateTimeLabel(dt)}
                        </b>
                        <small className="block truncate text-xs text-[var(--fgColor-muted)]">
                          {s.teacherName}
                          {s.room ? ` · ${s.room}` : ''}
                          {s.topic ? ` · ${s.topic}` : ''}
                        </small>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Bài tập" padded={assignments.length === 0}>
            {assignments.length === 0 ? (
              <EmptyState title="Lớp chưa có bài tập" hint="Giao bài ở màn Bài tập." />
            ) : (
              <ul className="m-0 flex list-none flex-col divide-y divide-[var(--borderColor-muted)] p-0">
                {assignments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-[#f8fafc] dark:hover:bg-[var(--bgColor-muted)]/40 max-[767px]:px-3.5"
                  >
                    <Link href={`/bai-tap/${a.id}`} data-link="true" className="min-w-0 hover:underline">
                      <b className="block truncate text-sm font-semibold text-[var(--fgColor-link)]">{a.title}</b>
                      <small className="block tabular-nums text-xs text-[var(--fgColor-muted)]">
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
