'use client';

import { Notice } from '@/components/ui/surfaces';
import { closestCorners, DndContext, KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { MAX_SLOTS_PER_DAY, slotField, WEEKDAY_CODE_LABELS, type WeekdayCode } from '@/lib/validation/class';
import { inputClass } from '@/components/ui/Field';
import { Btn } from '@/components/ui/Btn';
import { Alert } from '@/components/ui/primitives';

export type SlotDraft = { start: string; end: string };

// Ô giờ là ô chữ kiểu 24 giờ ("18:30"), không dùng ô time của trình duyệt vì máy cài tiếng Việt hiện "06:30 CH", dễ nhầm sáng chiều.
// Gõ "1830" thành "18:30"; rời ô thì "8:30" thành "08:30".
export function typingTime(value: string): string {
  // Người gõ dấu hai chấm: giữ phần giờ như đã gõ ("18:3" vẫn là "18:3", không thành "1:83")
  const colon = value.indexOf(':');
  if (colon >= 0) {
    const h = value.slice(0, colon).replace(/\D/g, '').slice(-2);
    const m = value.slice(colon + 1).replace(/\D/g, '').slice(0, 2);
    if (h) return `${h}:${m}`;
  }
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, -2)}:${digits.slice(-2)}`;
  // Vừa gõ "8:" hoặc "18:" thì giữ dấu hai chấm để gõ tiếp phút
  return value.trim().endsWith(':') && digits.length > 0 ? `${digits}:` : digits;
}
export function finishTime(value: string): string {
  const m = /^(\d{1,2}):?(\d{2})?$/.exec(value.trim());
  if (!m) return value;
  return `${m[1].padStart(2, '0')}:${m[2] ?? '00'}`;
}
const TIME_OK = /^([01]\d|2[0-3]):[0-5]\d$/;
// "1 giờ 30 phút", "45 phút"
export function durationLabel(start: string, end: string): string {
  if (!TIME_OK.test(start) || !TIME_OK.test(end) || end <= start) return '';
  const mins = Number(end.slice(0, 2)) * 60 + Number(end.slice(3)) - (Number(start.slice(0, 2)) * 60 + Number(start.slice(3)));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h} giờ` : '', m ? `${m} phút` : ''].filter(Boolean).join(' ');
}
export type DaySlots = { code: WeekdayCode; slots: SlotDraft[] };

// Các ca học của từng ngày: mỗi ca một dòng Bắt đầu – Kết thúc, gửi lên bằng ô start_T7, end_T7 (ca đầu), start_T7_2… (ca sau).
// Một ngày có thể học nhiều ca (sáng và chiều): "Thêm ca" thêm một dòng, "Bỏ ca" bỏ ca cuối của ngày đó. Kéo thả đổi thứ tự hoặc chuyển ngày.
export type SlotPos = { code: string; index: number };

