'use client';

import { Tooltip as PrimerTooltip, TooltipProps as PrimerTooltipProps } from '@primer/react';
import clsx from 'clsx';
import React from 'react';
import styles from './tooltip.module.css';

export interface ITooltipProps extends Omit<PrimerTooltipProps, 'children'> {
    children: React.ReactNode;
    /**
     * Nội dung KHÔNG tương tác được (icon, CounterLabel, Tag, span, div…).
     * Tooltip của @primer/react v38 (TooltipV2) bắt buộc trigger là phần tử tương tác được (button, a[href], input…),
     * nếu không sẽ throw lỗi lúc mount; icon <svg> cũng không làm trigger được. Khi bật cờ này, children được bọc trong
     * một span focus được (role="button", tabIndex=0) — giống span mà Tooltip v1 từng render quanh children.
     * Không bật với Button/IconButton/Link/Checkbox (tránh lồng phần tử tương tác).
     */
    nonInteractive?: boolean;
    /** Class cho span bọc ngoài khi `nonInteractive` */
    triggerClassName?: string;
}

/**
 * Tooltip dùng chung (TooltipV2). Với con tương tác được: children phải là MỘT phần tử nhận `ref`
 * (Button/IconButton/Link của Primer, `@/components-ui/button`…) và không được `disabled` lúc mount
 * — button disabled không nhận hover; dùng `aria-disabled`/`inactive` thay vì `disabled`.
 */
const Tooltip = React.forwardRef<HTMLElement, ITooltipProps>(({ children, nonInteractive, triggerClassName, ...props }, ref) => {
    if (!nonInteractive)
        return <PrimerTooltip {...props} ref={ref}>{children as React.ReactElement}</PrimerTooltip>;
    return (
        <PrimerTooltip {...props} ref={ref}>
            <span role="button" tabIndex={0} className={clsx(styles.trigger, triggerClassName)}>
                {children}
            </span>
        </PrimerTooltip>
    );
});
Tooltip.displayName = 'Tooltip';

export default Tooltip;
