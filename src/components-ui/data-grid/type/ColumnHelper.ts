import { Worksheet } from "exceljs";
import moment from "moment";
import { v4 as uuid } from "uuid";
import {
  DataGridRowRecord,
  ICondition,
  IDataGridColumn,
  IExpression,
  ISortingOrder,
} from "./IDataGridProps";

export interface IDataGridColumnVisible {
  dataField?: string;
  isVisible?: boolean;
}

export const IniColumn = (
  column: IDataGridColumn,
  columnsVisable?: IDataGridColumnVisible[],
): IDataGridColumn => {
  const result: IDataGridColumn = {
    ...column,
    isVisible: column.isVisible !== undefined ? column.isVisible : true,
    uuid: column.uuid ?? uuid(),
  };
  if (columnsVisable && column.dataField) {
    const cached = columnsVisable.find((x) => x.dataField === column.dataField);
    if (cached && cached.isVisible !== undefined) {
      result.isVisible = cached.isVisible;
    }
  }
  if (result.columns && result.columns.length > 0) {
    result.columns = result.columns.map((sub) => IniColumn(sub, columnsVisable));
  }
  if (result.columns && result.columns.length > 0) {
    result.width = result.columns
      .filter((x) => x.isVisible === true)
      .map((x) => x.width ?? 0)
      .reduce((a, b) => a + b, 0);
  }
  return result;
};

export const IniColumns = (
  columns: IDataGridColumn[],
  columnsVisable?: IDataGridColumnVisible[],
): IDataGridColumn[] => {
  return columns.map((col) => IniColumn(col, columnsVisable));
};

export interface IDataGridHeaderCell extends IDataGridColumn {
  rowspan: number;
  colspan: number;
  level: number;
}

export interface IDataGridHeaderRow {
  rowIdx: number;
  cells: IDataGridHeaderCell[];
}

export const GetDataGridHederGroupCell = (columns: IDataGridColumn[]) => {
  return buildHeaderRows(columns);
};

export const GetDataGridRowCell = (columns: IDataGridColumn[]) => {
  const result: IDataGridColumn[] = [];
  columns.forEach((column) => {
    SettingDataGridRowCell(column, result);
  });
  const lastFixedLeftIdx = result.findLastIndex(
    (x) => x.id !== "col_idx" && x.fixed === "left",
  );
  const lastFixedRightIdx = result.findIndex(
    (x) => x.id !== "selection" && x.fixed === "right",
  );
  if (lastFixedLeftIdx >= 0) result[lastFixedLeftIdx].isLastColFixed = true;
  if (lastFixedRightIdx >= 0) result[lastFixedRightIdx].isLastColFixed = true;
  return result;
};

export const SettingDataGridRowCell = (
  column: IDataGridColumn,
  result: IDataGridColumn[],
) => {
  if (!column.columns || column.columns.length === 0) {
    result.push(column);
  } else {
    column.columns.forEach((sub) => {
      SettingDataGridRowCell(sub, result);
    });
  }
};

const getMaxDepth = (columns: IDataGridColumn[], depth = 1): number => {
  if (columns.length === 0) return depth;
  return Math.max(
    ...columns.map((col) =>
      col.columns?.length ? getMaxDepth(col.columns, depth + 1) : depth,
    ),
  );
};

const countLeafColumns = (column: IDataGridColumn): number => {
  if (!column.columns || column.columns.length === 0) {
    return 1;
  }
  return column.columns.reduce((sum, col) => sum + countLeafColumns(col), 0);
};

export function buildHeaderRows(
  columns: IDataGridColumn[],
): IDataGridHeaderRow[] {
  if (columns.length === 0) return [];
  const maxLevel = getMaxDepth(columns);
  const rows: IDataGridHeaderRow[] = [];

  function traverse(cols: IDataGridColumn[], level: number) {
    rows[level - 1] ??= {
      rowIdx: level - 1,
      cells: [],
    };

    cols.forEach((col) => {
      const isGroup = !!col.columns?.length;

      const cell: IDataGridHeaderCell = {
        ...col,
        level,
        colspan: isGroup ? countLeafColumns(col) : 1,
        rowspan: isGroup ? 1 : maxLevel - level + 1,
      };

      rows[level - 1].cells.push(cell);

      if (isGroup && col.columns) {
        traverse(col.columns, level + 1);
      }
    });
  }

  traverse(columns, 1);
  return rows;
}

