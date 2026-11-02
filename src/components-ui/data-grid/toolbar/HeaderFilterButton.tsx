'use client';

import { FilterIcon } from '@primer/octicons-react';
import { AnchoredOverlay } from '@primer/react';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import styles from '../DataGrid.module.css';
import { DataGridRowRecord, ICondition, IDataGridColumn } from '../type/IDataGridProps';
import HeaderFilterModal from './HeaderFilterModal';

interface IHeaderFilterButtonProps {
    conditions: ICondition[];
    dataSource: DataGridRowRecord[];
    dataColumn: IDataGridColumn;
    onApply: (values: unknown[]) => void;
}

const HeaderFilterButton = ({
    dataSource,
    dataColumn,
    onApply,
    conditions,
}: IHeaderFilterButtonProps) => {
    const [isOpenFilterModal, setIsOpenFilterModal] = useState(false);

    const distinctedValues = useMemo<unknown[]>(() => {
        if (!isOpenFilterModal || !dataSource || !dataColumn.dataField) {
            return [];
        }
        const field = dataColumn.dataField;
        return Array.from(new Set(dataSource.map((x) => x[field])));
    }, [isOpenFilterModal, dataSource, dataColumn.dataField]);

    const handleFilterClick = () => {
        setIsOpenFilterModal(true);
    };

    const condition = useMemo(() => {
        return conditions.find((x) => x.field === dataColumn.dataField);
    }, [conditions, dataColumn]);

    return (
        <div>
            <AnchoredOverlay
                open={isOpenFilterModal}
                onClose={() => {
                    setIsOpenFilterModal(false);
                }}
                overlayProps={{
                    role: 'dialog',
                    'aria-modal': true,
                    'aria-label': 'Preview',
                }}
                focusZoneSettings={{
                    disabled: true,
                }}
                side="outside-bottom"
                align="start"
                renderAnchor={(anchorProps) => {
                    return (
                        <div
                            {...anchorProps}
                            onClick={() => {
                                handleFilterClick();
                            }}
                            className="cursor-pointer"
                        >
                            <FilterIcon
                                size={"small"}
                                className={clsx(styles.filterIcon, condition && styles.filterIconActive)}
                            />
                        </div>
                    );
                }}
            >
                <HeaderFilterModal
                    condition={condition}
                    dataColumn={dataColumn}
                    distinctedValues={distinctedValues}
                    onApply={(values) => {
                        onApply(values);
                        setIsOpenFilterModal(false);
                    }}
                    onCancel={() => {
                        setIsOpenFilterModal(false);
                    }}
                />
            </AnchoredOverlay>
        </div>
    );
};

export default HeaderFilterButton;
