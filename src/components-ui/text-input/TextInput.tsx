'use client';

import { FormControl, TextInput, TextInputProps } from '@primer/react';
import React, { forwardRef, useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';

export type FormRegisterFn = (
    name: string,
    options?: Record<string, unknown>,
) => Record<string, unknown>;

export type FormErrorsMap = Record<string, { message?: React.ReactNode } | undefined>;

export interface IMyTextInputProps extends TextInputProps {
    register?: FormRegisterFn;
    errors?: FormErrorsMap;
    validateMessage?: string;
    name?: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    onValueDelayChanged?: (value: string) => void;
}

const MyTextInput = forwardRef<HTMLInputElement, IMyTextInputProps>((props, forwardedRef) => {
    const {
        register,
        errors,
        validateMessage,
        name,
        required,
        minLength,
        maxLength,
        onValueDelayChanged,
        ...textInputProps
    } = props;

    const toStr = (v: unknown): string | undefined =>
        v === undefined || v === null ? undefined : String(v);

    const [tempValue, setTempValue] = useState<string | undefined>(
        toStr(props.value ?? props.defaultValue),
    );
    const [prevValueProp, setPrevValueProp] = useState(props.value);
    if (props.value !== prevValueProp) {
        setPrevValueProp(props.value);
        // chỉ dùng defaultValue (uncontrolled từ phía cha) → không ghi đè giá trị đang gõ bằng undefined
        if (props.value !== undefined || props.defaultValue === undefined) {
            setTempValue(toStr(props.value));
        }
    }

    const tempValueDelayed = useDebounce(tempValue, 300)[0];

    useEffect(() => {
        const baseline = toStr(props.value ?? props.defaultValue);
        if (onValueDelayChanged && tempValueDelayed !== baseline) {
            onValueDelayChanged(tempValueDelayed ?? "");
        }
    }, [tempValueDelayed, onValueDelayChanged, props.value, props.defaultValue]);

    return (
        <>
            {register && name && (
                <>
                    <TextInput
                        ref={forwardedRef}
                        {...register(name, {
                            required: {
                                value: required,
                                message: validateMessage ?? "",
                            },
                            minLength: {
                                value: minLength,
                                message: validateMessage ?? "",
                            },
                            maxLength: {
                                value: maxLength,
                                message: validateMessage ?? "",
                            },
                            pattern: {
                                value: props.pattern,
                                message: validateMessage ?? "",
                            },
                        })}
                        name={name}
                        {...textInputProps}
                        onChange={(e) => {
                            setTempValue(e.target.value);
                            if (props.onChange) {
                                props.onChange(e);
                            }
                        }}
                    />
                    {errors && errors[name] && (
                        <FormControl.Validation id={name} variant="error">
                            <> {errors[name]?.message ?? ""}</>
                        </FormControl.Validation>
                    )}
                </>
            )}
            {(!register || !name) && (
                <TextInput
                    ref={forwardedRef}
                    name={name}
                    required={required}
                    minLength={minLength}
                    maxLength={maxLength}
                    {...textInputProps}
                    // input do tempValue điều khiển → không truyền thêm defaultValue (React cảnh báo khi có cả hai)
                    defaultValue={undefined}
                    value={tempValue ?? ""}
                    onChange={(e) => {
                        setTempValue(e.target.value);
                        if (props.onChange) {
                            props.onChange(e);
                        }
                    }}
                />
            )}
        </>
    );
});
MyTextInput.displayName = "MyTextInput";

export default MyTextInput;