export const removeAccents = (str: string) => {
  if (!str) return str;
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

export const handleSearchByDataField = <T extends DataGridRowRecord>(
  dataFields: string[],
  data: T[],
  key: string,
): T[] => {
  const normalizedKey = removeAccents(key.toLowerCase());

  return data.filter((item) =>
    dataFields.some((dataField) => {
      const value = item[dataField];
      return (
        value !== undefined &&
        value !== null &&
        removeAccents(String(value).toLowerCase()).includes(normalizedKey)
      );
    }),
  );
};

export const dynamicSort = (property: string, mode: ISortingOrder) => {
  const sortOrder = mode === "asc" ? 1 : -1;
  return function <T extends DataGridRowRecord>(a: T, b: T): number {
    const valA = a[property];
    const valB = b[property];
    if (valA === valB) return 0;
    if (valA === undefined || valA === null) return -1 * sortOrder;
    if (valB === undefined || valB === null) return 1 * sortOrder;
    const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
    return cmp * sortOrder;
  };
};

export const renderExcelHeader = (
  worksheet: Worksheet,
  headerRows: IDataGridHeaderRow[],
  startRow = 1,
  startCol = 1,
) => {
  const occupied = new Map<string, boolean>();

  const isOccupied = (r: number, c: number) =>
    occupied.get(`${r}_${c}`) === true;

  const markOccupied = (r1: number, c1: number, r2: number, c2: number) => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        occupied.set(`${r}_${c}`, true);
      }
    }
  };

  headerRows.forEach((headerRow, rowOffset) => {
    const row = startRow + rowOffset;
    let col = startCol;

    headerRow.cells.forEach((cell) => {
      // 🔑 tìm cột trống tiếp theo
      while (isOccupied(row, col)) {
        col++;
      }

      const excelCell = worksheet.getCell(row, col);
      excelCell.value = cell.caption ?? cell.dataField?.toString() ?? "";

      excelCell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };

      excelCell.font = { bold: true };
      excelCell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      const r2 = row + cell.rowspan - 1;
      const c2 = col + cell.colspan - 1;

      if (cell.rowspan > 1 || cell.colspan > 1) {
        worksheet.mergeCells(row, col, r2, c2);
      }

      // 🔑 đánh dấu vùng đã chiếm
      markOccupied(row, col, r2, c2);

      col += cell.colspan;
    });
  });
};

export const handleFilter = <T extends DataGridRowRecord>(
  conditions: ICondition[],
  data: T[],
  logicOperator: string,
): T[] => {
  const filterExpression = conditions
    .map((cond): IExpression => [cond.field, cond.operator, cond.value])
    .reduce<Array<IExpression | string>>(
      (acc, curr, i) => (i > 0 ? [...acc, logicOperator, curr] : [curr]),
      [],
    );

  return data.filter((item) => {
    let result = true;
    let currentOperator = "and";

    for (let i = 0; i < filterExpression.length; i++) {
      const expr = filterExpression[i];
      if (typeof expr === "string") {
        currentOperator = expr;
        continue;
      }
      const [field, operator, value] = expr;
      const itemValue = item[field];

      let conditionResult: boolean;
      switch (operator) {
        case "equals":
          conditionResult = itemValue === value;
          break;
        case "contains":
          conditionResult = String(itemValue ?? "")
            .toLowerCase()
            .includes(String(value ?? "").toLowerCase());
          break;
        case "greaterThan":
          conditionResult = Number(itemValue) > Number(value);
          break;
        case "lessThan":
          conditionResult = Number(itemValue) < Number(value);
          break;
        case "greaterThanOrEqual":
          conditionResult = Number(itemValue) >= Number(value);
          break;
        case "lessThanOrEqual":
          conditionResult = Number(itemValue) <= Number(value);
          break;
        case "includes":
          if (!Array.isArray(value)) return false;
          conditionResult = value.includes(itemValue);
          break;
        default:
          conditionResult = true;
      }
      result =
        currentOperator === "and"
          ? result && conditionResult
          : result || conditionResult;
    }
    return result;
  });
};

export const formatDisplay = (col: IDataGridColumn, value: unknown): string => {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  if (col.dataType === "number") {
    return new Intl.NumberFormat("vi-VN", {
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(value));
  }
  if (col.dataType === "date") {
    return moment(value as moment.MomentInput).format("DD/MM/YYYY");
  }
  if (col.dataType === "datetime") {
    const m = moment(value as moment.MomentInput);
    return m.format("HH:mm") === "00:00"
      ? m.format("DD/MM/YYYY")
      : m.format("HH:mm DD/MM/YYYY");
  }
  if (col.dataType === "time") {
    return String(value).substring(0, 5);
  }
  return String(value);
};

export const extractLeafColumns = (
  columns: IDataGridColumn[],
): IDataGridColumnVisible[] => {
  return columns.flatMap((col) =>
    col.columns
      ? extractLeafColumns(col.columns)
      : [
          {
            dataField: col.dataField,
            isVisible: col.isVisible,
          },
        ],
  );
};
