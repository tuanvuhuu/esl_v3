'use client';

import { Textarea, TextareaProps } from '@primer/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import useAutosizeTextArea from '@/components-ui/_adapters/hooks';
import styles from './TextAreaAutoHeight.module.css';

interface ITextAreaAutoHeightProps extends TextareaProps {
    isAutoFocus?: boolean;
    onValueChanged?: (value: string) => void;
    isNoBorder?: boolean;
}

const TextAreaAutoHeight = (props: ITextAreaAutoHeightProps) => {
    // Textarea v38 gắn className lên span bọc ngoài (nơi sx cũ áp vào), không phải <textarea>
    const {
        className,
        isAutoFocus,
        onValueChanged,
        isNoBorder,
        defaultValue,
        rows,
        onChange,
        onBlur,
        ...textareaProps
    } = props;

    const defaultStr = defaultValue !== undefined ? defaultValue.toString() : "";
    const [value, setValue] = useState(defaultStr);
    const [prevDefaultStr, setPrevDefaultStr] = useState(defaultStr);
    if (defaultStr !== prevDefaultStr) {
        setPrevDefaultStr(defaultStr);
        setValue(defaultStr);
    }

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    useAutosizeTextArea(textAreaRef, value);

    useLayoutEffect(() => {
        if (isAutoFocus) {
            textAreaRef.current?.focus();
        }
    }, [isAutoFocus]);

    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.value = defaultValue?.toString() ?? "";
        }
    }, [defaultValue]);

    const handleChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = evt.target?.value;
        setValue(val);
        if (onChange) {
            onChange(evt);
        }
    };

    return (
        <Textarea
            rows={rows ?? 1}
            {...textareaProps}
            resize="none"
            className={clsx(styles.textarea, isNoBorder && styles.noBorder, className)}
            defaultValue={defaultValue}
            ref={textAreaRef}
            onChange={handleChange}
            onBlur={(e) => {
                if (onValueChanged) {
                    onValueChanged(e.target.value);
                }
                onBlur?.(e);
            }}
        />
    );
};

export default TextAreaAutoHeight;
