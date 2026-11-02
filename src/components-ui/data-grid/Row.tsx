'use client';

import Cell from "./Cell";
import styles from "./DataGrid.module.css";
import {
  DataGridRowRecord,
  IDataGridColumn,
  IDataGridFocusedCell,
  IStickyOffsets,
} from "./type/IDataGridProps";

interface IRowProps {
  rowData: DataGridRowRecord;
  rowIndex: number;
  stickyOffsets: IStickyOffsets;
  dataColumns: IDataGridColumn[];
  focusedCell?: IDataGridFocusedCell;
  mainColor?: string;
  isAltertingRowColor?: boolean;
}

const Row = (props: IRowProps) => {
  const { rowData, rowIndex, dataColumns, isAltertingRowColor } = props;

  return (
    <tr
      key={rowIndex}
      className={
        isAltertingRowColor
          ? rowIndex % 2 === 0
            ? styles.even
            : styles.odd
          : styles.odd
      }
    >
      {dataColumns
        .filter((x) => x.isVisible === true)
        .map((column: IDataGridColumn, colIndex: number) => (
          <Cell
            key={colIndex}
            column={column}
            colIndex={colIndex}
            rowData={rowData}
            rowId={rowData["id"]}
            rowIndex={rowIndex}
            stickyOffsets={props.stickyOffsets}
            focusedCell={props.focusedCell}
            mainColor={props.mainColor}
          />
        ))}
    </tr>
  );
};

export default Row;
