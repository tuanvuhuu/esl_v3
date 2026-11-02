'use client';

import type React from "react";
import clsx from "clsx";
import Text from "../text";
import TextWithEllipse from "../text-with-ellipse";
import styles from "./DataGrid.module.css";
import { formatDisplay } from "./type/ColumnHelper";
import {
  DataGridRowRecord,
  IDataGridColumn,
  IDataGridFocusedCell,
  IStickyOffsets,
} from "./type/IDataGridProps";

interface ICellProps {
  column: IDataGridColumn;
  rowIndex: number;
  rowId: unknown;
  rowData: DataGridRowRecord;
  colIndex: number;
  stickyOffsets: IStickyOffsets;
  focusedCell?: IDataGridFocusedCell;
  mainColor?: string;
}

const Cell = (props: ICellProps) => {
  const { column, rowData, colIndex, rowIndex, stickyOffsets } = props;
  const focusedRowId = props.focusedCell?.focusedCell?.rowData?.["id"];
  const isFocused = Boolean(
    column.isAllowFocus &&
      rowData["id"] === focusedRowId &&
      props.focusedCell?.focusedCell?.dataField === column.dataField,
  );

  const rowBgColor =
    typeof rowData.backgroundColor === "string"
      ? rowData.backgroundColor
      : undefined;

  const cellStyle: React.CSSProperties = {
    width: column.width,
    minWidth: column.minWidth,
    fontWeight: column.isMainColumn ? 500 : 400,
    padding: column.isNoPadding ? 0 : undefined,
    textAlign: column.align,
    ...(rowBgColor ? { color: rowBgColor } : {}),
    position: column.fixed ? "sticky" : "relative",
    left:
      column.fixed === "left"
        ? stickyOffsets.leftOffsets[column.uuid ?? ""]
        : undefined,
    right:
      column.fixed === "right"
        ? stickyOffsets.rightOffsets[column.uuid ?? ""]
        : undefined,
    zIndex: isFocused ? (column.fixed ? 110 : 100) : column.fixed ? 15 : 1,
    outline: isFocused
      ? `2px solid ${props.mainColor ?? "rgb(9, 105, 218)"}`
      : undefined,
    outlineOffset: isFocused ? "-2px" : undefined,
  };

  const handleFocus =
    column.isAllowFocus &&
    (column.dataField ?? column.id) &&
    props.focusedCell?.onFocusedCellChanged
      ? () =>
          props.focusedCell?.onFocusedCellChanged({
            rowData,
            dataField: column.dataField ?? column.id ?? "",
          })
      : undefined;

  const cellClassName = clsx(
    column.fixed ? styles.fixed : "",
    column.fixed === "left" ? styles.left : "",
    column.fixed === "right" ? styles.right : "",
    column.isLastColFixed ? styles.lastFixed : "",
    isFocused ? styles.focused : "",
  );

  if (column.id === "col_idx") {
    return (
      <td style={cellStyle} className={cellClassName}>
        <div className="text-xs tabular-nums text-[var(--fgColor-muted)]">{rowIndex + 1}</div>
      </td>
    );
  }

  if (column.cellRender) {
    return (
      <td
        key={colIndex}
        style={cellStyle}
        onFocus={handleFocus}
        tabIndex={column.isAllowFocus ? 0 : undefined}
        className={cellClassName}
      >
        {column.cellRender(rowData)}
      </td>
    );
  }

  const rawFieldValue = rowData[column.dataField ?? ""];
  const rawStr =
    rawFieldValue !== undefined && rawFieldValue !== null
      ? String(rawFieldValue)
      : "";

  return (
    <td
      key={colIndex}
      style={cellStyle}
      className={cellClassName}
      onFocus={handleFocus}
      tabIndex={column.isAllowFocus ? 0 : undefined}
    >
      {!column.isTextWithEllipseLine && (
        <Text
          text={
            column.isHideZeroValue && rawStr === "0"
              ? ""
              : formatDisplay(column, rawStr)
          }
        />
      )}
      {column.isTextWithEllipseLine && (
        <TextWithEllipse
          lineNumber={1}
          allowToggleText={true}
          text={column.isHideZeroValue && rawStr === "0" ? "" : rawStr}
        />
      )}
    </td>
  );
};

export default Cell;
