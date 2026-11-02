'use client';

import type React from 'react';
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, SearchIcon } from '@primer/octicons-react';
import { IconButton } from '@primer/react';

import { useCommonSelectedHook } from '@/components-ui/_adapters/hooks';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import Button from '../button';
import { IDataGridFocusedCell } from '../data-grid/type/IDataGridProps';
import { IPaging } from '../data-table/DataTable';
import Text from '../text';
import TextInput from '../text-input';
import TextWithEllipse from '../text-with-ellipse';
import styles from './tree-list.module.css';
import clsx from 'clsx';

export interface ITreeListNode {
    id: number;
    items?: ITreeListNode[];
    parentIdFieldName?: number;
    [key: string]: unknown;
}

export interface ITreeListColumn<TData extends ITreeListNode = ITreeListNode> {
    caption?: string;
    dataField?: string;
    isMainColumn?: boolean;
    cellRender?: (data: TData) => React.JSX.Element;
    headerRender?: () => ReactNode;
    width?: string;
    align?: "left" | "center" | "right" | undefined;
    left?: number;
    right?: number;
    isAllowFocus?: boolean;
}

export interface ITreeListProps<TData extends ITreeListNode = ITreeListNode> {
    data: TData[];
    columns: ITreeListColumn<TData>[];
    parentIdFieldName: string;
    editingData?: Partial<TData>;
    onAddOrEditClick?: (data: Partial<TData>) => void;
    addOrEditComponentRender?: (data: Partial<TData>, level?: number) => ReactNode;
    selectedId?: number;
    onSelectedIdChanged?: (id: number) => void;
    isAllowInsert?: boolean;
    isAllowDelete?: boolean;
    isAllowUpdate?: boolean;
    paging?: IPaging;
    title?: string;
    titleComponent?: React.ReactNode;
    subTitle?: string;
    subTitleComponent?: React.ReactNode;
    actionComponent?: React.ReactNode;
    height?: string;
    searchEnable?: boolean;
    focusedCell?: IDataGridFocusedCell;
}

interface IRowsProps<TData extends ITreeListNode = ITreeListNode> {
    data: TData[];
    parentId: number;
    columns: ITreeListColumn<TData>[];
    level: number;
    editingData?: Partial<TData>;
    selectedId?: number;
    addOrEditComponentRender?: (data: Partial<TData>, level?: number) => ReactNode;
    onAddOrEditClick?: (data: Partial<TData>) => void;
    onSelectedIdChanged?: (id: number) => void;
    focusedCell?: IDataGridFocusedCell;
    mainColor?: string;
    isAllowInsert?: boolean;
    isAllowDelete?: boolean;
    isAllowUpdate?: boolean;
    parentIdFieldName?: string;
}

interface IRowProps<TData extends ITreeListNode = ITreeListNode> {
    data: TData;
    parentId: number;
    columns: ITreeListColumn<TData>[];
    level: number;
    editingData?: Partial<TData>;
    addOrEditComponentRender?: (data: Partial<TData>, level?: number) => ReactNode;
    onAddOrEditClick?: (data: Partial<TData>) => void;
    selectedId?: number;
    onSelectedIdChanged?: (id: number) => void;
    focusedCell?: IDataGridFocusedCell;
    mainColor?: string;
    isAllowInsert?: boolean;
    isAllowDelete?: boolean;
    isAllowUpdate?: boolean;
    parentIdFieldName?: string;
}

const Rows = <TData extends ITreeListNode = ITreeListNode>(props: IRowsProps<TData>) => {
    const { data, editingData, addOrEditComponentRender, onAddOrEditClick } = props;

    return (
        <>
            {data.map(rowData => {
                return (
                    <Row
                        key={rowData.id}
                        data={rowData}
                        columns={props.columns}
                        level={props.level}
                        parentId={rowData.id}
                        editingData={editingData}
                        addOrEditComponentRender={addOrEditComponentRender}
                        onAddOrEditClick={onAddOrEditClick}
                        selectedId={props.selectedId}
                        onSelectedIdChanged={props.onSelectedIdChanged}
                        focusedCell={props.focusedCell}
                        mainColor={props.mainColor}
                        isAllowInsert={props.isAllowInsert}
                        parentIdFieldName={props.parentIdFieldName}
                    />
                );
            })}
        </>
    );
};

