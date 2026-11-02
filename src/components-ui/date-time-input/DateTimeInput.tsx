'use client';

import { AlertIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon } from "@primer/octicons-react";
import { ActionList, ActionMenu, AnchoredOverlay, IconButton, TextInput } from '@primer/react';
import moment from "moment";
import React, { useMemo, useState } from "react";
import Button from "../button";
import { IMyTextInputProps } from "../text-input/TextInput";
import styles from './date-time-input.module.css';
import clsx from 'clsx';

interface IDateTimeInputProps extends Omit<IMyTextInputProps, 'value' | 'onChange' | 'width'> {
  value?: string;
  onChange?: (isoValue: string) => void;
  width?: React.CSSProperties['width'];
}

const daysHeader = [
  { id: 2, name: "Th 2" },
  { id: 3, name: "Th 3" },
  { id: 4, name: "Th 4" },
  { id: 5, name: "Th 5" },
  { id: 6, name: "Th 6" },
  { id: 7, name: "Th 7" },
  { id: 8, name: "CN" },
];

const isValidDateTime = (day: string, month: string, year: string, hour: string, minute: string) => {
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  const h = parseInt(hour, 10);
  const min = parseInt(minute, 10);

  if (isNaN(m) || m < 1 || m > 12) return false;
  const maxDays = new Date(y, m, 0).getDate();
  if (isNaN(d) || d < 1 || d > maxDays) return false;
  if (isNaN(y) || y < 1900 || y > 9999) return false;
  if (isNaN(h) || h < 0 || h > 23) return false;
  if (isNaN(min) || min < 0 || min > 59) return false;
  return true;
};

