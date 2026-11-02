'use client';

import { TriangleDownIcon, XIcon } from '@primer/octicons-react';
import { Button } from '@primer/react';
import clsx from 'clsx';
import React, { useMemo, useState, type ReactNode } from 'react';
import { SelectPanel } from '../select-panel';
import type { SelectPanelAnchorProps } from '../select-panel-anchor';

export interface IComboBoxOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

type ComboBoxCommonProps = {
  label: string;
  options: IComboBoxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  name?: string;
  icon?: ReactNode;
  allowClear?: boolean;
  error?: boolean;
  disabled?: boolean;
  block?: boolean;
  auto?: boolean;
  variant?: 'field' | 'bar';
  className?: string;
};

export type IComboBoxSingleProps = ComboBoxCommonProps & {
  multiple?: false;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

export type IComboBoxMultiProps = ComboBoxCommonProps & {
  multiple: true;
  values?: string[];
  defaultValues?: string[];
  onChange?: (values: string[]) => void;
};

export type IComboBoxProps = IComboBoxSingleProps | IComboBoxMultiProps;

type ComboItem = NonNullable<React.ComponentProps<typeof SelectPanel>['items'][number]> & {
  id: string;
  text: string;
};

function normalizeVi(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function ComboBox(props: IComboBoxProps): React.JSX.Element {
  const {
    label,
    options,
    placeholder = 'Chọn...',
    searchPlaceholder = 'Tìm kiếm...',
    name,
    icon,
    allowClear = false,
    error = false,
    disabled = false,
    block = false,
    auto = false,
    variant = 'field',
    className = '',
  } = props;

  const isMulti = props.multiple === true;
  const isControlled = isMulti ? props.values !== undefined : props.value !== undefined;
  const [internalSelected, setInternalSelected] = useState<string[]>(() =>
    isMulti ? (props.defaultValues ?? []) : props.defaultValue !== undefined ? [props.defaultValue] : [],
  );

  const controlledMultiValues = isMulti ? props.values : undefined;
  const controlledSingleValue = !isMulti ? props.value : undefined;
  const selectedValues: string[] = useMemo(() => {
    if (!isControlled) return internalSelected;
    if (isMulti) return controlledMultiValues ?? [];
    return controlledSingleValue !== undefined ? [controlledSingleValue] : [];
  }, [isControlled, isMulti, controlledMultiValues, controlledSingleValue, internalSelected]);

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const allItems: ComboItem[] = useMemo(
    () =>
      options.map((opt) => ({
        id: opt.value,
        text: opt.label,
        description: opt.description,
        descriptionVariant: 'block' as const,
        disabled: opt.disabled,
      })),
    [options],
  );

  const filteredItems: ComboItem[] = useMemo(() => {
    const q = normalizeVi(filter.trim());
    if (!q) return allItems;
    return allItems.filter(
      (item) =>
        normalizeVi(item.text).includes(q) ||
        (item.description ? normalizeVi(item.description).includes(q) : false),
    );
  }, [allItems, filter]);

  const selectedItems = useMemo(
    () => selectedValues.map((v) => allItems.find((it) => it.id === v)).filter((it): it is ComboItem => Boolean(it)),
    [allItems, selectedValues],
  );

  const hasValue = selectedItems.length > 0 && !(selectedItems.length === 1 && selectedItems[0].id === '0' && selectedItems[0].disabled);
  const displayText = selectedItems.length > 0 ? selectedItems.map((it) => it.text).join(', ') : placeholder;
  const bar = variant === 'bar';

  const commitValues = (next: string[]) => {
    if (!isControlled) setInternalSelected(next);
    if (props.multiple === true) {
      props.onChange?.(next);
    } else {
      props.onChange?.(next[0] ?? '');
    }
  };

  const renderAnchor = (anchorProps: SelectPanelAnchorProps) => {
    const { 'aria-labelledby': _ariaLabelledBy, ...restAnchor } = anchorProps as SelectPanelAnchorProps & {
      'aria-labelledby'?: string;
    };
    void _ariaLabelledBy;
    return (
      <Button
        {...(restAnchor as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        type="button"
        disabled={disabled}
        block={block && !bar}
        alignContent="start"
        trailingAction={bar ? undefined : TriangleDownIcon}
        aria-label={bar ? `${label}: ${displayText}` : label}
        className={clsx(
          'button-left !font-normal',
          bar
            ? 'max-[1199px]:!px-2 min-[1200px]:max-w-[14rem]'
            : clsx(!auto && 'w-full', block || auto ? 'min-w-0' : 'min-w-[10rem]'),
          error && '!border-[var(--borderColor-danger-emphasis)]',
          !hasValue && '!text-[var(--fgColor-muted)]',
        )}
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          {icon}
          <span className={clsx('min-w-0 truncate', bar && 'max-[1199px]:hidden font-medium text-[var(--fgColor-default)]')}>
            {displayText}
          </span>
        </span>
      </Button>
    );
  };

  return (
    <div
      className={clsx(
        'relative min-w-0 items-center gap-1',
        block ? 'flex w-full' : clsx('inline-flex max-w-full', auto && 'self-start'),
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={clsx('min-w-0', block || !auto ? 'flex-1 w-full' : 'inline-flex')}>
        {isMulti ? (
          <SelectPanel
            title={label}
            placeholderText={searchPlaceholder}
            open={open}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen);
              if (!nextOpen) setFilter('');
            }}
            items={filteredItems}
            selected={selectedItems}
            onSelectedChange={(items: Array<{ id?: string | number }>) => {
              const nextIds = items.map((it) => String(it.id ?? ''));
              commitValues(nextIds);
            }}
            filterValue={filter}
            onFilterChange={setFilter}
            renderAnchor={renderAnchor}
            width="medium"
            disableFullscreenOnNarrow
          />
        ) : (
          <SelectPanel
            title={label}
            placeholderText={searchPlaceholder}
            open={open}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen);
              if (!nextOpen) setFilter('');
            }}
            items={filteredItems}
            selected={selectedItems[0]}
            onSelectedChange={(item: { id?: string | number } | undefined) => {
              commitValues(item && item.id !== undefined ? [String(item.id)] : []);
              setOpen(false);
              setFilter('');
            }}
            filterValue={filter}
            onFilterChange={setFilter}
            renderAnchor={renderAnchor}
            width="medium"
            disableFullscreenOnNarrow
          />
        )}
      </div>

      {allowClear && hasValue && !disabled && (
        <button
          type="button"
          aria-label={`Xoá chọn ${label}`}
          onClick={() => commitValues([])}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)]"
        >
          <XIcon size={12} />
        </button>
      )}

      {name &&
        (isMulti ? selectedValues : [selectedValues[0] ?? '']).map((v, idx) => (
          <input key={`${v}-${idx}`} type="hidden" name={name} value={v} />
        ))}
    </div>
  );
}

export default ComboBox;
