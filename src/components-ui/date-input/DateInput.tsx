'use client';

import { AlertIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "@primer/octicons-react";
import { ActionList, ActionMenu, AnchoredOverlay, IconButton, TextInput } from "@primer/react";
import clsx from "clsx";
import moment from "moment";
import React, { useMemo, useState } from "react";
import Button from "../button";
import { IMyTextInputProps } from "../text-input/TextInput";
import styles from "./DateInput.module.css";

interface IDateInputProps extends Omit<IMyTextInputProps, 'value' | 'onValueChanged' | 'width'> {
    value?: string;
    onValueChanged: (ddMMyyyy: string, date: Date) => void;
    width?: React.CSSProperties['width'];
}

const days = [
    { id: 2, name: "Th 2", name_en: "Mon" },
    { id: 3, name: "Th 3", name_en: "Tue" },
    { id: 4, name: "Th 4", name_en: "Wed" },
    { id: 5, name: "Th 5", name_en: "Thu" },
    { id: 6, name: "Th 6", name_en: "Fri" },
    { id: 7, name: "Th 7", name_en: "Sat" },
    { id: 8, name: "CN", name_en: "Sun" },
];

// Kiểm tra ngày tháng hợp lệ
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

const parseYearMonth = (val?: string) => {
    const now = new Date();
    if (val) {
        const digitsOnly = val.replace(/\D/g, "");
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
    const { onValueChanged, width, value, ...inputProps } = props;
    const initialYM = parseYearMonth(value);
    const [isOpenOverlay, setIsOpenOverlay] = useState(false);
    const [_year, setYear] = useState(initialYM.year);
    const [_monthIdx, setMonth] = useState(initialYM.monthIdx);
    const [tempValue, setTempValue] = useState<string>(value ?? "");
    const [prevValue, setPrevValue] = useState<string | undefined>(value);

    if (value !== prevValue) {
        setPrevValue(value);
        if (value) {
            const digitsOnly = value.replace(/\D/g, "");
            if (digitsOnly.length === 8) {
                setYear(parseInt(digitsOnly.slice(4, 8), 10));
                setMonth(parseInt(digitsOnly.slice(2, 4), 10) - 1);
            }
        }
        setTempValue(value ?? "");
    }

    const isShowWarning = useMemo(() => {
        if (tempValue) {
            const formatOk = /^\d{2}\/\d{2}\/\d{4}$/.test(tempValue);
            if (!formatOk) return true;

            const digitsOnly = tempValue.replace(/\D/g, "");
            const day = digitsOnly.slice(0, 2);
            const month = digitsOnly.slice(2, 4);
            const year = digitsOnly.slice(4, 8);

            return !isValidDate(day, month, year);
        }
        return false;
    }, [tempValue]);

    // Định dạng chuỗi thành dd/MM/yyyy khi nhập
    const formatDate = (input: string) => {
        if (!input) return "";
        const digitsOnly = input.replace(/\D/g, "");

        if (digitsOnly.length < 2) return digitsOnly;
        if (digitsOnly.length === 2) return `${digitsOnly.slice(0, 2)}/`;
        if (digitsOnly.length === 4) {
            return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}/`;
        }
        return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
    };

    // Xử lý khi blur để kiểm tra hợp lệ
    const handleBlur = () => {
        const digitsOnly = (tempValue ?? "").replace(/\D/g, "");
        if (digitsOnly.length === 8) {
            const day = digitsOnly.slice(0, 2);
            const month = digitsOnly.slice(2, 4);
            const year = digitsOnly.slice(4, 8);

            if (isValidDate(day, month, year)) {
                const formatted = `${day}/${month}/${year}`;
                setTempValue(formatted);
                onValueChanged(
                    formatted,
                    new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)),
                );
            } else {
                setTempValue("");
            }
        } else if (digitsOnly.length > 0) {
            setTempValue("");
        }
    };

    // Xử lý khi người dùng nhập
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rInput = e.target.value;
        const input = e.target.value.replace(/\D/g, "");
        if (input.length <= 8) {
            if (rInput.length >= (tempValue ?? "").length) {
                const formatted = formatDate(input);
                setTempValue(formatted);
            } else {
                setTempValue(rInput);
            }
        }
    };

    const getWeeksInMonth = (year: number, month: number) => {
        const weeks = [];
        const firstDay = new Date((isNaN(year) || isNaN(month)) ? 1 : year, month, 1);
        const lastDay = new Date((isNaN(year) || isNaN(month)) ? 1 : year, month + 1, 0);

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
    return (
        <AnchoredOverlay
            open={isOpenOverlay}
            onClose={() => {
                setIsOpenOverlay(false);
            }}
            overlayProps={{
                role: 'dialog',
                'aria-modal': true,
                'aria-label': 'User Card Overlay',
            }}
            focusZoneSettings={{
                disabled: true,
            }}
            renderAnchor={(anchorProps) => {
                return (
                    <div
                        {...anchorProps}
                        className="relative d-flex items-center"
                        style={{ width }}
                    >
                        <TextInput
                            {...inputProps}
                            value={tempValue ?? ""}
                            size={props.size}
                            placeholder="dd/MM/yyyy"
                            onBlur={handleBlur}
                            onChange={handleChange}
                            block
                            className={clsx(props.className, styles.input)}
                            disabled={props.disabled}
                        />
                        <IconButton
                            icon={ChevronDownIcon}
                            aria-label=""
                            onClick={() => {
                                setIsOpenOverlay(true);
                            }}
                            variant="invisible"
                            className={styles.toggleButton}
                            disabled={props.disabled}
                        />
                        {isShowWarning && (
                            <AlertIcon
                                size="small"
                                className={styles.warningIcon}
                            />
                        )}
                    </div>
                );
            }}
        >
            <div className="p-3 d-grid gap-2">
                <div className={styles.nav}>
                    <IconButton
                        icon={ChevronLeftIcon}
                        aria-label="prev"
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
                                if (!isNaN(num)) {
                                    setYear(num);
                                }
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
                                    {[
                                        "Tháng 1",
                                        "Tháng 2",
                                        "Tháng 3",
                                        "Tháng 4",
                                        "Tháng 5",
                                        "Tháng 6",
                                        "Tháng 7",
                                        "Tháng 8",
                                        "Tháng 9",
                                        "Tháng 10",
                                        "Tháng 11",
                                        "Tháng 12",
                                    ].map((month, index) => (
                                        <ActionList.Item
                                            key={index}
                                            onSelect={() => {
                                                setMonth(index);
                                            }}
                                            selected={_monthIdx === index}
                                        >
                                            {month}
                                        </ActionList.Item>
                                    ))}
                                </ActionList>
                            </ActionMenu.Overlay>
                        </ActionMenu>
                    </div>

                    <IconButton
                        icon={ChevronRightIcon}
                        aria-label="next"
                        variant="invisible"
                        onClick={() => {
                            setMonth(_monthIdx === 11 ? 0 : _monthIdx + 1);
                            setYear(_monthIdx === 11 ? _year + 1 : _year);
                        }}
                    />
                </div>
                <div id="calendar" className={styles.calendar}>
                    <div className={styles.week}>
                        {days.map(day => (
                            <div className={styles.dayName} key={day.id}>
                                {day.name}
                            </div>
                        ))}
                    </div>
                    {weeks.map(week => (
                        <div className={styles.week} key={week.start.getTime()}>
                            {days.map(day => {
                                const date = moment(week.start).add(day.id - 2, "days");
                                const isCurrentMonth = date.month() === _monthIdx;
                                const isSelected = date.format("DD/MM/YYYY") === value;
                                return (
                                    <Button
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
                                            onValueChanged(date.format("DD/MM/YYYY"), date.toDate());
                                        }}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
                <div className={styles.footer}>
                    <Button
                        text={`Hôm nay ${moment().format("DD/MM/YYYY")}`}
                        variant="invisible"
                        onClick={() => {
                            onValueChanged(moment().format("DD/MM/YYYY"), moment().toDate());
                        }}
                    />
                </div>
            </div>
        </AnchoredOverlay>
    );
};

export default DateInput;
