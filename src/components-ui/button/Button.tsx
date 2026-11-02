'use client';

import { Button, ButtonProps, Spinner } from '@primer/react';
import React from 'react';
import { useCommonContext } from '@/components-ui/_adapters/commonContext';
import Tooltip from '../tooltip';
export interface IMyButtonProps extends ButtonProps {
    text?: string,
    isLoading?: boolean,
    tooltip?: string,
    tooltipdDirection?: 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw',
}
const Loading = () => {
    return <Spinner size='small' />
}
// forwardRef để dùng được làm trigger của Tooltip (TooltipV2 gắn ref lên phần tử con)
const MyButton = React.forwardRef<HTMLButtonElement, IMyButtonProps>((props, ref) => {
    const { translate } = useCommonContext();
    const { text, isLoading, tooltip, tooltipdDirection, ...buttonProps } = props;
    const isDisabled = isLoading || props.disabled;
    if (!tooltip)
        return (
            <Button
                {...buttonProps}
                ref={ref}
                leadingVisual={isLoading ? Loading : props.leadingVisual}
                disabled={isDisabled}
            >
                {translate(text)}
                {props.children}
            </Button>
        );
    // Có tooltip: không dùng `disabled` (button disabled không nhận hover, và TooltipV2 throw nếu trigger disabled lúc mount)
    // → `inactive` + aria-disabled, chặn onClick.
    return (
        <Tooltip text={tooltip} direction={tooltipdDirection ?? 'n'}>
            <Button
                {...buttonProps}
                ref={ref}
                leadingVisual={isLoading ? Loading : props.leadingVisual}
                disabled={false}
                inactive={isDisabled || undefined}
                aria-disabled={isDisabled || undefined}
                onClick={isDisabled ? undefined : props.onClick}
            >
                {translate(text)}
                {props.children}
            </Button>
        </Tooltip>
    );
});
MyButton.displayName = 'MyButton';

export default MyButton;
