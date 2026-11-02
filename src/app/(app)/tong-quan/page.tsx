import {
  CalendarIcon,
  ClockIcon,
  CreditCardIcon,
  FileIcon,
  TasklistIcon,
  type Icon,
} from '@primer/octicons-react';
import { CounterLabel, SkeletonBox } from '@primer/react';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { BTN_BASE, BTN_GHOST, BTN_PRIMARY } from '@/components/ui/btn-classes';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, Pill, ProgressBar, type Tone } from '@/components/ui/primitives';
import { Panel } from '@/components/ui/surfaces';
import { getCampusContext } from '@/lib/campus-context';
import { classTone } from '@/lib/class-tone';
import { addDaysKey, dateKeyLabel, todayKeyVN, vnDateTimeLabel, vnDayBounds, weekdayLabel, weekdayOfKey } from '@/lib/datetime';
import { formatVND } from '@/lib/money';
import { hasPermission } from '@/lib/permissions';
import { listOverdueAssignments } from '@/lib/queries/assignments';
import { listClasses } from '@/lib/queries/classes';
import { getDashboardStats, listFrequentAbsentees } from '@/lib/queries/dashboard';
import { listSessionsBetween } from '@/lib/queries/sessions';
import { listInvoices } from '@/lib/queries/tuition';
import { getCurrentPermissions } from '@/lib/session';

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải tổng quan" className="flex flex-col gap-4">
      <SkeletonBox height={40} width={224} />
      <div className="grid grid-cols-2 gap-3 min-[768px]:grid-cols-4">
        <SkeletonBox height={96} />
        <SkeletonBox height={96} />
        <SkeletonBox height={96} />
        <SkeletonBox height={96} />
      </div>
      <SkeletonBox height={220} />
    </section>
  );
}

