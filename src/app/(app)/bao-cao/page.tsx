import { ChevronLeftIcon, ChevronRightIcon } from '@primer/octicons-react';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { BTN_BASE, BTN_GHOST } from '@/components/ui/btn-classes';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, Pill } from '@/components/ui/primitives';
import { Panel } from '@/components/ui/surfaces';
import { getCampusContext } from '@/lib/campus-context';
import { monthKey, monthLabel, shiftMonth, todayKeyVN } from '@/lib/datetime';
import { formatVND, formatVNDShort } from '@/lib/money';
import { hasPermission } from '@/lib/permissions';
import { getRevenueReport } from '@/lib/queries/tuition';
import { getCurrentPermissions } from '@/lib/session';
import { ReportMonthFilter } from './ReportMonthFilter';

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

// Cột bảng theo lớp trong tháng
const CLASS_COLUMNS: GridColumn[] = [
  { key: 'name', label: 'Lớp', width: 'minmax(180px,1.8fr)' },
  { key: 'share', label: 'Tỷ trọng', width: 'minmax(140px,1.2fr)' },
  { key: 'count', label: 'Số khoản', width: 'minmax(96px,0.6fr)', align: 'end' },
  { key: 'total', label: 'Doanh thu', width: 'minmax(136px,0.9fr)', align: 'end' },
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
      <div className="h-9 w-56 animate-pulse rounded-[var(--borderRadius-medium)] bg-[var(--bgColor-muted)]" />
      <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-3">
        <div className="h-24 animate-pulse rounded-[var(--borderRadius-large)] bg-[var(--bgColor-muted)]" />
        <div className="h-24 animate-pulse rounded-[var(--borderRadius-large)] bg-[var(--bgColor-muted)]" />
        <div className="h-24 animate-pulse rounded-[var(--borderRadius-large)] bg-[var(--bgColor-muted)]" />
      </div>
      <div className="h-[260px] w-full animate-pulse rounded-[var(--borderRadius-large)] bg-[var(--bgColor-muted)]" />
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
  const maxClassTotal = Math.max(1, ...report.byClass.map((c) => c.total));
  const href = (m: string) => `/bao-cao?m=${m}`;

  const navBtn =
    'grid size-[var(--icon-h)] place-items-center rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-default)] transition-colors hover:bg-[var(--bgColor-muted)] max-[767px]:size-[var(--icon-h-touch)]';

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Tài chính', 'Báo cáo doanh thu']}
        title="Báo cáo doanh thu"
        subtitle={`Tổng hợp từ sổ thu học phí, tháng ${monthLabel(month)}.`}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={href(shiftMonth(month, -1))} aria-label="Tháng trước" className={navBtn}>
              <ChevronLeftIcon size={16} aria-hidden />
            </Link>
            <ReportMonthFilter month={month} />
            <Link href={href(shiftMonth(month, 1))} aria-label="Tháng sau" className={navBtn}>
              <ChevronRightIcon size={16} aria-hidden />
            </Link>
            <Link href={href(current)} className={`${BTN_BASE} ${BTN_GHOST}`}>
              Tháng này
            </Link>
          </div>
        }
      />

      <div className="tsukuba-rise grid grid-cols-1 gap-3 min-[768px]:grid-cols-3">
        <Stat
          label={`Doanh thu tháng ${monthLabel(month)}`}
          value={formatVND(report.total)}
          sub={report.total > 0 ? 'Đã trừ các khoản hoàn và huỷ' : 'Chưa phát sinh khoản thu'}
          accent="border-l-[var(--primary)]"
          strong
        />
        <Stat
          label="Số khoản thu"
          value={String(report.count)}
          sub={`Giao dịch ghi nhận trong ${monthLabel(month)}`}
          accent="border-l-[#2a78d6]"
        />
        <Stat
          label="Trung bình mỗi khoản"
          value={report.count > 0 ? formatVND(Math.round(report.total / report.count)) : '—'}
          sub="Giá trị bình quân trên một lần đóng"
          accent="border-l-[#1baf7a]"
        />
      </div>

      <Panel
        title="Sáu tháng gần nhất"
        action={<Pill tone="stone">Đơn vị: VND</Pill>}
        className="tsukuba-rise mt-4"
      >
        <div className="grid grid-cols-6 items-end gap-2.5 max-[767px]:gap-1.5" role="img" aria-label="Biểu đồ doanh thu sáu tháng">
          {report.trend.map((t) => {
            const active = t.month === month;
            const pct = Math.max(4, Math.round((t.total / maxTrend) * 100));
            return (
              <Link
                key={t.month}
                href={href(t.month)}
                data-card="true"
                className={`group flex min-w-0 flex-col items-center gap-2 rounded-[var(--borderRadius-medium)] border px-2 py-2.5 transition-all duration-150 max-[767px]:px-1 ${
                  active
                    ? 'border-[var(--primary)] bg-[var(--primary-soft)]/45 shadow-2xs'
                    : 'border-transparent hover:border-[var(--borderColor-default)] hover:bg-[#f8fafc] dark:hover:bg-[var(--bgColor-muted)]/60'
                }`}
              >
                <small
                  className={`text-xs tabular-nums max-[767px]:text-2xs ${
                    active ? 'font-semibold text-[var(--primary-deep)]' : 'font-medium text-[var(--ink-2)]'
                  }`}
                >
                  {t.total > 0 ? formatVNDShort(t.total) : '0'}
                </small>
                <span className="flex h-[136px] w-full max-w-[44px] items-end overflow-hidden rounded-[var(--borderRadius-small)] bg-[#eef2f7] ring-1 ring-inset ring-black/[0.04] dark:bg-[var(--bgColor-neutral-muted)]">
                  <span
                    className={`block w-full rounded-t-[var(--borderRadius-small)] transition-all duration-200 ${
                      active
                        ? 'bg-gradient-to-t from-[#ea580c] to-[#fb923c] shadow-2xs'
                        : 'bg-gradient-to-t from-[#2563eb] to-[#60a5fa] group-hover:brightness-105'
                    }`}
                    style={{ height: `${pct}%` }}
                  />
                </span>
                <small
                  className={`font-mono text-xs tabular-nums max-[767px]:text-2xs ${
                    active ? 'font-semibold text-[var(--primary-deep)]' : 'text-[var(--fgColor-muted)]'
                  }`}
                >
                  {monthLabel(t.month)}
                </small>
              </Link>
            );
          })}
        </div>
      </Panel>

      <Panel
        title={`Theo lớp trong tháng ${monthLabel(month)}`}
        action={report.byClass.length > 0 ? <Pill tone="mint">{report.byClass.length} lớp có thu</Pill> : undefined}
        className="tsukuba-rise mt-4"
      >
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
              fill={false}
              cell={(c, key) => {
                const ratio = report.total > 0 ? Math.max(0, Math.round((c.total / report.total) * 100)) : 0;
                const barWidth = Math.max(4, Math.round((Math.max(0, c.total) / maxClassTotal) * 100));
                switch (key) {
                  case 'name':
                    return (
                      <span className="inline-flex max-w-full items-center truncate rounded-[5px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--primary-deep)]">
                        {c.name}
                      </span>
                    );
                  case 'share':
                    return (
                      <div className="flex items-center gap-2.5">
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#eef2f7] ring-1 ring-inset ring-black/[0.04] dark:bg-[var(--bgColor-neutral-muted)]">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#059669]"
                            style={{ width: `${barWidth}%` }}
                          />
                        </span>
                        <span className="w-9 text-right font-mono text-xs font-medium tabular-nums text-[var(--ink-2)]">{ratio}%</span>
                      </div>
                    );
                  case 'count':
                    return <span className="text-sm tabular-nums text-[var(--ink-2)]">{c.count}</span>;
                  case 'total':
                    return <span className="text-sm font-semibold tabular-nums text-[var(--fgColor-default)]">{formatVND(c.total)}</span>;
                  default:
                    return null;
                }
              }}
              card={(c) => {
                const barWidth = Math.max(4, Math.round((Math.max(0, c.total) / maxClassTotal) * 100));
                return (
                  <div className="flex flex-col gap-2 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-3 py-2.5 shadow-2xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="inline-flex max-w-full items-center truncate rounded-[5px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--primary-deep)]">
                          {c.name}
                        </span>
                        <small className="mt-1 block text-xs tabular-nums text-[var(--fgColor-muted)]">{c.count} khoản thu</small>
                      </div>
                      <b className="shrink-0 text-sm font-semibold tabular-nums text-[var(--fgColor-default)]">{formatVND(c.total)}</b>
                    </div>
                    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-[#eef2f7] ring-1 ring-inset ring-black/[0.04] dark:bg-[var(--bgColor-neutral-muted)]">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#059669]"
                        style={{ width: `${barWidth}%` }}
                      />
                    </span>
                  </div>
                );
              }}
            />
            {/* Phiếu tổng kết cuối bảng kiểu .slip */}
            <div className="mt-3 flex items-baseline justify-between gap-3 rounded-[var(--borderRadius-medium)] border border-dashed border-[var(--borderColor-default)] bg-[#f8fafc] px-3.5 py-2.5 dark:bg-[var(--bgColor-muted)]/60">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--fgColor-muted)]">
                Tổng cộng · {report.count} khoản thu
              </span>
              <b className="text-lg font-semibold tabular-nums text-[var(--primary)]">{formatVND(report.total)}</b>
            </div>
          </>
        )}
      </Panel>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
  strong = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] border-l-[3px] ${accent} bg-[var(--bgColor-default)] px-4 py-3.5 shadow-[var(--shadow)]`}
    >
      <small className="block text-xs font-medium text-[var(--fgColor-muted)]">{label}</small>
      <b
        className={`mt-1 block leading-tight tabular-nums ${
          strong ? 'text-2xl min-[768px]:text-[26px] text-[var(--primary)]' : 'text-2xl text-[var(--fgColor-default)]'
        } font-semibold`}
      >
        {value}
      </b>
      {sub && <small className="mt-1 block text-xs text-[var(--fgColor-muted)]">{sub}</small>}
    </div>
  );
}
