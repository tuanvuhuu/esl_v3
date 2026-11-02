'use client';

import {
   CalendarIcon,
   ChevronDownIcon,
   ChevronLeftIcon,
   ChevronRightIcon,
   FilterRemoveIcon,
   XIcon,
} from "@primer/octicons-react";
import {
   AnchoredOverlay,
   IconButton,
   Select,
   TextInput,
} from "@primer/react";
import moment from "moment";
import React, { useMemo, useState } from "react";
import Button from "../button";
import styles from './date-range-input.module.css';
import clsx from 'clsx';

export interface IDateRange {
   from?: Date;
   to?: Date;
}

interface IDateRangeInputProps {
   className?: string;
   value?: IDateRange;
   onValueChanged: (range: IDateRange) => void;
   width?: React.CSSProperties['width'];
   isShowClearBtn?: boolean;
   isSearch?: boolean;
   disabled?: boolean;
   size?: "small" | "medium" | "large";
   sx?: Record<string, unknown>;
   placeholder?: string;
   /**
    * Khi true: hiển thị luôn 2 CalendarPanel (không cần ô TextInput/anchor,
    * không cần click để mở overlay) — dùng khi component này đã nằm sẵn
    * trong 1 overlay/popover khác.
    */
   inline?: boolean;
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

const formatDate = (input: string) => {
   if (!input) return "";
   const digitsOnly = input.replace(/\D/g, "");
   if (digitsOnly.length < 2) return digitsOnly;
   if (digitsOnly.length === 2) return `${digitsOnly.slice(0, 2)}/`;
   if (digitsOnly.length === 4)
      return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}/`;
   return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
};

const parseTextToDate = (text: string): Date | undefined => {
   const digitsOnly = text.replace(/\D/g, "");
   if (digitsOnly.length !== 8) return undefined;
   const day = digitsOnly.slice(0, 2);
   const month = digitsOnly.slice(2, 4);
   const year = digitsOnly.slice(4, 8);
   if (!isValidDate(day, month, year)) return undefined;
   return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
};

const getWeeksInMonth = (year: number, month: number) => {
   const weeks = [];
   const firstDay = new Date(year, month, 1);
   const lastDay = new Date(year, month + 1, 0);

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

// ─── Sub-component: single calendar panel ────────────────────────────────────

interface ICalendarPanelProps {
   year: number;
   monthIdx: number;
   onChangeYear: (y: number) => void;
   onChangeMonth: (m: number) => void;
   onPrev: () => void;
   onNext: () => void;
   hidePrev?: boolean;
   hideNext?: boolean;
   from?: Date;
   to?: Date;
   hoverDate?: Date;
   onSelectDate: (date: Date) => void;
   onHoverDate: (date: Date | undefined) => void;
}

const CalendarPanel = ({
   year,
   monthIdx,
   onChangeYear,
   onChangeMonth,
   onPrev,
   onNext,
   hidePrev,
   hideNext,
   from,
   to,
   hoverDate,
   onSelectDate,
   onHoverDate,
}: ICalendarPanelProps) => {
   const weeks = getWeeksInMonth(year, monthIdx);

   const getRangeEndpoints = () => {
      if (!from) return { start: undefined, finish: undefined };
      const end = to ?? hoverDate;
      if (!end) return { start: from, finish: undefined };
      return {
         start: from < end ? from : end,
         finish: from < end ? end : from,
      };
   };

   /**
    * FIX: Tất cả các hàm highlight đều nhận thêm `isCurrentMonth`.
    * Nếu ngày không thuộc tháng đang hiển thị (tức là ngày "mờ" đầu/cuối tháng),
    * KHÔNG tô màu range — tránh conflict giữa 2 calendar.
    */
   const isInRange = (date: moment.Moment, isCurrentMonth: boolean) => {
      if (!isCurrentMonth) return false;
      const { start, finish } = getRangeEndpoints();
      if (!start || !finish) return false;
      return (
         date.isAfter(moment(start), "day") &&
         date.isBefore(moment(finish), "day")
      );
   };

   const isRangeStart = (date: moment.Moment, isCurrentMonth: boolean) => {
      if (!isCurrentMonth) return false;
      const { start } = getRangeEndpoints();
      if (!start) return false;
      return moment(start).isSame(date, "day");
   };

   const isRangeEnd = (date: moment.Moment, isCurrentMonth: boolean) => {
      if (!isCurrentMonth) return false;
      const { start, finish } = getRangeEndpoints();
      if (!start || !finish) return false;
      return (
         moment(finish).isSame(date, "day") &&
         !moment(start).isSame(date, "day")
      );
   };

   return (
      <div className="d-grid gap-2">
         {/* Header */}
         <div className={styles.calendarPanel_box2}>
            <IconButton
               icon={ChevronLeftIcon}
               aria-label="prev"
               variant="invisible"
               onClick={onPrev}
               className={clsx(hidePrev ? styles.calendarPanel_iconButton_hidePrev : styles.calendarPanel_iconButton_notHidePrev)}
            />
            <div className="flex-1 d-flex gap-1 justify-center">
               <TextInput
                  type="number"
                  value={year}
                  onChange={(e) => {
                     if (parseInt(e.target.value, 10) > 1900) {
                        onChangeYear(parseInt(e.target.value, 10));
                     }
                  }}
                  width={110}
                  leadingVisual={<div className={styles.calendarPanel_box4}>Năm</div>}
               />
               {/*
                  Dùng native <Select> thay vì ActionMenu: ActionMenu lồng bên trong
                  1 ActionMenu.Overlay khác (của ReportDateFilter) sẽ bị Primer coi là
                  submenu — khi chọn 1 tháng, gesture "item-select" bị đẩy lên đóng
                  luôn menu cha (overlay chính tự đóng lại). Select không có overlay
                  riêng nên tránh được lỗi này.
               */}
               <Select
                  value={`${monthIdx}`}
                  onChange={(e) => onChangeMonth(parseInt(e.target.value, 10))}
                  aria-label="Tháng"
                  className={styles.monthSelect}
               >
                  {Array.from({ length: 12 }, (_, i) => i).map((index) => (
                     <Select.Option key={index} value={`${index}`}>
                        Tháng {index + 1}
                     </Select.Option>
                  ))}
               </Select>
            </div>
            <IconButton
               icon={ChevronRightIcon}
               aria-label="next"
               variant="invisible"
               onClick={onNext}
               className={clsx(hideNext ? styles.calendarPanel_iconButton2_hideNext : styles.calendarPanel_iconButton2_notHideNext)}
            />
         </div>

         {/* Calendar grid */}
         <div className={styles.calendarPanel_box5}>
            <div className={styles.calendarPanel_box6}>
               {days.map((day) => (
                  <div key={day.name} className={styles.calendarPanel_box7}>
                     {day.name}
                  </div>
               ))}
            </div>

            {weeks.map((week, idx) => (
               <div key={idx} className={styles.calendarPanel_box6}>
                  {days.map((day) => {
                     const date = moment(week.start).add(day.id - 2, "days");
                     const isCurrentMonth = date.month() === monthIdx;

                     const isStart = isRangeStart(date, isCurrentMonth);
                     const isEnd = isRangeEnd(date, isCurrentMonth);
                     const inRange = isInRange(date, isCurrentMonth);
                     const isToday =
                        isCurrentMonth && moment(date).isSame(moment(), "day");

                     let bgColor: string | undefined;
                     if (isStart || isEnd) bgColor = "var(--app-accent-emphasis)";
                     else if (inRange) bgColor = "var(--app-accent-subtle)";
                     else if (isToday) bgColor = "var(--app-accent-muted)";

                     return (
                        <div
                           style={{ backgroundColor: bgColor }}
                           key={day.id}
                           className={clsx("relative d-flex items-center justify-center", isStart && styles.calendarPanel_box8_isStart, isEnd && styles.calendarPanel_box8_isEnd)}
                           onMouseEnter={() => onHoverDate(date.toDate())}
                           onMouseLeave={() => onHoverDate(undefined)}
                        >
                           <Button
                              style={{
                                 color: isStart || isEnd
                                    ? "#fff"
                                    : !isCurrentMonth
                                       ? "var(--app-fg-muted)"
                                       : "var(--app-fg-default)",
                              }}
                              className={clsx(styles.calendarPanel_button, isCurrentMonth && styles.calendarPanel_button_isCurrentMonth)}
                              variant="invisible"
                              text={`${date.date()}`}
                              onClick={() => onSelectDate(date.toDate())}
                           />
                        </div>
                     );
                  })}
               </div>
            ))}
         </div>
      </div>
   );
};

// ─── Main component ───────────────────────────────────────────────────────────

const DateRangeInput = (props: IDateRangeInputProps) => {
   const [isOpenOverlay, setIsOpenOverlay] = useState(false);
   const [selectingStep, setSelectingStep] = useState<"from" | "to">("from");
   const [internalFrom, setInternalFrom] = useState<Date | undefined>();
   const [internalTo, setInternalTo] = useState<Date | undefined>();
   const [hoverDate, setHoverDate] = useState<Date | undefined>();

   // Mặc định: cột phải hiển thị tháng hiện tại, cột trái hiển thị tháng trước.
   const [leftYear, setLeftYear] = useState(() => {
      if (props.value?.from) return props.value.from.getFullYear();
      const now = new Date();
      return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
   });
   const [leftMonth, setLeftMonth] = useState(() => {
      if (props.value?.from) return props.value.from.getMonth();
      const now = new Date();
      return now.getMonth() === 0 ? 11 : now.getMonth() - 1;
   });
   const [rightYear, setRightYear] = useState<number>(() => {
      if (props.value?.to) return props.value.to.getFullYear();
      return new Date().getFullYear();
   });
   const [rightMonth, setRightMonth] = useState<number>(() => {
      if (props.value?.to) return props.value.to.getMonth();
      return new Date().getMonth();
   });

   const [prevValue, setPrevValue] = useState(props.value);
   if (props.value !== prevValue) {
      setPrevValue(props.value);
      if (props.value?.to) {
         setRightYear(props.value.to.getFullYear());
         setRightMonth(props.value.to.getMonth());
      }
      if (props.value?.from) {
         setLeftYear(props.value.from.getFullYear());
         setLeftMonth(props.value.from.getMonth());
      }
   }

   if (rightYear === leftYear && rightMonth === leftMonth) {
      if (leftMonth === 0) {
         setLeftMonth(11);
         setLeftYear(leftYear - 1);
      } else {
         setLeftMonth(leftMonth - 1);
      }
   }

   const [fromText, setFromText] = useState("");
   const [toText, setToText] = useState("");

   const displayLabel = useMemo(() => {
      if (props.value?.from && props.value?.to) {
         return `${moment(props.value.from).format("DD/MM/YYYY")} – ${moment(props.value.to).format("DD/MM/YYYY")}`;
      }
      if (props.value?.from) {
         return `${moment(props.value.from).format("DD/MM/YYYY")} – ...`;
      }
      return "";
   }, [props.value]);

   const handleSelectDate = (date: Date) => {
      if (selectingStep === "from" || (internalFrom && internalTo)) {
         setInternalFrom(date);
         setInternalTo(undefined);
         setFromText(moment(date).format("DD/MM/YYYY"));
         setToText("");
         setSelectingStep("to");
      } else {
         const [start, end] =
            date < internalFrom!
               ? [date, internalFrom!]
               : [internalFrom!, date];
         setInternalFrom(start);
         setInternalTo(end);
         setFromText(moment(start).format("DD/MM/YYYY"));
         setToText(moment(end).format("DD/MM/YYYY"));
         setSelectingStep("from");
         props.onValueChanged({ from: start, to: end });
         setIsOpenOverlay(false);
      }
   };

   const handleFromTextBlur = () => {
      const date = parseTextToDate(fromText);
      if (date) {
         setInternalFrom(date);
         setFromText(moment(date).format("DD/MM/YYYY"));
      } else {
         setFromText(
            internalFrom ? moment(internalFrom).format("DD/MM/YYYY") : "",
         );
      }
   };

   const handleToTextBlur = () => {
      const date = parseTextToDate(toText);
      if (date) {
         setInternalTo(date);
         setToText(moment(date).format("DD/MM/YYYY"));
         if (internalFrom && date) {
            const [start, end] =
               date < internalFrom
                  ? [date, internalFrom]
                  : [internalFrom, date];
            props.onValueChanged({ from: start, to: end });
         }
      } else {
         setToText(internalTo ? moment(internalTo).format("DD/MM/YYYY") : "");
      }
   };

   const handleFromTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "");
      if (raw.length <= 8) {
         if (e.target.value.length >= fromText.length) {
            setFromText(formatDate(raw));
         } else {
            setFromText(e.target.value);
         }
      }
   };

   const handleToTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "");
      if (raw.length <= 8) {
         if (e.target.value.length >= toText.length) {
            setToText(formatDate(raw));
         } else {
            setToText(e.target.value);
         }
      }
   };

   const handleClear = () => {
      setInternalFrom(undefined);
      setInternalTo(undefined);
      setFromText("");
      setToText("");
      setSelectingStep("from");
      props.onValueChanged({});
   };

   const prevLeftMonth = () => {
      if (leftMonth === 0) {
         setLeftMonth(11);
         setLeftYear(leftYear - 1);
      } else {
         setLeftMonth(leftMonth - 1);
      }
   };

   const nextLeftMonth = () => {
      if (leftMonth === 11) {
         setLeftMonth(0);
         setLeftYear(leftYear + 1);
      } else setLeftMonth(leftMonth + 1);
   };
   const prevRightMonth = () => {
      if (rightMonth === 0) {
         setRightMonth(11);
         setRightYear(rightYear - 1);
      } else setRightMonth(rightMonth - 1);
   };

   const nextRightMonth = () => {
      if (rightMonth === 11) {
         setRightMonth(0);
         setRightYear(rightYear + 1);
      } else setRightMonth(rightMonth + 1);
   };

   const calendarPanels = (
      <>
         <div className="d-flex gap-4 items-baseline">
            <CalendarPanel
               year={leftYear}
               monthIdx={leftMonth}
               onChangeYear={setLeftYear}
               onChangeMonth={setLeftMonth}
               onPrev={() => {
                  prevLeftMonth();
                  prevRightMonth();
               }}
               onNext={() => {
                  nextLeftMonth();
                  nextRightMonth();
               }}
               hideNext={true}
               from={internalFrom}
               to={internalTo}
               hoverDate={hoverDate}
               onSelectDate={handleSelectDate}
               onHoverDate={setHoverDate}
            />
            <CalendarPanel
               year={rightYear}
               monthIdx={rightMonth}
               onChangeYear={setRightYear}
               onChangeMonth={setRightMonth}
               onPrev={() => {
                  prevLeftMonth();
                  prevRightMonth();
               }}
               onNext={() => {
                  nextLeftMonth();
                  nextRightMonth();
               }}
               hidePrev={true}
               from={internalFrom}
               to={internalTo}
               hoverDate={hoverDate}
               onSelectDate={handleSelectDate}
               onHoverDate={setHoverDate}
            />
         </div>

         <div className="d-flex justify-between mt-2 items-center">
            <Button
               text={`Hôm nay ${moment().format("DD/MM/YYYY")}`}
               variant="invisible"
               onClick={() => handleSelectDate(moment().toDate())}
            />
            {(internalFrom || internalTo) && (
               <Button
                  text="Xóa"
                  variant="danger"
                  leadingVisual={FilterRemoveIcon}
                  className={styles.dateRangeInput_button}
                  onClick={handleClear}
               />
            )}
         </div>
      </>
   );

   if (props.inline) {
      return (
         <div className={props.className}>
            <div className={styles.dateRangeInput_box3}>
               <div
                  className={clsx((selectingStep === "from") ? styles.dateRangeInput_box4_selectingStepFrom : styles.dateRangeInput_box4_notSelectingStepFrom)}
               >
                  Từ ngày:{" "}
                  {internalFrom
                     ? moment(internalFrom).format("DD/MM/YYYY")
                     : "--/--/----"}
               </div>
               <div className="text-muted">→</div>
               <div
                  className={clsx((selectingStep === "to") ? styles.dateRangeInput_box6_selectingStepTo : styles.dateRangeInput_box6_notSelectingStepTo)}
               >
                  Đến ngày:{" "}
                  {internalTo
                     ? moment(internalTo).format("DD/MM/YYYY")
                     : "--/--/----"}
               </div>
            </div>
            {calendarPanels}
         </div>
      );
   }

   return (
      <AnchoredOverlay
         open={isOpenOverlay}
         onClose={() => setIsOpenOverlay(false)}
         overlayProps={{
            role: "dialog",
            "aria-modal": true,
            "aria-label": "Date Range Picker",
         }}
         focusZoneSettings={{ disabled: true }}
         renderAnchor={(anchorProps) => (
            <div
               style={{ width: props.width }}
               {...anchorProps}
               className={clsx("relative d-flex items-center", props.className)}
            >
               <TextInput
                  value={displayLabel}
                  readOnly
                  size={props.size}
                  disabled={props.disabled}
                  placeholder={props.placeholder || "dd/MM/yyyy – dd/MM/yyyy"}
                  block
                  onClick={() => setIsOpenOverlay(true)}
                  className={clsx("cursor-pointer", props.isSearch && styles.dateRangeInput_textInput_isSearch)}
                  leadingVisual={
                     props.isSearch ? (
                        <button
                           type="button"
                           className={styles.dateRangeInput_box8}
                           onClick={() => setIsOpenOverlay(true)}
                        >
                           <CalendarIcon />
                        </button>
                     ) : null
                  }
               />

               {!props.isSearch && (
                  <IconButton
                     icon={ChevronDownIcon}
                     aria-label=""
                     onClick={() => setIsOpenOverlay(true)}
                     variant="invisible"
                     className={styles.dateRangeInput_iconButton}
                  />
               )}

               {props.isShowClearBtn &&
                  (props.value?.from || props.value?.to) && (
                     <IconButton
                        icon={XIcon}
                        aria-label="clear"
                        onClick={handleClear}
                        variant="invisible"
                        className={styles.dateRangeInput_iconButton2}
                     />
                  )}
            </div>
         )}
      >
         <div className="p-3">
            <div
               className={clsx(styles.dateRangeInput_box10, (selectingStep === "from") ? styles.dateRangeInput_box10_selectingStepFrom : styles.dateRangeInput_box10_notSelectingStepFrom)}
            >
               {selectingStep === "from"
                  ? "Chọn ngày bắt đầu"
                  : "Chọn ngày kết thúc"}
            </div>

            <div className="d-flex items-center gap-1 mb-3">
               <TextInput
                  value={fromText}
                  placeholder="dd/MM/yyyy"
                  onChange={handleFromTextChange}
                  onBlur={handleFromTextBlur}
                  onFocus={() => setSelectingStep("from")}
                  className={clsx("flex-1", (selectingStep === "from") ? styles.dateRangeInput_textInput2_selectingStepFrom : styles.dateRangeInput_textInput2_notSelectingStepFrom)}
                  leadingVisual={
                     <div className={styles.dateRangeInput_box12}>
                        Từ ngày
                     </div>
                  }
               />
               <div className={styles.dateRangeInput_box13}>→</div>
               <TextInput
                  value={toText}
                  placeholder="dd/MM/yyyy"
                  onChange={handleToTextChange}
                  onBlur={handleToTextBlur}
                  onFocus={() => setSelectingStep("to")}
                  className={clsx("flex-1", (selectingStep === "to") ? styles.dateRangeInput_textInput2_selectingStepTo : styles.dateRangeInput_textInput2_notSelectingStepTo)}
                  leadingVisual={
                     <div className={styles.dateRangeInput_box12}>
                        Đến ngày
                     </div>
                  }
               />
            </div>

            {calendarPanels}
         </div>
      </AnchoredOverlay>
   );
};

export default DateRangeInput;
