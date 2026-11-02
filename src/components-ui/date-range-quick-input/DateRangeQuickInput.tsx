'use client';

import Button from "@/components-ui/button";
import DateRangeInput from "@/components-ui/date-range-input";
import { CalendarIcon, HistoryIcon, SunIcon, type Icon } from "@primer/octicons-react";
import { ActionMenu } from "@primer/react";
import moment from "moment";
import { useMemo, useState } from "react";
import styles from './date-range-quick-input.module.css';

export interface IDateRangeQuickInput {
   from?: string;
   to?: string;
}

interface IDateRangeQuickInputProps extends IDateRangeQuickInput {
   onFilterChanged?: (value: IDateRangeQuickInput) => void;
}

type FilterMode = "today" | "current-week" | "current-month" | "other";

function getPresetRange(mode: FilterMode): IDateRangeQuickInput | null {
   const today = moment();
   const currentDay = today.day();
   switch (mode) {
      case "today":
         return {
            from: today.format("YYYY-MM-DD"),
            to: today.format("YYYY-MM-DD"),
         };
      case "current-week": {
         const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
         const start = today
            .clone()
            .subtract(daysToMonday, "days")
            .startOf("day");
         return {
            from: start.format("YYYY-MM-DD"),
            to: start.clone().add(6, "days").format("YYYY-MM-DD"),
         };
      }
      case "current-month":
         return {
            from: today.clone().startOf("month").format("YYYY-MM-DD"),
            to: today.clone().endOf("month").format("YYYY-MM-DD"),
         };
      default:
         return null;
   }
}

function detectFilterMode(from?: string, to?: string): FilterMode {
   if (!from || !to) return "other";
   for (const mode of [
      "today",
      "current-week",
      "current-month",
   ] as FilterMode[]) {
      const range = getPresetRange(mode);
      if (range?.from === from && range?.to === to) return mode;
   }
   return "other";
}

function formatDateRange(from?: string, to?: string): string {
   if (!from && !to) return "";
   const f = from ? moment(from).format("DD/MM") : "?";
   const t = to ? moment(to).format("DD/MM") : "?";
   return f === t ? f : `${f} – ${t}`;
}

const PRESETS: { mode: FilterMode; label: string; icon: Icon }[] = [
   { mode: "today", label: "Hôm nay", icon: SunIcon },
   { mode: "current-week", label: "Tuần hiện tại", icon: CalendarIcon },
   { mode: "current-month", label: "Tháng hiện tại", icon: HistoryIcon },
];

const DateRangeQuickInput = (props: IDateRangeQuickInputProps) => {
   const { from, to, onFilterChanged } = props;
   const [open, setOpen] = useState(false);

   const filterMode = useMemo(() => detectFilterMode(from, to), [from, to]);

   const presetLabel =
      PRESETS.find((p) => p.mode === filterMode)?.label ?? "Tùy chọn";
   const dateRangeLabel = formatDateRange(from, to);
   const buttonLabel = useMemo(() => {
      if (presetLabel === "Tùy chọn") {
         return `Từ ngày ${dateRangeLabel}`;
      }
      return `${presetLabel} (ngày ${dateRangeLabel})`;
   }, [dateRangeLabel, presetLabel]);

   const handlePresetSelect = (mode: FilterMode) => {
      const range = getPresetRange(mode);
      if (range) onFilterChanged?.(range);
      setOpen(false);
   };

   const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

   return (
      <ActionMenu open={open} onOpenChange={setOpen}>
         <ActionMenu.Button leadingVisual={CalendarIcon}>
            {buttonLabel}
         </ActionMenu.Button>

         <ActionMenu.Overlay
            onMouseDown={stopPropagation}
            onClick={stopPropagation}
            width="auto"
         >
            <div className="p-3 d-grid gap-3">
               <div
                  className={styles.dateRangeQuickInput_box2}
               >
                  <div className="flex-1 text-muted">Chọn nhanh</div>
                  {PRESETS.map(({ mode, label, icon }) => (
                     <Button
                        key={mode}
                        text={label}
                        leadingVisual={icon}
                        // block
                        variant={filterMode === mode ? "primary" : "default"}
                        onClick={() => handlePresetSelect(mode)}
                     />
                  ))}
               </div>

               <DateRangeInput
                  inline
                  value={{
                     from: from ? moment(from).toDate() : undefined,
                     to: to ? moment(to).toDate() : undefined,
                  }}
                  onValueChanged={({ from, to }) => {
                     if (from && to) {
                        onFilterChanged?.({
                           from: moment(from).format("YYYY-MM-DD"),
                           to: moment(to).format("YYYY-MM-DD"),
                        });
                        setOpen(false);
                     }
                  }}
               />
            </div>
         </ActionMenu.Overlay>
      </ActionMenu>
   );
};

export default DateRangeQuickInput;
