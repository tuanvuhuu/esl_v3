'use client';

// Bảng dữ liệu dùng trực tiếp `DataGrid` của `@/components-ui` (dự án 01. TSUKUBA):
// - Tích hợp thanh công cụ 1 dòng duy nhất (`title`, `subTitle`, `searchEnable`, `actionComponent`,
//   nút dòng lọc cột, xuất Excel `.xlsx`, ẩn/hiện cột lưu `localStorage`).
import { FilterIcon } from '@primer/octicons-react';
import { IconButton } from '@primer/react';
import clsx from 'clsx';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
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
const CARDS_HIDE_ABOVE = {
  md: 'min-[768px]:hidden',
  xl: 'min-[1200px]:hidden',
} as const;
const CARDS_MD_ONLY = 'hidden min-[768px]:flex';
const CARDS_ALL = 'flex';

function parseColumnWidth(spec: string): { width?: number; minWidth?: number; flex?: number } {
  const trimmed = spec.trim();
  const exactPx = /^(\d+)px$/.exec(trimmed);
  if (exactPx) {
    const px = Number(exactPx[1]);
    return { width: Math.max(40, px) };
  }
  const minMaxFr = /^minmax\(\s*(\d+)px\s*,\s*([\d.]+)fr\s*\)$/.exec(trimmed);
  if (minMaxFr) {
    const minPx = Number(minMaxFr[1]);
    const fr = Number(minMaxFr[2]);
    return {
      minWidth: Number.isFinite(minPx) && minPx > 0 ? minPx : undefined,
      flex: Number.isFinite(fr) && fr > 0 ? fr : 1,
    };
  }
  const pureFr = /^([\d.]+)fr$/.exec(trimmed);
  if (pureFr) {
    const fr = Number(pureFr[1]);
    return { flex: Number.isFinite(fr) && fr > 0 ? fr : 1 };
  }
  return { flex: 1 };
}

function extractNodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    return node.map(extractNodeText).filter(Boolean).join(' · ');
  }
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode; 'aria-hidden'?: boolean | 'true' | 'false' }>;
    if (el.props?.['aria-hidden'] === true || el.props?.['aria-hidden'] === 'true') return '';
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

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function DataGrid<T>({
  label,
  columns,
  rows,
  rowKey,
  cell,
  card,
  cardsFrom = 'all',
  from = 'xl',
  fill = true,
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
        if (col.key === 'select' || col.srOnly) continue;
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
      const isActionCol = Boolean(col.srOnly);
      const isSelectCol = col.key === 'select';
      const dims = parseColumnWidth(col.width);
      const canSortCol = sortable && col.sortable !== false && !isActionCol && !isSelectCol;
      const resolvedWidth = isActionCol
        ? dims.width && dims.width >= 36
          ? dims.width
          : 44
        : isSelectCol
          ? 38
          : dims.width;

      return {
        id: col.key,
        uuid: `col_${col.key}`,
        dataField: !isActionCol && !isSelectCol ? col.key : undefined,
        caption: col.srOnly ? '' : col.label,
        width: resolvedWidth,
        minWidth: resolvedWidth === undefined ? dims.minWidth : undefined,
        flex: resolvedWidth === undefined ? (dims.flex ?? 1) : undefined,
        align: col.align === 'end' ? 'right' : isSelectCol ? 'center' : 'left',
        fixed: (stickyEnd || isActionCol) && isLast ? 'right' : isSelectCol ? 'left' : undefined,
        isAllowSort: canSortCol,
        isDisableHederFilter: isActionCol || isSelectCol,
        cellRender: (record: DataGridRowRecord) => cell(record.__raw as T, col.key),
      };
    });
  }, [columns, sortable, stickyEnd, cell]);

  const gridWrapRef = useRef<HTMLDivElement>(null);
  const [autoMaxHeight, setAutoMaxHeight] = useState<number | string>('calc(100dvh - 96px)');

  useIsoLayoutEffect(() => {
    if (!fill) return;
    const measure = () => {
      const el = gridWrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      const docTop = rect.top + window.scrollY;
      let bottomSpace = 0;
      let node: HTMLElement | null = el.parentElement;
      while (node && node !== document.body) {
        const cs = window.getComputedStyle(node);
        bottomSpace +=
          (parseFloat(cs.paddingBottom) || 0) +
          (parseFloat(cs.borderBottomWidth) || 0) +
          (parseFloat(cs.marginBottom) || 0);
        if (node.tagName === 'MAIN') break;
        node = node.parentElement;
      }
      const available = Math.max(260, Math.floor(window.innerHeight - docTop - Math.max(8, bottomSpace) - 2));
      setAutoMaxHeight((prev) => (prev === available ? prev : available));
    };

    measure();
    const rafId = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    const mainEl = gridWrapRef.current?.closest('main');
    let ro: ResizeObserver | undefined;
    let mo: MutationObserver | undefined;
    const observeSiblings = () => {
      if (!ro || !mainEl) return;
      ro.disconnect();
      for (const child of Array.from(mainEl.children)) {
        if (!child.contains(gridWrapRef.current)) {
          ro.observe(child);
        }
      }
    };
    if (typeof ResizeObserver !== 'undefined' && mainEl) {
      ro = new ResizeObserver(() => measure());
      observeSiblings();
    }
    if (typeof MutationObserver !== 'undefined' && mainEl) {
      mo = new MutationObserver(() => {
        observeSiblings();
        measure();
      });
      mo.observe(mainEl, { childList: true });
    }
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', measure);
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [fill, pathname]);

  const frame = TABLE_SHOW[from];
  const hasSelectCol = columns.some((c) => c.key === 'select' || c.key === 'stt' || c.key === 'idx');
  const showToolbar = toolbar ?? columns.length >= 4;
  const cacheKey = `esl-dg-cols-${slugKey(pathname || 'app')}-${slugKey(label)}`;
  const hasCustomHeader = Boolean(title || subTitle || actionComponent || subToolbarElement);
  const resolvedPaging: IDataGridPaging | undefined = useMemo(() => {
    if (paging !== undefined) return paging;
    if (fill && !footer && dataSource.length > 15) {
      return { enable: true, pageSize: 15, pageSizeItems: [15, 30, 50, 100] };
    }
    return undefined;
  }, [paging, fill, footer, dataSource.length]);

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
                  <h2 className="m-0 text-base font-semibold text-[var(--fgColor-default)]">{title}</h2>
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
      <div ref={gridWrapRef} className={clsx('min-w-0', frame)} aria-label={label}>
        <UiDataGrid
          keyExpr="id"
          dataSource={dataSource}
          columns={gridColumns}
          maxHeight={fill ? autoMaxHeight : undefined}
          footerElement={footer}
          title={title}
          subTitle={subTitle}
          actionComponent={mergedActionComponent}
          subToolbarElement={subToolbarElement}
          searchEnable={searchEnable}
          isShowRowIdx={!hasSelectCol}
          isAltertingRowColor={false}
          filterRow={{ enable: showFilterRow }}
          sorting={{
            enable: sortable,
            field: activeSort?.column,
            mode: activeSort?.direction,
            onValueChanged: (field, mode) => handleSort(field, mode),
          }}
          paging={resolvedPaging}
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
                    <h2 className="m-0 text-base font-semibold text-[var(--fgColor-default)]">{title}</h2>
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

      {footer && <div className={clsx('mt-2', CARDS_HIDE_ABOVE[from])}>{footer}</div>}
    </>
  );
}
