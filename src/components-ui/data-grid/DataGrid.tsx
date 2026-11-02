'use client';

import { Checkbox, Radio, Spinner } from "@primer/react";
import clsx from "clsx";
import { createContext, useMemo, useState } from "react";
import styles from "./DataGrid.module.css";
import Paging from "./Paging";
import Table from "./Table";
import Toolbar from "./toolbar/Toolbar";
import {
  dynamicSort,
  GetDataGridRowCell,
  handleFilter,
  handleSearchByDataField,
  IDataGridColumnVisible,
  IniColumns,
} from "./type/ColumnHelper";
import {
  DataGridRowRecord,
  ICondition,
  IDataGridColumn,
  IDataGridGrouping,
  IDataGridProps,
  ILogicOperator,
  IStickyOffsets,
} from "./type/IDataGridProps";

export interface IDataGridContainerContext extends IDataGridProps<DataGridRowRecord> {
  _pagedData: DataGridRowRecord[];
  _pageCount: number;
  _columns: IDataGridColumn[];
  _onColumnSettingChanged: (columns: IDataGridColumn[]) => void;
  _conditions: ICondition[];
  _setConditions: (conditions: ICondition[]) => void;
  grouping?: IDataGridGrouping<DataGridRowRecord>;
}

export const DataGridContainerContext = createContext(
  {} as IDataGridContainerContext,
);

