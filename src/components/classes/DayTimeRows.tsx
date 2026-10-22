'use client';

import { Plus, X } from 'lucide-react';
import { MAX_SLOTS_PER_DAY, slotField, WEEKDAY_CODE_LABELS, type WeekdayCode } from '@/lib/validation/class';
import { inputClass } from '@/components/ui/Field';
import { Btn } from '@/components/ui/Btn';
import { Alert } from '@/components/ui/primitives';
import { Notice } from '@/components/ui/surfaces';

export type SlotDraft = { start: string; end: string };
export type DaySlots = { code: WeekdayCode; slots: SlotDraft[] };

// Các ca học của từng ngày: mỗi ca một dòng Bắt đầu – Kết thúc, gửi lên bằng ô start_T7, end_T7 (ca đầu), start_T7_2… (ca sau).
// Một ngày có thể học nhiều ca (sáng và chiều): "Thêm ca" thêm một dòng, "Bỏ ca" bỏ ca cuối của ngày đó.
// Không cần tích chọn "giờ khác nhau": khi các ngày khác giờ, form tự nêu ra để người nhập kiểm lại.
// canEditSlots = false (form sửa lớp): sửa giờ được, không thêm, bớt ca.
export function DayTimeRows({
  days,
  errors,
  canEditSlots,
  onChange,
  onAddSlot,
  onRemoveSlot,
}: {
  days: DaySlots[];
  errors: Record<string, string | undefined>;
  canEditSlots: boolean;
  onChange: (code: WeekdayCode, index: number, field: 'start' | 'end', value: string) => void;
  onAddSlot: (code: WeekdayCode) => void;
  onRemoveSlot: (code: WeekdayCode, index: number) => void;
}) {
  if (days.length === 0) return null;
  const all = days.flatMap((d) => d.slots.map((s) => ({ code: d.code, ...s })));
  const mixed = days.some((d) => d.slots.length > 1) || new Set(all.map((s) => `${s.start}–${s.end}`)).size > 1;

  return (
    <div className="col-span-full flex flex-col gap-2" role="group" aria-label="Giờ học từng ngày">
      <span className="text-sm font-normal text-ink-2">Giờ học *</span>
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 min-[768px]:grid-cols-2">
        {days.map((d) => {
          const label = WEEKDAY_CODE_LABELS[d.code];
          return (
            <div key={d.code} className="flex min-w-0 flex-col gap-1.5" data-day={d.code}>
              {d.slots.map((s, i) => {
                const caption = d.slots.length > 1 ? `${label} ca ${i + 1}` : label;
                // Lỗi ngay trên máy: giờ kết thúc không sau giờ bắt đầu. Lỗi của máy chủ đi theo tên ô.
                const localError = s.start && s.end && s.end <= s.start ? 'Giờ kết thúc phải sau giờ bắt đầu' : undefined;
                const startError = errors[slotField('start', d.code, i)];
                const endError = errors[slotField('end', d.code, i)] ?? localError;
                return (
                  <div key={i} className="flex min-w-0 flex-col gap-1" data-slot={`${d.code}-${i + 1}`}>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="w-8 shrink-0 text-sm font-semibold text-ink" title={label}>{i === 0 ? d.code : ''}</span>
                      <input
                        name={slotField('start', d.code, i)}
                        type="time"
                        aria-label={`Giờ bắt đầu ${caption}`}
                        value={s.start}
                        onChange={(e) => onChange(d.code, i, 'start', e.target.value)}
                        className={`${inputClass(startError)} min-w-0 flex-1`}
                      />
                      <span className="shrink-0 text-muted" aria-hidden>–</span>
                      <input
                        name={slotField('end', d.code, i)}
                        type="time"
                        aria-label={`Giờ kết thúc ${caption}`}
                        value={s.end}
                        onChange={(e) => onChange(d.code, i, 'end', e.target.value)}
                        className={`${inputClass(endError)} min-w-0 flex-1`}
                      />
                    </div>
                    {(startError || endError) && <Alert inline className="pl-10">{startError ?? endError}</Alert>}
                  </div>
                );
              })}
              {/* Nút dưới các ca, để ô giờ giữ đủ rộng trên điện thoại: thêm ca, và bỏ ca cuối khi ngày có nhiều ca */}
              {canEditSlots && (
                <div className="flex flex-wrap gap-2 pl-10">
                  {d.slots.length < MAX_SLOTS_PER_DAY && (
                    <Btn variant="ghost" onClick={() => onAddSlot(d.code)} aria-label={`Thêm ca ${label}`}>
                      <Plus className="size-4" aria-hidden /> Thêm ca {d.code}
                    </Btn>
                  )}
                  {d.slots.length > 1 && (
                    <Btn variant="danger" onClick={() => onRemoveSlot(d.code, d.slots.length - 1)} aria-label={`Bỏ ${label} ca ${d.slots.length}`}>
                      <X className="size-4" aria-hidden /> Bỏ ca {d.slots.length}
                    </Btn>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {mixed && (
        <Notice>
          Lịch có giờ khác nhau: {days.map((d) => `${d.code} ${d.slots.map((s) => `${s.start}–${s.end}`).join(', ')}`).join(' · ')}. Kiểm lại trước khi lưu.
        </Notice>
      )}
    </div>
  );
}
