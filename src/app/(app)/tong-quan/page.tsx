import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense, type ReactNode } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, Pill } from '@/components/ui/primitives';
import { formatVND } from '@/lib/money';
import { addDaysKey, dateKeyLabel, todayKeyVN, vnDateTimeLabel, vnDayBounds, weekdayLabel, weekdayOfKey } from '@/lib/datetime';
import { hasPermission } from '@/lib/permissions';
import { listOverdueAssignments } from '@/lib/queries/assignments';
import { listClasses } from '@/lib/queries/classes';
import { getDashboardStats, listFrequentAbsentees } from '@/lib/queries/dashboard';
import { listSessionsBetween } from '@/lib/queries/sessions';
import { listInvoices } from '@/lib/queries/tuition';
import { getCurrentPermissions } from '@/lib/session';

// Tổng quan: số liệu đang học, chuyên cần, công nợ, và những việc cần chú ý hôm nay. Tất cả từ DB.
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
      <div className="h-9 w-56 animate-pulse rounded-xl bg-stone" />
      <div className="grid grid-cols-2 gap-3 min-[768px]:grid-cols-4">
        <div className="h-24 animate-pulse rounded-[20px] bg-stone" />
        <div className="h-24 animate-pulse rounded-[20px] bg-stone" />
        <div className="h-24 animate-pulse rounded-[20px] bg-stone" />
        <div className="h-24 animate-pulse rounded-[20px] bg-stone" />
      </div>
      <div className="h-[260px] animate-pulse rounded-[24px] bg-stone" />
    </section>
  );
}

