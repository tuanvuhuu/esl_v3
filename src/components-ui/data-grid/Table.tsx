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
  const { dataColumn, height, stickyOffsets, sorting, onSortingChanged, filterdData } =
    props;

  return (
    <div
      ref={_wrapperRefTable}
      className={styles.tableWrapper}
      style={{ height: height }}
    >
      <table
        className={styles.table}
        style={{
          tableLayout: "fixed",
          position: "relative",
        }}
      >
        <colgroup>
          {dataColumn
            .filter((x) => x.isVisible === true)
            .map((col, idx) => (
              <col key={idx} style={col.width !== undefined ? { width: col.width } : undefined} />
            ))}
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
