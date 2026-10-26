'use client';

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from 'react';
import { createClassAction, previewScheduleAction, rescheduleClassAction, updateClassAction, type ClassCoreValues, type SchedulePreview } from '@/app/(app)/lop-hoc/actions';
import { dateKeyLabel, vnDateKey, vnTimeLabel, weekdayLabel, weekdayOfKey } from '@/lib/datetime';
import { MAX_SLOTS_PER_DAY, WEEKDAY_CODES, WEEKDAY_CODE_LABELS, type WeekdayCode } from '@/lib/validation/class';
import type { StaffRole } from '@/lib/validation/teacher';
import type { ActionResult } from '@/lib/validation/student';
import { Field, FORM_BTN_CANCEL, FORM_BTN_SUBMIT, inputClass, FormFooter } from '@/components/ui/Field';
import { Btn } from '@/components/ui/Btn';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { Alert } from '@/components/ui/primitives';
import { Notice } from '@/components/ui/surfaces';
import { DayTimeRows, type DaySlots, type SlotDraft, type SlotPos } from '@/components/classes/DayTimeRows';
import { moveSlot } from '@/lib/slot-move';

// staffRole: vị trí người này có thể giữ (chủ nhiệm, giáo viên nước ngoài, trợ giảng). campusIds: các cơ sở người này dạy.
// Form lớp chỉ cho chọn đúng vai trò và người dạy ở cơ sở của lớp.
export type TeacherChoice = { id: number; name: string; subject: string; staffRole: StaffRole; campusIds: number[] };
export type CampusChoice = { id: number; name: string };
export type LevelChoice = { id: number; code: string; name: string };

const INITIAL: ActionResult = { ok: false };
const DEFAULT_TIME = { start: '18:30', end: '20:00' };

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// Ca thêm mới: sau ca trước 30 phút, cùng độ dài. Không đủ chỗ trong ngày thì lấy lại giờ ca trước để người nhập tự sửa.
function nextSlotAfter(prev: { start: string; end: string }): { start: string; end: string } {
  if (!/^\d{2}:\d{2}$/.test(prev.start) || !/^\d{2}:\d{2}$/.test(prev.end)) return { ...prev };
  const length = Math.max(30, toMinutes(prev.end) - toMinutes(prev.start));
  const start = toMinutes(prev.end) + 30;
  return start + length < 24 * 60 ? { start: toTime(start), end: toTime(start + length) } : { ...prev };
}

