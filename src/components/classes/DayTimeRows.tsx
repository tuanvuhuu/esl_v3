'use client';

import { WEEKDAY_CODE_LABELS, type WeekdayCode } from '@/lib/validation/class';
import { inputClass } from '@/components/ui/Field';
import { Alert } from '@/components/ui/primitives';
import { Notice } from '@/components/ui/surfaces';

export type DayTimeDraft = { code: WeekdayCode; start: string; end: string };

// Giờ học của từng ngày: mỗi ngày học một dòng Bắt đầu – Kết thúc, gửi lên bằng ô start_T3, end_T3.
// Không cần tích chọn "giờ khác nhau": khi các ngày khác giờ, form tự nêu ra để người nhập kiểm lại.
export function DayTimeRows({
  rows,
  errors,
  onChange,
}: {
  rows: DayTimeDraft[];
  errors: Record<string, string | undefined>;
  onChange: (code: WeekdayCode, field: 'start' | 'end', value: string) => void;
}) {
  if (rows.length === 0) return null;
  const ranges = new Set(rows.map((r) => `${r.start}–${r.end}`));
  const mixed = rows.length > 1 && ranges.size > 1;

  return (
    <div className="col-span-full flex flex-col gap-2" role="group" aria-label="Giờ học từng ngày">
      <span className="text-sm font-normal text-ink-2">Giờ học *</span>
      <div className="grid grid-cols-1 gap-2 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
        {rows.map((r) => {
          const label = WEEKDAY_CODE_LABELS[r.code];
          // Lỗi ngay trên máy: giờ kết thúc không sau giờ bắt đầu. Lỗi của máy chủ đi theo tên ô.
          const localError = r.start && r.end && r.end <= r.start ? 'Giờ kết thúc phải sau giờ bắt đầu' : undefined;
          const startError = errors[`start_${r.code}`];
          const endError = errors[`end_${r.code}`] ?? localError;
          return (
            <div key={r.code} className="flex min-w-0 flex-col gap-1" data-day={r.code}>
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="w-8 shrink-0 text-sm font-semibold text-ink" title={label}>{r.code}</span>
                <input
                  name={`start_${r.code}`}
                  type="time"
                  aria-label={`Giờ bắt đầu ${label}`}
                  value={r.start}
                  onChange={(e) => onChange(r.code, 'start', e.target.value)}
                  className={`${inputClass(startError)} min-w-0 flex-1`}
                />
                <span className="shrink-0 text-muted" aria-hidden>–</span>
                <input
                  name={`end_${r.code}`}
                  type="time"
                  aria-label={`Giờ kết thúc ${label}`}
                  value={r.end}
                  onChange={(e) => onChange(r.code, 'end', e.target.value)}
                  className={`${inputClass(endError)} min-w-0 flex-1`}
                />
              </div>
              {(startError || endError) && <Alert inline className="pl-10">{startError ?? endError}</Alert>}
            </div>
          );
        })}
      </div>
      {mixed && (
        <Notice>
          Các ngày học khác giờ nhau: {rows.map((r) => `${r.code} ${r.start}–${r.end}`).join(', ')}. Kiểm lại trước khi lưu.
        </Notice>
      )}
    </div>
  );
}
