'use client';

import { ChevronLeftIcon, ChevronRightIcon } from "@primer/octicons-react";
import { ActionMenu, AnchoredOverlay, IconButton } from "@primer/react";
import { useState } from "react";
import Button from "../button";
import styles from './month-year-picker.module.css';

interface IMonthYearPickerProps {
    label?: string;
    value?: string; // format: YYYY-MM
    onValueChanged: (value: string) => void;
    disabled?: boolean;
}

const MONTHS = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
    "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
    "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

const parseValue = (value?: string) => {
    if (value) {
        const parts = value.split("-");
        if (parts.length === 2) {
            const y = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            if (!isNaN(y) && !isNaN(m)) return { year: y, month: m };
        }
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

const MonthYearPicker = ({ label, value, onValueChanged, disabled }: IMonthYearPickerProps) => {
    const parsed = parseValue(value);
    const [isOpen, setIsOpen] = useState(false);
    const [navYear, setNavYear] = useState(parsed.year);

    const selectedYear = parsed.year;
    const selectedMonth = parsed.month;

    const handleSelect = (month: number) => {
        const mm = String(month).padStart(2, "0");
        onValueChanged(`${navYear}-${mm}`);
        setIsOpen(false);
    };

    const displayText = value
        ? `Tháng ${selectedMonth}/${selectedYear}`
        : "Chọn tháng";

    return (
        <div className="d-flex items-center gap-1">
            {label && (
                <span className="fs-1 whitespace-nowrap text-default">
                    {label}
                </span>
            )}
            <AnchoredOverlay
                open={isOpen}
                onClose={() => setIsOpen(false)}
                overlayProps={{ role: "dialog", "aria-modal": true, "aria-label": "Chọn tháng năm" }}
                focusZoneSettings={{ disabled: true }}
                renderAnchor={(anchorProps) => (
                    <ActionMenu.Button
                        {...anchorProps}
                        disabled={disabled}
                        onClick={() => {
                            setNavYear(selectedYear);
                            setIsOpen(true);
                        }}
                        size="medium"
                        className={styles.monthYearPicker_button}
                    >
                        {displayText}
                    </ActionMenu.Button>
                )}
            >
                <div className={styles.monthYearPicker_box3}>
                    {/* Điều hướng năm */}
                    <div className="d-flex items-center justify-between mb-2">
                        <IconButton
                            icon={ChevronLeftIcon}
                            aria-label="Năm trước"
                            variant="invisible"
                            onClick={() => setNavYear(y => y - 1)}
                        />
                        <div className="fw-bold fs-1">Năm {navYear}</div>
                        <IconButton
                            icon={ChevronRightIcon}
                            aria-label="Năm sau"
                            variant="invisible"
                            onClick={() => setNavYear(y => y + 1)}
                        />
                    </div>

                    {/* Lưới tháng 3 cột */}
                    <div className={styles.monthYearPicker_box6}>
                        {MONTHS.map((name, idx) => {
                            const month = idx + 1;
                            const isSelected = month === selectedMonth && navYear === selectedYear;
                            return (
                                <Button
                                    key={month}
                                    text={name}
                                    variant={isSelected ? "primary" : "invisible"}
                                    className={styles.monthYearPicker_button2}
                                    onClick={() => handleSelect(month)}
                                />
                            );
                        })}
                    </div>
                </div>
            </AnchoredOverlay>
        </div>
    );
};

export default MonthYearPicker;
