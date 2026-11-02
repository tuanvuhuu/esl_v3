'use client';

// Bảng dữ liệu dùng trực tiếp `DataGrid` của `@/components-ui` (dự án 01. TSUKUBA):
// - Tích hợp thanh công cụ 1 dòng duy nhất (`title`, `subTitle`, `searchEnable`, `actionComponent`,
//   nút dòng lọc cột, xuất Excel `.xlsx`, ẩn/hiện cột lưu `localStorage`).
import { FilterIcon } from '@primer/octicons-react';
import { IconButton } from '@primer/react';
import clsx from 'clsx';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { isValidElement, useCallback, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import UiDataGrid from '@/components-ui/data-grid';
import type {
  DataGridRowRecord,
  IDataGridColumn,
  IDataGridPaging,
  IDataGridSelectionProps,
} from '@/components-ui/data-grid/type/IDataGridProps';
import Tooltip from '@/components-ui/tooltip';
import { sortRows } from '@/lib/sort';

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
  /** Tiêu đề hoặc thanh chip bên trái thanh công cụ DataGrid. */
  title?: ReactNode;
  /** Dòng phụ bên dưới tiêu đề thanh công cụ DataGrid. */
  subTitle?: ReactNode;
  /** Các bộ lọc & nút thao tác đặt trực tiếp vào `actionComponent` bên phải thanh công cụ DataGrid. */
  actionComponent?: ReactNode;
  /** Thanh phụ ngay dưới toolbar DataGrid (tuỳ chọn). */
  subToolbarElement?: ReactNode;
  /** Bật ô lọc nhanh trực tiếp trên thanh công cụ DataGrid. */
  searchEnable?: boolean;
  /** Bật các nút tiện ích của DataGrid (dòng lọc cột, ẩn/hiện cột, xuất Excel). Mặc định bật khi bảng >= 4 cột. */
  toolbar?: boolean;
  /** Bật phân trang nội bộ của DataGrid (dùng cho các bảng không phân trang qua URL). */
  paging?: IDataGridPaging;
  /** Chọn dòng trực tiếp trên DataGrid. */
  selection?: IDataGridSelectionProps;
};

const TABLE_SHOW = {
  md: 'hidden min-[768px]:block',
  xl: 'hidden min-[1200px]:block',
} as const;
const TABLE_SHOW_FILL = {
  md: 'hidden min-[768px]:flex min-[768px]:min-h-0 min-[768px]:flex-1 min-[768px]:flex-col',
  xl: 'hidden min-[1200px]:flex min-[1200px]:min-h-0 min-[1200px]:flex-1 min-[1200px]:flex-col',
} as const;
const CARDS_HIDE_ABOVE = {
  md: 'min-[768px]:hidden',
  xl: 'min-[1200px]:hidden',
} as const;
const CARDS_MD_ONLY = 'hidden min-[768px]:flex';
const CARDS_ALL = 'flex';

function parseColumnWidth(spec: string): { width?: number; minWidth?: number } {
  const trimmed = spec.trim();
  const exactPx = /^(\d+)px$/.exec(trimmed);
  if (exactPx) {
    const px = Number(exactPx[1]);
    return { width: Math.max(48, px), minWidth: Math.max(48, px) };
  }
  const minMax = /^minmax\((\d+)px/.exec(trimmed);
  if (minMax) {
    return { minWidth: Number(minMax[1]) };
  }
  return { minWidth: 100 };
}

function extractNodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    return node.map(extractNodeText).filter(Boolean).join(' · ');
  }
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractNodeText(el.props?.children);
  }
  return '';
}

