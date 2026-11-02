'use client';

import { useState } from "react";
import { NumericFormat } from "react-number-format";
import TextInput from "../text-input";
import { IMyTextInputProps } from "../text-input/TextInput";

interface ITextInputNumberProps
    extends Omit<IMyTextInputProps, "value" | "onValueChanged"> {
    value?: number | string | null;
    onValueChanged: (value: number) => void;
    isSoAm?: boolean;
    isAlignRight?: boolean;
    isZeroNumber?: boolean;
    isAllowReturnUndefinedValue?: boolean;
}

const TextInputNumber = (props: ITextInputNumberProps) => {
    const {
        value,
        onValueChanged,
        isSoAm,
        isAlignRight,
        isZeroNumber,
        isAllowReturnUndefinedValue,
        disabled,
    } = props;

    const externalValue = value ?? (isZeroNumber ? 0 : undefined);
    const [internalValue, setInternalValue] = useState<number | string | undefined>(
        externalValue,
    );
    const [prevExternalValue, setPrevExternalValue] = useState<number | string | undefined>(
        externalValue,
    );
    if (externalValue !== prevExternalValue) {
        setPrevExternalValue(externalValue);
        setInternalValue(externalValue);
    }

    return (
        <NumericFormat
            customInput={TextInput}
            value={internalValue}
            thousandSeparator=" "
            decimalSeparator=","
            decimalScale={2}
            allowNegative={!!isSoAm}
            inputMode="decimal"
            className={isAlignRight ? "input-align-right" : undefined}
            disabled={disabled}
            onValueChange={(values) => {
                // Chỉ lưu tạm
                setInternalValue(values.value === "" ? undefined : values.floatValue);
            }}
            onBlur={() => {
                if (internalValue === undefined || internalValue === null || internalValue === "") {
                    onValueChanged(
                        isAllowReturnUndefinedValue ? (undefined as unknown as number) : 0,
                    );
                } else {
                    if (Number(internalValue) !== Number(value)) {
                        onValueChanged(Number(internalValue));
                    }
                }
            }}
        />
    );
};

export default TextInputNumber;
