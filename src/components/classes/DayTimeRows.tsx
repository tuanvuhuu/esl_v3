'use client';

import { ClockIcon, GrabberIcon, PlusIcon, XIcon } from '@primer/octicons-react';
import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { TimeInput24h } from '@/components-ui';
import { MAX_SLOTS_PER_DAY, slotField, WEEKDAY_CODE_LABELS, type WeekdayCode } from '@/lib/validation/class';
import { Btn } from '@/components/ui/Btn';
import { Alert } from '@/components/ui/primitives';
import { Notice } from '@/components/ui/surfaces';

export type SlotDraft = { start: string; end: string };

// Ô giờ là ô chữ kiểu 24 giờ ("18:30"), không dùng ô time của trình duyệt vì máy cài tiếng Việt hiện "06:30 CH", dễ nhầm sáng chiều.
// Gõ "1830" thành "18:30"; rời ô thì "8:30" thành "08:30".
export function typingTime(value: string): string {
  const colon = value.indexOf(':');
  if (colon >= 0) {
    const h = value.slice(0, colon).replace(/\D/g, '').slice(-2);
    const m = value.slice(colon + 1).replace(/\D/g, '').slice(0, 2);
    if (h) return `${h}:${m}`;
  }
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, -2)}:${digits.slice(-2)}`;
  return value.trim().endsWith(':') && digits.length > 0 ? `${digits}:` : digits;
}

export function finishTime(value: string): string {
  const m = /^(\d{1,2}):?(\d{2})?$/.exec(value.trim());
  if (!m) return value;
  return `${m[1].padStart(2, '0')}:${m[2] ?? '00'}`;
}

const TIME_OK = /^([01]\d|2[0-3]):[0-5]\d$/;

export function durationLabel(start: string, end: string): string {
  if (!TIME_OK.test(start) || !TIME_OK.test(end) || end <= start) return '';
  const mins = Number(end.slice(0, 2)) * 60 + Number(end.slice(3)) - (Number(start.slice(0, 2)) * 60 + Number(start.slice(3)));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h} giờ` : '', m ? `${m} phút` : ''].filter(Boolean).join(' ');
}

export type DaySlots = { code: WeekdayCode; slots: SlotDraft[] };
export type SlotPos = { code: string; index: number };

