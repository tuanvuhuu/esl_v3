'use client';

import { DownloadIcon } from "@primer/octicons-react";
import { useState } from "react";
import Button from "../button";
import { IMyButtonProps } from "../button/Button";
import type { Column as ExcelColumn, Style } from "exceljs";

export interface IExcelColumnDef extends Partial<ExcelColumn> {
  headerStyle?: Partial<Style>;
  cellStyle?: Partial<Style>;
}

export interface IExportToExcelButtonProps<
  TRow = Record<string, unknown>,
  TFormatted = Record<string, unknown>,
> extends IMyButtonProps {
  fetchDataPromise?: () => Promise<TRow[] | undefined> | TRow[] | undefined;
  formatDataFunction: (data: TRow[]) => Promise<TFormatted[]> | TFormatted[];
  fileName: string;
  text?: string;
  teamplate?: boolean;
  teamplateFunction?: (data: TRow[]) => Promise<unknown> | unknown;
  excelClumns: IExcelColumnDef[];
  mergeFields?: string[];
  groupKey?: string;
  data?: TRow[];
}

const ExportToExcelButton = <
  TRow = Record<string, unknown>,
  TFormatted = Record<string, unknown>,
>(
  props: IExportToExcelButtonProps<TRow, TFormatted>,
) => {
  const {
    fetchDataPromise,
    formatDataFunction,
    fileName,
    groupKey = "id",
    mergeFields = [],
    teamplate = false,
    teamplateFunction = () => undefined,
    excelClumns,
    data: propData,
    text,
    ...buttonProps
  } = props;
  const [isLoading, setisLoading] = useState(false);

  const handleExport = async () => {
    setisLoading(true);
    const { Workbook } = await import("exceljs");
    try {
      const data = propData ?? (fetchDataPromise ? await fetchDataPromise() : undefined);
      if (data) {
        if (teamplate) {
          await teamplateFunction(data);
        } else {
          const formatData = await formatDataFunction(data);

          const workbook = new Workbook();
          const worksheet = workbook.addWorksheet("Sheet1");
          worksheet.columns = excelClumns;
          formatData.forEach((row) => {
            worksheet.addRow(row);
          });
          // Style Header
          for (let h = 1; h <= 1; h++) {
            const headerRow = worksheet.getRow(h);
            headerRow.eachCell((cell, colNumber) => {
              const column = excelClumns[colNumber - 1];
              const style: Partial<Style> = {
                font: { bold: true },
                fill: {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "ffffff" },
                },
                alignment: {
                  vertical: "middle",
                  horizontal: "center",
                  wrapText: true,
                },
                border: {
                  top: { style: "thin" },
                  left: { style: "thin" },
                  bottom: { style: "thin" },
                  right: { style: "thin" },
                },
                ...(column?.headerStyle || {}),
              };
              Object.assign(cell, { style });
            });
          }

          // Style các cell còn lại
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            row.eachCell((cell, colNumber) => {
              const column = excelClumns[colNumber - 1];
              const style: Partial<Style> = {
                alignment: {
                  vertical: "middle",
                  horizontal: "left",
                  wrapText: true,
                },
                border: {
                  top: { style: "thin" },
                  left: { style: "thin" },
                  bottom: { style: "thin" },
                  right: { style: "thin" },
                },
                ...(column?.cellStyle || {}),
              };
              Object.assign(cell, { style });
            });
          });
          if (mergeFields.length > 0) {
            // Build map colIndex → key
            const fieldToCol: Record<string, number> = {};

            excelClumns.forEach((col, i) => {
              if (col.key && mergeFields.includes(col.key)) {
                fieldToCol[col.key] = i + 1; // Excel column index
              }
            });

            // Duyệt từng group theo "code" hoặc field đầu tiên trong mergeFields
            const groupColIdx =
              excelClumns.findIndex((c) => c.key === groupKey) + 1;

            let start = 2; // row 1 = header

            while (start <= worksheet.rowCount) {
              const value = worksheet.getCell(start, groupColIdx).value;
              let end = start;

              // Tìm tất cả dòng liên tiếp có cùng giá trị code
              while (
                end + 1 <= worksheet.rowCount &&
                worksheet.getCell(end + 1, groupColIdx).value === value
              ) {
                end++;
              }

              // merge các field cha theo block size
              const groupSize = end - start + 1;

              if (groupSize > 1) {
                Object.values(fieldToCol).forEach((colIdx) => {
                  worksheet.mergeCells(start, colIdx, end, colIdx);

                  const mergedCell = worksheet.getCell(start, colIdx);
                  mergedCell.alignment = {
                    vertical: "middle",
                    horizontal: "left",
                    wrapText: true,
                  };
                });
              }

              start = end + 1;
            }
          }

          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: "application/octet-stream" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `${fileName}.xlsx`;
          link.click();
        }
      }
    } catch {
      // ignore export cancellation / error
    }
    setisLoading(false);
  };
  return (
    <Button
      text={text ?? "Xuất excel"}
      leadingVisual={DownloadIcon}
      variant="default"
      size="medium"
      onClick={handleExport}
      isLoading={isLoading}
      {...buttonProps}
    />
  );
};

export default ExportToExcelButton;
