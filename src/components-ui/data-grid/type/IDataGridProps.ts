import type React from "react";
import { ReactNode } from "react";

export type DataGridRowRecord = Record<string, unknown>;

export interface IStickyOffsets {
  leftOffsets: Record<string, number>;
  rightOffsets: Record<string, number>;
}

export interface IDataGridProps<T = DataGridRowRecord> {
  dataSource: T[];
  keyExpr?: string;
  columns: IDataGridColumn<T>[];
  sorting?: IDataGridSort;
  filterRow?: IDataGridFilterRow<T>;
  focusedCell?: IDataGridFocusedCell<T>;
  paging?: IDataGridPaging;
  isLoading?: boolean;
  showLoadingMode?: "inline" | "popup";
  title?: string | React.ReactNode;
  subTitle?: string | React.ReactNode;
  actionComponent?: React.ReactNode;
  searchEnable?: boolean;
  subToolbarElement?: ReactNode | ((filterData: T[]) => ReactNode);
  height?: number;
  isShowRowIdx?: boolean;
  selection?: IDataGridSelectionProps;
  exportConfig?: IExportConfig;
  totalSummary?: ISummaryItem<T>[];
  columnChooserConfig?: IColumnChooserConfig;
  isAltertingRowColor?: boolean;
  grouping?: IDataGridGrouping<T>;
}

export interface IDataGridGrouping<T = DataGridRowRecord> {
  enable: boolean;
  groupField: string;
  defaultExpanded?: boolean;
  groupSummary?: ISummaryItem<T>[];
}

export interface IExportConfig {
  enable: boolean;
  fileName?: string;
  onExportClick?: () => void;
  render?: () => ReactNode;
}

export interface IColumnChooserConfig {
  enable: boolean;
  cachedKeyName?: string;
  render?: (isHaveHiddenColumns?: boolean) => ReactNode;
}

export type ISortingOrder = "asc" | "desc";

export interface IDataGridSort {
  enable: boolean;
  field?: string;
  mode?: ISortingOrder;
  onValueChanged?: (field: string, mode: ISortingOrder) => void;
}

export interface IDataGridFilterRow<T = DataGridRowRecord> {
  enable: boolean;
  conditions?: ICondition[];
  onConditionChanged?: (conditions: ICondition[]) => void;
  _phantom?: T;
}

export type IComparisonOperator =
  | "equals"
  | "contains"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEqual"
  | "lessThanOrEqual"
  | "includes";

export type ILogicOperator = "and" | "or";
export type IExpression = [string, IComparisonOperator, unknown];

export interface ICondition {
  field: string;
  operator: IComparisonOperator;
  value: unknown;
}

export interface IDataGridPaging {
  enable: boolean;
  pageSize?: number;
  pageIndex?: number;
  pageSizeItems?: number[];
}

export interface IDataGridSelectionProps<TKey = number | string> {
  mode: "multiple" | "single";
  onSelectionChanged(keyValues: TKey[]): void;
  selectedRowKeys?: TKey[];
}

export interface IFocusedCell<T = DataGridRowRecord> {
  rowData: T;
  dataField: string;
}

export interface IDataGridFocusedCell<T = DataGridRowRecord> {
  focusedCell?: IFocusedCell<T>;
  onFocusedCellChanged(cell?: IFocusedCell<T>): void;
}

export type IColumnDataType =
  | "string"
  | "number"
  | "date"
  | "datetime"
  | "boolean"
  | "time";

export type IColumnAlignment = "left" | "center" | "right";
export type IColumnFixedPosition = "left" | "right";

export interface IDataGridColumn<T = DataGridRowRecord> {
  id?: string;
  dataField?: string;
  caption?: string;
  dataType?: IColumnDataType;

  width?: number;
  flex?: number;
  minWidth?: number;
  maxWidth?: number;

  allowResizing?: boolean;
  fixed?: IColumnFixedPosition;
  isLastColFixed?: boolean;

  cellRender?(rowData: T): React.ReactNode;
  headerRender?: () => React.ReactNode;
  cellFocusedRender?(rowData: T): React.ReactNode;

  isMainColumn?: boolean;
  isAllowFocus?: boolean;
  isAllowSort?: boolean;
  isHideZeroValue?: boolean;
  align?: IColumnAlignment;

  columns?: IDataGridColumn<T>[];
  uuid?: string;
  isVisible?: boolean;
  isDisableHederFilter?: boolean;

  isTextWithEllipseLine?: boolean;
  isNoPadding?: boolean;
}

export interface ISummaryItem<T = DataGridRowRecord> {
  dataField: string;
  summaryType: "sum" | "count" | "min" | "max";
  customizeRender?(data: T[], sumValue?: number | null): React.ReactNode;
}