// Form tạo lớp (có lịch học), sửa lớp (ô chung và giờ từng ngày học) và xếp lại lịch (chỉ phần lịch: ngày học, ca,
// ngày bắt đầu, tổng số buổi). Sửa một buổi riêng ở màn Lịch học. Tạo lớp thì cơ sở mặc định là cơ sở đang xem (defaultCampusId).
export function ClassForm({
  mode,
  classId,
  initial,
  teachers,
  campuses,
  levels = [],
  defaultCampusId,
  defaultStartDate,
  onDone,
  onCancel,
}: {
  mode: 'create' | 'edit' | 'reschedule';
  classId?: number;
  initial?: ClassCoreValues;
  teachers: TeacherChoice[];
  campuses: CampusChoice[];
  levels?: LevelChoice[];
  defaultCampusId: number;
  defaultStartDate: string;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const values: ClassCoreValues = initial ?? {
    name: '',
    course: '',
    campusId: String(defaultCampusId),
    teacherId: '',
    assistantId: '',
    foreignTeacherId: '',
    levelId: '',
    room: '',
    fee: 0,
    capacity: 15,
  };
  // Chọn cơ sở trước. Giáo viên chỉ hiện khi dạy ở cơ sở đó; đổi cơ sở thì bỏ giáo viên không dạy ở cơ sở mới.
  const [campusId, setCampusId] = useState(values.campusId);
  const [teacherId, setTeacherId] = useState(values.teacherId);
  const [assistantId, setAssistantId] = useState(values.assistantId);
  const [foreignTeacherId, setForeignTeacherId] = useState(values.foreignTeacherId);
  const [levelId, setLevelId] = useState(values.levelId ?? '');
  // Mỗi vị trí chỉ hiện người đúng vai trò và dạy ở cơ sở đang chọn
  const optionsOf = (role: StaffRole, campus: string) => teachers.filter((t) => t.staffRole === role && t.campusIds.includes(Number(campus)));
  const teacherOptions = optionsOf('teacher', campusId);
  const assistantOptions = optionsOf('assistant', campusId);
  const foreignOptions = optionsOf('foreign', campusId);
  // Đổi cơ sở thì bỏ người không còn dạy ở cơ sở mới, đúng vai trò của vị trí đó
  function chooseCampus(next: string) {
    setCampusId(next);
    if (!optionsOf('teacher', next).some((t) => String(t.id) === teacherId)) setTeacherId('');
    if (!optionsOf('assistant', next).some((t) => String(t.id) === assistantId)) setAssistantId('');
    if (!optionsOf('foreign', next).some((t) => String(t.id) === foreignTeacherId)) setForeignTeacherId('');
  }

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result =
      mode === 'edit' && classId
        ? await updateClassAction(classId, prev, formData)
        : mode === 'reschedule' && classId
          ? await rescheduleClassAction(classId, prev, formData)
          : await createClassAction(prev, formData);
    if (result.ok) onDone(result.message ?? 'Đã lưu');
    return result;
  }, INITIAL);
  const errors = state.fieldErrors ?? {};

  // Ca học theo ngày. Chọn ngày nào thì ngày đó có một ca, lấy giờ vừa nhập gần nhất; "Thêm ca" cho ngày học nhiều ca.
  // Sửa giờ ca đầu của một ngày thì ca đầu của các ngày chưa sửa đi theo, nên lớp cùng giờ chỉ cần nhập một lần.
  const initialTimes = new Map<WeekdayCode, SlotDraft[]>();
  for (const d of values.dayTimes ?? []) {
    const code = d.code as WeekdayCode;
    initialTimes.set(code, [...(initialTimes.get(code) ?? []), { start: d.start, end: d.end }]);
  }
  const [days, setDays] = useState<WeekdayCode[]>([...initialTimes.keys()]);
  const [times, setTimes] = useState(initialTimes);
  const [touched, setTouched] = useState<Set<WeekdayCode>>(() => new Set(initialTimes.keys()));
  // Lớp đã có lịch: ngày mới bật lấy giờ ca đầu của lớp thay vì giờ mặc định
  const [lastTime, setLastTime] = useState<SlotDraft>(() => (values.dayTimes?.[0] ? { start: values.dayTimes[0].start, end: values.dayTimes[0].end } : DEFAULT_TIME));
  const daySlots: DaySlots[] = WEEKDAY_CODES.filter((c) => days.includes(c)).map((code) => ({ code, slots: times.get(code) ?? [lastTime] }));

  function toggleDay(code: WeekdayCode, on: boolean) {
    setDays((prev) => (on ? [...prev, code] : prev.filter((c) => c !== code)));
    if (on && !times.has(code)) setTimes((prev) => new Map(prev).set(code, [lastTime]));
  }

  // Kéo ca sang vị trí khác: đổi thứ tự trong ngày hoặc chuyển sang ngày khác (ngày nguồn còn ít nhất một ca)
  function moveSlotTo(from: SlotPos, to: SlotPos) {
    const next = moveSlot(times, from, to, MAX_SLOTS_PER_DAY);
    if (!next) return;
    setTimes(next as Map<WeekdayCode, SlotDraft[]>);
    setTouched((prev) => new Set(prev).add(from.code as WeekdayCode).add(to.code as WeekdayCode));
  }

  function changeTime(code: WeekdayCode, index: number, field: 'start' | 'end', value: string) {
    const slots = times.get(code) ?? [lastTime];
    const old = slots[index];
    const edited = { ...old, [field]: value };
    // Đổi giờ bắt đầu thì giờ kết thúc dời theo, giữ nguyên độ dài ca (đổi 18:00–19:30 sang 08:00 thành 08:00–09:30)
    const ok = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
    if (field === 'start' && ok(value) && ok(old.start) && ok(old.end) && old.end > old.start) {
      const end = toMinutes(value) + toMinutes(old.end) - toMinutes(old.start);
      if (end < 24 * 60) edited.end = toTime(end);
    }
    setTimes((prev) => {
      const next = new Map(prev).set(code, slots.map((s, i) => (i === index ? edited : s)));
      if (index === 0) {
        for (const other of days) {
          const otherSlots = next.get(other) ?? [lastTime];
          if (other !== code && !touched.has(other) && otherSlots.length === 1) next.set(other, [edited]);
        }
      }
      return next;
    });
    setTouched((prev) => new Set(prev).add(code));
    setLastTime(edited);
  }

  // Ca mới bắt đầu sau ca cuối 30 phút, cùng độ dài; người nhập sửa lại giờ nếu cần
  function addSlot(code: WeekdayCode) {
    const slots = times.get(code) ?? [lastTime];
    setTimes((prev) => new Map(prev).set(code, [...slots, nextSlotAfter(slots[slots.length - 1])]));
    setTouched((prev) => new Set(prev).add(code));
  }

  // Đặt cùng một giờ cho mọi ngày học: lấy ca đầu của ngày đầu tiên, các ngày khác giữ nguyên ca thêm
  function applyFirstTimeToAll() {
    const first = daySlots[0]?.slots[0];
    if (!first) return;
    setTimes((prev) => {
      const next = new Map(prev);
      for (const d of daySlots) next.set(d.code, [{ ...first }, ...(next.get(d.code) ?? [lastTime]).slice(1)]);
      return next;
    });
    setTouched(new Set(days));
  }

  function removeSlot(code: WeekdayCode, index: number) {
    const slots = times.get(code) ?? [lastTime];
    setTimes((prev) => new Map(prev).set(code, slots.filter((_, i) => i !== index)));
  }

  // Gọi action thủ công để ô nhập không bị reset khi có lỗi (E-028)
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  const isCreate = mode === 'create';
  const isReschedule = mode === 'reschedule';
  const hasSchedule = isCreate || isReschedule;
  const kept = values.keptSessions ?? 0;

  // Xem trước lịch khi tạo lớp hoặc xếp lại lịch: chờ ngừng nhập nửa giây rồi hỏi máy chủ (số buổi, ngày cuối, buổi trùng giáo viên hoặc phòng).
  // bump tăng khi ô thường đổi; ô chọn (cơ sở, giáo viên) và giờ học nằm trong state nên đã có trong danh sách theo dõi.
  const formRef = useRef<HTMLFormElement>(null);
  const [bump, setBump] = useState(0);
  const [preview, setPreview] = useState<SchedulePreview | null>(null);
  useEffect(() => {
    if (!hasSchedule) return;
    const timer = setTimeout(async () => {
      if (!formRef.current) return;
      setPreview(await previewScheduleAction(new FormData(formRef.current)));
    }, 500);
    return () => clearTimeout(timer);
  }, [hasSchedule, bump, days, times, campusId, teacherId]);

  return (
    <form ref={formRef} onSubmit={submit} onChange={() => setBump((n) => n + 1)} noValidate className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
      {state.message && !state.ok && (
        <Alert className="col-span-full">{state.message}</Alert>
      )}

      {isReschedule && <input type="hidden" name="rescheduleClassId" value={classId} />}
      {!isReschedule && (
      <>
      <SectionTitle>Thông tin lớp</SectionTitle>
      <Field label="Cơ sở *" error={errors.campusId} hint="Mỗi lớp thuộc đúng một cơ sở">
        <SelectPanel
          name="campusId"
          label="Cơ sở *"
          value={campusId}
          onChange={chooseCampus}
          options={campuses.map((c) => ({ value: String(c.id), label: c.name }))}
          error={!!errors.campusId}
          block
        />
      </Field>
      <Field label="Mã lớp *" error={errors.name} hint="VD: IELTS-K15">
        <input name="name" defaultValue={values.name} autoComplete="off" className={inputClass(errors.name)} />
      </Field>
      <Field label="Khoá học *" error={errors.course}>
        <input name="course" defaultValue={values.course} placeholder="VD: IELTS Foundation 6.0" autoComplete="off" className={inputClass(errors.course)} />
      </Field>
      <Field label="Trình độ CEFR" error={errors.levelId} hint="Khung tham chiếu Châu Âu (A1–C2), để trống nếu không áp dụng">
        <SelectPanel
          name="levelId"
          label="Trình độ CEFR"
          value={levelId}
          onChange={setLevelId}
          options={[
            { value: '', label: 'Không áp dụng (để trống)' },
            ...levels.map((l) => ({ value: String(l.id), label: `${l.code} · ${l.name}` })),
          ]}
          error={!!errors.levelId}
          block
        />
      </Field>
      <SectionTitle>Giáo viên và phòng</SectionTitle>
      <Field label="Giáo viên chủ nhiệm *" error={errors.teacherId} hint={teacherOptions.length === 0 ? 'Cơ sở này chưa có giáo viên. Thêm ở màn Giáo viên.' : undefined}>
        <SelectPanel
          name="teacherId"
          label="Giáo viên chủ nhiệm *"
          value={teacherId}
          onChange={setTeacherId}
          options={[{ value: '', label: 'Chọn giáo viên' }, ...teacherOptions.map((t) => ({ value: String(t.id), label: `${t.name} · ${t.subject}` }))]}
          error={!!errors.teacherId}
          block
        />
      </Field>
      <Field label="Trợ giảng" error={errors.assistantId} hint={assistantOptions.length === 0 ? 'Cơ sở này chưa có trợ giảng. Thêm ở màn Giáo viên, chọn vai trò Trợ giảng.' : undefined}>
        <SelectPanel
          name="assistantId"
          label="Trợ giảng"
          value={assistantId}
          onChange={setAssistantId}
          options={[{ value: '', label: 'Chưa có trợ giảng' }, ...assistantOptions.map((t) => ({ value: String(t.id), label: `${t.name} · ${t.subject}` }))]}
          error={!!errors.assistantId}
          block
        />
      </Field>
      <Field label="Giáo viên nước ngoài" error={errors.foreignTeacherId} hint={foreignOptions.length === 0 ? 'Cơ sở này chưa có giáo viên nước ngoài. Thêm ở màn Giáo viên, chọn vai trò Giáo viên nước ngoài.' : undefined}>
        <SelectPanel
          name="foreignTeacherId"
          label="Giáo viên nước ngoài"
          value={foreignTeacherId}
          onChange={setForeignTeacherId}
          options={[{ value: '', label: 'Chưa có giáo viên nước ngoài' }, ...foreignOptions.map((t) => ({ value: String(t.id), label: `${t.name} · ${t.subject}` }))]}
          error={!!errors.foreignTeacherId}
          block
        />
      </Field>
      <Field label="Phòng" error={errors.room}>
        <input name="room" defaultValue={values.room} placeholder="VD: P.201" autoComplete="off" className={inputClass(errors.room)} />
      </Field>
      <SectionTitle>Học phí và sĩ số</SectionTitle>
      <Field label="Học phí (VND) *" error={errors.fee} hint="Học phí cả khoá, gõ số, app tự thêm dấu chấm">
        <MoneyInput name="fee" defaultValue={values.fee} className={inputClass(errors.fee)} />
      </Field>
      {mode === 'edit' && (
        <label className="col-span-full flex items-start gap-2 text-sm text-ink-2">
          <input type="checkbox" name="keepOldFee" defaultChecked className="mt-1 size-4 accent-[var(--primary-deep)]" />
          <span>
            Nếu đổi học phí: học sinh đang học giữ học phí cũ
            {values.affectedStudents !== undefined && <> ({values.affectedStudents} học sinh chưa có học phí riêng)</>}. Học sinh vào sau thì theo học phí mới.
          </span>
        </label>
      )}
      <Field label="Sĩ số tối đa *" error={errors.capacity}>
        <input name="capacity" type="number" inputMode="numeric" min={1} max={100} step={1} defaultValue={values.capacity} className={inputClass(errors.capacity)} />
      </Field>
      </>
      )}

      {hasSchedule ? (
        <>
          {isReschedule ? (
            <Notice className="col-span-full">
              {kept > 0 ? `Giữ nguyên ${kept} buổi đã học hoặc đã bắt đầu. ` : ''}Các buổi chưa học được thay bằng lịch mới bên dưới. Đổi ngày khai giảng, số buổi, ngày học hoặc ca ở đây.
            </Notice>
          ) : (
            <SectionTitle>Lịch học</SectionTitle>
          )}
          <fieldset className="col-span-full flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-normal text-ink-2">Ngày học trong tuần *</legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_CODES.map((code) => (
                <label key={code} className="cursor-pointer" title={WEEKDAY_CODE_LABELS[code]}>
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={code}
                    checked={days.includes(code)}
                    onChange={(e) => toggleDay(code, e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="inline-flex h-[var(--ctl-h)] min-w-[var(--ctl-h)] items-center justify-center rounded-full border border-line bg-surface px-3 text-sm font-semibold text-ink-2 max-[767px]:h-[var(--ctl-h-touch)] peer-checked:border-primary-deep peer-checked:bg-primary peer-checked:text-on-primary peer-focus-visible:outline-2 peer-focus-visible:outline-primary-deep">
                    {code}
                  </span>
                </label>
              ))}
            </div>
            {errors.weekdays && <span className="text-sm font-semibold text-blush-ink">{errors.weekdays}</span>}
          </fieldset>

          {daySlots.length > 1 && (
            <div className="col-span-full flex justify-end">
              <Btn variant="ghost" onClick={applyFirstTimeToAll}>
                Dùng giờ ca đầu của {daySlots[0].code} cho mọi ngày học
              </Btn>
            </div>
          )}
          <DayTimeRows days={daySlots} errors={errors} canEditSlots onChange={changeTime} onAddSlot={addSlot} onRemoveSlot={removeSlot} onMoveSlot={moveSlotTo} />
          <Field
            label={isReschedule && kept > 0 ? 'Xếp lại từ ngày *' : 'Ngày khai giảng *'}
            error={errors.startDate}
            hint={isReschedule && kept > 0 ? 'Buổi chưa học đầu tiên diễn ra vào ngày này hoặc ngày học gần nhất' : 'Buổi đầu tiên diễn ra vào ngày này hoặc ngày học gần nhất'}
          >
            <input name="startDate" type="date" defaultValue={isReschedule ? (values.nextDate ?? defaultStartDate) : defaultStartDate} className={inputClass(errors.startDate)} />
          </Field>
          <Field label={isReschedule ? 'Tổng số buổi của khoá *' : 'Số buổi *'} error={errors.sessionsTotal} hint={isReschedule && kept > 0 ? `Tính cả ${kept} buổi đã học` : undefined}>
            <input name="sessionsTotal" type="number" inputMode="numeric" min={1} max={200} step={1} defaultValue={values.sessionsTotal ?? 24} className={inputClass(errors.sessionsTotal)} />
          </Field>
          <PreviewBox preview={preview} />
        </>
      ) : (
        <>
          {/* Hướng dẫn đặt trên ô giờ: người dùng hay bỏ qua chữ ở cuối form */}
          <Notice className={`col-span-full ${daySlots.length === 0 ? 'hidden' : ''}`}>
            <b>Đổi giờ từng ca tại đây:</b> các buổi sắp tới của ca đó sẽ dời theo giờ mới. <b>Muốn thêm ca, đổi ngày học hoặc số buổi</b>, bấm <b>Xếp lại lịch</b> trong menu ⋯ của lớp ở danh sách. Sửa hoặc huỷ một buổi riêng ở màn Lịch học.
          </Notice>
          <DayTimeRows days={daySlots} errors={errors} canEditSlots={false} onChange={changeTime} onAddSlot={addSlot} onRemoveSlot={removeSlot} />
        </>
      )}

      <FormFooter className="col-span-full">
        <button type="button" onClick={onCancel} className={FORM_BTN_CANCEL}>Huỷ</button>
        <button type="submit" disabled={pending} className={FORM_BTN_SUBMIT}>
          {pending ? 'Đang lưu…' : isCreate ? 'Tạo lớp' : isReschedule ? 'Xếp lại lịch' : 'Lưu thay đổi'}
        </button>
      </FormFooter>
    </form>
  );
}

