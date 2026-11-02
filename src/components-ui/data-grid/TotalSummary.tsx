'use client';

import type React from "react";
import { formatVND } from "@/components-ui/_adapters/utils";
import styles from "./DataGrid.module.css";
import {
  DataGridRowRecord,
  IDataGridColumn,
  IStickyOffsets,
  ISummaryItem,
} from "./type/IDataGridProps";
import clsx from "clsx";

interface ITotalSummaryProps {
  dataColumns: IDataGridColumn[];
  totalSummary: ISummaryItem[];
  stickyOffsets: IStickyOffsets;
  filterdData: DataGridRowRecord[];
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

const calculateSummaryItem = (
  sumItem: ISummaryItem,
  data: DataGridRowRecord[],
): number | null => {
  const { dataField, summaryType } = sumItem;
  const values = data
    .map((item) => item?.[dataField])
    .filter((v) => v !== undefined && v !== null);
  switch (summaryType) {
    case "sum":
      return values.reduce<number>((total, v) => total + Number(v), 0);

    case "count":
      return values.length;

    case "min":
      if (values.length === 0) return null;
      return Math.min(...values.map((v) => Number(v)));

    case "max":
      if (values.length === 0) return null;
      return Math.max(...values.map((v) => Number(v)));

    default:
      return null;
  }
};

const defaultRender = (sumItem: ISummaryItem, sumValue: number | null | undefined) => {
  return (
    <div className="d-flex items-center">
      {sumItem.summaryType === "sum" && <SumIcon />}
      <div className="flex-1">
        {sumValue && sumValue > 0 ? <>{formatVND(sumValue)}</> : "-"}
      </div>
    </div>
  );
};

const TotalSummary = (props: ITotalSummaryProps) => {
  const { totalSummary, dataColumns, stickyOffsets, filterdData } = props;

  return (
    <tfoot
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 20,
        background: "#f7f8fa",
      }}
    >
      <tr>
        {dataColumns
          .filter((x) => x.isVisible === true)
          .map((column, idx: number) => {
            const sumItem = totalSummary?.find(
              (x) => x.dataField === column.dataField,
            );
            const sumValue = sumItem
              ? calculateSummaryItem(sumItem, filterdData)
              : undefined;
            const cellStyle: React.CSSProperties = {
              width: column.width,
              minWidth: column.minWidth,
              fontWeight: column.isMainColumn ? 600 : 400,
              whiteSpace: "break-spaces",
              textAlign: column.align ?? "right",
              position: column.fixed ? "sticky" : "relative",
              left:
                column.fixed === "left"
                  ? stickyOffsets.leftOffsets[column.uuid ?? ""]
                  : undefined,
              right:
                column.fixed === "right"
                  ? stickyOffsets.rightOffsets[column.uuid ?? ""]
                  : undefined,
              zIndex: column.fixed ? 15 : 1,
              backgroundColor: "#f7f8fa",
            };
            return (
              <td
                style={cellStyle}
                className={clsx(
                  column.fixed ? styles.fixed : "",
                  column.fixed === "left" ? styles.left : "",
                  column.fixed === "right" ? styles.right : "",
                  column.isLastColFixed ? styles.lastFixed : "",
                )}
                key={idx}
              >
                {sumItem && (
                  <div>
                    {sumItem.customizeRender
                      ? sumItem.customizeRender(filterdData, sumValue)
                      : defaultRender(sumItem, sumValue)}
                  </div>
                )}
              </td>
            );
          })}
      </tr>
    </tfoot>
  );
};

export default TotalSummary;
