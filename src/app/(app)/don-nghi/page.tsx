import { connection } from 'next/server';
import { Suspense } from 'react';
import { LeavesView } from '@/components/leaves/LeavesView';
import { NoAccess } from '@/components/ui/NoAccess';
import { getCampusContext } from '@/lib/campus-context';
import { withCampusNames } from '@/lib/campus';
import { hasPermission } from '@/lib/permissions';
import { listClassChoices } from '@/lib/queries/classes';
import { LEAVE_FILTERS, listLeaves, type LeaveFilter } from '@/lib/queries/leaves';
import { getCurrentAccount, getCurrentPermissions } from '@/lib/session';
import { makeupsOfLeaves } from '@/lib/makeup';

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

// Đơn nghỉ (37.11): đơn phụ huynh gửi qua bot và đơn giáo vụ ghi hộ. Bộ lọc nằm trên URL.
export default function LeavesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<LeavesSkeleton />}>
      <LeavesData searchParams={searchParams} />
    </Suspense>
  );
}

function LeavesSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải đơn nghỉ" className="flex flex-col gap-4">
      <div className="h-9 w-40 animate-pulse rounded-xl bg-stone" />
      <div className="h-[var(--ctl-h)] w-full animate-pulse rounded-[var(--radius-ctl)] bg-stone" />
      <div className="h-[360px] w-full animate-pulse rounded-[var(--radius-panel)] bg-stone" />
    </section>
  );
}

async function LeavesData({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const sp = await searchParams;
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'attendance.record')) return <NoAccess title="Đơn nghỉ" />;

  const account = await getCurrentAccount();
  const fRaw = first(sp.f) as LeaveFilter;
  const filter: LeaveFilter = LEAVE_FILTERS.includes(fRaw) ? fRaw : 'pending';
  const { scope } = await getCampusContext();
  const classes = withCampusNames(await listClassChoices(scope), scope === null);
  const clsRaw = Number(first(sp.cls));
  const classId = classes.some((c) => c.id === clsRaw) ? clsRaw : null;
  const { rows, counts } = await listLeaves({
    filter,
    classId,
    scope,
    teacherId: account?.role === 'teacher' ? account.teacherId : null,
  });
  const makeupMap = await makeupsOfLeaves(rows.filter((r) => r.status === 'approved').map((r) => r.id));
  const makeups = Object.fromEntries([...makeupMap].map(([id, m]) => [id, { className: m.className, startsAt: m.startsAt, endsAt: m.endsAt }]));
  return <LeavesView rows={rows} counts={counts} filter={filter} classId={classId} classes={classes.map((c) => ({ id: c.id, name: c.name }))} makeups={makeups} />;
}
