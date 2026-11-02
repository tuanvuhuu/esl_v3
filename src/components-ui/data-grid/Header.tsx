'use client';

import { useContext, useMemo } from "react";
import {
  DataGridContainerContext,
  IDataGridContainerContext,
} from "./DataGrid";

import { useCommonContext } from "@/components-ui/_adapters/commonContext";
import { ArrowDownIcon, ArrowUpIcon } from "@primer/octicons-react";
import clsx from "clsx";
import TextInput from "../text-input";
import styles from "./DataGrid.module.css";
import FilterModeSelection from "./FilterModeSelection";
import HeaderFilterButton from "./toolbar/HeaderFilterButton";
import { GetDataGridHederGroupCell } from "./type/ColumnHelper";
import {
  DataGridRowRecord,
  IComparisonOperator,
  ICondition,
  IDataGridColumn,
  IDataGridSort,
  IStickyOffsets,
} from "./type/IDataGridProps";

interface IHeaderProps {
  stickyOffsets: IStickyOffsets;
  dataColumns: IDataGridColumn[];
  sorting?: IDataGridSort;
  onSortingChanged?: (sorting: IDataGridSort) => void;
  dataSource: DataGridRowRecord[];
  conditions: ICondition[];
}

const Header = (props: IHeaderProps) => {
  const {
    _columns,
    filterRow,
    _onColumnSettingChanged,
    _conditions: conditions,
    _setConditions: setConditions,
  } = useContext<IDataGridContainerContext>(DataGridContainerContext);
  const { stickyOffsets, dataColumns } = props;
  const { translate } = useCommonContext();

  const headerGroups = useMemo(() => {
    return GetDataGridHederGroupCell(_columns.filter((x) => x.isVisible === true));
  }, [_columns]);

  const adjustColumnWidth = (
    col: IDataGridColumn,
    newWidth: number,
    colUuid: string,
  ): IDataGridColumn => {
    const result: IDataGridColumn = { ...col };
    if (col.uuid === colUuid) {
      result.width = newWidth;
      return result;
    }
    if ((col.columns?.length ?? 0) > 0) {
      result.columns = (col.columns ?? []).map((sub) =>
        adjustColumnWidth(sub, newWidth, colUuid),
      );

      result.width = result.columns
        .map((x) => x.width ?? 0)
        .reduce((a, b) => a + b, 0);
      return result;
    }
    return result;
  };

  const handleColumnResize = (columnId: string, newWidth: number) => {
    _onColumnSettingChanged(
      _columns.map((col) => adjustColumnWidth(col, newWidth, columnId)),
    );
  };

  // Thêm điều kiện mới
  const addCondition = (
    field: string,
    operator?: IComparisonOperator,
    value?: unknown,
  ) => {
    setConditions([
      ...conditions.filter((x) => x.field && x.field !== field),
      { field, operator: operator ?? "equals", value: value ?? "" },
    ]);
  };

  // Xóa điều kiện
  const removeCondition = (field: string) => {
    const newConditions = conditions.filter((x) => x.field !== field);
    setConditions([...newConditions]);
  };

  // Cập nhật điều kiện
  const updateCondition = (
    field: string,
    operator?: IComparisonOperator,
    value?: unknown,
  ) => {
    setConditions(
      [...conditions].map((c) => {
        if (c.field === field) {
          return {
            ...c,
            operator: operator ?? "equals",
            value,
          };
        }
        return c;
      }),
    );
  };

  const onFilterChange = (
    field?: string,
    operator?: IComparisonOperator,
    value?: unknown,
  ) => {
    if (!field) return;
    const cond = conditions.find((x) => x.field === field);
    if (cond) {
      updateCondition(field, operator, value ?? "");
    } else {
      addCondition(field, operator, value);
    }
  };

  return (
    <thead
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
      className={headerGroups.length > 1 ? styles.bands : ""}
    >
      {headerGroups.map((headerGroup, hIdx) => {
        return (
          <tr key={hIdx}>
            {headerGroup.cells.map((column, cIdx) => {
              const uuid = column.uuid ?? column.dataField ?? column.id ?? "";
              const sortMode =
                props.sorting &&
                props.sorting.enable !== false &&
                column.isAllowSort !== false &&
                props.sorting.field === column.dataField
                  ? props.sorting.mode
                  : undefined;
              return (
                <th
                  rowSpan={column.rowspan}
                  colSpan={column.colspan}
                  key={`${hIdx}-${cIdx}`}
                  className={clsx(
                    column.fixed ? styles.fixed : "",
                    column.fixed === "left" ? styles.left : "",
                    column.fixed === "right" ? styles.right : "",
                    column.isLastColFixed ? styles.lastFixed : "",
                  )}
                  style={{
                    textAlign: column.align ?? "left",
                    width: column.width,
                    minWidth: column.minWidth,
                    position: column.fixed ? "sticky" : "relative",
                    left:
                      column.fixed === "left"
                        ? stickyOffsets.leftOffsets[uuid]
                        : undefined,
                    right:
                      column.fixed === "right"
                        ? stickyOffsets.rightOffsets[uuid]
                        : undefined,
                    zIndex: column.fixed ? 20 : 1,
                  }}
                >
                  <div
                    className={clsx(
                      styles.headerCell,
                      column.align === "center" && "justify-center",
                    )}
                  >
                    {column.align === "right" && <div className="flex-1">&nbsp;</div>}
                    <div
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-1"
                      onClick={() => {
                        if (column.dataField && column.isAllowSort !== false) {
                          props.onSortingChanged?.({
                            enable: props.sorting?.enable ?? true,
                            onValueChanged: props.sorting?.onValueChanged,
                            field: column.dataField,
                            mode: sortMode === "asc" ? "desc" : "asc",
                          });
                        }
                      }}
                    >
                      <div className={styles.headerCaption}>
                        {column.headerRender
                          ? column.headerRender()
                          : translate(column.caption)}
                      </div>
                      {sortMode && (
                        <div className="shrink-0">
                          {sortMode === "asc" ? <ArrowUpIcon size={12} /> : <ArrowDownIcon size={12} />}
                        </div>
                      )}
                    </div>
                    {column.dataField && !column.isDisableHederFilter && (
                      <div
                        className={clsx(
                          styles.filterTrigger,
                          props.conditions.some((c) => c.field === column.dataField) &&
                            styles.filterTriggerActive,
                        )}
                      >
                        <HeaderFilterButton
                          dataSource={props.dataSource}
                          dataColumn={column}
                          conditions={props.conditions}
                          onApply={(values) => {
                            if (values.length > 0) {
                              onFilterChange(column.dataField, "includes", values);
                            } else if (column.dataField) {
                              removeCondition(column.dataField);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {column.dataField && (
                    <div
                      onMouseDown={(e) => {
                        e.persist();

                        const startWidth =
                          e.currentTarget.parentElement?.getBoundingClientRect().width ??
                          column.width ??
                          120;
                        const startX = e.clientX;

                        const onMouseMove = (e2: MouseEvent) => {
                          const delta = e2.clientX - startX;
                          const newWidth = startWidth + delta;
                          if (column.uuid) {
                            handleColumnResize(column.uuid, newWidth);
                          }
                        };

                        const onMouseUp = () => {
                          document.removeEventListener("mousemove", onMouseMove);
                          document.removeEventListener("mouseup", onMouseUp);
                        };

                        document.addEventListener("mousemove", onMouseMove);
                        document.addEventListener("mouseup", onMouseUp);
                      }}
                      className={styles.resizer}
                    />
                  )}
                </th>
              );
            })}
          </tr>
        );
      })}
      {(filterRow?.enable === true || !filterRow) &&
        headerGroups
          .filter((_, idx) => idx === headerGroups.length - 1)
          .map((_, hIdx) => {
            return (
              <tr key={hIdx}>
                {dataColumns
                  .filter((x) => x.isVisible)
                  .map((column, idx: number) => {
                    const columnCondition = conditions.find(
                      (x) => x.field === column.dataField,
                    );
                    const uuid = column.uuid ?? column.dataField ?? column.id ?? "";
                    return (
                      <th
                        style={{
                          textAlign: column.align ?? "left",
                          width: column.width,
                          minWidth: column.minWidth,
                          position: column.fixed ? "sticky" : "relative",
                          left:
                            column.fixed === "left"
                              ? stickyOffsets.leftOffsets[uuid]
                              : undefined,
                          right:
                            column.fixed === "right"
                              ? stickyOffsets.rightOffsets[uuid]
                              : undefined,
                          zIndex: column.fixed ? 20 : 1,
                          backgroundColor: "var(--bgColor-default)",
                        }}
                        className={clsx(
                          column.fixed ? styles.fixed : "",
                          column.fixed === "left" ? styles.left : "",
                          column.fixed === "right" ? styles.right : "",
                          column.isLastColFixed ? styles.lastFixed : "",
                        )}
                        key={`F${hIdx}-${idx}`}
                      >
                        <div className={styles.filterCell}>
                          {column.dataField && (
                            <TextInput
                              block
                              leadingVisual={
                                <div className={styles.filterModeAnchor}>
                                  <FilterModeSelection
                                    value={columnCondition?.operator}
                                    onChanged={(operator) => {
                                      onFilterChange(
                                        column.dataField,
                                        operator,
                                        columnCondition?.value ?? "",
                                      );
                                    }}
                                  />
                                </div>
                              }
                              className={styles.filterInput}
                              onValueDelayChanged={(value) => {
                                onFilterChange(
                                  column.dataField,
                                  columnCondition?.operator ?? "contains",
                                  value,
                                );
                              }}
                            />
                          )}
                        </div>
                      </th>
                    );
                  })}
              </tr>
            );
          })}
    </thead>
  );
};

export default Header;