// Tiêu đề nhóm trong form lớp: chia form dài thành bốn phần dễ dò
function SectionTitle({ children }: { children: string }) {
  return <h3 className="col-span-full mt-2 border-b border-line pb-1.5 text-md font-extrabold text-ink first:mt-0">{children}</h3>;
}

// Ô tiền: hiện "6.000.000", gửi số nguyên 6000000 qua ô ẩn cùng tên
function MoneyInput({ name, defaultValue, className }: { name: string; defaultValue: number; className: string }) {
  const [digits, setDigits] = useState(defaultValue ? String(defaultValue) : '');
  const shown = digits ? Number(digits).toLocaleString('vi-VN') : '';
  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={shown}
        placeholder="VD: 6.000.000"
        onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 12))}
        className={`${className} tabular-nums`}
      />
      <input type="hidden" name={name} value={digits || '0'} />
    </>
  );
}

// "T5 22/10/2026 08:00"
function whenLabel(d: Date): string {
  const key = vnDateKey(d);
  return `${weekdayLabel(weekdayOfKey(key))} ${dateKeyLabel(key)} ${vnTimeLabel(d)}`;
}

// Khung xem trước lịch: số buổi, ngày đầu, ngày cuối, vài buổi đầu; buổi trùng hiện đỏ để sửa trước khi tạo
function PreviewBox({ preview }: { preview: SchedulePreview | null }) {
  if (!preview) return null;
  if (!preview.ok) return <Notice className="col-span-full">{preview.message}</Notice>;
  return (
    <section aria-label="Xem trước lịch" className="col-span-full flex flex-col gap-2 rounded-[var(--radius-ctl)] bg-primary-soft p-3">
      <p className="text-base text-ink">
        <b className="font-extrabold">{preview.kept ? `${preview.total} buổi mới` : `${preview.total} buổi`}</b> · từ {whenLabel(preview.firstStartsAt)} đến {whenLabel(preview.lastStartsAt)}
        {preview.kept ? ` · giữ ${preview.kept} buổi đã học` : ''}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {preview.sample.map((s) => (
          <li key={s.startsAt.toISOString()} className="rounded-full bg-surface px-2.5 py-1 text-sm text-ink-2">
            {whenLabel(s.startsAt)}–{vnTimeLabel(s.endsAt)}
          </li>
        ))}
        {preview.total > preview.sample.length && <li className="px-1 py-1 text-sm text-muted">và {preview.total - preview.sample.length} buổi nữa</li>}
      </ul>
      {preview.conflictCount > 0 ? (
        <Alert inline>
          Trùng lịch {preview.conflictCount} buổi: {preview.conflicts.join('; ')}. Đổi giờ, ngày, giáo viên hoặc phòng trước khi lưu.
        </Alert>
      ) : (
        <Alert inline tone="ok">Không trùng lịch giáo viên và phòng.</Alert>
      )}
    </section>
  );
}
