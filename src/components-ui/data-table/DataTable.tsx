'use client';

import { Checkbox } from "@primer/react";
import clsx from "clsx";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Column,
  ColumnInstance,
  HeaderGroup,
  SimpleRow,
  useTable,
} from "./useSimpleTable";

import { useDebounce } from "use-debounce";
import { useCommonContext } from "@/components-ui/_adapters/commonContext";
import styles from "./DataTable.module.css";
import { dynamicSort, handleFilter, handleSearch } from "./DataTableHelper";
import Header from "./Header";
import Loading from "./Loading";
import Paging from "./Paging";
import Rows from "./Rows";
import Toolbar from "./Toolbar";

export type DataTableRowRecord = Record<string, unknown>;

export interface StartCellCoords {
  rowIndex: number;
  colIndex: number;
}

export enum eSortMode {
  ASC = "asc",
  DESC = "desc",
}

export interface IFocusCell<T = DataTableRowRecord> {
  rowData: T;
  dataField: string;
}

export interface ISelectionProps {
  keyExpr?: string;
  mode: "multiple" | "single";
  onSelectionChanged: (keys: number[]) => void;
  selectedRowKeys?: number[];
}

export interface IFoucsedRow {
  keyExpr?: string;
  onFocusedRowChanged: (id: number) => void;
  focuseddRowKey?: number;
}

interface ISortConfig {
  enable: boolean;
  field?: string;
  mode: eSortMode;
  onValueChanged?: (field: string, mode: eSortMode) => void;
}

export interface IPaging {
  enable: boolean;
  pageSize?: number;
  pageSizeItems?: number[];
}

export interface IGroupingColumn<T = DataTableRowRecord> {
  dataField: string;
  groupRender?(data: T): React.JSX.Element;
}

export interface IColumn<T = DataTableRowRecord> {
  caption?: string;
  dataField?: string;
  isMainColumn?: boolean;
  fixed?: boolean;
  id?: string;
  cellRender?(data: T): React.ReactNode;
  headerRender?(data?: unknown): ReactNode;
  renderSearch?(data?: unknown): ReactNode;
  columns?: IColumn<T>[];
  width?: number | string | undefined;
  minWidth?: number | string | undefined;
  maxWidth?: number | string | undefined;
  align?: "left" | "center" | "right";
  isAllowFocus?: boolean;
  isHideZeroValue?: boolean;
  isTextWithEllipseLine?: number;
  isVisible?: boolean;
}

export interface ICheckDontSaveChange<T = DataTableRowRecord> {
  fields: string[];
  rootDataSource: T[];
}

export interface IRangeSelectionKeyDownData {
  keyCode: string;
  rowKeys: number[];
  dataFields: string[];
}

export interface IRangeSelectionProps {
  onKeyDown: (data: IRangeSelectionKeyDownData) => void;
}

interface IFilterRowConfig {
  enable: boolean;
  onConditionChanged?: (cond: ICondition[]) => void;
}

export type IComparisonOperator =
  | "equals"
  | "contains"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEqual"
  | "lessThanOrEqual";

type ILogicOperator = "and" | "or";

export type IExpression = [string, IComparisonOperator, unknown];

interface IExportConfig {
  enable: boolean;
  fileName?: string;
  onExportClick?: () => void;
}

export interface ICondition {
  field: string;
  operator: IComparisonOperator;
  value: unknown;
}

export interface IColumnChooser {
  tableName: string;
}

export interface IDataTableProps<T = DataTableRowRecord> {
  width?: string;
  columns: IColumn<T>[];
  data: T[];
  height?: string;
  title?: string;
  titleComponent?: React.ReactNode;
  subTitle?: string;
  subTitleComponent?: React.ReactNode;
  actionComponent?: React.ReactNode;
  isLoading?: boolean;
  paging?: IPaging;
  searchEnable?: boolean;
  sortConfig?: ISortConfig;
  exportEnable?: boolean;
  selection?: ISelectionProps;
  focusedRow?: IFoucsedRow;
  onFocuseCellChanged?(data: IFocusCell<T>): void;
  focusedCell?: IFocusCell<T>;
  isHideenBorderWhenFocused?: boolean;
  checkDontSaveChange?: ICheckDontSaveChange<T>;
  emptyComponent?: React.ReactNode;
  rangeSelection?: IRangeSelectionProps;
  isNoPaddingCell?: boolean;
  filterRow?: IFilterRowConfig;
  groups?: IGroupingColumn<T>[];
  isShowRowIdx?: boolean;
  actionMoreComponent?: React.ReactNode;
  contentTableComponent?: React.ReactNode;
  exportConfig?: IExportConfig;
  subToolbarElement?: ReactNode;
}