async function DashboardData() {
  await connection();
  const granted = new Set(await getCurrentPermissions());
  const today = todayKeyVN();
  const canStudents = hasPermission(granted, 'students.view');
  const canTuition = hasPermission(granted, 'tuition.manage');
  const canAssignments = hasPermission(granted, 'assignments.manage') || canStudents;

  const dayStart = vnDayBounds(today).start;
  const dayEnd = vnDayBounds(addDaysKey(today, 1)).start;
  const [stats, sessionsToday, classes, overdueInvoices, absentees, overdueAssignments] = await Promise.all([
    getDashboardStats(today),
    canStudents ? listSessionsBetween(dayStart, dayEnd) : Promise.resolve([]),
    canStudents ? listClasses() : Promise.resolve([]),
    canTuition ? listInvoices(today, '', 'overdue') : Promise.resolve(null),
    canStudents ? listFrequentAbsentees(today) : Promise.resolve([]),
    canAssignments ? listOverdueAssignments() : Promise.resolve([]),
  ]);

  const debtTotal = overdueInvoices?.totalDebt ?? 0;
  const topDebts = overdueInvoices ? [...overdueInvoices.rows].sort((a, b) => b.debt - a.debt).slice(0, 5) : [];
  const attentionCount = topDebts.length + absentees.length + overdueAssignments.length;
  const weekday = weekdayLabel(weekdayOfKey(today));

  return (
    <section className="flex flex-col gap-5">
      <PageHeader crumbs={['Trung tâm']} title="Tổng quan" subtitle={`${weekday}, ${dateKeyLabel(today)}. Số liệu lấy từ dữ liệu hiện tại.`} />

      <div className="grid grid-cols-2 gap-3 min-[768px]:grid-cols-4 min-[768px]:gap-4">
        <Stat label="Đang học" value={String(stats.active)} />
        <Stat label="Học thử" value={String(stats.trial)} />
        <Stat label="Chuyên cần 30 ngày" value={`${stats.attendanceRate}%`} />
        {canTuition ? (
          <Stat label="Công nợ quá hạn" value={formatVND(debtTotal)} tone={debtTotal > 0 ? 'text-blush-ink' : undefined} hint={`${overdueInvoices?.counts.overdue ?? 0} học sinh`} />
        ) : (
          <Stat label="Sắp hết buổi" value={String(stats.nearlyDone)} hint="còn từ 3 buổi" />
        )}
      </div>

      {canStudents && (
        <div className="grid gap-5 min-[1200px]:grid-cols-2">
          {/* Cần chú ý */}
          <Panel title={`Cần chú ý (${attentionCount})`}>
            {attentionCount === 0 ? (
              <EmptyState title="Hôm nay không có việc gấp" hint="Không có công nợ quá hạn, vắng nhiều hay bài quá hạn." />
            ) : (
              <div className="flex flex-col gap-5">
                {canTuition && topDebts.length > 0 && (
                  <Group title="Công nợ quá hạn">
                    {topDebts.map((r) => (
                      <Item key={r.id} href={`/hoc-phi?f=overdue&q=${encodeURIComponent(r.fullName)}`} title={r.fullName} meta={`${r.className} · hạn ${dateKeyLabel(r.dueDate)}`} right={<b className="text-sm text-blush-ink">{formatVND(r.debt)}</b>} />
                    ))}
                  </Group>
                )}
                {absentees.length > 0 && (
                  <Group title="Vắng từ hai buổi trở lên trong 7 ngày">
                    {absentees.map((a) => (
                      <Item key={a.studentId} href={`/hoc-sinh/${a.studentId}`} title={a.fullName} meta={a.className} right={<Pill tone="blush">{a.absences} buổi vắng</Pill>} />
                    ))}
                  </Group>
                )}
                {canAssignments && overdueAssignments.length > 0 && (
                  <Group title="Bài tập quá hạn">
                    {overdueAssignments.slice(0, 5).map((a) => (
                      <Item key={a.id} href={`/bai-tap/${a.id}`} title={a.title} meta={`${a.className} · hạn ${vnDateTimeLabel(new Date(a.dueAt))}`} right={<Pill tone="blush">còn {a.enrolled - a.done} chưa nộp</Pill>} />
                    ))}
                  </Group>
                )}
              </div>
            )}
          </Panel>

          <div className="flex flex-col gap-5">
            {/* Buổi học hôm nay */}
            <Panel title={`Buổi học hôm nay (${sessionsToday.length})`} action={<Link href="/lich-hoc" className="text-sm font-bold text-ink underline underline-offset-4">Xem lịch</Link>}>
              {sessionsToday.length === 0 ? (
                <EmptyState title="Hôm nay không có buổi học" hint="Xem lịch tuần để biết buổi sắp tới." />
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {sessionsToday.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <b className="block text-base text-ink">{s.timeLabel} · {s.className}</b>
                        <small className="block truncate text-xs text-muted">{s.teacherName}{s.room ? ` · ${s.room}` : ''}</small>
                      </div>
                      <Pill tone={s.status === 'cancelled' ? 'blush' : s.status === 'done' ? 'stone' : s.isPast ? 'butter' : 'mint'}>
                        {s.status === 'cancelled' ? 'Đã huỷ' : s.status === 'done' ? 'Đã học' : s.isPast ? 'Chưa điểm danh' : 'Sắp học'}
                      </Pill>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* Lớp đang học */}
            <Panel title={`Lớp học (${classes.length})`} action={<Link href="/lop-hoc" className="text-sm font-bold text-ink underline underline-offset-4">Xem tất cả</Link>}>
              <ul className="flex flex-col divide-y divide-line">
                {classes.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <Link href={`/lop-hoc/${c.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-row-hover">
                      <div className="min-w-0">
                        <b className="block truncate text-base text-ink">{c.name}</b>
                        <small className="block truncate text-xs text-muted">{c.teacherName} · {c.schedule}</small>
                      </div>
                      <small className="shrink-0 text-sm font-bold text-ink-2">{c.studentCount}/{c.capacity}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      )}

      {!canStudents && (
        <div className="rounded-[24px] bg-surface shadow-card">
          <EmptyState title="Chào mừng đến ESL Center" hint="Chọn một mục ở thanh bên hoặc tab bên dưới để bắt đầu." />
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="min-w-0 rounded-[20px] bg-surface p-4 shadow-card min-[768px]:p-5">
      <small className="block truncate text-xs font-semibold text-muted min-[768px]:text-sm">{label}</small>
      <b className={`mt-1 block truncate text-xl font-extrabold min-[768px]:text-2xl ${tone ?? 'text-ink'}`}>{value}</b>
      {hint && <small className="mt-0.5 block text-xs text-muted">{hint}</small>}
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[24px] bg-surface p-5 shadow-card max-[767px]:p-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-ink">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{title}</h3>
      <ul className="flex flex-col divide-y divide-line">{children}</ul>
    </div>
  );
}

function Item({ href, title, meta, right }: { href: string; title: string; meta: string; right?: ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex items-center justify-between gap-3 py-2.5 hover:bg-row-hover">
        <div className="min-w-0">
          <b className="block truncate text-base text-ink">{title}</b>
          <small className="block truncate text-xs text-muted">{meta}</small>
        </div>
        {right}
      </Link>
    </li>
  );
}
