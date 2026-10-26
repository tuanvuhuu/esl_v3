import Link from 'next/link';
import { connection } from 'next/server';
import { CalendarDays, ClipboardCheck, Clock3, FileText, Wallet, type LucideIcon } from 'lucide-react';
import { Suspense } from 'react';
import { BTN_BASE, BTN_GHOST, BTN_PRIMARY } from '@/components/ui/Btn';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/surfaces';
import { EmptyState, Pill, ProgressBar, type Tone } from '@/components/ui/primitives';
import { formatVND } from '@/lib/money';
import { addDaysKey, dateKeyLabel, todayKeyVN, vnDateTimeLabel, vnDayBounds, weekdayLabel, weekdayOfKey } from '@/lib/datetime';
import { hasPermission } from '@/lib/permissions';
import { listOverdueAssignments } from '@/lib/queries/assignments';
import { listClasses } from '@/lib/queries/classes';
import { getCampusContext } from '@/lib/campus-context';
import { getDashboardStats, listFrequentAbsentees } from '@/lib/queries/dashboard';
import { listSessionsBetween } from '@/lib/queries/sessions';
import { listInvoices } from '@/lib/queries/tuition';
import { getCurrentPermissions } from '@/lib/session';

// Tổng quan (trang chủ): việc cần làm hôm nay đứng đầu, rồi số liệu, lịch hôm nay và lớp đang học. Tất cả từ DB.
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải tổng quan" className="flex flex-col gap-5">
      <div className="h-12 w-56 animate-pulse rounded-xl bg-stone" />
      <div className="grid grid-cols-2 gap-3 min-[768px]:grid-cols-4">
        <div className="h-24 animate-pulse rounded-[var(--radius-panel)] bg-stone" />
        <div className="h-24 animate-pulse rounded-[var(--radius-panel)] bg-stone" />
        <div className="h-24 animate-pulse rounded-[var(--radius-panel)] bg-stone" />
        <div className="h-24 animate-pulse rounded-[var(--radius-panel)] bg-stone" />
      </div>
      <div className="h-[220px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />
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

  // Số liệu theo cơ sở đang xem (scope null: tất cả cơ sở)
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

  // Chỉ cộng nợ đã quá hạn (totalDebt là mọi khoản còn nợ, kể cả chưa tới hạn)
  const debtCount = overdueInvoices?.counts.overdue ?? 0;
  const debtTotal = overdueInvoices?.rows.reduce((sum, r) => sum + r.debt, 0) ?? 0;
  const topDebts = overdueInvoices ? [...overdueInvoices.rows].sort((a, b) => b.debt - a.debt).slice(0, 5) : [];
  // Đếm đủ mọi học sinh nợ quá hạn, không chỉ năm người hiện trong danh sách. Khớp với số trên chuông thông báo.
  const attentionCount = debtCount + absentees.length + overdueAssignments.length;
  const nextSession = sessionsToday.find((s) => !s.isPast && s.status !== 'cancelled' && s.status !== 'done');
  const cancelledToday = sessionsToday.filter((s) => s.status === 'cancelled').length;
  const weekday = weekdayLabel(weekdayOfKey(today));

  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        crumbs={['Trung tâm']}
        title="Tổng quan"
        subtitle={`${weekday}, ${dateKeyLabel(today)}. Số liệu lấy từ dữ liệu hiện tại.`}
        actions={
          canStudents ? (
            <div className="flex flex-wrap gap-2">
              {canAttendance && <Link href="/diem-danh" className={`${BTN_BASE} ${BTN_GHOST}`}><ClipboardCheck className="size-4" aria-hidden />Điểm danh</Link>}
              <Link href="/lich-hoc" className={`${BTN_BASE} ${BTN_PRIMARY}`}><CalendarDays className="size-4" aria-hidden />Lịch tuần</Link>
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 min-[768px]:grid-cols-4 min-[768px]:gap-4">
        <Kpi label="Đang học" value={String(stats.active)} sub={`${stats.trial} học thử`} />
        <Kpi label="Chuyên cần 30 ngày" value={`${stats.attendanceRate}%`} bar={stats.attendanceRate} />
        {canTuition ? (
          <Kpi label="Công nợ quá hạn" value={formatVND(debtTotal)} alert={debtTotal > 0} sub={`${debtCount} học sinh`} />
        ) : (
          <Kpi label="Sắp hết buổi" value={String(stats.nearlyDone)} sub="còn từ 3 buổi" />
        )}
        {canStudents && (
          <Kpi label="Buổi hôm nay" value={String(sessionsToday.length)} sub={nextSession ? `Tiếp theo ${nextSession.timeLabel.split('–')[0]}` : cancelledToday > 0 ? `${cancelledToday} buổi đã huỷ` : 'Không còn buổi sắp học'} />
        )}
      </div>

      {canStudents && (
        <Panel title="Cần chú ý" action={<span className="grid min-w-8 place-items-center rounded-full bg-primary px-2.5 py-1 text-sm font-extrabold text-on-primary" aria-label={`${attentionCount} việc`}>{attentionCount}</span>}>
          {attentionCount === 0 ? (
            <EmptyState title="Hôm nay không có việc gấp" hint="Không có công nợ quá hạn, vắng nhiều hay bài quá hạn." />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-2 min-[768px]:grid-cols-3">
                {canTuition && debtCount > 0 && (
                  <Lane href="/hoc-phi?f=overdue" icon={Wallet} tone="blush" title="Công nợ quá hạn" hint={`${topDebts.slice(0, 2).map((r) => r.fullName).join(', ')}${debtCount > 2 ? ` và ${debtCount - 2} em khác` : ''}`} count={debtCount} />
                )}
                {absentees.length > 0 && (
                  <Lane href="/diem-danh" icon={Clock3} tone="butter" title="Vắng từ 2 buổi trở lên" hint="7 ngày gần đây" count={absentees.length} />
                )}
                {canAssignments && overdueAssignments.length > 0 && (
                  <Lane href="/bai-tap" icon={FileText} tone="lav" title="Bài tập quá hạn" hint={overdueAssignments.slice(0, 2).map((a) => a.title).join(', ')} count={overdueAssignments.length} />
                )}
              </div>
              {canTuition && topDebts.length > 0 && (
                <ul className="flex flex-col divide-y divide-line">
                  {topDebts.slice(0, 3).map((r) => (
                    <li key={r.id}>
                      <Link href={`/hoc-phi?f=overdue&q=${encodeURIComponent(r.fullName)}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-row-hover">
                        <div className="min-w-0">
                          <b className="block truncate text-base text-ink">{r.fullName}</b>
                          <small className="block truncate text-xs text-muted">{r.className} · hạn {dateKeyLabel(r.dueDate)}</small>
                        </div>
                        <b className="shrink-0 text-sm font-extrabold tabular-nums text-blush-ink">{formatVND(r.debt)}</b>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {canAssignments && overdueAssignments.length > 0 && (
                <ul className="flex flex-col divide-y divide-line">
                  {overdueAssignments.slice(0, 3).map((a) => (
                    <li key={a.id}>
                      <Link href={`/bai-tap/${a.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-row-hover">
                        <div className="min-w-0">
                          <b className="block truncate text-base text-ink">{a.title}</b>
                          <small className="block truncate text-xs text-muted">{a.className} · hạn {vnDateTimeLabel(new Date(a.dueAt))}</small>
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
        <div className="grid grid-cols-1 gap-5 min-[1100px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* grid-cols-1 = minmax(0, 1fr): cột không bị đẩy rộng theo chữ không xuống dòng (truncate) */}
          <Panel title="Lịch hôm nay" action={<Link href="/lich-hoc" className="text-sm font-bold text-ink underline underline-offset-4">Xem lịch</Link>}>
            {sessionsToday.length === 0 ? (
              <EmptyState title="Hôm nay không có buổi học" hint="Xem lịch tuần để biết buổi sắp tới." />
            ) : (
              <ol className="flex flex-col">
                {sessionsToday.map((s) => {
                  const isNext = s.id === nextSession?.id;
                  const label = isNext ? { tone: 'butter' as Tone, text: 'Tiếp theo' } : sessionLabel(s);
                  return (
                    <li key={s.id} className={`grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-3 first:border-t-0 ${isNext ? '-mx-2.5 rounded-[var(--radius-ctl)] border-t-transparent bg-primary-soft px-2.5' : ''}`}>
                      <time className="text-sm font-extrabold tabular-nums text-ink-2">{s.timeLabel.split('–')[0]}</time>
                      <div className="min-w-0">
                        <b className="block truncate text-base text-ink">{s.className}</b>
                        <small className="block truncate text-xs text-muted">{s.teacherName}{s.room ? ` · ${s.room}` : ''}</small>
                      </div>
                      <Pill tone={label.tone}>{label.text}</Pill>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>

          <Panel title="Lớp đang học" action={<Link href="/lop-hoc" className="text-sm font-bold text-ink underline underline-offset-4">Xem tất cả</Link>}>
            <ul className="grid grid-cols-1 gap-2.5 min-[768px]:grid-cols-2 min-[1100px]:grid-cols-1">
              {classes.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link href={`/lop-hoc/${c.id}`} className="block rounded-[var(--radius-ctl)] border border-line p-3 hover:bg-row-hover">
                    <div className="flex items-baseline justify-between gap-3">
                      <b className="min-w-0 truncate text-base text-ink">{c.name}</b>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-ink-2">{c.studentCount}/{c.capacity}</span>
                    </div>
                    <small className="block truncate text-xs text-muted">{c.teacherName} · {c.schedule}</small>
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

// Nhãn trạng thái của buổi trong ngày (buổi tiếp theo được đánh dấu riêng ở trên)
function sessionLabel(s: { status: string; isPast: boolean }): { tone: Tone; text: string } {
  if (s.status === 'cancelled') return { tone: 'blush', text: 'Đã huỷ' };
  if (s.status === 'done') return { tone: 'stone', text: 'Đã học' };
  if (s.isPast) return { tone: 'butter', text: 'Chưa điểm danh' };
  return { tone: 'mint', text: 'Sắp học' };
}

const KPI_ALERT = 'text-blush-ink';

function Kpi({ label, value, sub, alert = false, bar }: { label: string; value: string; sub?: string; alert?: boolean; bar?: number }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-panel)] bg-surface p-4 shadow-card min-[768px]:p-5">
      <small className="block truncate text-xs text-muted min-[768px]:text-sm">{label}</small>
      <b className={`mt-1 block truncate text-xl font-extrabold tabular-nums min-[768px]:text-2xl ${alert ? KPI_ALERT : 'text-ink'}`}>{value}</b>
      {bar !== undefined && <ProgressBar value={bar} max={100} className="mt-2.5" />}
      {sub && <small className="mt-0.5 block truncate text-xs text-muted">{sub}</small>}
    </div>
  );
}

// Một loại việc cần chú ý, bấm vào để mở đúng màn
const LANE_TONE: Record<'blush' | 'butter' | 'lav', string> = {
  blush: 'bg-blush text-blush-ink',
  butter: 'bg-butter text-butter-ink',
  lav: 'bg-lav text-lav-ink',
};

function Lane({ href, icon: Icon, tone, title, hint, count }: { href: string; icon: LucideIcon; tone: keyof typeof LANE_TONE; title: string; hint: string; count: number }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-[var(--radius-ctl)] border border-line bg-row-hover p-3 hover:bg-stone">
      <span className={`grid size-9 shrink-0 place-items-center rounded-[10px] ${LANE_TONE[tone]}`}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-base text-ink">{title}</b>
        <small className="block truncate text-xs text-muted">{hint}</small>
      </span>
      <b className="text-lg font-extrabold tabular-nums text-ink">{count}</b>
    </Link>
  );
}
