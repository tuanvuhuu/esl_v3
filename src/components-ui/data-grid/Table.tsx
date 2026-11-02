'use client';

import { useRef } from "react";
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

const Table = (props: ITableProps) => {
  const _wrapperRefTable = useRef<HTMLDivElement>(null);
  const { dataColumn, height, maxHeight, stickyOffsets, sorting, onSortingChanged, filterdData } =
    props;

  const visibleCols = dataColumn.filter((x) => x.isVisible === true);
  const fixedSum = visibleCols.reduce(
    (sum, col) => sum + (typeof col.width === "number" ? col.width : 0),
    0,
  );
  const flexSum = visibleCols.reduce(
    (sum, col) => sum + (typeof col.width === "number" ? 0 : (col.flex ?? 1)),
    0,
  );

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
        }}
      >
        <colgroup>
          {visibleCols.map((col, idx) => {
            const colWidth =
              typeof col.width === "number"
                ? `${col.width}px`
                : flexSum > 0
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