async function DashboardData() {
  await connection();
  const granted = new Set(await getCurrentPermissions());
  const today = todayKeyVN();
  const canStudents = hasPermission(granted, 'students.view');
  const canTuition = hasPermission(granted, 'tuition.manage');
  const canAttendance = hasPermission(granted, 'attendance.record');
  const canAssignments = hasPermission(granted, 'assignments.manage') || canStudents;

  const { scope } = await getCampusContext();
  const dayStart = vnDayBounds(today).start;
  const dayEnd = vnDayBounds(addDaysKey(today, 1)).start;
  const [stats, sessionsToday, classes, overdueInvoices, absentees, overdueAssignments] = await Promise.all([
    getDashboardStats(today, scope),
    canStudents ? listSessionsBetween(dayStart, dayEnd, scope) : Promise.resolve([]),
    canStudents ? listClasses(scope) : Promise.resolve([]),
    canTuition ? listInvoices(today, '', 'overdue', scope) : Promise.resolve(null),
    canStudents ? listFrequentAbsentees(today, scope) : Promise.resolve([]),
    canAssignments ? listOverdueAssignments(scope) : Promise.resolve([]),
  ]);

  const debtCount = overdueInvoices?.counts.overdue ?? 0;
  const debtTotal = overdueInvoices?.rows.reduce((sum, r) => sum + r.debt, 0) ?? 0;
  const topDebts = overdueInvoices ? [...overdueInvoices.rows].sort((a, b) => b.debt - a.debt).slice(0, 5) : [];
  const attentionCount = debtCount + absentees.length + overdueAssignments.length;
  const nextSession = sessionsToday.find((s) => !s.isPast && s.status !== 'cancelled' && s.status !== 'done');
  const cancelledToday = sessionsToday.filter((s) => s.status === 'cancelled').length;
  const weekday = weekdayLabel(weekdayOfKey(today));

  return (
    <section className="flex flex-col gap-4">
      <PageHeader
        crumbs={['Trung tâm']}
        title="Tổng quan"
        subtitle={`${weekday}, ${dateKeyLabel(today)}. Số liệu lấy từ dữ liệu hiện tại.`}
        actions={
          canStudents ? (
            <div className="flex flex-wrap gap-2">
              {canAttendance && (
                <Link href="/diem-danh" className={`${BTN_BASE} ${BTN_GHOST}`}>
                  <TasklistIcon size={16} aria-hidden />
                  Điểm danh
                </Link>
              )}
              <Link href="/lich-hoc" className={`${BTN_BASE} ${BTN_PRIMARY}`}>
                <CalendarIcon size={16} aria-hidden />
                Lịch tuần
              </Link>
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 min-[768px]:grid-cols-4">
        <Kpi label="Đang học" tone="mint" value={String(stats.active)} sub={`${stats.trial} học thử`} />
        <Kpi label="Chuyên cần 30 ngày" tone="lav" value={`${stats.attendanceRate}%`} bar={stats.attendanceRate} />
        {canTuition ? (
          <Kpi
            label="Công nợ quá hạn"
            tone={debtTotal > 0 ? 'blush' : 'mint'}
            value={formatVND(debtTotal)}
            sub={`${debtCount} học sinh`}
          />
        ) : (
          <Kpi label="Sắp hết buổi" tone="blush" value={String(stats.nearlyDone)} sub="còn từ 3 buổi" />
        )}
        {canStudents && (
          <Kpi
            label="Buổi hôm nay"
            tone="butter"
            value={String(sessionsToday.length)}
            sub={
              nextSession
                ? `Tiếp theo ${nextSession.timeLabel.split('–')[0]}`
                : cancelledToday > 0
                  ? `${cancelledToday} buổi đã huỷ`
                  : 'Không còn buổi sắp học'
            }
          />
        )}
      </div>

      {canStudents && (
        <Panel
          title="Cần chú ý"
          action={
            <CounterLabel aria-label={`${attentionCount} việc`} className="!font-semibold">
              {attentionCount}
            </CounterLabel>
          }
        >
          {attentionCount === 0 ? (
            <EmptyState title="Hôm nay không có việc gấp" hint="Không có công nợ quá hạn, vắng nhiều hay bài quá hạn." />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-2.5 min-[768px]:grid-cols-3">
                {canTuition && debtCount > 0 && (
                  <Lane
                    href="/hoc-phi?f=overdue"
                    icon={CreditCardIcon}
                    tone="blush"
                    title="Công nợ quá hạn"
                    hint={`${topDebts.slice(0, 2).map((r) => r.fullName).join(', ')}${debtCount > 2 ? ` và ${debtCount - 2} em khác` : ''}`}
                    count={debtCount}
                  />
                )}
                {absentees.length > 0 && (
                  <Lane
                    href="/diem-danh"
                    icon={ClockIcon}
                    tone="butter"
                    title="Vắng từ 2 buổi trở lên"
                    hint="7 ngày gần đây"
                    count={absentees.length}
                  />
                )}
                {canAssignments && overdueAssignments.length > 0 && (
                  <Lane
                    href="/bai-tap"
                    icon={FileIcon}
                    tone="lav"
                    title="Bài tập quá hạn"
                    hint={overdueAssignments.slice(0, 2).map((a) => a.title).join(', ')}
                    count={overdueAssignments.length}
                  />
                )}
              </div>
              {canTuition && topDebts.length > 0 && (
                <ul className="flex flex-col divide-y divide-[var(--borderColor-muted)]">
                  {topDebts.slice(0, 3).map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/hoc-phi?f=overdue&q=${encodeURIComponent(r.fullName)}`}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--bgColor-accent-muted)]/45"
                      >
                        <div className="min-w-0">
                          <b className="block truncate text-sm font-semibold text-[var(--fgColor-default)]">{r.fullName}</b>
                          <small className="block truncate text-xs text-[var(--fgColor-muted)]">
                            {r.className} · hạn {dateKeyLabel(r.dueDate)}
                          </small>
                        </div>
                        <b className="shrink-0 text-sm font-medium tabular-nums text-[var(--fgColor-danger)]">{formatVND(r.debt)}</b>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {canAssignments && overdueAssignments.length > 0 && (
                <ul className="flex flex-col divide-y divide-[var(--borderColor-muted)]">
                  {overdueAssignments.slice(0, 3).map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/bai-tap/${a.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[var(--bgColor-accent-muted)]/45"
                      >
                        <div className="min-w-0">
                          <b className="block truncate text-sm font-semibold text-[var(--fgColor-default)]">{a.title}</b>
                          <small className="block truncate text-xs text-[var(--fgColor-muted)]">
                            {a.className} · hạn {vnDateTimeLabel(new Date(a.dueAt))}
                          </small>
                        </div>
                        <Pill tone="blush">còn {a.enrolled - a.done} chưa nộp</Pill>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Panel>
      )}

      {canStudents && (
        <div className="grid grid-cols-1 gap-4 min-[1100px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <Panel
            title="Lịch hôm nay"
            action={
              <Link href="/lich-hoc" className="text-xs font-semibold text-[var(--fgColor-link)] underline underline-offset-4">
                Xem lịch
              </Link>
            }
          >
            {sessionsToday.length === 0 ? (
              <EmptyState title="Hôm nay không có buổi học" hint="Xem lịch tuần để biết buổi sắp tới." />
            ) : (
              <ol className="flex flex-col">
                {sessionsToday.map((s) => {
                  const isNext = s.id === nextSession?.id;
                  const label = isNext ? { tone: 'butter' as Tone, text: 'Tiếp theo' } : sessionLabel(s);
                  return (
                    <li
                      key={s.id}
                      className={`grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 border-t border-[var(--borderColor-muted)] py-2.5 first:border-t-0 ${
                        isNext ? '-mx-2 rounded-[var(--borderRadius-medium)] border-t-transparent bg-[var(--bgColor-accent-muted)] px-2' : ''
                      }`}
                    >
                      <time className={`text-sm font-medium tabular-nums ${classTone(s.classId).text}`}>
                        {s.timeLabel.split('–')[0]}
                      </time>
                      <div className="min-w-0">
                        <b className="block truncate text-sm font-semibold text-[var(--fgColor-default)]">{s.className}</b>
                        <small className="block truncate text-xs text-[var(--fgColor-muted)]">
                          {s.teacherName}
                          {s.room ? ` · ${s.room}` : ''}
                        </small>
                      </div>
                      <Pill tone={label.tone}>{label.text}</Pill>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>

          <Panel
            title="Lớp đang học"
            action={
              <Link href="/lop-hoc" className="text-xs font-semibold text-[var(--fgColor-link)] underline underline-offset-4">
                Xem tất cả
              </Link>
            }
          >
            <ul className="grid grid-cols-1 gap-2.5 min-[768px]:grid-cols-2 min-[1100px]:grid-cols-1">
              {classes.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/lop-hoc/${c.id}`}
                    data-card="true"
                    className="relative block overflow-hidden rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-3 pl-4 transition-colors hover:border-[var(--borderColor-accent-emphasis)] hover:bg-[var(--bgColor-accent-muted)]/35"
                  >
                    <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${classTone(c.id).ink}`} />
                    <div className="flex items-baseline justify-between gap-3">
                      <b className="min-w-0 truncate text-sm font-semibold text-[var(--fgColor-default)]">{c.name}</b>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-normal tabular-nums ${classTone(c.id).bg}`}>
                        {c.studentCount}/{c.capacity}
                      </span>
                    </div>
                    <small className="mt-0.5 block truncate text-xs text-[var(--fgColor-muted)]">
                      {c.teacherName} · {c.schedule}
                    </small>
                    <ProgressBar value={c.studentCount} max={c.capacity} className="mt-2" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      {!canStudents && (
        <Panel padded={false}>
          <EmptyState title="Chào mừng đến ESL Center" hint="Chọn một mục ở thanh bên hoặc tab bên dưới để bắt đầu." />
        </Panel>
      )}
    </section>
  );
}

function sessionLabel(s: { status: string; isPast: boolean }): { tone: Tone; text: string } {
  if (s.status === 'cancelled') return { tone: 'blush', text: 'Đã huỷ' };
  if (s.status === 'done') return { tone: 'stone', text: 'Đã học' };
  if (s.isPast) return { tone: 'butter', text: 'Chưa điểm danh' };
  return { tone: 'mint', text: 'Sắp học' };
}

const KPI_DOT: Record<'mint' | 'lav' | 'blush' | 'butter', string> = {
  mint: 'bg-[var(--accent)]',
  lav: 'bg-[var(--primary)]',
  blush: 'bg-[var(--blush-ink)]',
  butter: 'bg-[var(--butter-ink)]',
};

function Kpi({
  label,
  value,
  sub,
  tone,
  bar,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: keyof typeof KPI_DOT;
  bar?: number;
}) {
  return (
    <div className="min-w-0 rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-4 py-3.5 shadow-[var(--shadow)]">
      <small className="flex items-center gap-2 truncate text-xs font-medium text-[var(--fgColor-muted)]">
        <span className={`size-2 shrink-0 rounded-full ${KPI_DOT[tone]}`} aria-hidden />
        <span className="truncate">{label}</span>
      </small>
      <b className="mt-1.5 block truncate text-xl font-semibold tabular-nums text-[var(--fgColor-default)] min-[768px]:text-2xl">
        {value}
      </b>
      {bar !== undefined && <ProgressBar value={bar} max={100} className="mt-2.5" />}
      {sub && <small className="mt-1 block truncate text-xs text-[var(--fgColor-muted)]">{sub}</small>}
    </div>
  );
}

const LANE_TONE: Record<'blush' | 'butter' | 'lav', string> = {
  blush: 'bg-blush text-blush-ink',
  butter: 'bg-butter text-butter-ink',
  lav: 'bg-lav text-lav-ink',
};

function Lane({
  href,
  icon: IconComp,
  tone,
  title,
  hint,
  count,
}: {
  href: string;
  icon: Icon;
  tone: keyof typeof LANE_TONE;
  title: string;
  hint: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      data-card="true"
      className="flex items-center gap-3 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-3 transition-colors hover:border-[var(--borderColor-accent-emphasis)] hover:bg-[var(--bgColor-muted)]"
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-[var(--borderRadius-small)] ${LANE_TONE[tone]}`}>
        <IconComp size={16} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-sm font-semibold text-[var(--fgColor-default)]">{title}</b>
        <small className="block truncate text-xs text-[var(--fgColor-muted)]">{hint}</small>
      </span>
      <b className="text-lg font-medium tabular-nums text-[var(--fgColor-default)]">{count}</b>
    </Link>
  );
}
