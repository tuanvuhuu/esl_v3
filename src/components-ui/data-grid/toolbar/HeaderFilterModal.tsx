'use client';

import Button from '@/components-ui/button';
import ModalActions from '@/components-ui/modal/ModalActions';
import TextInput from '@/components-ui/text-input';
import { SearchIcon } from '@primer/octicons-react';
import { ActionList, Checkbox, FormControl } from '@primer/react';
import { useCallback, useMemo, useState } from 'react';
import { ICondition, IDataGridColumn } from '../type/IDataGridProps';
import { formatDisplay } from '../type/ColumnHelper';
import styles from '../DataGrid.module.css';

interface IHeaderFilterModalProps {
    condition?: ICondition;
    distinctedValues: unknown[];
    onApply: (values: unknown[]) => void;
    onCancel: () => void;
    dataColumn: IDataGridColumn;
}

const HeaderFilterModal = ({
    distinctedValues,
    onApply,
    onCancel,
    condition,
    dataColumn,
}: IHeaderFilterModalProps) => {
    const [selectedTemp, setSelectedTemp] = useState<unknown[]>(() =>
        condition && Array.isArray(condition.value) ? condition.value : [],
    );
    const [prevCondition, setPrevCondition] = useState<ICondition | undefined>(condition);

    if (condition !== prevCondition) {
        setPrevCondition(condition);
        if (condition && Array.isArray(condition.value)) {
            setSelectedTemp(condition.value);
        } else {
            setSelectedTemp([]);
        }
    }

    const [searchKey, setSearchKey] = useState<string>("");
    const filterdData = useMemo(() => {
        if (searchKey === "") return distinctedValues;
        return distinctedValues.filter((x) =>
            String(x ?? "").toLowerCase().includes(searchKey.toLowerCase()),
        );
    }, [searchKey, distinctedValues]);

    const onSubmit = useCallback(() => {
        onApply(selectedTemp);
    }, [onApply, selectedTemp]);

    const isSelectedAll = useMemo(() => {
        return !distinctedValues.find((x) => !selectedTemp.includes(x));
    }, [distinctedValues, selectedTemp]);

    return (
        <div className={styles.filterModal}>
            <div>
                <TextInput
                    placeholder='Tìm kiếm'
                    block
                    leadingVisual={SearchIcon}
                    onValueDelayChanged={(value) => {
                        setSearchKey(value);
                    }}
                />
            </div>
            <div className="pl-2">
                <FormControl>
                    <Checkbox
                        checked={isSelectedAll}
                        onChange={() => {
                            if (isSelectedAll) {
                                setSelectedTemp([]);
                            } else {
                                setSelectedTemp([...distinctedValues]);
                            }
                        }}
                    />
                    <FormControl.Label>Chọn tất cả</FormControl.Label>
                </FormControl>
            </div>
            <div className={styles.filterModalList}>
                <ActionList role="listbox" aria-multiselectable selectionVariant='multiple' variant='full'>
                    {filterdData.map((value, idx) => {
                        const isSelected = selectedTemp.find((s) => s === value) !== undefined;
                        return (
                            <ActionList.Item
                                key={idx}
                                selected={isSelected}
                                onSelect={() => {
                                    if (isSelected) {
                                        setSelectedTemp(selectedTemp.filter((x) => x !== value));
                                    } else {
                                        setSelectedTemp([...selectedTemp, value]);
                                    }
                                }}
                            >
                                {formatDisplay(dataColumn, value)}
                            </ActionList.Item>
                        );
                    })}
                </ActionList>
            </div>
            <ModalActions>
                <Button text='Đóng' onClick={onCancel} />
                <Button text='Áp dụng' variant='primary' onClick={onSubmit} />
            </ModalActions>
        </div>
    );
};

export default HeaderFilterModal;