const formatRawToDisplay = (input: string) => {
  if (!input) return "";
  const digits = input.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length <= 10) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)} ${digits.slice(8)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)} ${digits.slice(8, 10)}:${digits.slice(10, 12)}`;
};

const valueToDisplay = (val?: string) => {
  if (!val) return "";
  const mDisplay = moment(val, "DD/MM/YYYY HH:mm", true);
  if (mDisplay.isValid()) return val;

  const mIso = moment(val, ["YYYY-MM-DDTHH:mm", "YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD"]);
  if (mIso.isValid()) {
    return mIso.format("DD/MM/YYYY HH:mm");
  }
  return val;
};

const displayToIso = (displayStr?: string) => {
  if (!displayStr) return "";
  const m = moment(displayStr, "DD/MM/YYYY HH:mm", true);
  if (m.isValid()) {
    return m.format("YYYY-MM-DDTHH:mm");
  }
  return "";
};

const parseInitialDateTime = (val?: string) => {
  const formatted = valueToDisplay(val);
  if (formatted && formatted.length === 16) {
    const m = moment(formatted, "DD/MM/YYYY HH:mm", true);
    if (m.isValid()) {
      return {
        formatted,
        selectedMoment: m,
        year: m.year(),
        monthIdx: m.month(),
        hour: m.format("HH"),
        minute: m.format("mm"),
      };
    }
  }
  const now = moment();
  return {
    formatted,
    selectedMoment: now,
    year: now.year(),
    monthIdx: now.month(),
    hour: "08",
    minute: "00",
  };
};

const DateTimeInput = (props: IDateTimeInputProps) => {
  const { value, onChange, width, ...restInputProps } = props;
  const initial = parseInitialDateTime(value);

  const [isOpenOverlay, setIsOpenOverlay] = useState(false);
  const [tempValue, setTempValue] = useState<string>(initial.formatted);
  const [_year, setYear] = useState(initial.year);
  const [_monthIdx, setMonth] = useState(initial.monthIdx);
  const [_selectedMoment, setSelectedMoment] = useState<moment.Moment>(initial.selectedMoment);
  const [_hour, setHour] = useState<string>(initial.hour);
  const [_minute, setMinute] = useState<string>(initial.minute);

  const [prevValue, setPrevValue] = useState<string | undefined>(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const formatted = valueToDisplay(value);
    setTempValue(formatted);
    if (formatted && formatted.length === 16) {
      const m = moment(formatted, "DD/MM/YYYY HH:mm", true);
      if (m.isValid()) {
        setSelectedMoment(m);
        setYear(m.year());
        setMonth(m.month());
        setHour(m.format("HH"));
        setMinute(m.format("mm"));
      }
    }
  }

  const isShowWarning = useMemo(() => {
    if (tempValue) {
      const digits = tempValue.replace(/\D/g, "");
      if (digits.length > 0 && digits.length < 12) return true;
      if (digits.length === 12) {
        const d = digits.slice(0, 2);
        const m = digits.slice(2, 4);
        const y = digits.slice(4, 8);
        const h = digits.slice(8, 10);
        const min = digits.slice(10, 12);
        return !isValidDateTime(d, m, y, h, min);
      }
    }
    return false;
  }, [tempValue]);

  const handleBlur = () => {
    const digits = (tempValue ?? "").replace(/\D/g, "");
    if (digits.length === 12) {
      const d = digits.slice(0, 2);
      const m = digits.slice(2, 4);
      const y = digits.slice(4, 8);
      const h = digits.slice(8, 10);
      const min = digits.slice(10, 12);

      if (isValidDateTime(d, m, y, h, min)) {
        const formatted = `${d}/${m}/${y} ${h}:${min}`;
        setTempValue(formatted);
        const iso = `${y}-${m}-${d}T${h}:${min}`;
        if (onChange) {
          onChange(iso);
        }
      } else {
        setTempValue("");
        if (onChange) onChange("");
      }
    } else if (digits.length > 0) {
      setTempValue("");
      if (onChange) onChange("");
    } else {
      if (onChange) onChange("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rInput = e.target.value;
    const digits = rInput.replace(/\D/g, "");
    if (digits.length <= 12) {
      if (rInput.length >= (tempValue ?? "").length) {
        const formatted = formatRawToDisplay(digits);
        setTempValue(formatted);

        if (digits.length === 12) {
          const iso = displayToIso(formatted);
          if (iso && onChange) {
            onChange(iso);
          }
        }
      } else {
        setTempValue(rInput);
      }
    }
  };

  const applyPickerSelection = (targetMoment: moment.Moment, hourStr: string, minStr: string) => {
    const finalMoment = targetMoment.clone().hour(parseInt(hourStr, 10) || 0).minute(parseInt(minStr, 10) || 0);
    const formatted = finalMoment.format("DD/MM/YYYY HH:mm");
    const iso = finalMoment.format("YYYY-MM-DDTHH:mm");
    setTempValue(formatted);
    setSelectedMoment(finalMoment);
    if (onChange) {
      onChange(iso);
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

  const hoursList = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")), []);
  const minutesList = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")), []);

  return (
    <AnchoredOverlay
      open={isOpenOverlay}
      onClose={() => setIsOpenOverlay(false)}
      overlayProps={{
        role: "dialog",
        "aria-modal": true,
        "aria-label": "DateTime Input Picker",
      }}
      focusZoneSettings={{ disabled: true }}
      renderAnchor={(anchorProps) => (
        <div
          style={{ width }}
          {...anchorProps}
          className={clsx("relative d-flex items-center", props.className)}
        >
          <TextInput
            {...restInputProps}
            value={tempValue}
            size={props.size}
            placeholder="dd/MM/yyyy HH:mm"
            onBlur={handleBlur}
            onChange={handleChange}
            block
            className={styles.dateTimeInput_textInput}
            disabled={props.disabled}
          />
          <IconButton
            icon={CalendarIcon}
            aria-label="Chọn ngày giờ"
            onClick={() => setIsOpenOverlay(!isOpenOverlay)}
            variant="invisible"
            className={styles.dateTimeInput_iconButton}
            disabled={props.disabled}
          />
          {isShowWarning && (
            <AlertIcon
              size="small"
              className={styles.dateTimeInput_octicon}
            />
          )}
        </div>
      )}
    >
      <div className={styles.dateTimeInput_box2}>
        <div className="d-flex items-center justify-between">
          <IconButton
            icon={ChevronLeftIcon}
            aria-label="Tháng trước"
            variant="invisible"
            onClick={() => {
              const newMonth = _monthIdx === 0 ? 11 : _monthIdx - 1;
              const newYear = _monthIdx === 0 ? _year - 1 : _year;
              setMonth(newMonth);
              setYear(newYear);
            }}
          />
          <div className="d-flex gap-1 items-center">
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
              className={styles.dateTimeInput_textInput2}
            />
            <ActionMenu>
              <ActionMenu.Button>Tháng {_monthIdx + 1}</ActionMenu.Button>
              <ActionMenu.Overlay width="auto">
                <ActionList selectionVariant="single">
                  {Array.from({ length: 12 }, (_, idx) => (
                    <ActionList.Item
                      key={idx}
                      selected={_monthIdx === idx}
                      onSelect={() => setMonth(idx)}
                    >
                      Tháng {idx + 1}
                    </ActionList.Item>
                  ))}
                </ActionList>
              </ActionMenu.Overlay>
            </ActionMenu>
          </div>
          <IconButton
            icon={ChevronRightIcon}
            aria-label="Tháng sau"
            variant="invisible"
            onClick={() => {
              const newMonth = _monthIdx === 11 ? 0 : _monthIdx + 1;
              const newYear = _monthIdx === 11 ? _year + 1 : _year;
              setMonth(newMonth);
              setYear(newYear);
            }}
          />
        </div>

        <div id="calendar" className="mt-1">
          <div className={styles.dateTimeInput_box5}>
            {daysHeader.map((day) => (
              <div key={day.id} className={styles.dateTimeInput_box6}>
                {day.name}
              </div>
            ))}
          </div>

          {weeks.map((week, wIdx) => (
            <div key={wIdx} className={styles.dateTimeInput_box5}>
              {daysHeader.map((day) => {
                const date = moment(week.start).add(day.id - 2, "days");
                const isCurrentMonth = date.month() === _monthIdx;
                const isSelected = date.isSame(_selectedMoment, "day");

                return (
                  <Button
                    style={{ color: isSelected ? "#fff" : !isCurrentMonth ? "var(--app-fg-muted)" : "var(--app-fg-default)" }}
                    key={day.id}
                    className={clsx(styles.dateTimeInput_button, isCurrentMonth && styles.dateTimeInput_button_isCurrentMonth, isSelected && styles.dateTimeInput_button_isSelected)}
                    variant="invisible"
                    text={`${date.date()}`}
                    onClick={() => {
                      applyPickerSelection(date, _hour, _minute);
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <div className={styles.dateTimeInput_box7}>
          <div className="d-flex items-center gap-1">
            <ClockIcon size="small" className="text-muted" />
            <div className={styles.dateTimeInput_box9}>Giờ:</div>
            <ActionMenu>
              <ActionMenu.Button>{_hour}</ActionMenu.Button>
              <ActionMenu.Overlay width="auto" className={styles.timeOverlay}>
                <ActionList selectionVariant="single">
                  {hoursList.map((h) => (
                    <ActionList.Item
                      key={h}
                      selected={_hour === h}
                      onSelect={() => {
                        setHour(h);
                        applyPickerSelection(_selectedMoment, h, _minute);
                      }}
                    >
                      {h} giờ
                    </ActionList.Item>
                  ))}
                </ActionList>
              </ActionMenu.Overlay>
            </ActionMenu>

            <div className={styles.dateTimeInput_box10}>:</div>

            <ActionMenu>
              <ActionMenu.Button>{_minute}</ActionMenu.Button>
              <ActionMenu.Overlay width="auto" className={styles.timeOverlay}>
                <ActionList selectionVariant="single">
                  {minutesList.map((m) => (
                    <ActionList.Item
                      key={m}
                      selected={_minute === m}
                      onSelect={() => {
                        setMinute(m);
                        applyPickerSelection(_selectedMoment, _hour, m);
                      }}
                    >
                      {m} phút
                    </ActionList.Item>
                  ))}
                </ActionList>
              </ActionMenu.Overlay>
            </ActionMenu>
          </div>

          <Button
            text="Bây giờ"
            variant="invisible"
            onClick={() => {
              const now = moment();
              setYear(now.year());
              setMonth(now.month());
              const h = now.format("HH");
              const m = now.format("mm");
              setHour(h);
              setMinute(m);
              applyPickerSelection(now, h, m);
            }}
          />
        </div>
      </div>
    </AnchoredOverlay>
  );
};

export default DateTimeInput;
