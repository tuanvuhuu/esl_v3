'use client';

import { EyeClosedIcon, EyeIcon } from "@primer/octicons-react";
import { TextInput } from "@primer/react";
import clsx from "clsx";
import {
  CSSProperties,
  ForwardedRef,
  InputHTMLAttributes,
  forwardRef,
  useState,
} from "react";

export interface PasswordToggleInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  containerStyle?: CSSProperties;
  error?: boolean;
}

const PasswordToggleInput = (
  { containerStyle, className, error, ...inputProps }: PasswordToggleInputProps,
  ref: ForwardedRef<HTMLInputElement>,
) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div style={{ width: "100%", ...containerStyle }}>
      <TextInput
        {...inputProps}
        ref={ref}
        type={isVisible ? "text" : "password"}
        block
        validationStatus={error ? "error" : undefined}
        className={clsx("!min-w-0", className)}
        trailingAction={
          <TextInput.Action
            onClick={() => setIsVisible((prev) => !prev)}
            icon={isVisible ? EyeClosedIcon : EyeIcon}
            aria-label={isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          />
        }
      />
    </div>
  );
};

export default forwardRef<HTMLInputElement, PasswordToggleInputProps>(
  PasswordToggleInput,
);
