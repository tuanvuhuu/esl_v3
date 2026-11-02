'use client';

import { SearchIcon } from "@primer/octicons-react";
import clsx from "clsx";
import { useContext } from "react";
import TextInput from "../text-input";
import {
  DataTableContainerContext,
  DataTableRowRecord,
  IComparisonOperator,
  IDataTableContext,
} from "./DataTable";
import styles from "./DataTable.module.css";
import { ColumnInstance } from "./useSimpleTable";

const getWidthFromColumn = (
  column: ColumnInstance<DataTableRowRecord>,
): number | string | undefined => {
  if (column.placeholderOf) {
    return getWidthFromColumn(column.placeholderOf);
  }
  return column.width;
};

const Header = () => {
  const { props, headerGroups, allColumns, setConditions, conditions } =
    useContext<IDataTableContext>(DataTableContainerContext);

  // Thêm điều kiện mới
  const addCondition = (
    field: string,
    operator?: IComparisonOperator,
    value?: unknown,
  ) => {
    setConditions([
      ...conditions.filter((x) => x.field && x.field !== field),
      { field, operator: operator ?? "equals", value: value ?? "" },
    ]);
  };

  // Xóa điều kiện
  const removeCondition = (field: string) => {
    const newConditions = conditions.filter((x) => x.field !== field);
    setConditions(newConditions);
  };

  // Cập nhật điều kiện
  const updateCondition = (
    field: string,
    operator?: IComparisonOperator,
    value?: unknown,
  ) => {
    setConditions(
      conditions.map((c) => {
        if (c.field === field) {
          return {
            ...c,
            operator: operator ?? "equals",
            value,
          };
        }
        return c;
      }),
    );
  };

  const onFilterChange = (
    field: string,
    operator?: IComparisonOperator,
    value?: unknown,
  ) => {
    if (!value) {
      removeCondition(field);
      return;
    }
    const cond = conditions.find((x) => x.field === field);
    if (cond) {
      updateCondition(field, operator, value);
    } else {
      addCondition(field, operator, value);
    }
  };

  return (
    <thead className={styles.header}>
      {headerGroups.map((headerGroup, hIdx) => (
        <tr {...headerGroup.getHeaderGroupProps()} key={`${hIdx}`}>
          {headerGroup.headers.map((column, idx) => {
            return (
              <th
                {...column.getHeaderProps()}
                style={{
                  textAlign: column.align ?? "left",
                  width: getWidthFromColumn(column),
                  minWidth: column.placeholderOf
                    ? column.placeholderOf.minWidth
                    : column.minWidth,
                  left: column.fixed
                    ? column.id === "selection"
                      ? 0
                      : 40
                    : undefined,
                }}
                key={`${hIdx}-${idx}`}
                className={clsx(column.fixed ? styles.fixed_column_header : "")}
              >
                {column.headerRender
                  ? column.headerRender()
                  : column.render("Header")}
              </th>
            );
          })}
        </tr>
      ))}
      {(props.filterRow?.enable === true || !props.filterRow) && (
        <tr role="row">
          {allColumns.map((colum, idx) => {
            const fieldName = colum.dataField;
            return (
              <th
                style={{
                  position: "unset",
                  left: colum.fixed
                    ? colum.id === "selection"
                      ? 0
                      : 40
                    : undefined,
                  backgroundColor: "#ffff",
                }}
                className={clsx(colum.fixed ? styles.fixed_column_header : "")}
                key={`F-${idx}`}
              >
                {fieldName && (
                  <div className={styles.header_box}>
                    {colum.renderSearch ? (
                      colum.renderSearch()
                    ) : (
                      <TextInput
                        block
                        leadingVisual={
                          <div className={styles.header_box2}>
                            <SearchIcon className={styles.header_octicon} />
                          </div>
                        }
                        className={styles.header_textInput}
                        onValueDelayChanged={(value) => {
                          onFilterChange(fieldName, "contains", value);
                        }}
                      />
                    )}
                  </div>
                )}
              </th>
            );
          })}
        </tr>
      )}
    </thead>
  );
};

export default Header;
