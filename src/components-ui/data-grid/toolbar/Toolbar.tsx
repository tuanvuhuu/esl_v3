'use client';

import { DownloadIcon, SearchIcon } from "@primer/octicons-react";
import { IconButton } from "@primer/react";
import React, { useContext } from "react";
import Text from "../../text";
import TextInput from "../../text-input";
import Tooltip from "../../tooltip";
import styles from "../DataGrid.module.css";

import {
  DataGridContainerContext,
  IDataGridContainerContext,
} from "../DataGrid";
import {
  formatDisplay,
  GetDataGridHederGroupCell,
  renderExcelHeader,
} from "../type/ColumnHelper";
import {
  DataGridRowRecord,
  IColumnChooserConfig,
  IDataGridColumn,
  IExportConfig,
} from "../type/IDataGridProps";
import ColumnChooserButton from "./ColumnChooserButton";

interface ITittleProps {
  title?: string | React.ReactNode;
}
interface ISubTittleProps {
  subTitle?: string | React.ReactNode;
}
interface IActionsProps {
  actionComponent?: React.ReactNode;
  searchEnable?: boolean;
  columns: IDataGridColumn[];
  onSearchKeyChanged: (value: string) => void;
  exportConfig?: IExportConfig;
  filterdData: DataGridRowRecord[];
  dataColumns: IDataGridColumn[];
  columnChooserConfig?: IColumnChooserConfig;
}
interface IToolbarProps {
  onSearchKeyChanged: (value: string) => void;
  filterdData: DataGridRowRecord[];
  dataColumns: IDataGridColumn[];
}

const Toolbar = (props: IToolbarProps) => {
  const { onSearchKeyChanged, filterdData } = props;
  const {
    title,
    subTitle,
    actionComponent,
    searchEnable,
    columns,
    exportConfig,
    columnChooserConfig,
  } = useContext<IDataGridContainerContext>(DataGridContainerContext);

  const hasToolbarContent = Boolean(
    title ||
      subTitle ||
      actionComponent ||
      searchEnable ||
      exportConfig?.enable ||
      columnChooserConfig?.enable,
  );
  if (!hasToolbarContent) return null;

  return (
    <div className="d-grid gap-1">
      <div className="d-flex flex-wrap items-center justify-between gap-2">
        {(title || subTitle) ? (
          <div className={styles.toolbarTitle}>
            <Tittle title={title} />
            <SubTittle subTitle={subTitle} />
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div className="d-flex flex-wrap items-center gap-1.5">
          <Actions
            actionComponent={actionComponent}
            searchEnable={searchEnable}
            columns={columns}
            onSearchKeyChanged={onSearchKeyChanged}
            filterdData={filterdData}
            exportConfig={exportConfig}
            dataColumns={props.dataColumns}
            columnChooserConfig={columnChooserConfig}
          />
        </div>
      </div>
    </div>
  );
};

const Tittle = React.memo((props: ITittleProps) => {
  const { title } = props;
  if (!title) return null;
  if (typeof title === "string") {
    return <Text text={title} className={styles.title} />;
  }
  return <>{props.title}</>;
});
Tittle.displayName = "Tittle";

const SubTittle = React.memo((props: ISubTittleProps) => {
  const { subTitle } = props;
  if (!subTitle) return null;
  if (typeof subTitle === "string") {
    return <Text text={subTitle} className="text-muted" />;
  }
  return <>{props.subTitle}</>;
});
SubTittle.displayName = "SubTittle";

const Actions = React.memo((props: IActionsProps) => {
  const {
    actionComponent,
    searchEnable,
    onSearchKeyChanged,
    exportConfig,
    columns,
    filterdData,
    dataColumns,
    columnChooserConfig,
  } = props;

  const handleExportAsync = async () => {
    const { Workbook } = await import("exceljs");
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet("Sheet1");
    const headerGroups = GetDataGridHederGroupCell(columns);
    renderExcelHeader(worksheet, headerGroups);

    const dataStartRow = headerGroups.length + 1;
    dataColumns
      .filter((x) => x.id !== "col_idx" && x.id !== "selection" && x.id !== "actions" && x.id !== "select")
      .forEach((col, idx) => {
        worksheet.getColumn(idx + 1).width = col.width ? Math.max(12, col.width / 8) : 18;
      });
    filterdData.forEach((item) => {
      const rowValues = dataColumns
        .filter((x) => x.id !== "col_idx" && x.id !== "selection" && x.id !== "actions" && x.id !== "select")
        .map((col) =>
          col.dataField ? formatDisplay(col, item[col.dataField]) : "",
        );
      worksheet.addRow(rowValues);
    });
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      for (let col = 1; col <= worksheet.columnCount; col++) {
        const cell = row.getCell(col);
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (rowNumber < dataStartRow) {
          cell.font = { bold: true };
        }
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${exportConfig?.fileName ?? "Danh-sach"}.xlsx`;
    link.click();
  };

  return (
    <div className="d-flex flex-wrap gap-1.5 items-center">
      {searchEnable && (
        <TextInput
          placeholder="Lọc nhanh trên bảng…"
          leadingVisual={SearchIcon}
          onValueDelayChanged={onSearchKeyChanged}
          className="min-w-[190px]"
        />
      )}
      {actionComponent}
      {exportConfig?.enable && (
        <>
          {!exportConfig.render && (
            <Tooltip text="Xuất Excel (.xlsx)" direction="s">
              <IconButton
                icon={DownloadIcon}
                variant="default"
                aria-label="Xuất Excel"
                unsafeDisableTooltip
                onClick={() => {
                  if (props.exportConfig?.onExportClick) {
                    props.exportConfig.onExportClick();
                  } else {
                    void handleExportAsync();
                  }
                }}
              />
            </Tooltip>
          )}
          {exportConfig.render && (
            <div
              onClick={() => {
                if (props.exportConfig?.onExportClick) {
                  props.exportConfig.onExportClick();
                } else {
                  void handleExportAsync();
                }
              }}
              className="cursor-pointer"
            >
              {exportConfig.render()}
            </div>
          )}
        </>
      )}
      {columnChooserConfig && columnChooserConfig.enable && (
        <ColumnChooserButton columns={columns} />
      )}
    </div>
  );
});
Actions.displayName = "Actions";

export default Toolbar;
