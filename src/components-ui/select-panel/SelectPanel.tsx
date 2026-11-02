'use client';

import { SelectPanel as PrimerSelectPanel, SelectPanelProps } from '@primer/react';
import { useState } from 'react';

/**
 * SelectPanel của @primer/react v38 kèm 2 sửa lỗi hành vi, dùng thay cho import thẳng từ Primer:
 * - `loading` mặc định `false`: nếu không truyền, v38 tự bật spinner khi mở panel mà `items` rỗng và chỉ tắt khi mảng
 *   `items` đổi → không có dữ liệu thì spinner quay mãi. Truyền `loading` thật nếu dữ liệu tải bất đồng bộ.
 * - danh sách rỗng mà không truyền `message` → thông báo tiếng Việt (mặc định Primer là "No items available");
 *   `placeholderText` mặc định "Tìm kiếm" (Primer: "Filter items").
 */
export const SelectPanel = (props: SelectPanelProps) => {
    const [internalFilter, setInternalFilter] = useState('');
    const filter = props.filterValue ?? internalFilter;
    const emptyMessage: SelectPanelProps['message'] = props.items.length === 0
        ? (filter
            ? { variant: 'empty', title: 'Không tìm thấy kết quả', body: `Không có kết quả phù hợp với "${filter}"` }
            : { variant: 'empty', title: 'Không có dữ liệu', body: '' })
        : undefined;
    return (
        <PrimerSelectPanel
            loading={false}
            placeholderText="Tìm kiếm"
            message={emptyMessage}
            {...props}
            onFilterChange={(value, e) => {
                setInternalFilter(value);
                props.onFilterChange?.(value, e);
            }}
        />
    );
};

export default SelectPanel;
