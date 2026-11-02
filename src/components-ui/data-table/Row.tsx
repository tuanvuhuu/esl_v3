'use client';

import Cell from "./Cell";
import {
  DataTableRowRecord,
  ICheckDontSaveChange,
  IFocusCell,
  IFoucsedRow,
  IRangeSelectionProps,
  ISelectionProps,
} from "./DataTable";
import styles from "./DataTable.module.css";
import GroupRow from "./GroupRow";
import { SimpleRow } from "./useSimpleTable";

interface IRowProps {
  selection?: ISelectionProps;
  row: SimpleRow<DataTableRowRecord>;
  focusedCell?: IFocusCell;
  rowIndex: number;
  checkDontSaveChange?: ICheckDontSaveChange;
  onFocuseCellChanged?: (data: IFocusCell) => void;
  selectedCells: Set<string>;
  rangeSelection?: IRangeSelectionProps;
  focusedRow?: IFoucsedRow;
  handleMouseDown: (rowIndex: number, colIndex: number) => void;
  handleMouseMove: (rowIndex: number, colIndex: number) => void;
  isHideenBorderWhenFocused?: boolean;
}

const checkIfRowSelectedSingle = (
  rowId: unknown,
  selection?: ISelectionProps,
): boolean => {
  if (!selection || selection.mode !== "single") return false;
  if (
    selection.selectedRowKeys &&
    selection.selectedRowKeys.length > 0 &&
    selection.selectedRowKeys[0] === rowId
  ) {
    return true;
  }
  return false;
};

const Row = (props: IRowProps) => {
  const {
    selection,
    row,
    rowIndex,
    selectedCells,
    handleMouseDown,
    handleMouseMove,
    onFocuseCellChanged,
    isHideenBorderWhenFocused,
  } = props;
  const rawRowId = row.original.id;
  const isRowSelectedSingle = checkIfRowSelectedSingle(rawRowId, selection);
  const isHaveFocusedCell = Boolean(
    props.focusedCell && props.focusedCell.rowData.id === rawRowId,
  );

  const handleRowClick = () => {
    const numericId = Number(rawRowId);
    if (selection?.mode === "single") {
      selection?.onSelectionChanged?.([numericId]);
    }
    if (props.focusedRow) {
      props.focusedRow?.onFocusedRowChanged?.(numericId);
    }
  };

  return (
    <tr
      {...row.getRowProps()}
      onClick={handleRowClick}
      key={rowIndex}
      className={
        props.focusedRow?.focuseddRowKey === rawRowId
          ? styles.focusedRow
          : ""
      }
    >
      {row.original.rowDisplayType === "group" && (
        <GroupRow row={row} selection={selection} />
      )}
      {row.original.rowDisplayType !== "group" &&
        row.cells.map((cell, colIndex) => {
          return (
            <Cell
              isHideenBorderWhenFocused={isHideenBorderWhenFocused}
              cell={cell}
              colIndex={colIndex}
              handleMouseDown={handleMouseDown}
              handleMouseMove={handleMouseMove}
              isRowSelectedSingle={isRowSelectedSingle}
              rowData={row.original}
              rowId={rawRowId}
              rowIndex={rowIndex}
              selectedCells={selectedCells}
              checkDontSaveChange={props.checkDontSaveChange}
              focusedCell={props.focusedCell}
              isHaveFocusedCell={isHaveFocusedCell}
              key={`${String(rawRowId)}-${colIndex}`}
              onFocuseCellChanged={onFocuseCellChanged}
              rangeSelection={props.rangeSelection}
            />
          );
        })}
    </tr>
  );
};

Row.displayName = "Row";
export default Row;
