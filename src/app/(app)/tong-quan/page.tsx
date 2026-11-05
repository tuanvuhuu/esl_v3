import {
  ArrowRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  FileIcon,
  HourglassIcon,
  PeopleIcon,
  TasklistIcon,
  type Icon,
} from '@primer/octicons-react';
import { SkeletonBox } from '@primer/react';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { BTN_BASE, BTN_GHOST, BTN_PRIMARY } from '@/components/ui/btn-classes';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, Pill, ProgressBar, type Tone } from '@/components/ui/primitives';
import { Panel } from '@/components/ui/surfaces';
import { getCampusContext } from '@/lib/campus-context';
import { addDaysKey, dateKeyLabel, todayKeyVN, vnDateTimeLabel, vnDayBounds, weekdayLabel, weekdayOfKey } from '@/lib/datetime';
import { formatVND } from '@/lib/money';
import { hasPermission } from '@/lib/permissions';
import { listOverdueAssignments } from '@/lib/queries/assignments';
import { listClasses } from '@/lib/queries/classes';
import { getDashboardStats, listFrequentAbsentees } from '@/lib/queries/dashboard';
import { listSessionsBetween } from '@/lib/queries/sessions';
import { listInvoices } from '@/lib/queries/tuition';
import { getCurrentAccount, getCurrentPermissions } from '@/lib/session';

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải tổng quan" className="flex flex-col gap-3">
      <SkeletonBox height={56} />
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
  const [account, permList, { scope }] = await Promise.all([
    getCurrentAccount(),
    getCurrentPermissions(),
    getCampusContext(),
  ]);
  const granted = new Set(permList);
  const today = todayKeyVN();
  const canStudents = hasPermission(granted, 'students.view');
  const canTuition = hasPermission(granted, 'tuition.manage');
  const canAttendance = hasPermission(granted, 'attendance.record');
  const canAssignments = hasPermission(granted, 'assignments.manage') || canStudents;

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
    <section className="flex flex-col gap-3">
      <PageHeader
        crumbs={['Trung tâm', 'Tổng quan']}
        title="Bảng điều khiển"
        subtitle={`${account ? `Xin chào ${account.fullName} · ${account.roleLabel} — ` : ''}${weekday}, ${dateKeyLabel(today)}`}
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

      {/* Hàng 4 thẻ KPI đồng nhất 1 tông màu chủ đề, sạch sẽ & dễ nhìn */}
      <div className="grid grid-cols-2 gap-3 min-[768px]:grid-cols-4">
        <Kpi
          index={0}
          href={canStudents ? '/hoc-sinh' : undefined}
          icon={PeopleIcon}
          label="Học sinh đang học"
          value={String(stats.active)}
          sub={`${stats.trial} học thử đang theo dõi`}
        />
        <Kpi
          index={1}
          href={canAttendance ? '/diem-danh' : undefined}
          icon={CheckCircleIcon}
          label="Chuyên cần 30 ngày"
          value={`${stats.attendanceRate}%`}
          bar={stats.attendanceRate}
        />
        {canTuition ? (
          <Kpi
            index={2}
            href="/hoc-phi?f=overdue"
            icon={CreditCardIcon}
            label="Công nợ quá hạn"
            alert={debtTotal > 0}
            value={formatVND(debtTotal)}
            sub={`${debtCount} học sinh chưa tất toán`}
          />
        ) : (
          <Kpi
            index={2}
            href={canStudents ? '/hoc-sinh' : undefined}
            icon={HourglassIcon}
            label="Sắp hết buổi"
            alert={stats.nearlyDone > 0}
            value={String(stats.nearlyDone)}
            sub="còn từ 3 buổi trở xuống"
          />
        )}
        {canStudents && (
          <Kpi
            index={3}
            href="/lich-hoc"
            icon={CalendarIcon}
            label="Buổi học hôm nay"
            value={String(sessionsToday.length)}
            sub={
              nextSession
                ? `Tiếp theo lúc ${nextSession.timeLabel.split('–')[0]}`
                : cancelledToday > 0
                  ? `${cancelledToday} buổi đã huỷ`
                  : 'Không còn buổi sắp học'
            }
          />
        )}
      </div>

      {canStudents && (
        <div className="grid grid-cols-1 gap-3 min-[1100px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* Cột trái: Cần chú ý / Việc cần xử lý */}
          <section
            aria-label="Cần chú ý"
            className="overflow-hidden rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-[var(--shadow)]"
          >
            <header className="flex items-center justify-between gap-3 border-b border-[var(--borderColor-muted)] px-4 py-3 max-[767px]:px-3.5">
              <h2 className="m-0 truncate text-sm font-semibold text-[var(--fgColor-default)]">
                Việc cần xử lý{account ? ` · ${account.roleLabel}` : ''}
              </h2>
              <span
                aria-label={`${attentionCount} việc`}
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-2 text-xs font-semibold tabular-nums ${
                  attentionCount > 0
                    ? 'bg-[var(--blush)] text-[var(--blush-ink)]'
                    : 'bg-[var(--stone)] text-[var(--fgColor-muted)]'
                }`}
              >
                {attentionCount}
              </span>
            </header>

            <div className="p-4 max-[767px]:p-3.5">
              {attentionCount === 0 ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--stone)]/60 px-3.5 py-2.5">
                    <CheckCircleIcon size={18} className="shrink-0 text-[var(--primary)]" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <b className="block text-sm font-semibold text-[var(--fgColor-default)]">
                        Không có việc gấp đang chờ xử lý hôm nay
                      </b>
                      <small className="block text-xs text-[var(--fgColor-muted)]">
                        Công nợ, chuyên cần và bài tập của cơ sở đều đang trong hạn.
                      </small>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 min-[640px]:grid-cols-3">
                    <Link
                      href="/hoc-phi"
                      data-card="true"
                      className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-3 py-2.5 transition-colors hover:border-[var(--borderColor-accent-emphasis)] hover:bg-[var(--row-hover)]"
                    >
                      <small className="block truncate text-xs text-[var(--fgColor-muted)]">Quá hạn học phí</small>
                      <b className="mt-0.5 block text-sm font-semibold tabular-nums text-[var(--fgColor-default)]">0 phiếu</b>
                    </Link>

                    <Link
                      href="/diem-danh"
                      data-card="true"
                      className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-3 py-2.5 transition-colors hover:border-[var(--borderColor-accent-emphasis)] hover:bg-[var(--row-hover)]"
                    >
                      <small className="block truncate text-xs text-[var(--fgColor-muted)]">Vắng liên tiếp</small>
                      <b className="mt-0.5 block text-sm font-semibold tabular-nums text-[var(--fgColor-default)]">0 học sinh</b>
                    </Link>

                    <Link
                      href="/bai-tap"
                      data-card="true"
                      className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-3 py-2.5 transition-colors hover:border-[var(--borderColor-accent-emphasis)] hover:bg-[var(--row-hover)]"
                    >
                      <small className="block truncate text-xs text-[var(--fgColor-muted)]">Bài tập trễ hạn</small>
                      <b className="mt-0.5 block text-sm font-semibold tabular-nums text-[var(--fgColor-default)]">0 bài</b>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div className="grid grid-cols-1 gap-1.5">
                    {canTuition && debtCount > 0 && (
                      <Lane
                        href="/hoc-phi?f=overdue"
                        icon={CreditCardIcon}
                        urgent
                        title="Công nợ quá hạn cần nhắc thu"
                        hint={`${topDebts.slice(0, 2).map((r) => r.fullName).join(', ')}${debtCount > 2 ? ` và ${debtCount - 2} em khác` : ''}`}
                        count={debtCount}
                      />
                    )}
                    {absentees.length > 0 && (
                      <Lane
                        href="/diem-danh"
                        icon={ClockIcon}
                        title="Vắng từ 2 buổi trở lên"
                        hint="Trong 7 ngày gần đây — cần liên hệ phụ huynh"
                        count={absentees.length}
                      />
                    )}
                    {canAssignments && overdueAssignments.length > 0 && (
                      <Lane
                        href="/bai-tap"
                        icon={FileIcon}
                        title="Bài tập quá hạn chưa nộp đủ"
                        hint={overdueAssignments.slice(0, 2).map((a) => a.title).join(', ')}
                        count={overdueAssignments.length}
                      />
                    )}
                  </div>

                  {((canTuition && topDebts.length > 0) || (canAssignments && overdueAssignments.length > 0)) && (
                    <div
                      className={`grid grid-cols-1 gap-3 border-t border-[var(--borderColor-muted)] pt-2.5 ${
                        canTuition && topDebts.length > 0 && canAssignments && overdueAssignments.length > 0
                          ? 'min-[640px]:grid-cols-2'
                          : ''
                      }`}
                    >
                      {canTuition && topDebts.length > 0 && (
                        <div className="min-w-0">
                          <div className="mb-1 text-xs font-medium text-[var(--fgColor-muted)]">Học phí quá hạn cao nhất</div>
                          <ul className="flex flex-col divide-y divide-[var(--borderColor-muted)]">
                            {topDebts.slice(0, 2).map((r) => (
                              <li key={r.id}>
                                <Link
                                  href={`/hoc-phi?f=overdue&q=${encodeURIComponent(r.fullName)}`}
                                  data-card="true"
                                  className="flex items-center justify-between gap-2 rounded-[var(--borderRadius-medium)] px-2 py-1.5 transition-colors hover:bg-[var(--row-hover)]"
                                >
                                  <div className="min-w-0">
                                    <b className="block truncate text-xs font-medium text-[var(--fgColor-default)]">{r.fullName}</b>
                                    <small className="block truncate text-[11px] text-[var(--fgColor-muted)]">
                                      {r.className} · {dateKeyLabel(r.dueDate)}
                                    </small>
                                  </div>
                                  <b className="shrink-0 text-xs font-semibold tabular-nums text-[var(--fgColor-danger)]">
                                    {formatVND(r.debt)}
                                  </b>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {canAssignments && overdueAssignments.length > 0 && (
                        <div className="min-w-0">
                          <div className="mb-1 text-xs font-medium text-[var(--fgColor-muted)]">Bài tập quá hạn gần nhất</div>
                          <ul className="flex flex-col divide-y divide-[var(--borderColor-muted)]">
                            {overdueAssignments.slice(0, 2).map((a) => (
                              <li key={a.id}>
                                <Link
                                  href={`/bai-tap/${a.id}`}
                                  data-card="true"
                                  className="flex items-center justify-between gap-2 rounded-[var(--borderRadius-medium)] px-2 py-1.5 transition-colors hover:bg-[var(--row-hover)]"
                                >
                                  <div className="min-w-0">
                                    <b className="block truncate text-xs font-medium text-[var(--fgColor-default)]">{a.title}</b>
                                    <small className="block truncate text-[11px] text-[var(--fgColor-muted)]">
                                      {a.className} · {vnDateTimeLabel(new Date(a.dueAt))}
                                    </small>
                                  </div>
                                  <Pill tone="blush">-{a.enrolled - a.done}</Pill>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Cột phải: Lịch hôm nay */}
          <Panel
            title="Lịch hôm nay"
            action={
              <Link
                href="/lich-hoc"
                data-link="true"
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--fgColor-link)] hover:underline"
              >
                Xem lịch tuần
                <ArrowRightIcon size={12} aria-hidden />
              </Link>
            }
          >
            {sessionsToday.length === 0 ? (
              <EmptyState title="Hôm nay không có buổi học" hint="Xem lịch tuần để biết buổi sắp tới." />
            ) : (
              <ol className="flex flex-col gap-1.5">
                {sessionsToday.slice(0, 5).map((s) => {
                  const isNext = s.id === nextSession?.id;
                  const label = isNext ? { tone: 'butter' as Tone, text: 'Tiếp theo' } : sessionLabel(s);
                  return (
                    <li
                      key={s.id}
                      className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--borderRadius-medium)] border px-3 py-2 transition-colors ${
                        isNext
                          ? 'border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)]/45'
                          : 'border-[var(--borderColor-muted)] bg-[var(--stone)]/40'
                      }`}
                    >
                      <time
                        className={`inline-flex w-[58px] shrink-0 items-center justify-center rounded-md border px-2 py-1 font-mono text-xs font-semibold tabular-nums ${
                          isNext
                            ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]'
                            : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-default)]'
                        }`}
                      >
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
        </div>
      )}

      {canStudents && classes.length > 0 && (
        <Panel
          title="Lớp đang hoạt động"
          action={
            <Link
              href="/lop-hoc"
              data-link="true"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--fgColor-link)] hover:underline"
            >
              Xem tất cả ({classes.length})
              <ArrowRightIcon size={12} aria-hidden />
            </Link>
          }
        >
          <ul className="grid grid-cols-1 gap-2.5 min-[768px]:grid-cols-2 min-[1200px]:grid-cols-3">
            {classes.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/lop-hoc/${c.id}`}
                  data-card="true"
                  className="group block rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-3.5 transition-colors hover:border-[var(--borderColor-accent-emphasis)] hover:bg-[var(--row-hover)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <b className="truncate text-sm font-semibold text-[var(--fgColor-default)] group-hover:text-[var(--primary-deep)]">
                      {c.name}
                    </b>
                    <span className="shrink-0 rounded-md bg-[var(--stone)] px-2 py-0.5 font-mono text-xs font-medium tabular-nums text-[var(--fgColor-muted)]">
                      {c.studentCount}/{c.capacity} HS
                    </span>
                  </div>
                  <small className="mt-1 block truncate text-xs text-[var(--fgColor-muted)]">
                    {c.teacherName} · {c.schedule}
                  </small>
                  <ProgressBar value={c.studentCount} max={c.capacity} className="mt-2.5" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
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

function Kpi({
  index,
  href,
  icon: IconComp,
  label,
  value,
  sub,
  alert = false,
  bar,
}: {
  index: number;
  href?: string;
  icon: Icon;
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
  bar?: number;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <small className="block truncate text-xs font-medium text-[var(--fgColor-muted)]">{label}</small>
          <b
            className={`mt-1 block truncate text-2xl font-bold leading-tight tracking-tight tabular-nums ${
              alert ? 'text-[var(--fgColor-danger)]' : 'text-[var(--fgColor-default)]'
            }`}
          >
            {value}
          </b>
        </div>
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-lg ${
            alert
              ? 'bg-[var(--blush)] text-[var(--blush-ink)]'
              : 'bg-[var(--primary-soft)] text-[var(--primary)]'
          }`}
          aria-hidden
        >
          <IconComp size={16} />
        </span>
      </div>
      {bar !== undefined && <ProgressBar value={bar} max={100} className="mt-2.5" />}
      {sub && <small className="mt-1.5 block truncate text-xs text-[var(--fgColor-muted)]">{sub}</small>}
    </>
  );

  const cls =
    'tsukuba-rise min-w-0 block rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-4 py-3.5 shadow-[var(--shadow)] transition-colors duration-150';

  if (href) {
    return (
      <Link
        href={href}
        data-card="true"
        style={{ animationDelay: `${index * 45}ms` }}
        className={`${cls} hover:border-[var(--borderColor-accent-emphasis)] hover:bg-[var(--row-hover)]`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div style={{ animationDelay: `${index * 45}ms` }} className={cls}>
      {inner}
    </div>
  );
}

function Lane({
  href,
  icon: IconComp,
  urgent,
  title,
  hint,
  count,
}: {
  href: string;
  icon: Icon;
  urgent?: boolean;
  title: string;
  hint: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      data-card="true"
      className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--stone)]/50 px-3 py-2 transition-colors hover:border-[var(--borderColor-accent-emphasis)] hover:bg-[var(--row-hover)]"
    >
      <b
        className={`grid h-7 min-w-7 shrink-0 place-items-center rounded-md px-2 text-xs font-semibold tabular-nums ${
          urgent
            ? 'bg-[var(--blush)] text-[var(--blush-ink)]'
            : 'bg-[var(--primary-soft)] text-[var(--primary-deep)]'
        }`}
      >
        {count}
      </b>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5">
          <IconComp size={14} className="shrink-0 text-[var(--fgColor-muted)]" aria-hidden />
          <b className="truncate text-sm font-medium text-[var(--fgColor-default)]">{title}</b>
          {urgent && <Pill tone="blush">Gấp</Pill>}
        </span>
        <small className="block truncate text-xs text-[var(--fgColor-muted)]">{hint}</small>
      </span>
      <ArrowRightIcon
        size={16}
        className="shrink-0 text-[var(--fgColor-muted)] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[var(--primary)]"
        aria-hidden
      />
    </Link>
  );
}
