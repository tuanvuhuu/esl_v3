'use client';

// Bảng dữ liệu dùng chung theo phong cách Primer + dự án 01. TSUKUBA.
// Lưu ý (E-045): mọi lớp theo breakpoint viết nguyên văn trong bảng hằng dưới đây, không ghép chuỗi lúc chạy.
import clsx from 'clsx';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { sortRows } from '@/lib/sort';
import { SortHeader } from './SortHeader';

export type GridSort = { column: string; direction: 'asc' | 'desc' };

export type GridColumn<T = unknown> = {
  key: string;
  label: string;
  width: string;
  align?: 'start' | 'end';
  srOnly?: boolean;
  sortable?: boolean;
  sortValue?: (row: T) => unknown;
};

type Props<T> = {
  label: string;
  columns: GridColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  cell: (row: T, key: string) => ReactNode;
  card?: (row: T) => ReactNode;
  cardsFrom?: 'all' | 'md';
  from?: 'md' | 'xl';
  fill?: boolean;
  stickyEnd?: boolean;
  footer?: ReactNode;
  empty?: ReactNode;
  sort?: GridSort | null;
  onSort?: (column: string) => void;
  sortable?: boolean;
};

const TABLE_SHOW = {
  md: 'hidden min-[768px]:block',
  xl: 'hidden min-[1200px]:block',
} as const;
const TABLE_SHOW_FILL = {
  md: 'hidden min-[768px]:flex min-[768px]:min-h-0 min-[768px]:flex-1 min-[768px]:flex-col',
  xl: 'hidden min-[1200px]:flex min-[1200px]:min-h-0 min-[1200px]:flex-1 min-[1200px]:flex-col',
} as const;
const BODY_FILL = {
  md: 'min-[768px]:min-h-0 min-[768px]:flex-1 min-[768px]:overflow-y-auto scroll-quiet',
  xl: 'min-[1200px]:min-h-0 min-[1200px]:flex-1 min-[1200px]:overflow-y-auto scroll-quiet',
} as const;
const BODY_X = {
  md: 'min-[768px]:overflow-x-auto',
  xl: 'min-[1200px]:overflow-x-auto',
} as const;
const CARDS_HIDE_ABOVE = {
  md: 'min-[768px]:hidden',
  xl: 'min-[1200px]:hidden',
} as const;
const CARDS_MD_ONLY = 'hidden min-[768px]:flex';
const CARDS_ALL = 'flex';

