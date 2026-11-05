'use client';

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./DataGrid.module.css";
import Header from "./Header";
import Rows from "./Rows";
import {
  DataGridRowRecord,
  ICondition,
  IDataGridColumn,
  IDataGridFocusedCell,
  IDataGridSort,
  IStickyOffsets,
  ISummaryItem,
} from "./type/IDataGridProps";
import Loading from "./Loading";
import TotalSummary from "./TotalSummary";

interface ITableProps {
  dataColumn: IDataGridColumn[];
  stickyOffsets: IStickyOffsets;
  height?: number | string;
  maxHeight?: number | string;
  sorting?: IDataGridSort;
  onSortingChanged?: (sorting: IDataGridSort) => void;
  isLoading?: boolean;
  showLoadingMode?: "inline" | "popup";
  focusedCell?: IDataGridFocusedCell;
  mainColor?: string;
  totalSummary?: ISummaryItem[];
  filterdData: DataGridRowRecord[];
  dataSource: DataGridRowRecord[];
  conditions: ICondition[];
  isAltertingRowColor?: boolean;
}

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const Table = (props: ITableProps) => {
  const _wrapperRefTable = useRef<HTMLDivElement>(null);
  const [wrapperWidth, setWrapperWidth] = useState<number>(0);
  const { dataColumn, height, maxHeight, stickyOffsets, sorting, onSortingChanged, filterdData } =
    props;

  useIsoLayoutEffect(() => {
    const el = _wrapperRefTable.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setWrapperWidth((prev) => (prev === w ? prev : w));
    };
    update();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const visibleCols = dataColumn.filter((x) => x.isVisible === true);
  const fixedSum = visibleCols.reduce(
    (sum, col) => sum + (typeof col.width === "number" ? col.width : 0),
    0,
  );
  const flexSum = visibleCols.reduce(
    (sum, col) => sum + (typeof col.width === "number" ? 0 : (col.flex ?? 1)),
    0,
  );
  const flexMinSum = visibleCols.reduce(
    (sum, col) =>
      sum +
      (typeof col.width === "number"
        ? 0
        : typeof col.minWidth === "number"
          ? col.minWidth
          : 120),
    0,
  );
  const minTableWidth = fixedSum + flexMinSum;
  const effectiveTableWidth = wrapperWidth > 0 ? Math.max(minTableWidth, wrapperWidth) : minTableWidth;
  const availableFlexWidth = Math.max(flexMinSum, effectiveTableWidth - fixedSum);

  // Phân bổ chính xác độ rộng từng cột flex để tổng không vượt quá availableFlexWidth
  const flexWidths = new Map<number, number>();
  if (flexSum > 0 && wrapperWidth > 0) {
    const flexIndices = visibleCols
      .map((col, idx) => (typeof col.width === "number" ? -1 : idx))
      .filter((idx) => idx >= 0);
    let remainingFlexWidth = availableFlexWidth;
    let remainingFlexWeight = flexSum;
    for (let i = 0; i < flexIndices.length; i++) {
      const idx = flexIndices[i];
      const col = visibleCols[idx];
      const weight = col.flex ?? 1;
      const minW = col.minWidth ?? 80;
      const isLast = i === flexIndices.length - 1;
      const allocated = isLast
        ? Math.max(minW, remainingFlexWidth)
        : Math.max(minW, Math.round((remainingFlexWidth * weight) / Math.max(0.0001, remainingFlexWeight)));
      flexWidths.set(idx, allocated);
      remainingFlexWidth = Math.max(0, remainingFlexWidth - allocated);
      remainingFlexWeight = Math.max(0, remainingFlexWeight - weight);
    }
  }

  return (
    <div
      ref={_wrapperRefTable}
      className={styles.tableWrapper}
      style={{ height: height, maxHeight: maxHeight }}
    >
      <table
        className={styles.table}
        style={{
          tableLayout: "fixed",
          position: "relative",
          minWidth: minTableWidth > 0 ? `${minTableWidth}px` : undefined,
        }}
      >
        <colgroup>
          {visibleCols.map((col, idx) => {
            if (typeof col.width === "number") {
              return <col key={col.uuid ?? idx} style={{ width: `${col.width}px` }} />;
            }
            const computedPx = flexWidths.get(idx);
            if (computedPx !== undefined) {
              return <col key={col.uuid ?? idx} style={{ width: `${computedPx}px` }} />;
            }
            const colWidth =
              flexSum > 0
                ? `calc((100% - ${fixedSum}px) * ${((col.flex ?? 1) / flexSum).toFixed(5)})`
                : undefined;
            return <col key={col.uuid ?? idx} style={colWidth ? { width: colWidth } : undefined} />;
          })}
        </colgroup>
        <Header
          stickyOffsets={stickyOffsets}
          dataColumns={dataColumn}
          sorting={sorting}
          onSortingChanged={onSortingChanged}
          dataSource={props.dataSource}
          conditions={props.conditions}
        />

        {props.isLoading && (
          <>
            {props.showLoadingMode !== "popup" && <Loading dataColumn={dataColumn} />}
          </>
        )}
        {(!props.isLoading || props.showLoadingMode === "popup") && (
          <Rows
            stickyOffsets={stickyOffsets}
            dataColumns={dataColumn}
            focusedCell={props.focusedCell}
            mainColor={props.mainColor}
            isAltertingRowColor={props.isAltertingRowColor}
          />
        )}
        {props.totalSummary && props.totalSummary.length > 0 && (
          <TotalSummary
            dataColumns={dataColumn}
            totalSummary={props.totalSummary ?? []}
            stickyOffsets={stickyOffsets}
            filterdData={filterdData}
          />
        )}
      </table>
    </div>
  );
};

export default Table;
