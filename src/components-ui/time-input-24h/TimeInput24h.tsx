'use client';

import React, { useState } from "react";
import { TextInput } from "@primer/react";

interface TimeInput24hProps {
  value?: string; // Format: "HH:MM" (e.g., "14:30")
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  block?: boolean;
}

const normalizePropTime = (val?: string) => (val && val.includes(":") ? val : "");

const TimeInput24h = ({
  value = "",
  onChange,
  disabled = false,
  placeholder = "HH:MM",
  block = false,
}: TimeInput24hProps) => {
  const [inputValue, setInputValue] = useState<string>(() => normalizePropTime(value));
  const [prevValue, setPrevValue] = useState<string>(value);

  // Parse value khi component mount hoặc value thay đổi
  if (value !== prevValue) {
    setPrevValue(value);
    setInputValue(normalizePropTime(value));
  }

  const formatTime = (input: string): string => {
    // Loại bỏ tất cả ký tự không phải số
    const numbers = input.replace(/\D/g, '');

    if (numbers.length === 0) return "";
    if (numbers.length === 1) return numbers;
    if (numbers.length === 2) return numbers;
    if (numbers.length === 3) return `${numbers.slice(0, 2)}:${numbers.slice(2)}`;
    if (numbers.length >= 4) return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;

    return numbers;
  };

  const validateTime = (timeStr: string): boolean => {
    if (!timeStr || !timeStr.includes(':')) return false;

    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);

    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatTime(rawValue);

    setInputValue(formattedValue);

    // Chỉ gọi onChange khi có đủ 4 chữ số và hợp lệ
    if (formattedValue.length === 5 && validateTime(formattedValue)) {
      onChange?.(formattedValue);
    } else if (formattedValue.length === 0) {
      onChange?.("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Chỉ cho phép số, backspace, delete, arrow keys
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
    if (allowedKeys.includes(e.key) || /^\d$/.test(e.key)) {
      return;
    }
    e.preventDefault();
  };

  const handleBlur = () => {
    // Khi blur, đảm bảo format đúng
    if (inputValue && inputValue.length === 5 && validateTime(inputValue)) {
      onChange?.(inputValue);
    } else if (inputValue && inputValue.length === 4) {
      // Nếu có 4 chữ số, thêm dấu :
      const formatted = `${inputValue.slice(0, 2)}:${inputValue.slice(2)}`;
      if (validateTime(formatted)) {
        setInputValue(formatted);
        onChange?.(formatted);
      }
    }
  };

  return (
    <TextInput
      value={inputValue}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder={placeholder}
      block={block}
      maxLength={5}
      style={{
        textAlign: 'center',
      }}
    />
  );
};

export default TimeInput24h;
