'use client';

import { ActionList, AnchoredOverlay } from "@primer/react";
import { useMemo, useState } from "react";
import Button from "../button";
import styles from "./DataGrid.module.css";
import { IComparisonOperator } from "./type/IDataGridProps";

const filterModes: Array<{
  id: IComparisonOperator;
  name: string;
  icon: string;
}> = [
  { id: "contains", name: "Chứa giá trị", icon: "../../images/search.svg" },
  { id: "equals", name: "So sánh bằng", icon: "../../images/equals.svg" },
  {
    id: "lessThanOrEqual",
    name: "Nhỏ hơn hoặc bằng",
    icon: "../../images/less-than.png",
  },
  {
    id: "greaterThanOrEqual",
    name: "Lớn hơn hoặc bằng",
    icon: "../../images/greater-than.png",
  },
];

interface IFilterModeSelectionProps {
  value?: IComparisonOperator;
  onChanged: (value: IComparisonOperator) => void;
}

const FilterModeSelection = (props: IFilterModeSelectionProps) => {
  const [isOpenOverlay, setIsOpenOverlay] = useState(false);
  const selectedValue = useMemo(() => {
    return filterModes.find((x) => x.id === props.value);
  }, [props.value]);
  const SelectedIcon = useMemo(() => {
    if (!selectedValue)
      return <img src={`../../images/search.svg`} alt="" style={{ width: "0.875rem" }} />;
    return <img src={`${selectedValue.icon}`} alt="" style={{ width: "0.875rem" }} />;
  }, [selectedValue]);

  return (
    <AnchoredOverlay
      open={isOpenOverlay}
      onClose={() => {
        setIsOpenOverlay(false);
      }}
      overlayProps={{
        role: "dialog",
        "aria-modal": true,
        "aria-label": "User Card Overlay",
      }}
      focusZoneSettings={{
        disabled: true,
      }}
      renderAnchor={(anchorProps) => {
        return (
          <div {...anchorProps} tabIndex={-1}>
            <Button
              tabIndex={-1}
              onClick={() => {
                setIsOpenOverlay(true);
              }}
              className={styles.filterModeButton}
            >
              {SelectedIcon}
            </Button>
          </div>
        );
      }}
    >
      <div className={styles.filterModeList}>
        <ActionList role="listbox" showDividers selectionVariant="single" variant="full">
          {filterModes.map((filterMode) => {
            return (
              <ActionList.Item
                key={filterMode.id}
                selected={filterMode.id === selectedValue?.id}
                onSelect={() => {
                  props.onChanged(filterMode.id);
                }}
              >
                <ActionList.LeadingVisual>
                  <img src={`${filterMode.icon}`} alt="" style={{ width: "0.875rem" }} />
                </ActionList.LeadingVisual>
                {filterMode.name}
              </ActionList.Item>
            );
          })}
        </ActionList>
      </div>
    </AnchoredOverlay>
  );
};

export default FilterModeSelection;
