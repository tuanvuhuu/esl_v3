'use client';

// Trường nhập liệu dùng chung cho form, xuất kèm toàn bộ control từ `@/components-ui`
// (ComboBox, SelectBox, DateInput, DateTimeInput, TimeInput24h, MonthYearPicker, TextInputNumber, TextAreaAutoHeight, PasswordToggleInput).
import clsx from 'clsx';
import type { ReactNode } from 'react';
import BulkActionBar from '@/components-ui/bulk-action-bar';
import { ComboBox } from '@/components-ui/combo-box';
import DateInput from '@/components-ui/date-input';
import DateRangeInput from '@/components-ui/date-range-input';
import DateRangeQuickInput from '@/components-ui/date-range-quick-input';
import DateTimeInput from '@/components-ui/date-time-input';
import ModalActions from '@/components-ui/modal/ModalActions';
import MonthYearPicker from '@/components-ui/month-year-picker';
import PasswordToggleInput from '@/components-ui/password-input/PasswordToggleInput';
import { SelectBox } from '@/components-ui/select-box';
import Steps from '@/components-ui/steps';
import TextAreaAutoHeight from '@/components-ui/text-area-auto-height';
import UiTextInput from '@/components-ui/text-input';
import TextInputNumber from '@/components-ui/text-input-number';
import TimeInput24h from '@/components-ui/time-input-24h';
import { BTN_BASE, BTN_GHOST, BTN_PRIMARY } from './Btn';
import { CTL_FIELD } from './controls';

export {
  BulkActionBar,
  ComboBox,
  DateInput,
  DateRangeInput,
  DateRangeQuickInput,
  DateTimeInput,
  ModalActions,
  MonthYearPicker,
  PasswordToggleInput,
  SelectBox,
  Steps,
  TextAreaAutoHeight,
  TextInputNumber,
  TimeInput24h,
  UiTextInput,
};

export function Field({
  label,
  error,
  wide,
  hint,
  children,
}: {
  label: string;
  error?: string;
  wide?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        'flex min-w-0 flex-col gap-1.5 text-sm font-normal text-[var(--fgColor-default)]',
        wide && 'min-[768px]:col-span-full',
      )}
    >
      <span className="text-sm font-medium text-[var(--fgColor-default)]">{label}</span>
      {children}
      {error ? (
        <span className="text-sm font-medium text-blush-ink">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[var(--fgColor-muted)]">{hint}</span>
      ) : null}
    </div>
  );
}

export function inputClass(error?: string) {
  return clsx(CTL_FIELD, error && '!border-[var(--borderColor-danger-emphasis)]');
}

export function textareaClass(error?: string) {
  return clsx(
    'w-full min-w-0 rounded-[var(--borderRadius-medium)] border bg-[var(--bgColor-default)] px-2.5 py-2 text-sm text-[var(--fgColor-default)] outline-none placeholder:text-[var(--fgColor-muted)] focus:border-[var(--focus-outlineColor)] max-[767px]:text-input',
    error ? 'border-[var(--borderColor-danger-emphasis)]' : 'border-[var(--borderColor-default)]',
  );
}

export function FormFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <ModalActions className={clsx('mt-2 !justify-end max-[767px]:[&>button]:flex-1', className)}>
      {children}
    </ModalActions>
  );
}

export function FileInput({
  label,
  accept,
  disabled = false,
  onFile,
}: {
  label: string;
  accept: string;
  disabled?: boolean;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <input
      type="file"
      accept={accept}
      aria-label={label}
      disabled={disabled}
      onChange={(e) => onFile(e.target.files?.[0])}
      className="h-[var(--ctl-h)] max-w-full text-sm text-[var(--fgColor-muted)] file:mr-3 file:h-full file:rounded-[var(--borderRadius-medium)] file:border file:border-[var(--borderColor-default)] file:bg-[var(--bgColor-default)] file:px-3 file:text-sm file:font-semibold file:text-[var(--fgColor-default)] hover:file:bg-[var(--bgColor-muted)] max-[767px]:h-[var(--ctl-h-touch)]"
    />
  );
}

export const FORM_BTN_CANCEL = `${BTN_BASE} ${BTN_GHOST}`;
export const FORM_BTN_SUBMIT = `${BTN_BASE} ${BTN_PRIMARY}`;
