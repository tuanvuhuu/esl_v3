'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import { createClassAction, updateClassAction, type ClassCoreValues } from '@/app/(app)/lop-hoc/actions';
import { WEEKDAY_CODES, WEEKDAY_CODE_LABELS } from '@/lib/validation/class';
import type { ActionResult } from '@/lib/validation/student';
import { Field, FORM_BTN_CANCEL, FORM_BTN_SUBMIT, inputClass } from '@/components/ui/Field';

export type TeacherChoice = { id: number; name: string; subject: string };

const INITIAL: ActionResult = { ok: false };

// Form tạo lớp (có lịch học) và sửa lớp (chỉ ô chung). Lịch học đổi theo từng buổi ở màn Lịch học.
export function ClassForm({
  mode,
  classId,
  initial,
  teachers,
  defaultStartDate,
  onDone,
  onCancel,
}: {
  mode: 'create' | 'edit';
  classId?: number;
  initial?: ClassCoreValues;
  teachers: TeacherChoice[];
  defaultStartDate: string;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const values: ClassCoreValues = initial ?? { name: '', course: '', teacherId: '', room: '', fee: 0, capacity: 15 };
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result = mode === 'edit' && classId ? await updateClassAction(classId, prev, formData) : await createClassAction(prev, formData);
    if (result.ok) onDone(result.message ?? 'Đã lưu');
    return result;
  }, INITIAL);
  const errors = state.fieldErrors ?? {};

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
        <div role="alert" className="col-span-full rounded-xl bg-blush px-3.5 py-2.5 text-base font-semibold text-blush-ink">{state.message}</div>
      )}

      <Field label="Mã lớp *" error={errors.name} hint="VD: IELTS-K15">
        <input name="name" defaultValue={values.name} autoComplete="off" className={inputClass(errors.name)} />
      </Field>
      <Field label="Khoá học *" error={errors.course}>
        <input name="course" defaultValue={values.course} placeholder="VD: IELTS Foundation 6.0" autoComplete="off" className={inputClass(errors.course)} />
      </Field>
      <Field label="Giáo viên *" error={errors.teacherId}>
        <select name="teacherId" defaultValue={values.teacherId} className={inputClass(errors.teacherId)}>
          <option value="">Chọn giáo viên</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.name} · {t.subject}</option>
          ))}
        </select>
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
            <legend className="mb-1.5 text-sm font-bold text-ink-2">Ngày học trong tuần *</legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_CODES.map((code) => (
                <label key={code} className="cursor-pointer" title={WEEKDAY_CODE_LABELS[code]}>
                  <input type="checkbox" name="weekdays" value={code} className="peer sr-only" />
                  <span className="inline-flex h-10 min-w-12 items-center justify-center rounded-xl border border-line bg-surface px-3 text-sm font-bold text-ink-2 peer-checked:border-primary-deep peer-checked:bg-primary peer-checked:text-on-primary peer-focus-visible:outline-2 peer-focus-visible:outline-primary-deep">
                    {code}
                  </span>
                </label>
              ))}
            </div>
            {errors.weekdays && <span className="text-sm font-semibold text-blush-ink">{errors.weekdays}</span>}
          </fieldset>

          <Field label="Giờ bắt đầu *" error={errors.startTime}>
            <input name="startTime" type="time" defaultValue="18:30" className={inputClass(errors.startTime)} />
          </Field>
          <Field label="Giờ kết thúc *" error={errors.endTime}>
            <input name="endTime" type="time" defaultValue="20:00" className={inputClass(errors.endTime)} />
          </Field>
          <Field label="Ngày khai giảng *" error={errors.startDate} hint="Buổi đầu tiên diễn ra vào ngày này hoặc ngày học gần nhất">
            <input name="startDate" type="date" defaultValue={defaultStartDate} className={inputClass(errors.startDate)} />
          </Field>
          <Field label="Số buổi *" error={errors.sessionsTotal}>
            <input name="sessionsTotal" type="number" inputMode="numeric" min={1} max={200} step={1} defaultValue={24} className={inputClass(errors.sessionsTotal)} />
          </Field>
        </>
      ) : (
        <p className="col-span-full rounded-[18px] bg-lav px-4 py-3 text-base leading-relaxed text-lav-ink">
          Lịch tuần và số buổi không đổi ở đây. Muốn đổi giờ, ngày hoặc huỷ một buổi, làm ở màn Lịch học.
        </p>
      )}

      <div className="col-span-full mt-1 flex justify-end gap-2.5 max-[767px]:[&>button]:flex-1">
        <button type="button" onClick={onCancel} className={FORM_BTN_CANCEL}>Huỷ</button>
        <button type="submit" disabled={pending} className={FORM_BTN_SUBMIT}>
          {pending ? 'Đang lưu…' : isCreate ? 'Tạo lớp' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  );
}
