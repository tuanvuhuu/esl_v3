'use client';

import { Textarea, TextareaProps } from '@primer/react';
import clsx from 'clsx';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import useAutosizeTextArea from '@/components-ui/_adapters/hooks';
import styles from './TextAreaAutoHeight.module.css';

export interface ITextAreaAutoHeightProps extends TextareaProps {
  isAutoFocus?: boolean;
  onValueChanged?: (value: string) => void;
  isNoBorder?: boolean;
  error?: boolean;
}

const TextAreaAutoHeight = (props: ITextAreaAutoHeightProps) => {
  const {
    className,
    isAutoFocus,
    onValueChanged,
    isNoBorder,
    value: controlledValue,
    defaultValue,
    rows,
    error,
    onChange,
    onBlur,
    ...textareaProps
  } = props;

  const isControlled = controlledValue !== undefined;
  const initialStr = (isControlled ? controlledValue : defaultValue)?.toString() ?? '';
  const [innerValue, setInnerValue] = useState(initialStr);
  const [prevDefaultStr, setPrevDefaultStr] = useState(defaultValue?.toString() ?? '');

  const currentDefaultStr = defaultValue?.toString() ?? '';
  if (!isControlled && currentDefaultStr !== prevDefaultStr) {
    setPrevDefaultStr(currentDefaultStr);
    setInnerValue(currentDefaultStr);
  }

  const activeStr = isControlled ? String(controlledValue ?? '') : innerValue;
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  useAutosizeTextArea(textAreaRef, activeStr);

  useLayoutEffect(() => {
    if (isAutoFocus) {
      textAreaRef.current?.focus();
    }
  }, [isAutoFocus]);

  useEffect(() => {
    if (!isControlled && textAreaRef.current && defaultValue !== undefined) {
      textAreaRef.current.value = defaultValue.toString();
    }
  }, [defaultValue, isControlled]);

  const handleChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = evt.target?.value ?? '';
    if (!isControlled) setInnerValue(val);
    onChange?.(evt);
  };

  return (
    <Textarea
      rows={rows ?? 2}
      {...textareaProps}
      block
      resize="vertical"
      validationStatus={error ? 'error' : textareaProps.validationStatus}
      className={clsx(styles.textarea, isNoBorder && styles.noBorder, '!w-full', className)}
      {...(isControlled ? { value: activeStr } : { defaultValue })}
      ref={textAreaRef}
      onChange={handleChange}
      onBlur={(e) => {
        onValueChanged?.(e.target.value);
        onBlur?.(e);
      }}
    />
  );
};

export default TextAreaAutoHeight;
