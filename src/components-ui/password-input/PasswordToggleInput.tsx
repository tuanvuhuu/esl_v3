'use client';

import { EyeClosedIcon, EyeIcon } from "@primer/octicons-react";
import { IconButton } from "@primer/react";
import {
  CSSProperties,
  ForwardedRef,
  InputHTMLAttributes,
  forwardRef,
  useState,
} from "react";
import styles from './password-input.module.css';

interface PasswordToggleInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  containerStyle?: CSSProperties;
}

const PasswordToggleInput = (
  { containerStyle, style, ...inputProps }: PasswordToggleInputProps,
  ref: ForwardedRef<HTMLInputElement>
) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        ...containerStyle,
      }}
    >
      <input
        {...inputProps}
        ref={ref}
        type={isVisible ? "text" : "password"}
        style={{
          width: "100%",
          padding: "5px 36px 5px 12px",
          fontSize: "14px",
          borderRadius: "6px",
          border: "1px solid #d0d7de",
          ...style,
        }}
      />
      <IconButton
        icon={isVisible ? EyeClosedIcon : EyeIcon}
        aria-label={isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        onClick={() => setIsVisible((prev) => !prev)}
        variant="invisible"
        className={styles.passwordToggleInput_iconButton}
      />
    </div>
  );
};

export default forwardRef<HTMLInputElement, PasswordToggleInputProps>(
  PasswordToggleInput
);