function minPx(width: string): number {
  const m = /^(?:minmax\()?(\d+)px/.exec(width);
  return m ? Number(m[1]) : 0;
}

export function DataGrid<T>({
  label,
  columns,
  rows,
  rowKey,
  cell,
  card,
  cardsFrom = 'all',
  from = 'xl',
  fill = false,
  stickyEnd = false,
  footer,
  empty,
  sort: controlledSort,
  onSort: controlledOnSort,
  sortable = true,
}: Props<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [internalSort, setInternalSort] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);

  const isControlled = controlledSort !== undefined;
  const urlSort = !isControlled && searchParams ? searchParams.get('sort') : null;
  const urlOrder = !isControlled && searchParams ? searchParams.get('order') : null;

  const activeSort: { column: string; direction: 'asc' | 'desc' } | null = useMemo(() => {
    if (isControlled) return controlledSort;
    if (urlSort) {
      return {
        column: urlSort,
        direction: urlOrder === 'desc' ? 'desc' : 'asc',
      };
    }
    return internalSort;
  }, [isControlled, controlledSort, urlSort, urlOrder, internalSort]);

  const handleSort = useCallback(
    (columnKey: string) => {
      if (controlledOnSort) {
        controlledOnSort(columnKey);
        return;
      }

      const isCurrent = activeSort?.column === columnKey;
      const nextDir: 'asc' | 'desc' | null = !isCurrent ? 'asc' : activeSort.direction === 'asc' ? 'desc' : null;

      setInternalSort(nextDir ? { column: columnKey, direction: nextDir } : null);

      const isServerUrlSync = pathname === '/hoc-sinh' || (searchParams?.has('sort') ?? false);
      if (isServerUrlSync && searchParams && router) {
        const params = new URLSearchParams(searchParams.toString());
        if (nextDir) {
          params.set('sort', columnKey);
          params.set('order', nextDir);
        } else {
          params.delete('sort');
          params.delete('order');
        }
        if (params.has('p')) params.set('p', '1');
        if (params.has('n')) params.set('n', '1');
        const qs = params.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname || '', { scroll: false });
      }
    },
    [controlledOnSort, activeSort, searchParams, router, pathname],
  );

  const displayRows = useMemo(() => {
    if (!activeSort || !sortable) return rows;
    const col = columns.find((c) => c.key === activeSort.column);
    return sortRows(rows, activeSort.column, activeSort.direction, col?.sortValue);
  }, [rows, activeSort, sortable, columns]);

  if (rows.length === 0 && empty) return <>{empty}</>;

  const template = columns.map((c) => c.width).join(' ');
  const rowMin = stickyEnd ? columns.reduce((sum, c) => sum + minPx(c.width), 0) + (columns.length - 1) * 12 + 16 : undefined;
  const pinIndex = stickyEnd ? columns.length - 1 : -1;
  const frame = fill ? TABLE_SHOW_FILL[from] : TABLE_SHOW[from];

  return (
    <>
      <div
        className={clsx(
          'overflow-hidden rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-[var(--shadow-resting-small,0_1px_2px_rgba(0,0,0,0.04))]',
          frame,
        )}
      >
        <div role="table" aria-label={label} className={fill ? BODY_FILL[from] : BODY_X[from]}>
          <div
            role="row"
            style={{ gridTemplateColumns: template, minWidth: rowMin }}
            className={clsx(
              'sticky top-0 z-10 grid items-center gap-x-3 border-b border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] py-2 text-xs font-normal text-[var(--fgColor-muted)]',
              stickyEnd ? 'pl-4' : 'px-4',
            )}
          >
            {columns.map((c) => {
              if (c.srOnly) {
                return (
                  <span key={c.key} role="columnheader" className="min-w-0">
                    <span className="sr-only">{c.label}</span>
                  </span>
                );
              }
              const isColumnSortable = sortable && c.sortable !== false && c.key !== 'actions';
              if (isColumnSortable) {
                const isSorted = activeSort?.column === c.key;
                const direction = isSorted ? activeSort.direction : undefined;
                return (
                  <span
                    key={c.key}
                    role="columnheader"
                    aria-sort={isSorted ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={clsx('min-w-0 font-normal', c.align === 'end' && 'text-right')}
                  >
                    <SortHeader
                      columnKey={c.key}
                      label={c.label}
                      align={c.align}
                      isSorted={isSorted}
                      direction={direction}
                      onSort={handleSort}
                    />
                  </span>
                );
              }
              return (
                <span key={c.key} role="columnheader" className={clsx('font-normal', c.align === 'end' && 'text-right')}>
                  {c.label}
                </span>
              );
            })}
          </div>
          {displayRows.map((row) => (
            <div
              key={rowKey(row)}
              role="row"
              style={{ gridTemplateColumns: template, minWidth: rowMin }}
              className={clsx(
                'group grid items-center gap-x-3 border-b border-[var(--borderColor-muted)] py-2 transition-colors last:border-0 hover:bg-[var(--bgColor-accent-muted)]/45',
                stickyEnd ? 'pl-4' : 'px-4',
              )}
            >
              {columns.map((c, i) => (
                <div
                  key={c.key}
                  role="cell"
                  className={clsx(
                    'min-w-0',
                    c.align === 'end' && 'flex justify-end',
                    i === pinIndex && 'sticky right-0 z-[1] bg-[var(--bgColor-default)] pr-4 group-hover:bg-[var(--row-hover)]',
                  )}
                >
                  {cell(row, c.key)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {card && (
        <div className={`${cardsFrom === 'md' ? CARDS_MD_ONLY : CARDS_ALL} flex-col gap-3 ${CARDS_HIDE_ABOVE[from]}`}>
          {displayRows.map((row) => (
            <div key={rowKey(row)}>{card(row)}</div>
          ))}
        </div>
      )}

      {footer && <div className="mt-3">{footer}</div>}
    </>
  );
}
