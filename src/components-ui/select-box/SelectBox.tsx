'use client';

import { TriangleDownIcon } from '@primer/octicons-react';
import { ActionList, ActionMenu } from '@primer/react';
import clsx from 'clsx';
import React, { useState, type ReactNode } from 'react';

export interface ISelectBoxOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface ISelectBoxProps {
  label: string;
  options: ISelectBoxOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  name?: string;
  icon?: ReactNode;
  error?: boolean;
  disabled?: boolean;
  block?: boolean;
  auto?: boolean;
  variant?: 'field' | 'bar';
  className?: string;
}

export function SelectBox({
  label,
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Chọn...',
  name,
  icon,
  error = false,
  disabled = false,
  block = false,
  auto = false,
  variant = 'field',
  className = '',
}: ISelectBoxProps): React.JSX.Element {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string>(defaultValue ?? '');
  const currentValue = isControlled ? value : internalValue;

  const selectedOption = options.find((o) => o.value === currentValue);
  const hasValue = Boolean(selectedOption && !(selectedOption.value === '0' && selectedOption.disabled));
  const shown = selectedOption ? selectedOption.label : placeholder;
  const bar = variant === 'bar';

  const handleSelect = (nextVal: string) => {
    if (!isControlled) setInternalValue(nextVal);
    onChange?.(nextVal);
  };

  return (
    <div
      className={clsx(
        'relative min-w-0',
        block ? 'flex w-full' : clsx('inline-flex max-w-full', auto && 'self-start'),
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <ActionMenu>
        <ActionMenu.Button
          type="button"
          disabled={disabled}
          block={block && !bar}
          alignContent="start"
          trailingAction={bar ? undefined : TriangleDownIcon}
          aria-label={bar ? `${label}: ${shown}` : label}
          className={clsx(
            'button-left !font-normal',
            bar
              ? 'max-[1199px]:!px-2 min-[1200px]:max-w-[14rem]'
              : clsx(!auto && 'w-full', block || auto ? 'min-w-0' : 'min-w-[9rem]'),
            error && '!border-[var(--borderColor-danger-emphasis)]',
            !hasValue && '!text-[var(--fgColor-muted)]',
          )}
        >
          <span className="inline-flex min-w-0 items-center gap-1.5">
            {icon}
            <span className={clsx('min-w-0 truncate', bar && 'max-[1199px]:hidden font-medium text-[var(--fgColor-default)]')}>
              {shown}
            </span>
          </span>
        </ActionMenu.Button>
        <ActionMenu.Overlay width="auto" align={bar ? 'end' : 'start'}>
          <ActionList selectionVariant="single" role="listbox" aria-label={label}>
            {options.map((opt) => (
              <ActionList.Item
                key={opt.value}
                role="option"
                selected={opt.value === currentValue}
                disabled={opt.disabled}
                onSelect={() => {
                  if (!opt.disabled) handleSelect(opt.value);
                }}
              >
                {opt.label}
                {opt.description && (
                  <ActionList.Description variant="block">{opt.description}</ActionList.Description>
                )}
              </ActionList.Item>
            ))}
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>

      {name && <input type="hidden" name={name} value={currentValue} />}
    </div>
  );
}

export default SelectBox;