// Kéo thả ca học (form tạo lớp, xếp lại lịch): kéo bằng nút GrabberIcon để đổi thứ tự ca trong ngày, hoặc kéo sang ngày khác.
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
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
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-[var(--fgColor-default)]">Giờ học từng ngày *</span>
        {dragOn && (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--fgColor-muted)]">
            Kéo <GrabberIcon size={12} className="shrink-0" aria-hidden /> để đổi thứ tự hoặc chuyển ca sang ngày khác
          </span>
        )}
      </div>
      <DndContext id="day-time-rows-dnd" sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-2.5 min-[768px]:grid-cols-2">
          {days.map((d) => {
            const label = WEEKDAY_CODE_LABELS[d.code];
            return (
              <DayGroup key={d.code} code={d.code} dayLabel={label} count={d.slots.length} dragOn={dragOn}>
                {d.slots.map((s, i) => {
                  const caption = d.slots.length > 1 ? `${label} ca ${i + 1}` : label;
                  const localError = s.start && s.end && s.end <= s.start ? 'Giờ kết thúc phải sau giờ bắt đầu' : undefined;
                  const startError = errors[slotField('start', d.code, i)];
                  const endError = errors[slotField('end', d.code, i)] ?? localError;
                  return (
                    <SlotRow
                      key={`${d.code}-${i}`}
                      code={d.code}
                      index={i}
                      totalSlots={d.slots.length}
                      caption={caption}
                      slot={s}
                      startError={startError}
                      endError={endError}
                      dragOn={dragOn}
                      onChange={onChange}
                    />
                  );
                })}
                {canEditSlots && (
                  <div className="mt-1 flex flex-wrap gap-1.5 border-t border-[var(--borderColor-muted)]/70 pt-2">
                    {d.slots.length < MAX_SLOTS_PER_DAY && (
                      <Btn variant="ghost" leadingVisual={PlusIcon} onClick={() => onAddSlot(d.code)} aria-label={`Thêm ca ${label}`}>
                        Thêm ca {d.code}
                      </Btn>
                    )}
                    {d.slots.length > 1 && (
                      <Btn
                        variant="danger"
                        leadingVisual={XIcon}
                        onClick={() => onRemoveSlot(d.code, d.slots.length - 1)}
                        aria-label={`Bỏ ${label} ca ${d.slots.length}`}
                      >
                        Bỏ ca {d.slots.length}
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

function DayGroup({
  code,
  dayLabel,
  count,
  dragOn,
  children,
}: {
  code: WeekdayCode;
  dayLabel: string;
  count: number;
  dragOn: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${code}`, data: { dropAt: { code, index: count } }, disabled: !dragOn });
  const ids = Array.from({ length: count }, (_, i) => `slot-${code}-${i}`);
  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'flex min-w-0 flex-col gap-2 rounded-[var(--borderRadius-medium)] border p-2.5 transition-colors',
        isOver
          ? 'border-[var(--borderColor-accent-emphasis)] bg-[var(--bgColor-accent-muted)]'
          : 'border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/60',
      )}
      data-day={code}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center rounded-[var(--borderRadius-small)] bg-[var(--bgColor-neutral-muted)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--fgColor-default)]">
            {code}
          </span>
          <span className="text-xs font-medium text-[var(--fgColor-default)]">{dayLabel}</span>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-[var(--fgColor-muted)]">{count} ca</span>
      </div>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
}

function SlotRow({
  code,
  index,
  totalSlots,
  caption,
  slot: s,
  startError,
  endError,
  dragOn,
  onChange,
}: {
  code: WeekdayCode;
  index: number;
  totalSlots: number;
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
  const dur = durationLabel(s.start, s.end);
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(
        'flex min-w-0 flex-col gap-1 rounded-[var(--borderRadius-small)] border border-[var(--borderColor-muted)] bg-[var(--bgColor-default)] px-2 py-1.5',
        isDragging && 'z-10 border-[var(--borderColor-accent-emphasis)] opacity-75 shadow-sm',
      )}
      data-slot={`${code}-${index + 1}`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {dragOn && (
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Kéo ca ${caption} để đổi chỗ`}
            className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-[var(--borderRadius-small)] text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] active:cursor-grabbing max-[767px]:size-9"
          >
            <GrabberIcon size={16} aria-hidden />
          </button>
        )}
        {totalSlots > 1 && (
          <span className="shrink-0 font-mono text-[11px] text-[var(--fgColor-muted)]">C{index + 1}</span>
        )}
        <TimeInput24h
          name={slotField('start', code, index)}
          ariaLabel={`Giờ bắt đầu ${caption}`}
          value={s.start}
          placeholder="18:30"
          error={Boolean(startError)}
          onChange={(val) => onChange(code, index, 'start', val)}
          className="min-w-0 flex-1"
        />
        <span className="shrink-0 text-xs text-[var(--fgColor-muted)]" aria-hidden>
          –
        </span>
        <TimeInput24h
          name={slotField('end', code, index)}
          ariaLabel={`Giờ kết thúc ${caption}`}
          value={s.end}
          placeholder="20:00"
          error={Boolean(endError)}
          onChange={(val) => onChange(code, index, 'end', val)}
          className="min-w-0 flex-1"
        />
      </div>
      {dur && !(startError || endError) && (
        <div className="flex items-center gap-1 text-[11px] tabular-nums text-[var(--fgColor-muted)]">
          <ClockIcon size={11} aria-hidden />
          <span>{dur}</span>
        </div>
      )}
      {(startError || endError) && <Alert inline>{startError ?? endError}</Alert>}
    </div>
  );
}