const Row = <TData extends ITreeListNode = ITreeListNode>(props: IRowProps<TData>) => {
    const { data, editingData, addOrEditComponentRender, onAddOrEditClick, focusedCell } = props;
    const rowData = data;
    const [isExpanded, setIsExpanded] = useState(true);
    const gridTemplateColumns = props.columns.map(col => col.width ?? "1fr").join(" ");
    const childItems = (rowData.items ?? []) as TData[];
    const isHaveChild = childItems.length > 0;
    const isEditing = Boolean(editingData && editingData.id === props.data.id);
    const backgroundColor = rowData.id === props.selectedId ? "#fbefff" : "#ffff";
    const mainColumn = props.columns.find(x => x.isMainColumn);
    const rawMainVal = mainColumn && mainColumn.dataField ? props.data[mainColumn.dataField] : undefined;
    const mainText = rawMainVal !== undefined && rawMainVal !== null ? String(rawMainVal) : undefined;

    const handleFocus = (col: ITreeListColumn<TData>) => {
        focusedCell?.onFocusedCellChanged?.({
            rowData: rowData,
            dataField: col.dataField ?? "",
        });
    };

    const focusedRowRecord = props.focusedCell?.focusedCell?.rowData as Record<string, unknown> | undefined;

    return (
        <>
            <div
                style={{ gridTemplateColumns: gridTemplateColumns, backgroundColor: backgroundColor }}
                key={rowData.id}
                className="d-grid"
                onClick={() => {
                    props.onSelectedIdChanged?.(rowData.id);
                }}
            >
                {props.columns.map((col, idxCol) => {
                    const isLastCol = idxCol === props.columns.length - 1;
                    const isFocused =
                        col.isAllowFocus &&
                        rowData["id"] === focusedRowRecord?.["id"] &&
                        props.focusedCell?.focusedCell?.dataField === col.dataField;
                    const cellText = col.dataField && rowData[col.dataField] !== undefined && rowData[col.dataField] !== null
                        ? String(rowData[col.dataField])
                        : "";
                    return (
                        <div
                            key={idxCol}
                            style={{
                                left: col.left,
                                right: col.right,
                                backgroundColor: backgroundColor,
                                outline: isFocused
                                    ? `2px solid ${props.mainColor ?? "rgb(9, 105, 218)"}`
                                    : undefined,
                            }}
                            onFocus={() => {
                                handleFocus(col);
                            }}
                            tabIndex={col.isAllowFocus ? 0 : undefined}
                            className={clsx(
                                styles.row_box2,
                                (col.left !== undefined || col.right !== undefined) && styles.row_box2_leftRight,
                                !isLastCol && styles.row_box2_isLastCol,
                                col.isMainColumn && "fw-bold",
                                isFocused && styles.row_box2_isFocused,
                            )}
                        >
                            {col.isMainColumn && (
                                <div style={{ gridTemplateColumns: `${(props.level + 1) * 20}px 1fr` }} className="d-grid gap-2">
                                    <div className={styles.row_box4}>
                                        {isHaveChild && (
                                            <IconButton
                                                icon={isExpanded ? ChevronDownIcon : ChevronRightIcon}
                                                aria-label='Expand'
                                                variant='invisible'
                                                className={styles.row_iconButton}
                                                onClick={() => {
                                                    setIsExpanded(!isExpanded);
                                                }}
                                            />
                                        )}
                                    </div>

                                    <div>
                                        {col.cellRender ? (
                                            col.cellRender(rowData)
                                        ) : (
                                            <>
                                                {col.dataField && rowData && (
                                                    <TextWithEllipse text={cellText} lineNumber={1} />
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                            {!col.isMainColumn && (
                                <>
                                    {col.cellRender ? (
                                        col.cellRender(rowData)
                                    ) : (
                                        <>
                                            {col.dataField && rowData && (
                                                <TextWithEllipse text={cellText} lineNumber={1} />
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {isEditing && (
                <div>
                    {props.addOrEditComponentRender?.(props.data, props.level)}
                </div>
            )}
            {isExpanded && childItems.length > 0 && (
                <Rows
                    columns={props.columns}
                    data={childItems}
                    parentId={rowData.id}
                    level={props.level + 1}
                    editingData={editingData}
                    addOrEditComponentRender={addOrEditComponentRender}
                    onAddOrEditClick={onAddOrEditClick}
                    selectedId={props.selectedId}
                    onSelectedIdChanged={props.onSelectedIdChanged}
                    focusedCell={props.focusedCell}
                    mainColor={props.mainColor}
                    isAllowInsert={props.isAllowInsert}
                />
            )}
            {(!editingData || editingData.parentIdFieldName === props.data.id) &&
                props.data.id === props.selectedId &&
                props.isAllowInsert && (
                    <div style={{ paddingLeft: `${(props.level + 2) * 30}px` }} className={styles.row_box5}>
                        <Button
                            tooltip={mainText}
                            variant='invisible'
                            leadingVisual={PlusIcon}
                            onClick={() => {
                                props.onAddOrEditClick?.({
                                    parentIdFieldName: props.data.id,
                                } as Partial<TData>);
                            }}
                        >
                            <TextWithEllipse text={`Thêm cho ${mainText ?? ""}`} />
                        </Button>
                    </div>
                )}
            {editingData && editingData.parentIdFieldName === props.data.id && (
                <div>
                    {props.addOrEditComponentRender?.(editingData, props.level + 1)}
                </div>
            )}
        </>
    );
};

const TreeList = <TData extends ITreeListNode = ITreeListNode>(props: ITreeListProps<TData>) => {
    const {
        columns,
        data,
        editingData,
        title,
        titleComponent,
        subTitle,
        subTitleComponent,
        actionComponent,
        searchEnable,
        parentIdFieldName,
    } = props;
    const gridTemplateColumns = columns.map(col => col.width ?? "1fr").join(" ");
    const { mainColor } = useCommonSelectedHook();

    const buildTree = useCallback((items: TData[]): TData[] => {
        const map = new Map<number, TData & { items: TData[] }>();
        const tree: TData[] = [];

        items.forEach((item) => {
            map.set(item.id, { ...item, items: [] });
        });

        items.forEach((item) => {
            const objNode = map.get(item.id);
            if (objNode) {
                const parentIdVal = item[parentIdFieldName];
                if (parentIdVal === 0) {
                    tree.push(objNode);
                } else if (typeof parentIdVal === "number") {
                    const objParentNode = map.get(parentIdVal);
                    if (objParentNode) {
                        objParentNode.items.push(objNode);
                    }
                }
            }
        });
        return tree;
    }, [parentIdFieldName]);

    const structedData = useMemo(() => {
        return buildTree(data);
    }, [buildTree, data]);

    return (
        <div>
            <div id="toolbar" className="d-flex mb-1">
                <div id="left" className="flex-1">
                    {title && (
                        <Text
                            text={title}
                            className={styles.treeList_text}
                        />
                    )}
                    {titleComponent && <div>{titleComponent}</div>}
                    {(subTitle || subTitleComponent) && (
                        <div>
                            {subTitle && <Text text={subTitle} className={styles.treeList_text2} />}
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
                                placeholder="Search"
                                onValueDelayChanged={() => undefined}
                            />
                        </div>
                    )}
                </div>
            </div>
            <div style={{ height: props.height }} className={styles.treeList_box2}>
                <div
                    style={{ gridTemplateColumns: gridTemplateColumns }}
                    id='header'
                    className={styles.treeList_header}
                >
                    {props.columns.map((col, idxCol) => {
                        const isLastCol = idxCol === props.columns.length - 1;
                        return (
                            <div
                                key={idxCol}
                                style={{ left: col.left, right: col.right, textAlign: col.align ?? "left" }}
                                className={clsx(
                                    styles.treeList_box3,
                                    (col.left !== undefined || col.right !== undefined) && styles.treeList_box3_leftRight,
                                    !isLastCol && styles.treeList_box3_isLastCol,
                                )}
                            >
                                {col.caption ? <>{col.caption}</> : <>{col.headerRender?.()}</>}
                            </div>
                        );
                    })}
                </div>
                <Rows
                    columns={props.columns}
                    data={structedData}
                    level={0}
                    parentId={0}
                    editingData={editingData}
                    addOrEditComponentRender={props.addOrEditComponentRender}
                    onAddOrEditClick={props.onAddOrEditClick}
                    selectedId={props.selectedId}
                    onSelectedIdChanged={props.onSelectedIdChanged}
                    focusedCell={props.focusedCell}
                    mainColor={mainColor}
                    isAllowInsert={props.isAllowInsert}
                    parentIdFieldName={props.parentIdFieldName}
                />
                {!editingData && props.isAllowInsert && (
                    <div className={styles.treeList_box4}>
                        <Button
                            text='Thêm nội dung'
                            variant='invisible'
                            leadingVisual={PlusIcon}
                            onClick={() => {
                                props.onAddOrEditClick?.({
                                    id: 0,
                                } as Partial<TData>);
                            }}
                        />
                    </div>
                )}
                {editingData && editingData.id === 0 && (
                    <>
                        {props.addOrEditComponentRender?.(editingData, 0)}
                    </>
                )}
            </div>
        </div>
    );
};

export default TreeList;
