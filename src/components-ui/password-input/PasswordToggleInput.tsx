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

  const ToggleIcon = isVisible ? EyeClosedIcon : EyeIcon;

  return (
    <div className="relative w-full" style={containerStyle}>
      <TextInput
        {...inputProps}
        ref={ref}
        type={isVisible ? "text" : "password"}
        block
        validationStatus={error ? "error" : undefined}
        className={clsx("!min-w-0 [&_input]:!pr-9 max-[767px]:[&_input]:!pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setIsVisible((prev) => !prev)}
        aria-label={isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        className="absolute right-0 top-0 inline-flex h-[var(--ctl-h)] w-[var(--ctl-h)] items-center justify-center rounded-r-[var(--borderRadius-medium)] text-[var(--fgColor-muted)] transition-colors hover:text-[var(--fgColor-default)] max-[767px]:h-[var(--ctl-h-touch)] max-[767px]:w-[var(--ctl-h-touch)]"
      >
        <ToggleIcon size={16} aria-hidden />
      </button>
    </div>
  );
};

export default forwardRef<HTMLInputElement, PasswordToggleInputProps>(
  PasswordToggleInput,
);
