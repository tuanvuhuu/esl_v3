import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { BTN_BASE, BTN_GHOST } from '@/components/ui/Btn';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/primitives';
import { formatVND, formatVNDShort } from '@/lib/money';
import { getCampusContext } from '@/lib/campus-context';
import { monthLabel, shiftMonth, todayKeyVN, monthKey } from '@/lib/datetime';
import { hasPermission } from '@/lib/permissions';
import { getRevenueReport } from '@/lib/queries/tuition';
import { getCurrentPermissions } from '@/lib/session';
import { Panel } from '@/components/ui/surfaces';

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

// Cột bảng theo lớp trong tháng
const CLASS_COLUMNS: GridColumn[] = [
  { key: 'name', label: 'Lớp', width: 'minmax(0,1fr)' },
  { key: 'count', label: 'Số khoản', width: '120px', align: 'end' },
  { key: 'total', label: 'Doanh thu', width: '160px', align: 'end' },
];

// Báo cáo doanh thu theo tháng: tổng, số khoản thu, theo lớp, xu hướng sáu tháng. Tháng nằm trên URL.
export default function ReportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportData searchParams={searchParams} />
    </Suspense>
  );
}

function ReportSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải báo cáo" className="flex flex-col gap-4">
      <div className="h-9 w-56 animate-pulse rounded-xl bg-stone" />
      <div className="h-28 w-full animate-pulse rounded-[var(--radius-panel)] bg-stone" />
      <div className="h-[300px] w-full animate-pulse rounded-[var(--radius-panel)] bg-stone" />
    </section>
  );
}

async function ReportData({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const sp = await searchParams;
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'reports.view')) return <NoAccess title="Báo cáo doanh thu" />;

  const current = monthKey(todayKeyVN());
  const mRaw = first(sp.m);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(mRaw) ? mRaw : current;
  const monthsBack = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
  const { scope } = await getCampusContext();
  const report = await getRevenueReport(month, monthsBack, scope);
  const maxTrend = Math.max(1, ...report.trend.map((t) => t.total));
  const href = (m: string) => `/bao-cao?m=${m}`;

  const navBtn = 'grid size-[var(--icon-h)] place-items-center rounded-[var(--radius-ctl)] border border-line bg-surface text-base font-bold text-ink max-[767px]:size-[var(--icon-h-touch)]';

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Tài chính', 'Báo cáo doanh thu']}
        title="Báo cáo doanh thu"
        subtitle={`Tổng hợp từ sổ thu học phí, tháng ${monthLabel(month)}.`}
        actions={
          <div className="flex items-center gap-1.5">
            <Link href={href(shiftMonth(month, -1))} aria-label="Tháng trước" className={navBtn}>‹</Link>
            <Link href={href(current)} className={`${BTN_BASE} ${BTN_GHOST}`}>Tháng này</Link>
            <Link href={href(shiftMonth(month, 1))} aria-label="Tháng sau" className={navBtn}>›</Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-3 min-[768px]:gap-4">
        <Stat label={`Doanh thu tháng ${monthLabel(month)}`} value={formatVND(report.total)} strong />
        <Stat label="Số khoản thu" value={String(report.count)} />
        <Stat label="Trung bình mỗi khoản" value={report.count > 0 ? formatVND(Math.round(report.total / report.count)) : '—'} />
      </div>

      <Panel className="mt-4">
        <h2 className="mb-4 text-lg font-extrabold text-ink">Sáu tháng gần nhất</h2>
        <div className="grid grid-cols-6 items-end gap-2 max-[767px]:gap-1.5" role="img" aria-label="Biểu đồ doanh thu sáu tháng">
          {report.trend.map((t) => (
            <Link key={t.month} href={href(t.month)} className="flex min-w-0 flex-col items-center gap-2">
              <small className="text-xs text-ink-2 max-[767px]:text-2xs">{t.total > 0 ? formatVNDShort(t.total) : '0'}</small>
              <span className={`block w-full rounded-t-[var(--radius-ctl)] ${t.month === month ? 'bg-primary-deep' : 'bg-primary'}`} style={{ height: `${Math.max(4, Math.round((t.total / maxTrend) * 140))}px` }} />
              <small className={`text-xs ${t.month === month ? 'font-semibold text-ink' : 'text-muted'}`}>{monthLabel(t.month)}</small>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4">
        <h2 className="mb-3 text-lg font-extrabold text-ink">Theo lớp trong tháng {monthLabel(month)}</h2>
        {report.byClass.length === 0 ? (
          <EmptyState title="Chưa có khoản thu trong tháng này" hint="Chọn tháng khác ở trên hoặc ghi thu ở màn Học phí." />
        ) : (
          <>
            <DataGrid
              label="Doanh thu theo lớp"
              columns={CLASS_COLUMNS}
              rows={report.byClass}
              rowKey={(c) => c.classId}
              from="md"
              cell={(c, key) => {
                switch (key) {
                  case 'name':
                    return <b className="block truncate text-base font-bold text-ink">{c.name}</b>;
                  case 'count':
                    return <span className="text-base text-ink-2">{c.count}</span>;
                  case 'total':
                    return <span className="text-base text-ink">{formatVND(c.total)}</span>;
                  default:
                    return null;
                }
              }}
              card={(c) => (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <b className="block truncate text-base text-ink">{c.name}</b>
                    <small className="text-xs text-muted">{c.count} khoản thu</small>
                  </div>
                  <b className="shrink-0 text-base font-normal text-ink">{formatVND(c.total)}</b>
                </div>
              )}
            />
            {/* Dòng tổng, hiện dưới bảng trên mọi màn hình */}
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
              <span className="text-base text-ink-2">Tổng · {report.count} khoản thu</span>
              <b className="text-base text-ink">{formatVND(report.total)}</b>
            </div>
          </>
        )}
      </Panel>
    </section>
  );
}

function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <Panel>
      <small className="block text-sm font-normal text-muted">{label}</small>
      <b className={`mt-1.5 block ${strong ? 'text-h1 max-[767px]:text-2xl' : 'text-2xl'} font-extrabold text-ink`}>{value}</b>
    </Panel>
  );
}