// Kéo thả ca học (form tạo lớp, xếp lại lịch): kéo bằng tay cầm ⋮⋮ để đổi thứ tự ca trong ngày, hoặc kéo sang ngày khác.
// Bàn phím cũng dùng được: chọn tay cầm, Space để nhấc, mũi tên để di chuyển, Space để thả.
export function DayTimeRows({
  days,
  errors,
  canEditSlots,
  onChange,
  onAddSlot,
  onRemoveSlot,
  onMoveSlot,
}: {
  days: DaySlots[];
  errors: Record<string, string | undefined>;
  canEditSlots: boolean;
  onChange: (code: WeekdayCode, index: number, field: 'start' | 'end', value: string) => void;
  onAddSlot: (code: WeekdayCode) => void;
  onRemoveSlot: (code: WeekdayCode, index: number) => void;
  onMoveSlot?: (from: SlotPos, to: SlotPos) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  if (days.length === 0) return null;
  const all = days.flatMap((d) => d.slots.map((s) => ({ code: d.code, ...s })));
  const mixed = days.some((d) => d.slots.length > 1) || new Set(all.map((s) => `${s.start}–${s.end}`)).size > 1;
  const dragOn = canEditSlots && !!onMoveSlot;

  function onDragEnd(e: DragEndEvent) {
    const from = e.active.data.current?.pos as SlotPos | undefined;
    const to = (e.over?.data.current?.pos ?? e.over?.data.current?.dropAt) as SlotPos | undefined;
    if (!from || !to || !onMoveSlot) return;
    if (from.code === to.code && from.index === to.index) return;
    onMoveSlot(from, to);
  }

  return (
    <div className="col-span-full flex flex-col gap-2" role="group" aria-label="Giờ học từng ngày">
      <span className="text-sm font-normal text-ink-2">Giờ học *</span>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 min-[768px]:grid-cols-2">
          {days.map((d) => {
            const label = WEEKDAY_CODE_LABELS[d.code];
            return (
              <DayGroup key={d.code} code={d.code} count={d.slots.length} dragOn={dragOn}>
                {d.slots.map((s, i) => {
                  const caption = d.slots.length > 1 ? `${label} ca ${i + 1}` : label;
                  // Lỗi ngay trên máy: giờ kết thúc không sau giờ bắt đầu. Lỗi của máy chủ đi theo tên ô.
                  const localError = s.start && s.end && s.end <= s.start ? 'Giờ kết thúc phải sau giờ bắt đầu' : undefined;
                  const startError = errors[slotField('start', d.code, i)];
                  const endError = errors[slotField('end', d.code, i)] ?? localError;
                  return (
                    <SlotRow
                      key={`${d.code}-${i}`}
                      code={d.code}
                      index={i}
                      dayLabel={label}
                      caption={caption}
                      slot={s}
                      startError={startError}
                      endError={endError}
                      dragOn={dragOn}
                      onChange={onChange}
                    />
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
              </DayGroup>
            );
          })}
        </div>
      </DndContext>
      {mixed && (
        <Notice>
          Lịch có giờ khác nhau: {days.map((d) => `${d.code} ${d.slots.map((s) => `${s.start}–${s.end}`).join(', ')}`).join(' · ')}. Kiểm lại trước khi lưu.
        </Notice>
      )}
    </div>
  );
}

// Một ngày học: vùng thả ca từ ngày khác, và danh sách ca có thể sắp lại trong ngày
function DayGroup({ code, count, dragOn, children }: { code: WeekdayCode; count: number; dragOn: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${code}`, data: { dropAt: { code, index: count } }, disabled: !dragOn });
  const ids = Array.from({ length: count }, (_, i) => `slot-${code}-${i}`);
  return (
    <div ref={setNodeRef} className={`flex min-w-0 flex-col gap-1.5 rounded-xl ${isOver ? 'bg-primary-soft/60' : ''}`} data-day={code}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
}

// Một ca: tay cầm ⋮⋮ để kéo, hai ô giờ bắt đầu – kết thúc
function SlotRow({
  code,
  index,
  dayLabel,
  caption,
  slot: s,
  startError,
  endError,
  dragOn,
  onChange,
}: {
  code: WeekdayCode;
  index: number;
  dayLabel: string;
  caption: string;
  slot: SlotDraft;
  startError: string | undefined;
  endError: string | undefined;
  dragOn: boolean;
  onChange: (code: WeekdayCode, index: number, field: 'start' | 'end', value: string) => void;
}) {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: `slot-${code}-${index}`,
    data: { pos: { code, index } satisfies SlotPos },
    disabled: !dragOn,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex min-w-0 flex-col gap-1 ${isDragging ? 'z-10 opacity-70' : ''}`}
      data-slot={`${code}-${index + 1}`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {dragOn ? (
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Kéo ca ${caption} để đổi chỗ`}
            className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted hover:bg-stone active:cursor-grabbing"
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
        ) : (
          <span className="w-8 shrink-0" aria-hidden />
        )}
        <span className="w-8 shrink-0 text-sm font-semibold text-ink" title={dayLabel}>{index === 0 ? code : ''}</span>
        <input
          name={slotField('start', code, index)}
          type="text"
          inputMode="numeric"
          maxLength={5}
          placeholder="18:30"
          autoComplete="off"
          aria-label={`Giờ bắt đầu ${caption}`}
          value={s.start}
          onChange={(e) => onChange(code, index, 'start', typingTime(e.target.value))}
          onBlur={(e) => onChange(code, index, 'start', finishTime(e.target.value))}
          className={`${inputClass(startError)} min-w-0 flex-1 tabular-nums`}
        />
        <span className="shrink-0 text-muted" aria-hidden>–</span>
        <input
          name={slotField('end', code, index)}
          type="text"
          inputMode="numeric"
          maxLength={5}
          placeholder="20:00"
          autoComplete="off"
          aria-label={`Giờ kết thúc ${caption}`}
          value={s.end}
          onChange={(e) => onChange(code, index, 'end', typingTime(e.target.value))}
          onBlur={(e) => onChange(code, index, 'end', finishTime(e.target.value))}
          className={`${inputClass(endError)} min-w-0 flex-1 tabular-nums`}
        />
      </div>
      {durationLabel(s.start, s.end) && !(startError || endError) && <span className="pl-[4.5rem] text-sm text-muted">{durationLabel(s.start, s.end)}</span>}
      {(startError || endError) && <Alert inline className="pl-[4.5rem]">{startError ?? endError}</Alert>}
    </div>
  );
}
