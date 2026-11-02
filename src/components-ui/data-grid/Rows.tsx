'use client';

import { ChevronDownIcon, ChevronRightIcon } from "@primer/octicons-react";
import React, { useContext, useMemo, useState } from "react";
import {
  DataGridContainerContext,
  IDataGridContainerContext,
} from "./DataGrid";
import Row from "./Row";
import {
  DataGridRowRecord,
  IDataGridColumn,
  IDataGridFocusedCell,
  IStickyOffsets,
} from "./type/IDataGridProps";
import { formatVND } from "@/components-ui/_adapters/utils";
import styles from "./DataGrid.module.css";
import clsx from "clsx";

interface IRowsProps {
  dataColumns: IDataGridColumn[];
  stickyOffsets: IStickyOffsets;
  focusedCell?: IDataGridFocusedCell;
  mainColor?: string;
  isAltertingRowColor?: boolean;
}

const SumIcon = () => {
  return (
    <img
      src="../../images/sum.svg"
      alt="sum"
      style={{
        width: "0.875rem",
      }}
    />
  );
};

const Rows = (props: IRowsProps) => {
  const { _pagedData, grouping } = useContext<IDataGridContainerContext>(
    DataGridContainerContext,
  );

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const isGroupExpanded = (groupName: string) => {
    const isDefaultExpanded = grouping?.defaultExpanded !== false;
    const state = expandedGroups[groupName];
    if (state === undefined) return isDefaultExpanded;
    return state;
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !isGroupExpanded(groupName),
    }));
  };

  const groupData = useMemo(() => {
    if (!grouping?.enable || !grouping.groupField) {
      return null;
    }
    const groups: Record<string, DataGridRowRecord[]> = {};
    _pagedData.forEach((item) => {
      const rawGroup = item[grouping.groupField];
      const groupValue = rawGroup ? String(rawGroup) : "Khác";
      if (!groups[groupValue]) {
        groups[groupValue] = [];
      }
      groups[groupValue].push(item);
    });
    return groups;
  }, [_pagedData, grouping]);

  const visibleLeafColumns = useMemo(() => {
    return props.dataColumns.filter((x) => x.isVisible === true);
  }, [props.dataColumns]);

  const firstSummaryColIndex = useMemo(() => {
    if (!grouping?.groupSummary || grouping.groupSummary.length === 0) return -1;
    const summaryList = grouping.groupSummary;
    return visibleLeafColumns.findIndex((col) =>
      summaryList.some((s) => s.dataField === col.dataField),
    );
  }, [visibleLeafColumns, grouping]);

  return (
    <>
      {_pagedData.length === 0 && (
        <tbody>
          <tr>
            <td
              colSpan={Math.max(1, visibleLeafColumns.length)}
              className="py-6 text-center text-muted"
            >
              Không tìm thấy dữ liệu phù hợp.
            </td>
          </tr>
        </tbody>
      )}
      {_pagedData.length > 0 && (
        <tbody>
          {groupData ? (
            Object.entries(groupData).map(([groupName, items]) => {
              const expanded = isGroupExpanded(groupName);

              return (
                <React.Fragment key={groupName}>
                  <tr
                    style={{ backgroundColor: "#f6f8fa", cursor: "pointer" }}
                    onClick={() => toggleGroup(groupName)}
                  >
                    {firstSummaryColIndex > 0 ? (
                      <>
                        <td
                          colSpan={firstSummaryColIndex}
                          style={{
                            padding: "8px 12px",
                            fontWeight: 600,
                            borderBottom: "1px solid #d0d7de",
                            position: "sticky",
                            left: 0,
                            zIndex: 15,
                            backgroundColor: "#f6f8fa",
                          }}
                          className={clsx(styles.fixed, styles.left)}
                        >
                          <div className="d-flex items-center gap-2">
                            {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                            <span>{groupName}</span>
                          </div>
                        </td>
                        {visibleLeafColumns.slice(firstSummaryColIndex).map((column, idx) => {
                          const sumItem = grouping?.groupSummary?.find(
                            (x) => x.dataField === column.dataField,
                          );
                          let sumValue: number | undefined = undefined;
                          if (sumItem) {
                            const { dataField, summaryType } = sumItem;
                            const values = items
                              .map((item) => item?.[dataField])
                              .filter((v) => v !== undefined && v !== null);

                            if (summaryType === "sum") {
                              sumValue = values.reduce<number>(
                                (total, v) => total + Number(v),
                                0,
                              );
                            } else if (summaryType === "count") {
                              sumValue = values.length;
                            } else if (summaryType === "min") {
                              if (values.length > 0) {
                                sumValue = Math.min(...values.map((v) => Number(v)));
                              }
                            } else if (summaryType === "max") {
                              if (values.length > 0) {
                                sumValue = Math.max(...values.map((v) => Number(v)));
                              }
                            }
                          }

                          const cellStyle: React.CSSProperties = {
                            padding: "8px 12px",
                            width: column.width,
                            minWidth: column.minWidth,
                            fontWeight: 600,
                            whiteSpace: "break-spaces",
                            textAlign: column.align ?? "right",
                            position: column.fixed ? "sticky" : "relative",
                            left:
                              column.fixed === "left"
                                ? props.stickyOffsets.leftOffsets[column.uuid ?? ""]
                                : undefined,
                            right:
                              column.fixed === "right"
                                ? props.stickyOffsets.rightOffsets[column.uuid ?? ""]
                                : undefined,
                            zIndex: column.fixed ? 15 : 1,
                            backgroundColor: "#f6f8fa",
                            borderBottom: "1px solid #d0d7de",
                          };

                          return (
                            <td
                              key={idx}
                              style={cellStyle}
                              className={clsx(
                                column.fixed ? styles.fixed : "",
                                column.fixed === "left" ? styles.left : "",
                                column.fixed === "right" ? styles.right : "",
                                column.isLastColFixed ? styles.lastFixed : "",
                              )}
                            >
                              {sumItem && sumValue !== undefined && sumValue !== 0 ? (
                                <div className="d-flex items-center">
                                  {sumItem.summaryType === "sum" && <SumIcon />}
                                  <div className="flex-1">{formatVND(sumValue)}</div>
                                </div>
                              ) : null}
                            </td>
                          );
                        })}
                      </>
                    ) : (
                      <td
                        colSpan={visibleLeafColumns.length}
                        style={{
                          padding: "8px 12px",
                          fontWeight: 600,
                          borderBottom: "1px solid #d0d7de",
                        }}
                      >
                        <div className="d-flex items-center gap-2">
                          {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                          <span>{groupName}</span>
                        </div>
                      </td>
                    )}
                  </tr>
                  {expanded &&
                    items.map((rowData, rowIndex) => (
                      <Row
                        rowData={rowData}
                        rowIndex={rowIndex}
                        key={`${groupName}-${rowIndex}`}
                        dataColumns={props.dataColumns}
                        stickyOffsets={props.stickyOffsets}
                        focusedCell={props.focusedCell}
                        mainColor={props.mainColor}
                        isAltertingRowColor={props.isAltertingRowColor}
                      />
                    ))}
                </React.Fragment>
              );
            })
          ) : (
            _pagedData.map((rowData, rowIndex) => (
              <Row
                rowData={rowData}
                rowIndex={rowIndex}
                key={rowIndex}
                dataColumns={props.dataColumns}
                stickyOffsets={props.stickyOffsets}
                focusedCell={props.focusedCell}
                mainColor={props.mainColor}
                isAltertingRowColor={props.isAltertingRowColor}
              />
            ))
          )}
        </tbody>
      )}
    </>
  );
};

export default Rows;
