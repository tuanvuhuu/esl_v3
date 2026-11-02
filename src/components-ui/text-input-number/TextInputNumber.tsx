'use client';

import clsx from "clsx";
import { useState } from "react";
import { NumericFormat } from "react-number-format";
import TextInput from "../text-input";
import { IMyTextInputProps } from "../text-input/TextInput";

export interface ITextInputNumberProps
  extends Omit<IMyTextInputProps, "value" | "defaultValue" | "onValueChanged"> {
  value?: number | string | null;
  defaultValue?: number | string | null;
  onValueChanged?: (value: number) => void;
  onTextChange?: (raw: string) => void;
  decimalScale?: number;
  thousandSeparator?: string | boolean;
  min?: number;
  max?: number;
  error?: boolean;
  isSoAm?: boolean;
  isAlignRight?: boolean;
  isZeroNumber?: boolean;
  isAllowReturnUndefinedValue?: boolean;
}

const TextInputNumber = (props: ITextInputNumberProps) => {
  const {
    value,
    defaultValue,
    onValueChanged,
    onTextChange,
    decimalScale = 0,
    thousandSeparator = " ",
    min,
    max,
    error,
    name,
    isSoAm,
    isAlignRight,
    isZeroNumber,
    isAllowReturnUndefinedValue,
    disabled,
    placeholder,
    className,
    block = true,
    ...restProps
  } = props;

  const isControlled = value !== undefined;
  const externalValue = isControlled
    ? (value ?? (isZeroNumber ? 0 : undefined))
    : (defaultValue ?? (isZeroNumber ? 0 : undefined));

  const [internalValue, setInternalValue] = useState<number | string | undefined>(externalValue);
  const [prevValue, setPrevValue] = useState<number | string | null | undefined>(value);

  if (isControlled && value !== prevValue) {
    setPrevValue(value);
    setInternalValue(value ?? (isZeroNumber ? 0 : undefined));
  }

  const rawString =
    internalValue === undefined || internalValue === null || internalValue === ""
      ? ""
      : String(internalValue);

  return (
    <>
      <NumericFormat
        customInput={TextInput}
        value={internalValue ?? ""}
        thousandSeparator={thousandSeparator}
        decimalSeparator=","
        decimalScale={decimalScale}
        allowNegative={!!isSoAm}
        inputMode={decimalScale > 0 ? "decimal" : "numeric"}
        placeholder={placeholder}
        block={block}
        validationStatus={error ? "error" : restProps.validationStatus}
        aria-label={restProps["aria-label"]}
        className={clsx(isAlignRight && "input-align-right", className)}
        disabled={disabled}
        onValueChange={(values, sourceInfo) => {
          const nextFloat = values.value === "" ? undefined : values.floatValue;
          setInternalValue(nextFloat);
          if (sourceInfo.source === "event") {
            onTextChange?.(values.value);
            if (nextFloat !== undefined) {
              onValueChanged?.(nextFloat);
            } else if (isAllowReturnUndefinedValue) {
              onValueChanged?.(undefined as unknown as number);
            }
          }
        }}
        onBlur={() => {
          if (internalValue === undefined || internalValue === null || internalValue === "") {
            onValueChanged?.(
              isAllowReturnUndefinedValue ? (undefined as unknown as number) : 0,
            );
            return;
          }
          let num = Number(internalValue);
          if (min !== undefined && num < min) num = min;
          if (max !== undefined && num > max) num = max;
          if (num !== internalValue) {
            setInternalValue(num);
            onTextChange?.(String(num));
          }
          onValueChanged?.(num);
        }}
      />
      {name && <input type="hidden" name={name} value={rawString} />}
    </>
  );
};

export default TextInputNumber;