const DataGrid = <T = DataGridRowRecord,>(props: IDataGridProps<T>) => {
  const normalizedProps = props as unknown as IDataGridProps<DataGridRowRecord>;
  const { height, maxHeight, footerElement, dataSource, columnChooserConfig } = normalizedProps;
  const logicOperator: ILogicOperator = "and";

  const [_paging, _setPaging] = useState(normalizedProps.paging);
  const [prevPagingEnable, setPrevPagingEnable] = useState(normalizedProps.paging?.enable);
  if (normalizedProps.paging?.enable !== prevPagingEnable) {
    setPrevPagingEnable(normalizedProps.paging?.enable);
    _setPaging(normalizedProps.paging);
  }
  const [_searchKeyDelayed, _setSearchKeyDelayed] = useState("");
  const [_sorting, _setSorting] = useState(normalizedProps.sorting);
  const [_conditions, _setConditions] = useState<ICondition[]>([]);
  const [prevConditions, setPrevConditions] = useState<ICondition[]>(_conditions);

  if (_conditions !== prevConditions) {
    setPrevConditions(_conditions);
    if (_paging) {
      _setPaging({
        ..._paging,
        pageIndex: 0,
      });
    }
  }

  const _pageSize = useMemo(() => {
    return _paging?.pageSize ?? 20;
  }, [_paging?.pageSize]);

  const _pageIndex = useMemo(() => {
    return _paging?.pageIndex ?? 0;
  }, [_paging?.pageIndex]);

  const baseColumns = useMemo(() => {
    let columnsVisable: IDataGridColumnVisible[] = [];
    if (
      typeof window !== "undefined" &&
      columnChooserConfig &&
      columnChooserConfig.cachedKeyName
    ) {
      const cachedData = localStorage.getItem(columnChooserConfig.cachedKeyName);
      if (cachedData) {
        try {
          columnsVisable = JSON.parse(cachedData) as IDataGridColumnVisible[];
        } catch {
          columnsVisable = [];
        }
      }
    }
    return IniColumns(normalizedProps.columns, columnsVisable);
  }, [normalizedProps.columns, columnChooserConfig]);

  const dataFields = useMemo(() => {
    return baseColumns
      .filter((x) => x.dataField)
      .map((x) => x.dataField as string);
  }, [baseColumns]);

  const filterdData: DataGridRowRecord[] = useMemo(() => {
    let resultData: DataGridRowRecord[] = [...dataSource];

    if (_searchKeyDelayed) {
      resultData = handleSearchByDataField(
        dataFields ?? [],
        dataSource,
        _searchKeyDelayed,
      );
    }
    if (_sorting?.enable !== false && _sorting?.mode && _sorting.field) {
      resultData = [...resultData].sort(dynamicSort(_sorting.field, _sorting.mode));
    }
    if (_conditions.length > 0) {
      resultData = handleFilter(_conditions, resultData, logicOperator);
    }
    return resultData;
  }, [dataSource, _searchKeyDelayed, dataFields, _sorting, _conditions, logicOperator]);

  const _pageCount = useMemo(() => {
    if (_pageSize <= 0) return filterdData.length;
    const c = Math.floor(filterdData.length / _pageSize);
    if (c * _pageSize < filterdData.length) return c + 1;
    return c;
  }, [filterdData.length, _pageSize]);

  const safePageIndex = useMemo(() => {
    return Math.min(_pageIndex, Math.max(0, _pageCount - 1));
  }, [_pageIndex, _pageCount]);

  const _pagedData = useMemo(() => {
    if (_paging?.enable === true) {
      return filterdData.slice(
        _pageSize * safePageIndex,
        _pageSize * safePageIndex + _pageSize,
      );
    }
    return filterdData;
  }, [filterdData, safePageIndex, _pageSize, _paging?.enable]);

  const keyField = normalizedProps.keyExpr ?? "id";

  const filterdDataKeys = useMemo(() => {
    return filterdData.map((x) => x[keyField] as number | string);
  }, [filterdData, keyField]);

  const selectedRowKeys = useMemo(() => {
    return normalizedProps.selection?.selectedRowKeys ?? [];
  }, [normalizedProps.selection]);

  const isSelectedAll = useMemo(() => {
    return (
      filterdDataKeys.find((x) => !selectedRowKeys.includes(x)) === undefined
    );
  }, [selectedRowKeys, filterdDataKeys]);

  const selectionColumn: IDataGridColumn | null = useMemo(() => {
    if (!normalizedProps.selection) return null;
    const selectionCfg = normalizedProps.selection;
    return {
      id: "selection",
      width: 36,
      align: "center",
      caption: "#",
      fixed: "left",
      isVisible: true,
      uuid: "__col_selection__",
      headerRender: () => {
        return (
          <div className="d-flex items-center justify-center">
            {selectionCfg.mode === "multiple" && (
              <Checkbox
                checked={isSelectedAll}
                onChange={(e) => {
                  if (e.target.checked) {
                    selectionCfg.onSelectionChanged(filterdDataKeys);
                  } else {
                    selectionCfg.onSelectionChanged([]);
                  }
                }}
              />
            )}
          </div>
        );
      },
      cellRender: (data: DataGridRowRecord) => {
        const rowKey = data[keyField] as number | string;
        return (
          <div className="d-flex items-center justify-center">
            {selectionCfg.mode === "multiple" && (
              <Checkbox
                checked={selectedRowKeys.includes(rowKey)}
                onChange={(e) => {
                  if (e.target.checked) {
                    selectionCfg.onSelectionChanged([
                      ...selectedRowKeys,
                      rowKey,
                    ]);
                  } else {
                    selectionCfg.onSelectionChanged(
                      selectedRowKeys.filter((x) => x !== rowKey),
                    );
                  }
                }}
              />
            )}
            {selectionCfg.mode === "single" && (
              <Radio
                name={String(rowKey)}
                value={String(rowKey)}
                aria-label="Select row"
                checked={selectedRowKeys.includes(rowKey)}
                onChange={(e) => {
                  if (e.target.checked) {
                    selectionCfg.onSelectionChanged([rowKey]);
                  } else {
                    selectionCfg.onSelectionChanged([]);
                  }
                }}
              />
            )}
          </div>
        );
      },
    };
  }, [normalizedProps.selection, keyField, isSelectedAll, selectedRowKeys, filterdDataKeys]);

  const idxColumn: IDataGridColumn | null = useMemo(() => {
    if (normalizedProps.isShowRowIdx === false) return null;
    return {
      id: "col_idx",
      width: 36,
      align: "center",
      caption: "#",
      fixed: "left",
      isVisible: true,
      uuid: "__col_idx__",
    };
  }, [normalizedProps.isShowRowIdx]);

  const finalColumns = useMemo(() => {
    const cols: IDataGridColumn[] = [];
    if (idxColumn) cols.push(idxColumn);
    if (selectionColumn) cols.push(selectionColumn);
    cols.push(...baseColumns);
    return cols;
  }, [baseColumns, selectionColumn, idxColumn]);

  const [_columns, _setColumns] = useState<IDataGridColumn[]>(finalColumns);
  const [prevFinalColumns, setPrevFinalColumns] = useState<IDataGridColumn[]>(finalColumns);
  if (finalColumns !== prevFinalColumns) {
    setPrevFinalColumns(finalColumns);
    _setColumns(finalColumns);
  }

  const dataColumn = useMemo(() => {
    return GetDataGridRowCell(_columns);
  }, [_columns]);

  const stickyOffsets: IStickyOffsets = useMemo(() => {
    const leftOffsets: Record<string, number> = {};
    let left = 0;
    const rightOffsets: Record<string, number> = {};
    let right = 0;
    dataColumn
      .filter((x) => x.isVisible)
      .forEach((col) => {
        if (col.fixed === "left") {
          leftOffsets[col.uuid ?? ""] = left;
          left += col.width ?? 100;
        }
      });
    [...dataColumn.filter((x) => x.isVisible)].reverse().forEach((col) => {
      if (col.fixed === "right") {
        rightOffsets[col.uuid ?? ""] = right;
        right += col.width ?? 100;
      }
    });

    return { leftOffsets, rightOffsets };
  }, [dataColumn]);

  const _onColumnSettingChanged = (columns: IDataGridColumn[]) => {
    _setColumns(columns);
  };

  const contextValue: IDataGridContainerContext = {
    ...normalizedProps,
    _pagedData,
    _pageCount,
    _columns,
    _onColumnSettingChanged,
    _conditions,
    _setConditions,
    grouping: normalizedProps.grouping,
  };

  const isConstrained = height !== undefined || maxHeight !== undefined;
  const showBuiltInPaging = _paging?.enable === true && _pageCount > 0;
  const hasFooterArea = showBuiltInPaging || Boolean(footerElement);

  return (
    <DataGridContainerContext.Provider value={contextValue}>
      <div
        style={{ height: height, maxHeight: maxHeight }}
        className={clsx(
          styles.container,
          isConstrained && styles.fixedHeight,
          normalizedProps.isLoading &&
            normalizedProps.showLoadingMode === "popup" &&
            styles.grayscale,
        )}
      >
        <div className={clsx(styles.toolbarArea, "pb-1")}>
          <Toolbar
            onSearchKeyChanged={_setSearchKeyDelayed}
            filterdData={filterdData}
            dataColumns={dataColumn}
          />
          {typeof props.subToolbarElement === "function"
            ? props.subToolbarElement(filterdData as unknown as T[])
            : props.subToolbarElement}
        </div>
        <div className={styles.tableArea}>
          <Table
            isAltertingRowColor={normalizedProps.isAltertingRowColor !== false}
            conditions={_conditions}
            dataSource={normalizedProps.dataSource}
            dataColumn={dataColumn}
            stickyOffsets={stickyOffsets}
            height={height !== undefined ? "100%" : undefined}
            maxHeight={maxHeight !== undefined && height === undefined ? "100%" : undefined}
            sorting={_sorting}
            onSortingChanged={(value) => {
              if (_sorting?.enable !== false) {
                _setSorting(value);
              }
            }}
            isLoading={normalizedProps.isLoading}
            showLoadingMode={normalizedProps.showLoadingMode}
            focusedCell={normalizedProps.focusedCell}
            mainColor={"#1a7f37"}
            totalSummary={normalizedProps.totalSummary}
            filterdData={filterdData}
          />
        </div>
        {hasFooterArea && (
          <div className={clsx(styles.pagingArea, "pt-1.5")}>
            {showBuiltInPaging && (
              <Paging
                pageSizeItems={_paging?.pageSizeItems}
                pageCount={_pageCount}
                pageIndex={safePageIndex}
                pageSize={_pageSize}
                totalCount={filterdData.length}
                onPagingChanged={(pageIndex, pageSize) => {
                  _setPaging({
                    enable: _paging?.enable ?? true,
                    pageSizeItems: _paging?.pageSizeItems,
                    pageIndex,
                    pageSize,
                  });
                }}
              />
            )}
            {footerElement}
          </div>
        )}
        {normalizedProps.isLoading &&
          normalizedProps.showLoadingMode === "popup" && (
            <div id="loading-overlay" className={styles.loadingOverlay}>
              <div className={styles.loadingBox}>
                <Spinner size="small" />
                <div>Đang tải</div>
              </div>
            </div>
          )}
      </div>
    </DataGridContainerContext.Provider>
  );
};

export default DataGrid;
