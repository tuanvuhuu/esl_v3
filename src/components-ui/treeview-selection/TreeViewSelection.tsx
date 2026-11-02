'use client';

import { Checkbox, FormControl, TreeView } from '@primer/react';
import React, { useMemo } from 'react';
import styles from './treeview-selection.module.css';

export interface ITreeViewItem<TId = number | string, TData = unknown> {
    id: TId;
    data: TData;
    text?: React.ReactNode;
    leadingVisualRender?: (data: TData) => React.ReactNode;
    trailingVisualRender?: (data: TData) => React.ReactNode;
    itemRender?: (data: TData) => React.ReactNode;
    subItems?: ITreeViewItem<TId, TData>[];
    childIds?: TId[];
}

export interface ITreeViewSelectionProps<TId = number | string, TData = unknown> {
    selectedIds: TId[];
    onSelectionChanged: (ids: TId[]) => void;
    items: ITreeViewItem<TId, TData>[];
}

interface ITreeViewItemRenderProps<TId = number | string, TData = unknown> {
    item: ITreeViewItem<TId, TData>;
    selectedIds: TId[];
    onSelectionChanged: (ids: TId[]) => void;
}

const TreeViewItemRender = <TId = number | string, TData = unknown>(
    props: ITreeViewItemRenderProps<TId, TData>,
) => {
    const { item, selectedIds, onSelectionChanged } = props;
    const isHaveSubItems = (item.subItems ?? []).length > 0;
    const childIds = useMemo(() => item.childIds ?? [], [item.childIds]);
    const isSelected = useMemo(() => {
        if (!isHaveSubItems) {
            return selectedIds.includes(item.id);
        } else {
            if (childIds.length === 0) return false;
            const unSelecedItem = childIds.find(s => !selectedIds.includes(s));
            return unSelecedItem === undefined;
        }
    }, [selectedIds, isHaveSubItems, childIds, item.id]);

    const onChanged = (checked: boolean) => {
        if (!checked) {
            if (isHaveSubItems) {
                const newIds = selectedIds.filter(x => !childIds.includes(x));
                onSelectionChanged([...Array.from(new Set(newIds))]);
            } else {
                onSelectionChanged(selectedIds.filter(x => x !== item.id));
            }
        } else {
            if (isHaveSubItems) {
                const newIds = [...selectedIds, ...childIds];
                onSelectionChanged([...Array.from(new Set(newIds))]);
            } else {
                onSelectionChanged([...selectedIds, item.id]);
            }
        }
    };

    return (
        <TreeView.Item id={String(item.id)}>
            <div className="d-flex gap-2">
                {item.leadingVisualRender && <>{item.leadingVisualRender(item.data)}</>}
                <div className="flex-1 d-flex gap-2">
                    <FormControl>
                        <FormControl.Label className={styles.treeViewItemRender_label}>
                            {item.itemRender ? item.itemRender(item.data) : item.text}
                        </FormControl.Label>
                        <Checkbox
                            checked={isSelected}
                            onChange={(e) => {
                                onChanged(e.target.checked);
                            }}
                        />
                    </FormControl>
                </div>
                {item.trailingVisualRender && <>{item.trailingVisualRender(item.data)}</>}
            </div>
            {isHaveSubItems && (
                <TreeView.SubTree>
                    {(item.subItems ?? []).map(subItem => (
                        <TreeViewItemRender
                            key={String(subItem.id)}
                            item={subItem}
                            selectedIds={selectedIds}
                            onSelectionChanged={onSelectionChanged}
                        />
                    ))}
                </TreeView.SubTree>
            )}
        </TreeView.Item>
    );
};

const SetChildIds = <TId = number | string, TData = unknown>(
    item: ITreeViewItem<TId, TData>,
): ITreeViewItem<TId, TData> => {
    if (!item.subItems || item.subItems.length === 0) {
        return { ...item, childIds: [item.id] };
    }
    const subItems = item.subItems.map(s => SetChildIds(s));
    const childIds = subItems.flatMap(s => s.childIds ?? []);
    return {
        ...item,
        subItems,
        childIds,
    };
};

const TreeViewSelection = <TId = number | string, TData = unknown>(
    props: ITreeViewSelectionProps<TId, TData>,
) => {
    const { items, selectedIds, onSelectionChanged } = props;
    const dataSource = useMemo(() => {
        return items.map(item => SetChildIds(item));
    }, [items]);

    const isSelectedAll = useMemo(() => {
        const unSelected = dataSource.find(item => {
            const isUnSelected = (item.childIds ?? []).find(id => !selectedIds.includes(id));
            return isUnSelected !== undefined;
        });
        return unSelected === undefined;
    }, [selectedIds, dataSource]);

    const onChanged = (checked: boolean) => {
        if (checked) {
            onSelectionChanged(dataSource.flatMap(i => i.childIds ?? []));
        } else {
            onSelectionChanged([]);
        }
    };

    return (
        <div className="d-grid gap-2">
            <div>
                <FormControl>
                    <FormControl.Label>Chọn tất cả</FormControl.Label>
                    <Checkbox
                        checked={isSelectedAll}
                        onChange={(e) => {
                            onChanged(e.target.checked);
                        }}
                    />
                </FormControl>
            </div>
            <nav aria-label="Class">
                <TreeView aria-label="Files changed">
                    {dataSource.map(item => (
                        <TreeViewItemRender
                            key={String(item.id)}
                            item={item}
                            selectedIds={selectedIds}
                            onSelectionChanged={onSelectionChanged}
                        />
                    ))}
                </TreeView>
            </nav>
        </div>
    );
};

export default TreeViewSelection;