function slugKey(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
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
  title,
  subTitle,
  actionComponent,
  subToolbarElement,
  searchEnable = false,
  toolbar,
  paging,
  selection,
}: Props<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [showFilterRow, setShowFilterRow] = useState(false);

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
    (columnKey: string, mode: 'asc' | 'desc') => {
      if (controlledOnSort) {
        controlledOnSort(columnKey);
        return;
      }

      setInternalSort({ column: columnKey, direction: mode });

      const isServerUrlSync = pathname === '/hoc-sinh' || (searchParams?.has('sort') ?? false);
      if (isServerUrlSync && searchParams && router) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('sort', columnKey);
        params.set('order', mode);
        if (params.has('p')) params.set('p', '1');
        if (params.has('n')) params.set('n', '1');
        const qs = params.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname || '', { scroll: false });
      }
    },
    [controlledOnSort, searchParams, router, pathname],
  );

  const sortedRows = useMemo(() => {
    if (!activeSort || !sortable) return rows;
    const col = columns.find((c) => c.key === activeSort.column);
    return sortRows(rows, activeSort.column, activeSort.direction, col?.sortValue);
  }, [rows, activeSort, sortable, columns]);

  const dataSource: DataGridRowRecord[] = useMemo(() => {
    return sortedRows.map((row) => {
      const record: DataGridRowRecord = {
        id: rowKey(row),
        __raw: row,
      };
      for (const col of columns) {
        if (col.key === 'actions' || col.key === 'select' || col.srOnly) continue;
        if (col.sortValue) {
          const sv = col.sortValue(row);
          if (typeof sv === 'string' || typeof sv === 'number') {
            record[col.key] = sv;
            continue;
          }
        }
        const rendered = cell(row, col.key);
        record[col.key] = extractNodeText(rendered);
      }
      return record;
    });
  }, [sortedRows, columns, rowKey, cell]);

  const gridColumns: IDataGridColumn<DataGridRowRecord>[] = useMemo(() => {
    return columns.map((col, idx) => {
      const isLast = idx === columns.length - 1;
      const isActionCol = col.key === 'actions' || col.key === 'action' || col.srOnly;
      const isSelectCol = col.key === 'select';
      const dims = parseColumnWidth(col.width);
      const canSortCol = sortable && col.sortable !== false && !isActionCol && !isSelectCol;

      return {
        id: col.key,
        uuid: `col_${col.key}`,
        dataField: !isActionCol && !isSelectCol ? col.key : undefined,
        caption: col.srOnly ? '' : col.label,
        width: isActionCol ? Math.max(52, dims.width ?? 52) : isSelectCol ? Math.max(44, dims.width ?? 44) : dims.width,
        minWidth: dims.minWidth,
        align: col.align === 'end' ? 'right' : isSelectCol ? 'center' : 'left',
        fixed: (stickyEnd || isActionCol) && isLast ? 'right' : isSelectCol ? 'left' : undefined,
        isAllowSort: canSortCol,
        isDisableHederFilter: isActionCol || isSelectCol,
        cellRender: (record: DataGridRowRecord) => cell(record.__raw as T, col.key),
      };
    });
  }, [columns, sortable, stickyEnd, cell]);

  const frame = fill ? TABLE_SHOW_FILL[from] : TABLE_SHOW[from];
  const hasSelectCol = columns.some((c) => c.key === 'select' || c.key === 'stt' || c.key === 'idx');
  const showToolbar = toolbar ?? columns.length >= 4;
  const cacheKey = `esl-dg-cols-${slugKey(pathname || 'app')}-${slugKey(label)}`;
  const hasCustomHeader = Boolean(title || subTitle || actionComponent || subToolbarElement);

  const mergedActionComponent =
    actionComponent || (showToolbar && rows.length > 0) ? (
      <>
        {actionComponent}
        {showToolbar && rows.length > 0 && (
          <Tooltip text={showFilterRow ? 'Ẩn dòng lọc theo cột' : 'Hiện dòng lọc theo cột'} direction="s">
            <IconButton
              type="button"
              icon={FilterIcon}
              aria-label="Bật/tắt dòng lọc theo cột"
              unsafeDisableTooltip
              variant={showFilterRow ? 'primary' : 'default'}
              onClick={() => setShowFilterRow((v) => !v)}
            />
          </Tooltip>
        )}
      </>
    ) : undefined;

  if (rows.length === 0 && empty) {
    return (
      <div className="flex flex-col gap-2">
        {hasCustomHeader && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {(title || subTitle) && (
              <div className="min-w-0">
                {typeof title === 'string' ? (
                  <h2 className="m-0 text-base font-bold text-[var(--fgColor-default)]">{title}</h2>
                ) : (
                  title
                )}
                {typeof subTitle === 'string' ? (
                  <p className="m-0 text-xs text-[var(--fgColor-muted)]">{subTitle}</p>
                ) : (
                  subTitle
                )}
              </div>
            )}
            {actionComponent && <div className="ml-auto flex flex-wrap items-center gap-1.5">{actionComponent}</div>}
          </div>
        )}
        {subToolbarElement}
        {empty}
      </div>
    );
  }

  return (
    <>
      <div className={clsx('min-w-0', frame)} aria-label={label}>
        <UiDataGrid
          keyExpr="id"
          dataSource={dataSource}
          columns={gridColumns}
          title={title}
          subTitle={subTitle}
          actionComponent={mergedActionComponent}
          subToolbarElement={subToolbarElement}
          searchEnable={searchEnable}
          isShowRowIdx={!hasSelectCol}
          isAltertingRowColor
          filterRow={{ enable: showFilterRow }}
          sorting={{
            enable: sortable,
            field: activeSort?.column,
            mode: activeSort?.direction,
            onValueChanged: (field, mode) => handleSort(field, mode),
          }}
          paging={paging}
          selection={selection}
          exportConfig={
            showToolbar && rows.length > 0
              ? { enable: true, fileName: slugKey(label) || 'danh-sach' }
              : undefined
          }
          columnChooserConfig={
            showToolbar && rows.length > 0
              ? { enable: true, cachedKeyName: cacheKey }
              : undefined
          }
        />
      </div>

      {card && (
        <div className={`${cardsFrom === 'md' ? CARDS_MD_ONLY : CARDS_ALL} flex-col gap-2.5 ${CARDS_HIDE_ABOVE[from]}`}>
          {hasCustomHeader && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              {(title || subTitle) && (
                <div className="min-w-0">
                  {typeof title === 'string' ? (
                    <h2 className="m-0 text-base font-bold text-[var(--fgColor-default)]">{title}</h2>
                  ) : (
                    title
                  )}
                  {typeof subTitle === 'string' ? (
                    <p className="m-0 text-xs text-[var(--fgColor-muted)]">{subTitle}</p>
                  ) : (
                    subTitle
                  )}
                </div>
              )}
              {actionComponent && <div className="ml-auto flex flex-wrap items-center gap-1.5">{actionComponent}</div>}
            </div>
          )}
          {subToolbarElement}
          {sortedRows.map((row) => (
            <div key={rowKey(row)}>{card(row)}</div>
          ))}
        </div>
      )}

      {footer && <div className="mt-2">{footer}</div>}
    </>
  );
}
