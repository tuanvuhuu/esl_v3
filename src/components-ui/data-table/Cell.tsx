'use client';

import clsx from "clsx";
import React from "react";
import Text from "../text";
import TextWithEllipse from "../text-with-ellipse";
import {
  DataTableRowRecord,
  ICheckDontSaveChange,
  IFocusCell,
  IRangeSelectionProps,
} from "./DataTable";
import styles from "./DataTable.module.css";
import { SimpleCell } from "./useSimpleTable";

interface ICellProps {
  cell: SimpleCell<DataTableRowRecord>;
  focusedCell?: IFocusCell;
  rowIndex: number;
  checkDontSaveChange?: ICheckDontSaveChange;
  onFocuseCellChanged?: (data: IFocusCell) => void;
  selectedCells: Set<string>;
  rangeSelection?: IRangeSelectionProps;
  handleMouseDown: (rowIndex: number, colIndex: number) => void;
  handleMouseMove: (rowIndex: number, colIndex: number) => void;
  rowId: unknown;
  rowData: DataTableRowRecord;
  isRowSelectedSingle: boolean;
  colIndex: number;
  isHaveFocusedCell?: boolean;
  isHideenBorderWhenFocused?: boolean;
}

const Cell = (props: ICellProps) => {
  const {
    cell,
    handleMouseDown,
    handleMouseMove,
    rowId,
    rowData,
    isRowSelectedSingle,
    onFocuseCellChanged,
    colIndex,
    isHaveFocusedCell,
    selectedCells,
    rowIndex,
    isHideenBorderWhenFocused,
  } = props;

  const dataField = cell.column.dataField ?? "";
  let isDontSave = false;
  if (props.checkDontSaveChange && cell.column.isAllowFocus && dataField) {
    const rootRowData = props.checkDontSaveChange.rootDataSource.find(
      (x) => x.id === rowId,
    );
    if (rootRowData) {
      const rootValue = rootRowData[dataField];
      const currentValue = rowData[dataField];
      if (rootValue !== currentValue) {
        isDontSave = true;
      }
    }
  }

  const cellStyle: React.CSSProperties = {
    width: cell.column.width,
    minWidth: cell.column.minWidth,
    fontWeight: cell.column.isMainColumn ? "600" : 400,
    whiteSpace: "break-spaces",
    textAlign: cell.column.align,
    ...(isRowSelectedSingle && { backgroundColor: "rgba(74, 194, 107, 0.1)" }),
    ...(typeof rowData?.backgroundColor === "string" && {
      color: rowData.backgroundColor,
    }),
    left: cell.column.fixed
      ? cell.column.id === "selection"
        ? 0
        : 40
      : undefined,
  };

  const handleFocus =
    cell.column.isAllowFocus && onFocuseCellChanged
      ? () =>
          onFocuseCellChanged({
            rowData,
            dataField,
          })
      : undefined;

  const rawCellText =
    dataField && rowData[dataField] !== undefined && rowData[dataField] !== null
      ? String(rowData[dataField])
      : "";
  const displayText =
    cell.column.isHideZeroValue && rawCellText === "0" ? "" : rawCellText;

  return (
    <td
      {...cell.getCellProps()}
      key={colIndex}
      style={cellStyle}
      tabIndex={cell.column.isAllowFocus ? 0 : undefined}
      onFocus={handleFocus}
      className={clsx(
        !isHideenBorderWhenFocused &&
          props.focusedCell &&
          isHaveFocusedCell &&
          props.focusedCell.dataField === cell.column.dataField
          ? styles.focused
          : "",
        isDontSave ? styles.isDoneSave : "",
        selectedCells.has(`${rowIndex}-${colIndex}`)
          ? styles.rangeSelected
          : "",
        cell.column.fixed ? styles.fixed_column : "",
      )}
      onMouseDown={
        props.rangeSelection
          ? () => handleMouseDown(rowIndex, colIndex)
          : undefined
      }
      onMouseMove={
        props.rangeSelection
          ? () => handleMouseMove(rowIndex, colIndex)
          : undefined
      }
    >
      {cell.column.id === "col_idx" && <div>{rowIndex + 1}</div>}
      {cell.column.id !== "col_idx" && (
        <>
          {cell.column.cellRender ? (
            cell.column.cellRender(rowData)
          ) : (
            <>
              {!cell.column.isTextWithEllipseLine && (
                <Text text={displayText} />
              )}
              {cell.column.isTextWithEllipseLine && (
                <TextWithEllipse
                  lineNumber={cell.column.isTextWithEllipseLine}
                  text={displayText}
                />
              )}
            </>
          )}
        </>
      )}
    </td>
  );
};

export default Cell;
