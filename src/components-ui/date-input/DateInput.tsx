'use client';

import { AlertIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@primer/octicons-react";
import { ActionList, ActionMenu, AnchoredOverlay, IconButton, TextInput } from "@primer/react";
import clsx from "clsx";
import moment from "moment";
import React, { useMemo, useState } from "react";
import Button from "../button";
import { IMyTextInputProps } from "../text-input/TextInput";
import styles from "./DateInput.module.css";

export interface IDateInputProps extends Omit<IMyTextInputProps, 'value' | 'defaultValue' | 'onValueChanged' | 'width'> {
  value?: string;
  defaultValue?: string;
  onValueChanged?: (ddMMyyyy: string, date: Date) => void;
  onIsoChange?: (yyyyMMdd: string) => void;
  error?: boolean;
  width?: React.CSSProperties['width'];
}

const days = [
  { id: 2, name: "Th 2" },
  { id: 3, name: "Th 3" },
  { id: 4, name: "Th 4" },
  { id: 5, name: "Th 5" },
  { id: 6, name: "Th 6" },
  { id: 7, name: "Th 7" },
  { id: 8, name: "CN" },
];

const isValidDate = (day: string, month: string, year: string) => {
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  if (m < 1 || m > 12) return false;
  const maxDays = new Date(y, m, 0).getDate();
  if (d < 1 || d > maxDays) return false;
  if (y < 1900 || y > 9999) return false;
  return true;
};

/** Chấp nhận cả YYYY-MM-DD (ISO từ DB/server) lẫn DD/MM/YYYY → trả về DD/MM/YYYY để hiển thị */
function toDisplayDate(raw?: string): string {
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split("-");
    if (isValidDate(d, m, y)) return `${d}/${m}/${y}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    return raw;
  }
  return "";
}

/** Chuyển DD/MM/YYYY → YYYY-MM-DD để gửi lên FormData / server action */
function displayToIso(ddMMyyyy?: string): string {
  if (!ddMMyyyy) return "";
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ddMMyyyy);
  if (!m) return "";
  const [, d, mo, y] = m;
  return isValidDate(d, mo, y) ? `${y}-${mo}-${d}` : "";
}

const parseYearMonth = (displayVal?: string) => {
  const now = new Date();
  if (displayVal) {
    const digitsOnly = displayVal.replace(/\D/g, "");
    if (digitsOnly.length === 8) {
      return {
        year: parseInt(digitsOnly.slice(4, 8), 10),
        monthIdx: parseInt(digitsOnly.slice(2, 4), 10) - 1,
      };
    }
  }
  return { year: now.getFullYear(), monthIdx: now.getMonth() };
};

const DateInput = (props: IDateInputProps) => {
  const { onValueChanged, onIsoChange, width, value, defaultValue, name, error, ...inputProps } = props;
  const externalRaw = value !== undefined ? value : defaultValue;
  const initialDisplay = toDisplayDate(externalRaw);
  const initialYM = parseYearMonth(initialDisplay);

  const [isOpenOverlay, setIsOpenOverlay] = useState(false);
  const [_year, setYear] = useState(initialYM.year);
  const [_monthIdx, setMonth] = useState(initialYM.monthIdx);
  const [tempValue, setTempValue] = useState<string>(initialDisplay);
  const [committedDisplay, setCommittedDisplay] = useState<string>(initialDisplay);
  const [prevValue, setPrevValue] = useState<string | undefined>(value);

  if (value !== prevValue) {
    setPrevValue(value);
    const nextDisp = toDisplayDate(value);
    if (nextDisp) {
      const ym = parseYearMonth(nextDisp);
      setYear(ym.year);
      setMonth(ym.monthIdx);
    }
    setTempValue(nextDisp);
    setCommittedDisplay(nextDisp);
  }

  const isShowWarning = useMemo(() => {
    if (tempValue) {
      const formatOk = /^\d{2}\/\d{2}\/\d{4}$/.test(tempValue);
      if (!formatOk) return true;
      const digitsOnly = tempValue.replace(/\D/g, "");
      return !isValidDate(digitsOnly.slice(0, 2), digitsOnly.slice(2, 4), digitsOnly.slice(4, 8));
    }
    return false;
  }, [tempValue]);

  const formatDate = (input: string) => {
    if (!input) return "";
    const digitsOnly = input.replace(/\D/g, "");
    if (digitsOnly.length < 2) return digitsOnly;
    if (digitsOnly.length === 2) return `${digitsOnly.slice(0, 2)}/`;
    if (digitsOnly.length === 4) return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}/`;
    return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
  };

  const commitDate = (ddMMyyyy: string, dateObj?: Date) => {
    setTempValue(ddMMyyyy);
    setCommittedDisplay(ddMMyyyy);
    const iso = displayToIso(ddMMyyyy);
    onIsoChange?.(iso);
    if (ddMMyyyy && dateObj) {
      onValueChanged?.(ddMMyyyy, dateObj);
    }
  };

  const handleBlur = () => {
    const digitsOnly = (tempValue ?? "").replace(/\D/g, "");
    if (digitsOnly.length === 8) {
      const day = digitsOnly.slice(0, 2);
      const month = digitsOnly.slice(2, 4);
      const year = digitsOnly.slice(4, 8);
      if (isValidDate(day, month, year)) {
        const formatted = `${day}/${month}/${year}`;
        commitDate(formatted, new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));
      } else {
        commitDate("");
      }
    } else {
      commitDate("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rInput = e.target.value;
    const input = rInput.replace(/\D/g, "");
    if (input.length <= 8) {
      const next = rInput.length >= (tempValue ?? "").length ? formatDate(input) : rInput;
      setTempValue(next);
      if (input.length === 8) {
        const day = input.slice(0, 2);
        const month = input.slice(2, 4);
        const year = input.slice(4, 8);
        if (isValidDate(day, month, year)) {
          const full = `${day}/${month}/${year}`;
          setCommittedDisplay(full);
          onIsoChange?.(`${year}-${month}-${day}`);
          onValueChanged?.(full, new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));
        }
      } else if (input.length === 0) {
        setCommittedDisplay("");
        onIsoChange?.("");
      }
    }
  };

  const getWeeksInMonth = (year: number, month: number) => {
    const weeks = [];
    const safeYear = isNaN(year) ? new Date().getFullYear() : year;
    const safeMonth = isNaN(month) ? new Date().getMonth() : month;
    const firstDay = new Date(safeYear, safeMonth, 1);
    const lastDay = new Date(safeYear, safeMonth + 1, 0);

    const currentDay = new Date(firstDay);
    while (currentDay.getDay() !== 1) {
      currentDay.setDate(currentDay.getDate() - 1);
    }

    while (currentDay <= lastDay) {
      const weekStart = new Date(currentDay);
      const weekEnd = new Date(currentDay);
      weekEnd.setDate(weekEnd.getDate() + 6);

      if (weekStart <= lastDay && weekEnd >= firstDay) {
        weeks.push({
          start: new Date(weekStart),
          end: new Date(weekEnd > lastDay ? lastDay : weekEnd),
        });
      }
      currentDay.setDate(currentDay.getDate() + 7);
    }
    return weeks;
  };

  const weeks = getWeeksInMonth(_year, _monthIdx);
  const isoHiddenValue = displayToIso(committedDisplay);

  return (
    <>
      <AnchoredOverlay
        open={isOpenOverlay}
        onClose={() => setIsOpenOverlay(false)}
        overlayProps={{
          role: 'dialog',
          'aria-modal': true,
          'aria-label': 'Chọn ngày',
        }}
        focusZoneSettings={{ disabled: true }}
        renderAnchor={(anchorProps) => (
          <div
            {...anchorProps}
            className="relative d-flex w-full items-center"
            style={width !== undefined ? { width } : undefined}
          >
            <TextInput
              {...inputProps}
              value={tempValue ?? ""}
              size={props.size}
              placeholder={props.placeholder ?? "dd/MM/yyyy"}
              validationStatus={error ? "error" : props.validationStatus}
              onBlur={handleBlur}
              onChange={handleChange}
              block
              className={clsx(props.className, styles.input)}
              disabled={props.disabled}
            />
            <IconButton
              type="button"
              icon={CalendarIcon}
              aria-label="Mở lịch chọn ngày"
              unsafeDisableTooltip
              onClick={() => setIsOpenOverlay((v) => !v)}
              variant="invisible"
              className={styles.toggleButton}
              disabled={props.disabled}
            />
            {isShowWarning && (
              <AlertIcon size="small" className={styles.warningIcon} />
            )}
          </div>
        )}
      >
        <div className="p-3 d-grid gap-2">
          <div className={styles.nav}>
            <IconButton
              type="button"
              icon={ChevronLeftIcon}
              aria-label="Tháng trước"
              unsafeDisableTooltip
              variant="invisible"
              onClick={() => {
                setMonth(_monthIdx === 0 ? 11 : _monthIdx - 1);
                setYear(_monthIdx === 0 ? _year - 1 : _year);
              }}
            />
            <div className="flex-1 d-flex gap-1 justify-center">
              <TextInput
                type="number"
                value={isNaN(_year) ? "" : _year}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setYear(NaN);
                    return;
                  }
                  const num = parseInt(val, 10);
                  if (!isNaN(num)) setYear(num);
                }}
                className={styles.yearInput}
                leadingVisual={<div className={styles.yearLabel}>Năm</div>}
              />
              <ActionMenu>
                <ActionMenu.Button size="medium">
                  Tháng {_monthIdx + 1}
                </ActionMenu.Button>
                <ActionMenu.Overlay width="auto">
                  <ActionList selectionVariant="single">
                    {Array.from({ length: 12 }, (_, index) => (
                      <ActionList.Item
                        key={index}
                        onSelect={() => setMonth(index)}
                        selected={_monthIdx === index}
                      >
                        Tháng {index + 1}
                      </ActionList.Item>
                    ))}
                  </ActionList>
                </ActionMenu.Overlay>
              </ActionMenu>
            </div>

            <IconButton
              type="button"
              icon={ChevronRightIcon}
              aria-label="Tháng sau"
              unsafeDisableTooltip
              variant="invisible"
              onClick={() => {
                setMonth(_monthIdx === 11 ? 0 : _monthIdx + 1);
                setYear(_monthIdx === 11 ? _year + 1 : _year);
              }}
            />
          </div>
          <div id="calendar" className={styles.calendar}>
            <div className={styles.week}>
              {days.map((day) => (
                <div className={styles.dayName} key={day.id}>
                  {day.name}
                </div>
              ))}
            </div>
            {weeks.map((week) => (
              <div className={styles.week} key={week.start.getTime()}>
                {days.map((day) => {
                  const date = moment(week.start).add(day.id - 2, "days");
                  const isCurrentMonth = date.month() === _monthIdx;
                  const formattedDay = date.format("DD/MM/YYYY");
                  const isSelected = formattedDay === committedDisplay;
                  return (
                    <Button
                      type="button"
                      className={clsx(
                        styles.day,
                        !isCurrentMonth && styles.dayOutside,
                        isCurrentMonth && styles.dayCurrent,
                        isSelected && styles.daySelected,
                      )}
                      key={day.id}
                      variant="invisible"
                      text={`${date.date()}`}
                      onClick={() => {
                        commitDate(formattedDay, date.toDate());
                        setIsOpenOverlay(false);
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className={styles.footer}>
            <Button
              type="button"
              text={`Hôm nay ${moment().format("DD/MM/YYYY")}`}
              variant="invisible"
              onClick={() => {
                const now = moment();
                setYear(now.year());
                setMonth(now.month());
                commitDate(now.format("DD/MM/YYYY"), now.toDate());
                setIsOpenOverlay(false);
              }}
            />
          </div>
        </div>
      </AnchoredOverlay>
      {name && <input type="hidden" name={name} value={isoHiddenValue} />}
    </>
  );
};

export default DateInput;
