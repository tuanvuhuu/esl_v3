'use client';

import React, { useMemo } from 'react';

export interface Column<D extends Record<string, unknown> = Record<string, unknown>> {
  id?: string;
  Header?: React.ReactNode | ((col: ColumnInstance<D>) => React.ReactNode);
  accessor?: string | ((originalRow: D, index: number) => unknown);
  columns?: Column<D>[];
  width?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  align?: 'left' | 'center' | 'right';
  fixed?: boolean;
  caption?: string;
  dataField?: string;
  isMainColumn?: boolean;
  isAllowFocus?: boolean;
  isHideZeroValue?: boolean;
  isTextWithEllipseLine?: number;
  isVisible?: boolean;
  headerRender?(data?: unknown): React.ReactNode;
  renderSearch?(data?: unknown): React.ReactNode;
  cellRender?(data: D): React.ReactNode;
  [key: string]: unknown;
}

export interface HeaderProps {
  role: 'columnheader';
  colSpan?: number;
}

export interface ColumnInstance<D extends Record<string, unknown> = Record<string, unknown>>
  extends Column<D> {
  id: string;
  placeholderOf?: ColumnInstance<D>;
  getHeaderProps: () => HeaderProps;
  render: (type: 'Header' | string) => React.ReactNode;
}

export interface HeaderGroup<D extends Record<string, unknown> = Record<string, unknown>> {
  headers: ColumnInstance<D>[];
  getHeaderGroupProps: () => { role: 'row' };
}

export interface SimpleCell<D extends Record<string, unknown> = Record<string, unknown>> {
  column: ColumnInstance<D>;
  row: SimpleRow<D>;
  value: unknown;
  getCellProps: () => { role: 'cell' };
  render: (type: 'Cell' | string) => React.ReactNode;
}

export interface SimpleRow<D extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  index: number;
  original: D;
  values: Record<string, unknown>;
  cells: SimpleCell<D>[];
  getRowProps: () => { role: 'row' };
}

export interface UseTableOptions<D extends Record<string, unknown> = Record<string, unknown>> {
  columns: Column<D>[];
  data: D[];
}

export interface TableInstance<D extends Record<string, unknown> = Record<string, unknown>> {
  getTableProps: () => { role: 'table' };
  getTableBodyProps: () => { role: 'rowgroup' };
  headerGroups: HeaderGroup<D>[];
  rows: SimpleRow<D>[];
  allColumns: ColumnInstance<D>[];
  prepareRow: (row: SimpleRow<D>) => void;
}

function getColumnDepth<D extends Record<string, unknown>>(cols: Column<D>[]): number {
  let max = 1;
  for (const col of cols) {
    if (col.columns && col.columns.length > 0) {
      max = Math.max(max, 1 + getColumnDepth(col.columns));
    }
  }
  return max;
}

function countLeaves<D extends Record<string, unknown>>(col: Column<D>): number {
  if (!col.columns || col.columns.length === 0) return 1;
  return col.columns.reduce((sum, child) => sum + countLeaves(child), 0);
}

function toColumnInstance<D extends Record<string, unknown>>(
  col: Column<D>,
  fallbackId: string,
  colSpan = 1,
  placeholderOf?: ColumnInstance<D>,
): ColumnInstance<D> {
  const id =
    col.id ||
    (typeof col.accessor === 'string' && col.accessor) ||
    col.dataField ||
    fallbackId;

  const instance: ColumnInstance<D> = {
    ...col,
    id,
    placeholderOf,
    getHeaderProps: () => ({
      role: 'columnheader',
      ...(colSpan > 1 ? { colSpan } : {}),
    }),
    render: (type: string) => {
      if (type === 'Header') {
        if (placeholderOf) return null;
        if (typeof col.Header === 'function') {
          return col.Header(instance);
        }
        return col.Header ?? col.caption ?? '';
      }
      return null;
    },
  };
  return instance;
}

function flattenLeaves<D extends Record<string, unknown>>(
  cols: Column<D>[],
  prefix = 'col',
): ColumnInstance<D>[] {
  const leaves: ColumnInstance<D>[] = [];
  cols.forEach((col, idx) => {
    const key = `${prefix}_${idx}`;
    if (col.columns && col.columns.length > 0) {
      leaves.push(...flattenLeaves(col.columns, key));
    } else {
      leaves.push(toColumnInstance(col, key, 1));
    }
  });
  return leaves;
}

function buildHeaderGroups<D extends Record<string, unknown>>(
  cols: Column<D>[],
): HeaderGroup<D>[] {
  const maxDepth = getColumnDepth(cols);
  const levels: ColumnInstance<D>[][] = Array.from({ length: maxDepth }, () => []);

  const traverse = (items: Column<D>[], depth: number, prefix: string) => {
    items.forEach((col, idx) => {
      const key = `${prefix}_${idx}`;
      if (col.columns && col.columns.length > 0) {
        const span = countLeaves(col);
        levels[depth].push(toColumnInstance(col, key, span));
        traverse(col.columns, depth + 1, key);
      } else {
        const leafInstance = toColumnInstance(col, key, 1);
        for (let d = depth; d < maxDepth - 1; d++) {
          levels[d].push(
            toColumnInstance(
              { ...col, Header: '', headerRender: undefined },
              `${key}_ph_${d}`,
              1,
              leafInstance,
            ),
          );
        }
        levels[maxDepth - 1].push(leafInstance);
      }
    });
  };

  traverse(cols, 0, 'hdr');

  return levels.map((headers) => ({
    headers,
    getHeaderGroupProps: () => ({ role: 'row' as const }),
  }));
}

export function useTable<D extends Record<string, unknown> = Record<string, unknown>>(
  options: UseTableOptions<D>,
): TableInstance<D> {
  const { columns, data } = options;

  const allColumns = useMemo(() => flattenLeaves(columns), [columns]);
  const headerGroups = useMemo(() => buildHeaderGroups(columns), [columns]);

  const rows = useMemo<SimpleRow<D>[]>(() => {
    return data.map((original, rowIdx) => {
      const values: Record<string, unknown> = {};
      const rowObj: SimpleRow<D> = {
        id: String(rowIdx),
        index: rowIdx,
        original,
        values,
        cells: [],
        getRowProps: () => ({ role: 'row' as const }),
      };

      rowObj.cells = allColumns.map((col) => {
        let cellValue: unknown;
        if (typeof col.accessor === 'function') {
          cellValue = col.accessor(original, rowIdx);
        } else if (typeof col.accessor === 'string' && col.accessor) {
          cellValue = original?.[col.accessor];
        } else if (col.dataField) {
          cellValue = original?.[col.dataField];
        }
        values[col.id] = cellValue;

        return {
          column: col,
          row: rowObj,
          value: cellValue,
          getCellProps: () => ({ role: 'cell' as const }),
          render: () => (cellValue !== undefined && cellValue !== null ? String(cellValue) : ''),
        };
      });

      return rowObj;
    });
  }, [data, allColumns]);

  const getTableProps = () => ({ role: 'table' as const });
  const getTableBodyProps = () => ({ role: 'rowgroup' as const });
  const prepareRow = () => undefined;

  return {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    allColumns,
    prepareRow,
  };
}