export interface IDataTableContext {
  props: IDataTableProps<DataTableRowRecord>;
  searchKey?: string;
  setSearchKey?: (searchKey: string) => void;
  sortConfig?: ISortConfig;
  setSortConfig?: (sortConfig: ISortConfig) => void;
  sortByField: string;
  headerGroups: HeaderGroup<DataTableRowRecord>[];
  allColumns: ColumnInstance<DataTableRowRecord>[];
  conditions: ICondition[];
  setConditions: (conditions: ICondition[]) => void;
  getTableBodyProps: () => { role: "rowgroup" };
  pagedData: DataTableRowRecord[];
  filterdData: DataTableRowRecord[];
  rows: SimpleRow<DataTableRowRecord>[];
  prepareRow: (row: SimpleRow<DataTableRowRecord>) => void;
  selectedCells: Set<string>;
  setSelectedCells: React.Dispatch<React.SetStateAction<Set<string>>>;
  isSelecting: boolean;
  setIsSelecting: (isSelecting: boolean) => void;
  startCell: StartCellCoords | null;
  setStartCell: (startCell: StartCellCoords | null) => void;
  pageIndex: number;
  setPageIndex: (pageIndex: number) => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  pageCount: number;
  focusedRow?: IFoucsedRow;
  expandedGroupValue?: unknown[];
  setExpandedGroupValue?: (data: unknown[]) => void;
  wrapperRef?: React.RefObject<HTMLDivElement | null>;
  exportConfig?: IExportConfig;
  isHideenBorderWhenFocused?: boolean;
}

export const DataTableContainerContext = createContext<IDataTableContext>({
  props: { columns: [], data: [] },
  sortByField: "",
  headerGroups: [],
  allColumns: [],
  conditions: [],
  setConditions: () => undefined,
  getTableBodyProps: () => ({ role: "rowgroup" as const }),
  pagedData: [],
  filterdData: [],
  rows: [],
  prepareRow: () => undefined,
  selectedCells: new Set<string>(),
  setSelectedCells: () => undefined,
  isSelecting: false,
  setIsSelecting: () => undefined,
  startCell: null,
  setStartCell: () => undefined,
  pageIndex: 0,
  setPageIndex: () => undefined,
  pageSize: 20,
  setPageSize: () => undefined,
  pageCount: 0,
  isHideenBorderWhenFocused: false,
});

const DEFAULT_LOGIC_OPERATOR: ILogicOperator = "and";

