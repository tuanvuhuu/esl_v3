'use client';

// Bộ chọn nâng cấp hoàn toàn sang `ComboBox` (tìm kiếm + chọn đơn/đa trên nền @/components-ui/select-panel)
// và `SelectBox` (trình đơn gọn cho danh sách ít mục trên nền ActionMenu/ActionList của @/components-ui).
import type { ReactNode } from 'react';
import {
  ComboBox,
  type IComboBoxMultiProps,
  type IComboBoxOption,
  type IComboBoxProps,
  type IComboBoxSingleProps,
} from '@/components-ui/combo-box';
import {
  SelectBox,
  type ISelectBoxOption,
  type ISelectBoxProps,
} from '@/components-ui/select-box';

export { ComboBox, SelectBox };
export type {
  IComboBoxMultiProps,
  IComboBoxOption,
  IComboBoxProps,
  IComboBoxSingleProps,
  ISelectBoxOption,
  ISelectBoxProps,
};

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type Common = {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  name?: string;
  icon?: ReactNode;
  searchable?: boolean;
  allowClear?: boolean;
  error?: boolean;
  disabled?: boolean;
  block?: boolean;
  auto?: boolean;
  variant?: 'field' | 'bar';
  className?: string;
};

type SingleProps = Common & {
  multiple?: false;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

type MultiProps = Common & {
  multiple: true;
  values?: string[];
  defaultValues?: string[];
  onChange?: (values: string[]) => void;
};

export type SelectPanelProps = SingleProps | MultiProps;

export function SelectPanel(props: SelectPanelProps) {
  if (props.multiple === true) {
    return (
      <ComboBox
        multiple
        label={props.label}
        options={props.options}
        values={props.values}
        defaultValues={props.defaultValues}
        onChange={props.onChange}
        placeholder={props.placeholder}
        name={props.name}
        icon={props.icon}
        allowClear={props.allowClear}
        error={props.error}
        disabled={props.disabled}
        block={props.block}
        auto={props.auto}
        variant={props.variant}
        className={props.className}
      />
    );
  }

  const useSearchableCombo = props.searchable ?? props.options.length > 5;
  if (useSearchableCombo) {
    return (
      <ComboBox
        label={props.label}
        options={props.options}
        value={props.value}
        defaultValue={props.defaultValue}
        onChange={props.onChange}
        placeholder={props.placeholder}
        name={props.name}
        icon={props.icon}
        allowClear={props.allowClear}
        error={props.error}
        disabled={props.disabled}
        block={props.block}
        auto={props.auto}
        variant={props.variant}
        className={props.className}
      />
    );
  }

  return (
    <SelectBox
      label={props.label}
      options={props.options}
      value={props.value}
      defaultValue={props.defaultValue}
      onChange={props.onChange}
      placeholder={props.placeholder}
      name={props.name}
      icon={props.icon}
      error={props.error}
      disabled={props.disabled}
      block={props.block}
      auto={props.auto}
      variant={props.variant}
      className={props.className}
    />
  );
}
