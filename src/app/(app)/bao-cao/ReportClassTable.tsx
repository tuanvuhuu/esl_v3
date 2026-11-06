'use client';

import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { formatVND } from '@/lib/money';

type ClassRevenueRow = {
  classId: number;
  name: string;
  total: number;
  count: number;
};

const CLASS_COLUMNS: GridColumn<ClassRevenueRow>[] = [
  { key: 'name', label: 'Lớp', width: 'minmax(180px,1.8fr)' },
  { key: 'share', label: 'Tỷ trọng', width: 'minmax(140px,1.2fr)' },
  { key: 'count', label: 'Số khoản', width: 'minmax(96px,0.6fr)', align: 'end' },
  { key: 'total', label: 'Doanh thu', width: 'minmax(136px,0.9fr)', align: 'end' },
];

export function ReportClassTable({
  rows,
  total,
  maxClassTotal,
}: {
  rows: ClassRevenueRow[];
  total: number;
  maxClassTotal: number;
}) {
  return (
    <DataGrid
      label="Doanh thu theo lớp"
      columns={CLASS_COLUMNS}
      rows={rows}
      rowKey={(c) => c.classId}
      from="md"
      fill={false}
      cell={(c, key) => {
        const ratio = total > 0 ? Math.max(0, Math.round((c.total / total) * 100)) : 0;
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
  );
}

