import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/primitives';
import { formatVND, formatVNDShort } from '@/lib/money';
import { monthLabel, shiftMonth, todayKeyVN, monthKey } from '@/lib/datetime';
import { hasPermission } from '@/lib/permissions';
import { getRevenueReport } from '@/lib/queries/tuition';
import { getCurrentPermissions } from '@/lib/session';

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

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
      <div className="h-28 w-full animate-pulse rounded-[24px] bg-stone" />
      <div className="h-[300px] w-full animate-pulse rounded-[24px] bg-stone" />
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
  const report = await getRevenueReport(month, monthsBack);
  const maxTrend = Math.max(1, ...report.trend.map((t) => t.total));
  const href = (m: string) => `/bao-cao?m=${m}`;

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Tài chính', 'Báo cáo doanh thu']}
        title="Báo cáo doanh thu"
        subtitle={`Tổng hợp từ sổ thu học phí, tháng ${monthLabel(month)}.`}
        actions={
          <div className="flex items-center gap-1.5">
            <Link href={href(shiftMonth(month, -1))} aria-label="Tháng trước" className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-lg font-bold text-ink">‹</Link>
            <Link href={href(current)} className="inline-flex h-10 items-center rounded-xl border border-line bg-surface px-4 text-base font-bold text-ink">Tháng này</Link>
            <Link href={href(shiftMonth(month, 1))} aria-label="Tháng sau" className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-lg font-bold text-ink">›</Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-3 min-[768px]:gap-4">
        <Stat label={`Doanh thu tháng ${monthLabel(month)}`} value={formatVND(report.total)} strong />
        <Stat label="Số khoản thu" value={String(report.count)} />
        <Stat label="Trung bình mỗi khoản" value={report.count > 0 ? formatVND(Math.round(report.total / report.count)) : '—'} />
      </div>

      <section className="mt-4 rounded-[24px] bg-surface p-5 shadow-card max-[767px]:p-4">
        <h2 className="mb-4 text-lg font-extrabold text-ink">Sáu tháng gần nhất</h2>
        <div className="grid grid-cols-6 items-end gap-2 max-[767px]:gap-1.5" role="img" aria-label="Biểu đồ doanh thu sáu tháng">
          {report.trend.map((t) => (
            <Link key={t.month} href={href(t.month)} className="flex min-w-0 flex-col items-center gap-2">
              <small className="text-xs font-bold text-ink-2 max-[767px]:text-2xs">{t.total > 0 ? formatVNDShort(t.total) : '0'}</small>
              <span className={`block w-full rounded-t-xl ${t.month === month ? 'bg-primary-deep' : 'bg-primary'}`} style={{ height: `${Math.max(4, Math.round((t.total / maxTrend) * 140))}px` }} />
              <small className={`text-xs ${t.month === month ? 'font-bold text-ink' : 'text-muted'}`}>{monthLabel(t.month)}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-[24px] bg-surface p-5 shadow-card max-[767px]:p-4">
        <h2 className="mb-3 text-lg font-extrabold text-ink">Theo lớp trong tháng {monthLabel(month)}</h2>
        {report.byClass.length === 0 ? (
          <EmptyState title="Chưa có khoản thu trong tháng này" hint="Chọn tháng khác ở trên hoặc ghi thu ở màn Học phí." />
        ) : (
          <>
            <div className="hidden min-[768px]:block">
              <table className="w-full text-left text-base">
                <thead>
                  <tr className="border-b border-line text-xs font-semibold text-muted">
                    <th className="py-2.5 font-semibold">Lớp</th>
                    <th className="py-2.5 text-right font-semibold">Số khoản</th>
                    <th className="py-2.5 text-right font-semibold">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byClass.map((c) => (
                    <tr key={c.classId} className="border-b border-line last:border-0">
                      <td className="py-3 font-bold text-ink">{c.name}</td>
                      <td className="py-3 text-right text-ink-2">{c.count}</td>
                      <td className="py-3 text-right font-bold text-ink">{formatVND(c.total)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="pt-3 font-extrabold text-ink">Tổng</td>
                    <td className="pt-3 text-right font-bold text-ink-2">{report.count}</td>
                    <td className="pt-3 text-right font-extrabold text-ink">{formatVND(report.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="flex flex-col divide-y divide-line min-[768px]:hidden">
              {report.byClass.map((c) => (
                <li key={c.classId} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <b className="block truncate text-base text-ink">{c.name}</b>
                    <small className="text-xs text-muted">{c.count} khoản thu</small>
                  </div>
                  <b className="shrink-0 text-base text-ink">{formatVND(c.total)}</b>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </section>
  );
}

function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-[24px] bg-surface p-5 shadow-card max-[767px]:p-4">
      <small className="block text-sm font-semibold text-muted">{label}</small>
      <b className={`mt-1.5 block ${strong ? 'text-h1 max-[767px]:text-2xl' : 'text-2xl'} font-extrabold text-ink`}>{value}</b>
    </div>
  );
}
