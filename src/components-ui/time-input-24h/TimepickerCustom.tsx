'use client';

import React, { useState, useRef, useEffect } from "react";
import TextInput from "../text-input";
import { createPortal } from "react-dom";

type Props = {
    value?: string | null;
    onChange?: (time: string | null) => void;
    stepMinutes?: number;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
};

function pad2(n: number) {
    return n.toString().padStart(2, "0");
}

function formatExternalTime(val?: string | null): string {
    if (val) {
        const [h, m] = val.split(":");
        if (h && m) return `${pad2(+h)}:${pad2(+m)}`;
    }
    return "";
}

export const TimePickerCustom: React.FC<Props> = ({
    value = null,
    onChange,
    stepMinutes = 5,
    placeholder = "HH:mm",
    required = false,
    disabled = false,
}) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState(() => formatExternalTime(value));
    const [prevValue, setPrevValue] = useState(value);

    // 🔹 Đồng bộ value vào input (chỉ lấy HH:mm)
    if (value !== prevValue) {
        setPrevValue(value);
        setInputValue(formatExternalTime(value));
    }

    const ref = useRef<HTMLDivElement>(null);
    const hourListRef = useRef<HTMLDivElement>(null);
    const minuteListRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 / stepMinutes }, (_, i) => i * stepMinutes);

    // click ngoài để đóng popup
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                ref.current &&
                !ref.current.contains(target) &&
                !dropdownRef.current?.contains(target)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (h: number, m: number) => {
        const formatted = `${pad2(h)}:${pad2(m)}`;
        setInputValue(formatted);
        onChange?.(formatted);
    };

    // Tự động thêm ":" khi người dùng đang nhập (nhưng không khi đang xóa)
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        // chỉ giữ số và ":"
        let val = raw.replace(/[^\d:]/g, "");

        // loại bỏ nhiều ":" (chỉ giữ dấu ":" đầu tiên nếu có)
        const firstColonIndex = val.indexOf(":");
        if (firstColonIndex !== -1) {
            // keep first colon only
            val = val.slice(0, firstColonIndex + 1) + val.slice(firstColonIndex + 1).replace(/:/g, "");
        }

        const prev = inputValue;
        // tinh toán chỉ dựa trên ký tự số+':' (độ dài so sánh)
        const prevClean = prev.replace(/[^\d:]/g, "");
        const isDeleting = val.length < prevClean.length;

        if (isDeleting) {
            // nếu xóa thì cho phép xóa thoải mái, không auto thêm ':'
            setInputValue(val);
            return;
        }

        // nếu không có ":" và chỉ 2 chữ số → tự thêm ":" (vd: nhập 09 -> 09:)
        const digitsOnly = val.replace(/:/g, "");
        if (!val.includes(":") && digitsOnly.length === 2) {
            val = digitsOnly + ":";
        } else if (!val.includes(":") && /^\d{3,4}$/.test(digitsOnly)) {
            // ví dụ 930 hoặc 0930 => format thành 09:30
            const n = digitsOnly.length === 3 ? "0" + digitsOnly : digitsOnly;
            val = `${n.slice(0, 2)}:${n.slice(2)}`;
        }

        // nếu có ":" nhưng sau ":" có >=3 chữ số (ví dụ paste "09:300") -> trim
        if (val.includes(":")) {
            const parts = val.split(":");
            if (parts[1].length > 2) {
                parts[1] = parts[1].slice(0, 2);
                val = parts.join(":");
            }
        }

        setInputValue(val);
    };

    const handleInputBlur = () => {
        const match = /^(\d{1,2}):(\d{1,2})$/.exec(inputValue);
        if (match) {
            const h = Math.min(Math.max(Number(match[1]), 0), 23);
            const m = Math.min(Math.max(Number(match[2]), 0), 59);
            const formatted = `${pad2(h)}:${pad2(m)}`;
            setInputValue(formatted);
            onChange?.(formatted);
        } else if (!inputValue) {
            onChange?.(null);
        } else {
            // reset nếu nhập sai định dạng
            setInputValue(value ?? "");
        }
    };

    // 🔹 Auto scroll đến giờ & phút đang chọn khi mở dropdown
    useEffect(() => {
        if (open) {
            const [curH, curM] = inputValue.split(":").map(Number);
            const hEl = hourListRef.current?.querySelector<HTMLDivElement>(`[data-hour="${curH}"]`);
            const mEl = minuteListRef.current?.querySelector<HTMLDivElement>(`[data-minute="${curM}"]`);
            hEl?.scrollIntoView({ block: "center" });
            mEl?.scrollIntoView({ block: "center" });
        }
    }, [open, inputValue]);

    const openDropdown = () => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + 4,
                left: rect.left,
            });
        }
        setOpen(true);
    };

    return (
        <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
            <TextInput
                disabled={disabled}
                type="text"
                value={inputValue}
                placeholder={placeholder}
                required={required}
                onChange={handleInputChange}
                onFocus={openDropdown}
                onBlur={handleInputBlur}
                style={{
                    width: 125,
                    borderRadius: 4,
                    cursor: "pointer",
                    textAlign: 'center',
                    fontWeight: 500,
                }}
            />

            {open && typeof document !== "undefined" && createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        position: "fixed",
                        top: dropdownPos.top,
                        left: dropdownPos.left,
                        zIndex: 9999,
                        display: "flex",
                        background: "white",
                        borderRadius: 4,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        maxHeight: 200,
                        overflow: "hidden",
                    }}
                >
                    {/* Cột giờ */}
                    <div
                        ref={hourListRef}
                        style={{
                            height: 200,
                            overflowY: "auto",
                            borderRight: "1px solid #eee",
                            width: 60,
                        }}
                    >
                        {hours.map((h) => (
                            <div
                                key={h}
                                data-hour={h}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    const [, curM] = inputValue.split(":").map(Number);
                                    handleSelect(h, isNaN(curM) ? 0 : curM);
                                }}
                                style={{
                                    padding: "6px 8px",
                                    cursor: "pointer",
                                    background:
                                        inputValue.startsWith(pad2(h)) ? "#e6f4ff" : "transparent",
                                }}
                            >
                                {pad2(h)}
                            </div>
                        ))}
                    </div>

                    {/* Cột phút */}
                    <div
                        ref={minuteListRef}
                        style={{
                            height: 200,
                            overflowY: "auto",
                            width: 60,
                        }}
                    >
                        {minutes.map((m) => (
                            <div
                                key={m}
                                data-minute={m}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    const [curH] = inputValue.split(":").map(Number);
                                    handleSelect(isNaN(curH) ? 0 : curH, m);
                                }}
                                style={{
                                    padding: "6px 8px",
                                    cursor: "pointer",
                                    background:
                                        inputValue.endsWith(pad2(m)) ? "#e6f4ff" : "transparent",
                                }}
                            >
                                {pad2(m)}
                            </div>
                        ))}
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
};
