'use client';

import { useContext } from "react";
import { DataTableContainerContext, IDataTableContext } from "./DataTable";
import Row from "./Row";

const Rows = () => {
  const {
    pagedData,
    getTableBodyProps,
    rows,
    prepareRow,
    props,
    selectedCells,
    setSelectedCells,
    setIsSelecting,
    setStartCell,
    isSelecting,
    startCell,
    isHideenBorderWhenFocused,
  } = useContext<IDataTableContext>(DataTableContainerContext);
  const { selection } = props;

  // Bắt đầu chọn vùng
  const handleMouseDown = (rowIndex: number, colIndex: number) => {
    setIsSelecting(true);
    setStartCell({ rowIndex, colIndex });
    setSelectedCells(new Set<string>([`${rowIndex}-${colIndex}`]));
  };

  // Kéo chuột để chọn vùng
  const handleMouseMove = (rowIndex: number, colIndex: number) => {
    if (isSelecting && startCell) {
      const { rowIndex: startRow, colIndex: startCol } = startCell;
      const minRow = Math.min(startRow, rowIndex);
      const maxRow = Math.max(startRow, rowIndex);
      const minCol = Math.min(startCol, colIndex);
      const maxCol = Math.max(startCol, colIndex);

      const newSelectedCells = new Set<string>();
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          newSelectedCells.add(`${r}-${c}`);
        }
      }
      setSelectedCells(newSelectedCells);
    }
  };

  return (
    <>
      {pagedData.length > 0 && (
        <tbody {...getTableBodyProps()}>
          {rows.map((row, rowIndex) => {
            prepareRow(row);
            return (
              <Row
                isHideenBorderWhenFocused={isHideenBorderWhenFocused}
                focusedRow={props.focusedRow}
                focusedCell={props.focusedCell}
                handleMouseDown={handleMouseDown}
                handleMouseMove={handleMouseMove}
                row={row}
                rowIndex={rowIndex}
                selectedCells={selectedCells}
                selection={selection}
                checkDontSaveChange={props.checkDontSaveChange}
                key={rowIndex}
                onFocuseCellChanged={props.onFocuseCellChanged}
                rangeSelection={props.rangeSelection}
              />
            );
          })}
        </tbody>
      )}
      {pagedData.length <= 0 && (
        <tbody>
          <tr>
            <td
              colSpan={
                props.columns.length +
                (props.selection?.mode === "multiple" ? 1 : 0) +
                (props.isShowRowIdx !== false ? 1 : 0)
              }
            >
              {props.emptyComponent}
            </td>
          </tr>
        </tbody>
      )}
    </>
  );
};

export default Rows;
