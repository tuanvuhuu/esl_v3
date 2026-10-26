import { connection } from 'next/server';
import { Suspense } from 'react';
import { TuitionView } from '@/components/tuition/TuitionView';
import { NoAccess } from '@/components/ui/NoAccess';
import { getCampusContext } from '@/lib/campus-context';
import { todayKeyVN } from '@/lib/datetime';
import { hasPermission } from '@/lib/permissions';
import { listInvoices, type InvoiceFilter } from '@/lib/queries/tuition';
import { getCurrentPermissions } from '@/lib/session';

type SearchParams = Record<string, string | string[] | undefined>;

const FILTERS: InvoiceFilter[] = ['all', 'paid', 'partial', 'unpaid', 'overdue'];

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

// Học phí. Bộ lọc và tìm kiếm nằm trên URL. Dữ liệu đọc trong Suspense (cacheComponents đang bật).
export default function TuitionPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<TuitionSkeleton />}>
      <TuitionData searchParams={searchParams} />
    </Suspense>
  );
}

function TuitionSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải học phí" className="flex flex-col gap-4">
      <div className="h-9 w-40 animate-pulse rounded-xl bg-stone" />
      <div className="h-[var(--ctl-h)] w-full animate-pulse rounded-[var(--radius-ctl)] bg-stone" />
      <div className="h-[420px] w-full animate-pulse rounded-[var(--radius-panel)] bg-stone" />
    </section>
  );
}

async function TuitionData({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const sp = await searchParams;
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'tuition.manage')) return <NoAccess title="Học phí" />;

  const fRaw = first(sp.f) as InvoiceFilter;
  const filter: InvoiceFilter = FILTERS.includes(fRaw) ? fRaw : 'all';
  const q = first(sp.q).slice(0, 80);
  const { scope } = await getCampusContext();
  const { rows, counts, totalDebt, totals } = await listInvoices(todayKeyVN(), q, filter, scope);

  return <TuitionView rows={rows} counts={counts} totalDebt={totalDebt} totals={totals} filter={filter} q={q} canManage={hasPermission(granted, 'tuition.manage')} />;
}
