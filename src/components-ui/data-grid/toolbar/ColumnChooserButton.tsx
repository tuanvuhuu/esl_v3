'use client';

import { useCommonContext } from '@/components-ui/_adapters/commonContext';
import { EyeIcon, SearchIcon } from '@primer/octicons-react';
import { AnchoredOverlay, Checkbox, FormControl, IconButton, TextInput, TreeView } from '@primer/react';
import { useContext, useMemo, useState } from 'react';
import { DataGridContainerContext, IDataGridContainerContext } from '../DataGrid';
import { extractLeafColumns } from '../type/ColumnHelper';
import { IDataGridColumn } from '../type/IDataGridProps';
import styles from '../DataGrid.module.css';

interface IColumnTreeViewItemProps {
    column: IDataGridColumn;
    onChanged: (columns: IDataGridColumn[]) => void;
}
interface IColumnTreeViewSelectionProps {
    columns: IDataGridColumn[];
}
interface IColumnChooserButtonProps {
    columns: IDataGridColumn[];
}

const ColumnChooserButton = (props: IColumnChooserButtonProps) => {
    const [isOpenOverlay, setIsOpenOverlay] = useState(false);
    const {
        _columns,
        columnChooserConfig,
    } = useContext<IDataGridContainerContext>(DataGridContainerContext);
    const isHaveHiddenColumns = useMemo(() => {
        return _columns.find(x => x.isVisible === false) !== undefined;
    }, [_columns]);

    return (
        <AnchoredOverlay
            open={isOpenOverlay}
            onClose={() => {
                setIsOpenOverlay(false);
            }}
            overlayProps={{
                role: 'dialog',
                'aria-modal': true,
                'aria-label': 'Ẩn/ hiện cột',
            }}
            focusZoneSettings={{
                disabled: true,
            }}
            renderAnchor={(anchorProps) => {
                if (columnChooserConfig && columnChooserConfig.render) {
                    return (
                        <div {...anchorProps}>
                            <div
                                className="cursor-pointer"
                                onClick={() => {
                                    setIsOpenOverlay(true);
                                }}
                            >
                                {columnChooserConfig.render(isHaveHiddenColumns)}
                            </div>
                        </div>
                    );
                }
                return (
                    <div {...anchorProps}>
                        <IconButton
                            icon={EyeIcon}
                            variant={isHaveHiddenColumns ? "danger" : "default"}
                            aria-label="Ẩn/ hiện cột"
                            onClick={() => {
                                setIsOpenOverlay(true);
                            }}
                        />
                    </div>
                );
            }}
        >
            <div className="p-2">
                <ColumnTreeViewSelection columns={props.columns} />
            </div>
        </AnchoredOverlay>
    );
};

const ColumnTreeViewSelection = (_props: IColumnTreeViewSelectionProps) => {
    void _props;
    const {
        _columns,
        _onColumnSettingChanged,
        columnChooserConfig,
    } = useContext<IDataGridContainerContext>(DataGridContainerContext);

    const checkVisable = (col: IDataGridColumn, changeds: IDataGridColumn[]): IDataGridColumn => {
        const temp = changeds.find(x => x.uuid === col.uuid);
        const result: IDataGridColumn = {
            ...col,
            isVisible: temp?.isVisible ?? col.isVisible,
            columns:
                col.columns && col.columns.length > 0
                    ? col.columns.map((x) => checkVisable(x, changeds))
                    : undefined,
        };
        return result;
    };

    const handleOnChanged = (cols: IDataGridColumn[]) => {
        const data = _columns.map(col => checkVisable(col, cols));
        if (typeof window !== "undefined" && columnChooserConfig && columnChooserConfig.cachedKeyName) {
            const saveToCachedData = extractLeafColumns(data).filter(x => x.dataField);
            localStorage.setItem(columnChooserConfig.cachedKeyName, JSON.stringify(saveToCachedData));
        }
        _onColumnSettingChanged(data);
    };

    return (
        <div>
            <div className={styles.columnChooserHeader}>
                <FormControl disabled>
                    <FormControl.Label>
                        Chọn tất cả
                    </FormControl.Label>
                    <Checkbox disabled readOnly />
                </FormControl>
                <TextInput placeholder='Search' trailingVisual={SearchIcon} disabled />
            </div>
            <TreeView aria-label='ColumnTreeViewSelection'>
                {_columns.filter(x => x.dataField || x.columns).map((col, idx) => (
                    <ColumnTreeViewItem
                        key={col.uuid ?? col.dataField ?? idx}
                        column={col}
                        onChanged={(cols) => {
                            handleOnChanged(cols);
                        }}
                    />
                ))}
            </TreeView>
        </div>
    );
};

const ColumnTreeViewItem = (props: IColumnTreeViewItemProps) => {
    const { translate } = useCommonContext();
    const { column, onChanged } = props;
    if ((column.columns ?? []).length > 0) {
        const isSelectedAll = (column.columns ?? []).find(x => !x.isVisible) === undefined;
        return (
            <TreeView.Item id={`${column.uuid}`} defaultExpanded>
                <FormControl>
                    <FormControl.Label>
                        {translate(column.caption)}
                    </FormControl.Label>
                    <Checkbox
                        checked={isSelectedAll}
                        onChange={(e) => {
                            onChanged(
                                (column.columns ?? []).map(sub => ({
                                    ...sub,
                                    isVisible: e.target.checked,
                                })),
                            );
                        }}
                    />
                </FormControl>
                <TreeView.SubTree>
                    {(column.columns ?? []).map((subColumn, idx) => (
                        <ColumnTreeViewItem
                            key={subColumn.uuid ?? subColumn.dataField ?? idx}
                            column={subColumn}
                            onChanged={(cols) => {
                                onChanged(cols);
                            }}
                        />
                    ))}
                </TreeView.SubTree>
            </TreeView.Item>
        );
    }

    return (
        <TreeView.Item id={`${column.uuid}`}>
            <FormControl>
                <FormControl.Label>
                    {translate(column.caption)}
                </FormControl.Label>
                <Checkbox
                    checked={column.isVisible}
                    onChange={(e) => {
                        onChanged([{ ...column, isVisible: e.target.checked }]);
                    }}
                />
            </FormControl>
        </TreeView.Item>
    );
};

export default ColumnChooserButton;
