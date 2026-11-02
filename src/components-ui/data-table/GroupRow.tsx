'use client';

import { ChevronDownIcon, ChevronRightIcon } from "@primer/octicons-react";
import { Checkbox, IconButton } from "@primer/react";
import { useContext, useRef } from "react";
import { useCommonContext } from "@/components-ui/_adapters/commonContext";
import { useElementPosition } from "@/components-ui/_adapters/hooks";
import {
  DataTableContainerContext,
  DataTableRowRecord,
  IDataTableContext,
  ISelectionProps,
} from "./DataTable";
import styles from "./DataTable.module.css";
import { SimpleRow } from "./useSimpleTable";

interface IGroupRowProps {
  selection?: ISelectionProps;
  row: SimpleRow<DataTableRowRecord>;
}

const GroupRow = (props: IGroupRowProps) => {
  const { row, selection } = props;
  const { filterdData, expandedGroupValue, setExpandedGroupValue, wrapperRef } =
    useContext<IDataTableContext>(DataTableContainerContext);
  const groupValueField = String(row.original.groupValueField ?? "");
  const { translate } = useCommonContext();
  const groupValue = row.original.groupValue;
  const groupDatas = filterdData.filter(
    (x) => x[groupValueField] === groupValue,
  );
  const isExpanded = Boolean(
    expandedGroupValue && expandedGroupValue.includes(groupValue),
  );

  const wrapPosition = useElementPosition(wrapperRef);

  const groupRef = useRef<HTMLDivElement | null>(null);
  const groupPosition = useElementPosition(groupRef);
  const caption = row.cells.find(
    (x) => x.column.dataField === groupValueField,
  )?.column.caption;

  const enabledGroupRows = groupDatas.filter((g) => !g.disabled);

  return (
    <td
      colSpan={row.cells.length}
      style={{
        fontWeight: "bold",
        backgroundColor: "#F5F8FA",
      }}
      className={styles.fixed_column}
    >
      <div
        style={{ paddingLeft: `${wrapPosition.x - groupPosition.x}px` }}
        ref={groupRef}
        className={styles.groupRow_box}
      >
        {selection && selection.mode === "multiple" && (
          <div
            style={{
              fontWeight: "bold",
              backgroundColor: "#F5F8FA",
              marginLeft: "40px",
            }}
          >
            <Checkbox
              checked={
                enabledGroupRows.length > 0 &&
                enabledGroupRows.find(
                  (x) =>
                    !(props.selection?.selectedRowKeys ?? []).includes(
                      Number(x.id),
                    ),
                ) === undefined
              }
              onChange={(e) => {
                const ids = enabledGroupRows.map((x) => Number(x.id));
                if (e.target.checked) {
                  props.selection?.onSelectionChanged(
                    Array.from(
                      new Set([
                        ...(props.selection?.selectedRowKeys ?? []),
                        ...ids,
                      ]),
                    ),
                  );
                } else {
                  props.selection?.onSelectionChanged(
                    Array.from(
                      new Set(
                        (props.selection?.selectedRowKeys ?? []).filter(
                          (x) => !ids.includes(x),
                        ),
                      ),
                    ),
                  );
                }
              }}
            />
          </div>
        )}
        <IconButton
          icon={isExpanded ? ChevronDownIcon : ChevronRightIcon}
          aria-label="Toggle group"
          variant="invisible"
          onClick={() => {
            if (isExpanded) {
              setExpandedGroupValue?.([
                ...(expandedGroupValue ?? []).filter((x) => x !== groupValue),
              ]);
            } else {
              setExpandedGroupValue?.([
                ...(expandedGroupValue ?? []),
                groupValue,
              ]);
            }
          }}
        />
        <div className="flex-1">
          {translate(caption)}: {String(row.original.groupValue ?? "")}
        </div>
      </div>
    </td>
  );
};

export default GroupRow;
