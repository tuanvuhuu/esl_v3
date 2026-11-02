'use client';

import { ClockIcon } from '@primer/octicons-react';
import { AnchoredOverlay, IconButton, TextInput } from '@primer/react';
import clsx from 'clsx';
import React, { useState } from 'react';

export interface TimeInput24hProps {
  value?: string;
  defaultValue?: string;
  name?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
  block?: boolean;
  ariaLabel?: string;
  className?: string;
}

const normalizePropTime = (val?: string) => (val && val.includes(':') ? val.slice(0, 5) : '');

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const TimeInput24h = ({
  value,
  defaultValue,
  name,
  onChange,
  disabled = false,
  error = false,
  placeholder = 'HH:MM',
  block = true,
  ariaLabel,
  className,
}: TimeInput24hProps) => {
  const initial = normalizePropTime(value !== undefined ? value : defaultValue);
  const [inputValue, setInputValue] = useState<string>(initial);
  const [committed, setCommitted] = useState<string>(initial);
  const [prevValue, setPrevValue] = useState<string | undefined>(value);
  const [open, setOpen] = useState(false);

  if (value !== prevValue) {
    setPrevValue(value);
    const next = normalizePropTime(value);
    setInputValue(next);
    setCommitted(next);
  }

  const formatTime = (input: string): string => {
    const numbers = input.replace(/\D/g, '');
    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return numbers;
    return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
  };

  const validateTime = (timeStr: string): boolean => {
    if (!timeStr || !timeStr.includes(':')) return false;
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  };

  const applyTime = (formatted: string) => {
    setInputValue(formatted);
    setCommitted(formatted);
    onChange?.(formatted);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatTime(rawValue);
    setInputValue(formattedValue);

    if (formattedValue.length === 5 && validateTime(formattedValue)) {
      setCommitted(formattedValue);
      onChange?.(formattedValue);
    } else if (formattedValue.length === 0) {
      setCommitted('');
      onChange?.('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', ':'];
    if (allowedKeys.includes(e.key) || /^\d$/.test(e.key)) {
      return;
    }
    e.preventDefault();
  };

  const handleBlur = () => {
    if (inputValue && inputValue.length === 5 && validateTime(inputValue)) {
      applyTime(inputValue);
    } else if (inputValue && inputValue.length === 4) {
      const formatted = `${inputValue.slice(0, 2)}:${inputValue.slice(2)}`;
      if (validateTime(formatted)) {
        applyTime(formatted);
      }
    } else if (inputValue && inputValue.length === 3) {
      const formatted = `0${inputValue.slice(0, 1)}:${inputValue.slice(1)}`;
      if (validateTime(formatted)) {
        applyTime(formatted);
      }
    }
  };

  const [curHour, curMin] = committed ? committed.split(':') : ['08', '00'];

  return (
    <>
      <AnchoredOverlay
        open={open}
        onClose={() => setOpen(false)}
        overlayProps={{ role: 'dialog', 'aria-modal': true, 'aria-label': 'Chọn giờ (24h)' }}
        focusZoneSettings={{ disabled: true }}
        renderAnchor={(anchorProps) => (
          <div {...anchorProps} className={clsx('relative d-flex items-center', block && 'w-full', className)}>
            <TextInput
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              disabled={disabled}
              placeholder={placeholder}
              aria-label={ariaLabel}
              validationStatus={error ? 'error' : undefined}
              block={block}
              maxLength={5}
              className="!pr-8"
              style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
            />
            <IconButton
              type="button"
              icon={ClockIcon}
              aria-label="Chọn giờ"
              unsafeDisableTooltip
              variant="invisible"
              disabled={disabled}
              onClick={() => setOpen((v) => !v)}
              className="!absolute right-0.5 !size-7"
            />
          </div>
        )}
      >
        <div className="d-flex max-h-56 overflow-hidden p-1.5 text-sm">
          <div className="scroll-quiet flex w-16 flex-col overflow-y-auto border-r border-[var(--borderColor-muted)] pr-1">
            <div className="px-2 py-1 text-center text-xs font-semibold text-[var(--fgColor-muted)]">Giờ</div>
            {HOURS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => applyTime(`${h}:${curMin || '00'}`)}
                className={clsx(
                  'rounded px-2 py-1 text-center tabular-nums transition-colors hover:bg-[var(--bgColor-muted)]',
                  curHour === h && 'bg-[var(--bgColor-accent-emphasis)] font-semibold text-[var(--fgColor-onEmphasis)] hover:bg-[var(--bgColor-accent-emphasis)]',
                )}
              >
                {h}
              </button>
            ))}
          </div>
          <div className="scroll-quiet flex w-16 flex-col overflow-y-auto pl-1">
            <div className="px-2 py-1 text-center text-xs font-semibold text-[var(--fgColor-muted)]">Phút</div>
            {MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  applyTime(`${curHour || '08'}:${m}`);
                  setOpen(false);
                }}
                className={clsx(
                  'rounded px-2 py-1 text-center tabular-nums transition-colors hover:bg-[var(--bgColor-muted)]',
                  curMin === m && 'bg-[var(--bgColor-accent-emphasis)] font-semibold text-[var(--fgColor-onEmphasis)] hover:bg-[var(--bgColor-accent-emphasis)]',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </AnchoredOverlay>
      {name && <input type="hidden" name={name} value={committed} />}
    </>
  );
};

export default TimeInput24h;