const DataTableBase = <T = DataTableRowRecord,>(props: IDataTableProps<T>) => {
  const normalizedProps = props as unknown as IDataTableProps<DataTableRowRecord>;
  const { data, isLoading, paging, groups } = normalizedProps;
  const _wrapperRef = useRef<HTMLDivElement | null>(null);
  const { translate } = useCommonContext();
  const [_searchKeyDelayed, _setSearchKeyDelayed] = useState("");
  const [_pageIndex, _setPageIndex] = useState(0);
  const [_pageSize, _setPageSize] = useState(normalizedProps.paging?.pageSize ?? 20);
  const [prevPaging, setPrevPaging] = useState<IPaging | undefined>(normalizedProps.paging);

  if (normalizedProps.paging !== prevPaging) {
    setPrevPaging(normalizedProps.paging);
    if (normalizedProps.paging) {
      _setPageSize(normalizedProps.paging.pageSize ?? 20);
    }
  }

  const [_sortConfig, _setSortConfig] = useState(normalizedProps.sortConfig);
  const [_expandedGroupValue, _setExpandedGroupValue] = useState<unknown[]>([]);

  // Trạng thái vùng được chọn
  const [_selectedCells, _setSelectedCells] = useState<Set<string>>(() => new Set<string>());
  const [_isSelecting, _setIsSelecting] = useState(false);
  const [_startCell, _setStartCell] = useState<StartCellCoords | null>(null);
  const [_conditions, _setConditions] = useState<ICondition[]>([]);

  const _selectedRowKeys = useMemo(() => {
    return new Set(normalizedProps.selection?.selectedRowKeys ?? []);
  }, [normalizedProps.selection?.selectedRowKeys]);

  const sortByField = useMemo(() => {
    return _sortConfig?.field ?? "";
  }, [_sortConfig]);

  const [prevSortByField, setPrevSortByField] = useState(sortByField);
  if (sortByField !== prevSortByField) {
    setPrevSortByField(sortByField);
    _setPageIndex(0);
  }

  const _sortMode = _sortConfig?.mode ?? eSortMode.DESC;

  const filterdData: DataTableRowRecord[] = useMemo(() => {
    let resultData: DataTableRowRecord[] = [...data];

    if (_searchKeyDelayed) {
      resultData = handleSearch(normalizedProps.columns, data, _searchKeyDelayed);
    }
    if (sortByField) {
      resultData = [...resultData].sort(dynamicSort(sortByField, _sortMode));
    }
    if (_conditions.length > 0) {
      resultData = handleFilter(_conditions, resultData, DEFAULT_LOGIC_OPERATOR);
    }
    return resultData;
  }, [
    _searchKeyDelayed,
    data,
    normalizedProps.columns,
    sortByField,
    _sortMode,
    _conditions,
  ]);

  const pageCount = useMemo(() => {
    if (_pageSize <= 0) return filterdData.length;
    const c = Math.floor(filterdData.length / _pageSize);
    if (c * _pageSize < filterdData.length) return c + 1;
    return c;
  }, [filterdData.length, _pageSize]);

  const pagedData = useMemo<DataTableRowRecord[]>(() => {
    let result: DataTableRowRecord[] = [];
    if (paging?.enable === true) {
      result = filterdData.slice(
        _pageSize * _pageIndex,
        _pageSize * _pageIndex + _pageSize,
      );
    } else {
      result = filterdData;
    }

    if (groups && groups.length > 0) {
      const resultGrouped: DataTableRowRecord[] = [];
      groups.forEach((group) => {
        const groupValues = Array.from(
          new Set(result.map((x) => x[group.dataField])),
        );
        groupValues.forEach((groupValue) => {
          const groupData = result.filter(
            (x) => x[group.dataField] === groupValue,
          );
          if (groupData.length > 0) {
            const groupRowData: DataTableRowRecord = {
              id: groupValue,
              rowDisplayType: "group",
              groupValue: groupValue,
              groupValueField: group.dataField,
              [group.dataField]: groupData[0][group.dataField],
            };
            resultGrouped.push(groupRowData);
            if (_expandedGroupValue.includes(groupValue)) {
              resultGrouped.push(...groupData);
            }
          }
        });
      });
      return resultGrouped;
    }
    return result;
  }, [
    paging?.enable,
    filterdData,
    groups,
    _pageSize,
    _pageIndex,
    _expandedGroupValue,
  ]);

  const settingColum = useCallback(
    function mapColumn(column: IColumn<DataTableRowRecord>): Column<DataTableRowRecord> {
      const col: Column<DataTableRowRecord> = {
        ...column,
        width: column.width,
        minWidth: column.minWidth,
        columns:
          column.columns && column.columns.length > 0
            ? column.columns.map((x) => mapColumn(x))
            : undefined,
        Header: column.caption ? translate(column.caption) : "",
        accessor: column.dataField ?? column.id ?? "",
      };
      return col;
    },
    [translate],
  );

  const columns = useMemo<Column<DataTableRowRecord>[]>(() => {
    const col = normalizedProps.columns
      .filter((x) => x.isVisible !== false)
      .map((x) => settingColum(x));

    const fixCol: Column<DataTableRowRecord>[] = [];
    if (normalizedProps.isShowRowIdx !== false) {
      const idxCol: Column<DataTableRowRecord> = {
        id: "col_idx",
        width: "40px",
        align: "center",
        caption: "STT",
        Header: "STT",
      };
      fixCol.push(idxCol);
    }
    if (normalizedProps.selection?.mode === "multiple") {
      const selectionCol: Column<DataTableRowRecord> = {
        id: "selection",
        width: "40px",
        align: "center",
        cellRender: (rowData: DataTableRowRecord) => {
          const id = Number(rowData.id);
          return (
            <Checkbox
              checked={_selectedRowKeys.has(id)}
              disabled={Boolean(rowData.disabled)}
              onChange={(e) => {
                if (e.target.checked) {
                  normalizedProps.selection?.onSelectionChanged([
                    ...(normalizedProps.selection?.selectedRowKeys ?? []),
                    id,
                  ]);
                } else {
                  normalizedProps.selection?.onSelectionChanged([
                    ...(normalizedProps.selection?.selectedRowKeys ?? []).filter(
                      (x) => x !== id,
                    ),
                  ]);
                }
              }}
            />
          );
        },
        headerRender: () => {
          const enabledRows = filterdData.filter((g) => !g.disabled);
          return (
            <Checkbox
              checked={
                enabledRows.length > 0 &&
                enabledRows.find(
                  (x) =>
                    !(normalizedProps.selection?.selectedRowKeys ?? []).includes(
                      Number(x.id),
                    ),
                ) === undefined
              }
              onChange={(e) => {
                const ids = enabledRows.map((x) => Number(x.id));
                if (e.target.checked) {
                  normalizedProps.selection?.onSelectionChanged(
                    Array.from(
                      new Set([
                        ...(normalizedProps.selection?.selectedRowKeys ?? []),
                        ...ids,
                      ]),
                    ),
                  );
                } else {
                  normalizedProps.selection?.onSelectionChanged(
                    Array.from(
                      new Set(
                        (normalizedProps.selection?.selectedRowKeys ?? []).filter(
                          (x) => !ids.includes(x),
                        ),
                      ),
                    ),
                  );
                }
              }}
            />
          );
        },
      };
      fixCol.push(selectionCol);
    }
    return [...fixCol, ...col];
  }, [
    normalizedProps.columns,
    normalizedProps.isShowRowIdx,
    normalizedProps.selection,
    _selectedRowKeys,
    filterdData,
    settingColum,
  ]);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    allColumns,
  } = useTable<DataTableRowRecord>({ columns, data: pagedData });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (_selectedCells.size > 0 && rows.length > 0) {
        let rowIndexs: number[] = [];
        let colIndexs: number[] = [];
        _selectedCells.forEach((cellKey) => {
          const [rowIndx, colIndex] = cellKey
            .split("-")
            .map((c) => parseInt(c, 10));
          if (!rowIndexs.includes(rowIndx)) rowIndexs.push(rowIndx);
          if (!colIndexs.includes(colIndex)) colIndexs.push(colIndex);
        });
        rowIndexs = Array.from(new Set(rowIndexs));
        colIndexs = Array.from(new Set(colIndexs));
        const rowKeys: number[] = [];
        const dataFields: string[] = [];
        rowIndexs.forEach((rowIndex) => {
          const rowData = rows[rowIndex]?.original;
          if (rowData && rowData.id !== undefined) {
            rowKeys.push(Number(rowData.id));
          }
        });
        colIndexs.forEach((colIndex) => {
          const cell = rows[0]?.cells[colIndex];
          if (cell) {
            dataFields.push(cell.column.dataField ?? "");
          }
        });

        if (normalizedProps.rangeSelection?.onKeyDown) {
          normalizedProps.rangeSelection.onKeyDown({
            dataFields,
            rowKeys,
            keyCode: e.key,
          });
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Dọn dẹp sự kiện khi component unmount
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [_selectedCells, rows, normalizedProps.rangeSelection]);

  // Kết thúc chọn vùng
  const handleMouseUp = () => {
    _setIsSelecting(false);
    _setStartCell(null);
  };

  const contextValue: IDataTableContext = {
    props: normalizedProps,
    searchKey: _searchKeyDelayed,
    setSearchKey: _setSearchKeyDelayed,
    sortConfig: _sortConfig,
    setSortConfig: _setSortConfig,
    sortByField,
    headerGroups,
    allColumns,
    conditions: _conditions,
    setConditions: _setConditions,
    getTableBodyProps,
    pagedData,
    filterdData,
    rows,
    prepareRow,
    selectedCells: _selectedCells,
    setSelectedCells: _setSelectedCells,
    isSelecting: _isSelecting,
    setIsSelecting: _setIsSelecting,
    setStartCell: _setStartCell,
    startCell: _startCell,
    pageIndex: _pageIndex,
    pageSize: _pageSize,
    setPageIndex: _setPageIndex,
    setPageSize: _setPageSize,
    pageCount,
    focusedRow: normalizedProps.focusedRow,
    expandedGroupValue: _expandedGroupValue,
    setExpandedGroupValue: _setExpandedGroupValue,
    wrapperRef: _wrapperRef,
    isHideenBorderWhenFocused: normalizedProps.isHideenBorderWhenFocused ?? false,
  };

  const [isShowLoading] = useDebounce(isLoading, 100);

  return (
    <div className="overflow-auto">
      <DataTableContainerContext.Provider value={contextValue}>
        <Toolbar />
        {normalizedProps.subToolbarElement && <>{normalizedProps.subToolbarElement}</>}
        <div
          id="warpper"
          className={clsx(
            styles.dataTable_warpper,
            paging?.enable === true
              ? styles.dataTable_warpper_pagingEnable
              : styles.dataTable_warpper_notPagingEnable,
          )}
          ref={_wrapperRef}
        >
          <div
            style={{ height: normalizedProps.height ?? "auto" }}
            className={clsx(
              styles.container,
              paging?.enable === true && pageCount > 0
                ? styles.containerHasPaging
                : "",
              styles.dataTable_container,
            )}
          >
            <table
              {...getTableProps()}
              className={clsx(
                styles.myTable,
                normalizedProps.isNoPaddingCell ? styles.noPadding : undefined,
                normalizedProps.rangeSelection ? styles.rangeSelection : undefined,
                paging?.enable === true ? styles.hasPaging : "",
              )}
              onMouseUp={normalizedProps.rangeSelection ? handleMouseUp : undefined}
            >
              <Header />
              {isShowLoading && <Loading />}
              {!isShowLoading && (
                <>
                  <Rows />
                </>
              )}
            </table>
          </div>
          {paging?.enable === true && pageCount > 0 && <Paging />}
        </div>
      </DataTableContainerContext.Provider>
    </div>
  );
};

const DataTable = Object.assign(DataTableBase, {
  Toolbar,
  Header,
  Loading,
  Rows,
  Paging,
});

export default DataTable;
