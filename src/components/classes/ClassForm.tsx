'use client';

import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { createClassAction, updateClassAction, type ClassCoreValues } from '@/app/(app)/lop-hoc/actions';
import { WEEKDAY_CODES, WEEKDAY_CODE_LABELS, type WeekdayCode } from '@/lib/validation/class';
import type { StaffRole } from '@/lib/validation/teacher';
import type { ActionResult } from '@/lib/validation/student';
import { Field, FORM_BTN_CANCEL, FORM_BTN_SUBMIT, inputClass, FormFooter } from '@/components/ui/Field';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { Alert } from '@/components/ui/primitives';
import { Notice } from '@/components/ui/surfaces';
import { DayTimeRows, type DayTimeDraft } from '@/components/classes/DayTimeRows';

// staffRole: vị trí người này có thể giữ (chủ nhiệm, giáo viên nước ngoài, trợ giảng). campusIds: các cơ sở người này dạy.
// Form lớp chỉ cho chọn đúng vai trò và người dạy ở cơ sở của lớp.
export type TeacherChoice = { id: number; name: string; subject: string; staffRole: StaffRole; campusIds: number[] };
export type CampusChoice = { id: number; name: string };
export type LevelChoice = { id: number; code: string; name: string };

const INITIAL: ActionResult = { ok: false };
const DEFAULT_TIME = { start: '18:30', end: '20:00' };

// Form tạo lớp (có lịch học) và sửa lớp (ô chung và giờ từng ngày học). Thêm, bớt ngày hoặc sửa một buổi ở màn Lịch học.
// Tạo lớp thì cơ sở mặc định là cơ sở đang xem (defaultCampusId).
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
  mode: 'create' | 'edit';
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
    const result = mode === 'edit' && classId ? await updateClassAction(classId, prev, formData) : await createClassAction(prev, formData);
    if (result.ok) onDone(result.message ?? 'Đã lưu');
    return result;
  }, INITIAL);
  const errors = state.fieldErrors ?? {};

  // Giờ học theo ngày. Chọn ngày nào thì ngày đó có một dòng giờ, lấy giờ vừa nhập gần nhất.
  // Sửa giờ một dòng thì các dòng chưa sửa đi theo, nên lớp cùng giờ chỉ cần nhập một lần.
  const initialTimes = new Map((values.dayTimes ?? []).map((d) => [d.code as WeekdayCode, { start: d.start, end: d.end }]));
  const [days, setDays] = useState<WeekdayCode[]>([...initialTimes.keys()]);
  const [times, setTimes] = useState(initialTimes);
  const [touched, setTouched] = useState<Set<WeekdayCode>>(() => new Set(initialTimes.keys()));
  const [lastTime, setLastTime] = useState(DEFAULT_TIME);
  const rows: DayTimeDraft[] = WEEKDAY_CODES.filter((c) => days.includes(c)).map((code) => ({ code, ...(times.get(code) ?? lastTime) }));

  function toggleDay(code: WeekdayCode, on: boolean) {
    setDays((prev) => (on ? [...prev, code] : prev.filter((c) => c !== code)));
    if (on && !times.has(code)) setTimes((prev) => new Map(prev).set(code, lastTime));
  }

  function changeTime(code: WeekdayCode, field: 'start' | 'end', value: string) {
    const edited = { ...(times.get(code) ?? lastTime), [field]: value };
    setTimes((prev) => {
      const next = new Map(prev).set(code, edited);
      for (const other of days) if (other !== code && !touched.has(other)) next.set(other, edited);
      return next;
    });
    setTouched((prev) => new Set(prev).add(code));
    setLastTime(edited);
  }

  // Gọi action thủ công để ô nhập không bị reset khi có lỗi (E-028)
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  const isCreate = mode === 'create';

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
      {state.message && !state.ok && (
        <Alert className="col-span-full">{state.message}</Alert>
      )}

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
      <Field label="Học phí (VND) *" error={errors.fee} hint="Số nguyên, không có dấu chấm">
        <input name="fee" type="number" inputMode="numeric" min={0} step={1} defaultValue={values.fee} className={inputClass(errors.fee)} />
      </Field>
      <Field label="Sĩ số tối đa *" error={errors.capacity}>
        <input name="capacity" type="number" inputMode="numeric" min={1} max={100} step={1} defaultValue={values.capacity} className={inputClass(errors.capacity)} />
      </Field>

      {isCreate ? (
        <>
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

          <DayTimeRows rows={rows} errors={errors} onChange={changeTime} />
          <Field label="Ngày khai giảng *" error={errors.startDate} hint="Buổi đầu tiên diễn ra vào ngày này hoặc ngày học gần nhất">
            <input name="startDate" type="date" defaultValue={defaultStartDate} className={inputClass(errors.startDate)} />
          </Field>
          <Field label="Số buổi *" error={errors.sessionsTotal}>
            <input name="sessionsTotal" type="number" inputMode="numeric" min={1} max={200} step={1} defaultValue={24} className={inputClass(errors.sessionsTotal)} />
          </Field>
        </>
      ) : (
        <>
          <DayTimeRows rows={rows} errors={errors} onChange={changeTime} />
          <Notice className={`col-span-full ${rows.length === 0 ? 'hidden' : ''}`}>
            Đổi giờ của một ngày thì các buổi sắp tới của ngày đó dời sang giờ mới. Thêm, bớt ngày học hoặc sửa, huỷ một buổi riêng làm ở màn Lịch học.
          </Notice>
        </>
      )}

      <FormFooter className="col-span-full">
        <button type="button" onClick={onCancel} className={FORM_BTN_CANCEL}>Huỷ</button>
        <button type="submit" disabled={pending} className={FORM_BTN_SUBMIT}>
          {pending ? 'Đang lưu…' : isCreate ? 'Tạo lớp' : 'Lưu thay đổi'}
        </button>
      </FormFooter>
    </form>
  );
}
