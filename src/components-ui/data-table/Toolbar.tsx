'use client';

import {
  DownloadIcon,
  FilterIcon,
  SearchIcon,
  SortAscIcon,
  SortDescIcon,
} from "@primer/octicons-react";
import { ActionList, ActionMenu, Button, IconButton } from "@primer/react";
import { useContext, useMemo, useState } from "react";
import { useCommonContext } from "@/components-ui/_adapters/commonContext";
import { localizedResourceMap } from "@/components-ui/_adapters/localizedResourceMap";
import Text from "../text";
import TextInput from "../text-input";
import {
  DataTableContainerContext,
  eSortMode,
  IDataTableContext,
} from "./DataTable";
import styles from './data-table.module.css';

const Toolbar = () => {
  const { props, setSearchKey, sortConfig, setSortConfig, sortByField } =
    useContext<IDataTableContext>(DataTableContainerContext);
  const { translate } = useCommonContext();
  const {
    title,
    titleComponent,
    subTitle,
    subTitleComponent,
    actionComponent,
    searchEnable,
    exportConfig: pExportConfig,
    actionMoreComponent,
    contentTableComponent,
  } = props;
  const [showActionMore, setShowActionMore] = useState(false);
  const exportConfig = pExportConfig;
  const sortByName = useMemo(() => {
    return props.columns
      .filter((x) => x.dataField === sortByField)
      .map((x) => x.caption)
      .join(",");
  }, [props.columns, sortByField]);

  const handleExportAsync = async () => {
    // Custom export fallback when onExportClick is not supplied
  };

  return (
    <div id="toolbar">
      <div className="d-flex mb-1">
        <div id="left" className="flex-1">
          {title && <Text text={title} className={styles.toolbar_text} />}
          {titleComponent && <div>{titleComponent}</div>}
          {(subTitle || subTitleComponent) && (
            <div>
              {subTitle && (
                <Text text={subTitle} className={styles.toolbar_text2} />
              )}
              {subTitleComponent && <>{subTitleComponent}</>}
            </div>
          )}
        </div>
        <div id="actions" className="d-flex items-start">
          {actionComponent}
          {searchEnable && (
            <div className="ml-2">
              <TextInput
                leadingVisual={SearchIcon}
                placeholder={translate(localizedResourceMap.BASE.SEARCH)}
                onValueDelayChanged={(value) => {
                  setSearchKey?.(value);
                }}
              />
            </div>
          )}
          {sortConfig && sortConfig.enable && (
            <div className="ml-2">
              <ActionMenu>
                <ActionMenu.Button
                  leadingVisual={
                    sortConfig?.mode === eSortMode.DESC
                      ? SortDescIcon
                      : SortAscIcon
                  }
                >
                  Sắp xếp theo <b>{sortByName}</b>
                </ActionMenu.Button>
                <ActionMenu.Overlay>
                  <ActionList
                    selectionVariant="single"
                    role="menu"
                    aria-label="Sort options"
                    showDividers
                  >
                    {props.columns
                      .filter((x) => x.dataField)
                      .map((x, idx) => {
                        return (
                          <ActionList.Item
                            key={idx}
                            role="menuitemcheckbox"
                            selected={x.dataField === sortConfig.field}
                            onSelect={() => {
                              if (sortConfig && setSortConfig)
                                setSortConfig({
                                  ...sortConfig,
                                  field: x.dataField ?? "",
                                });
                              if (x.dataField)
                                props.sortConfig?.onValueChanged?.(
                                  x.dataField,
                                  props.sortConfig?.mode,
                                );
                            }}
                          >
                            {translate(x.caption)}
                          </ActionList.Item>
                        );
                      })}

                    <ActionList.Divider />
                    <ActionList.Item
                      role="menuitemcheckbox"
                      selected={sortConfig.mode === eSortMode.ASC}
                      onSelect={() => {
                        if (sortConfig && setSortConfig)
                          setSortConfig({
                            ...sortConfig,
                            mode: eSortMode.ASC,
                          });
                        props.sortConfig?.onValueChanged?.(
                          props.sortConfig.field ?? "",
                          eSortMode.ASC,
                        );
                      }}
                    >
                      <ActionList.LeadingVisual>
                        <SortAscIcon />
                      </ActionList.LeadingVisual>
                      Ascending
                    </ActionList.Item>
                    <ActionList.Item
                      role="menuitemcheckbox"
                      selected={sortConfig.mode === eSortMode.DESC}
                      onSelect={() => {
                        if (sortConfig && setSortConfig)
                          setSortConfig({
                            ...sortConfig,
                            mode: eSortMode.DESC,
                          });
                        props.sortConfig?.onValueChanged?.(
                          props.sortConfig.field ?? "",
                          eSortMode.DESC,
                        );
                      }}
                    >
                      <ActionList.LeadingVisual>
                        <SortDescIcon />
                      </ActionList.LeadingVisual>
                      Descending
                    </ActionList.Item>
                  </ActionList>
                </ActionMenu.Overlay>
              </ActionMenu>
            </div>
          )}
          {exportConfig?.enable && (
            <div className="ml-2">
              <IconButton
                icon={DownloadIcon}
                variant="default"
                aria-label="Download"
                onClick={() => {
                  if (props.exportConfig?.onExportClick) {
                    props.exportConfig?.onExportClick();
                  } else {
                    handleExportAsync();
                  }
                }}
              />
            </div>
          )}
          {actionMoreComponent && (
            <div className="ml-2">
              <Button
                leadingVisual={FilterIcon}
                variant="primary"
                disabled={false}
                aria-label="Tìm kiếm nâng cao"
                onClick={() => {
                  setShowActionMore(!showActionMore);
                }}
              />
            </div>
          )}
        </div>
      </div>
      {actionMoreComponent && showActionMore && (
        <div id="action-more">{actionMoreComponent}</div>
      )}
      {contentTableComponent && (
        <div id="content-table">{contentTableComponent}</div>
      )}
    </div>
  );
};

export default Toolbar;
