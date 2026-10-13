'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import { createTeacherAction, updateTeacherAction, type TeacherFormValues } from '@/app/(app)/giao-vien/actions';
import { TEACHER_STATUSES, TEACHER_STATUS_LABELS } from '@/lib/validation/teacher';
import type { ActionResult } from '@/lib/validation/student';
import { Field, FORM_BTN_CANCEL, FORM_BTN_SUBMIT, inputClass } from '@/components/ui/Field';

const EMPTY: TeacherFormValues = { name: '', subject: '', phone: '', years: 0, status: 'active' };
const INITIAL: ActionResult = { ok: false };

// Form thêm và sửa giáo viên. Dùng trong hộp thoại Modal.
export function TeacherForm({
  mode,
  teacherId,
  initial,
  onDone,
  onCancel,
}: {
  mode: 'create' | 'edit';
  teacherId?: number;
  initial?: TeacherFormValues;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const values = initial ?? EMPTY;

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result = mode === 'edit' && teacherId ? await updateTeacherAction(teacherId, prev, formData) : await createTeacherAction(prev, formData);
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

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
      {state.message && !state.ok && (
        <div role="alert" className="col-span-full rounded-xl bg-blush px-3.5 py-2.5 text-base font-semibold text-blush-ink">{state.message}</div>
      )}

      <Field label="Họ và tên *" error={errors.name} wide>
        <input name="name" defaultValue={values.name} placeholder="VD: Cô Thu Hà" autoComplete="off" className={inputClass(errors.name)} />
      </Field>
      <Field label="Môn dạy *" error={errors.subject}>
        <input name="subject" defaultValue={values.subject} placeholder="VD: IELTS" autoComplete="off" className={inputClass(errors.subject)} />
      </Field>
      <Field label="Số điện thoại *" error={errors.phone}>
        <input name="phone" type="tel" inputMode="tel" defaultValue={values.phone} placeholder="09xx xxx xxx" autoComplete="off" className={inputClass(errors.phone)} />
      </Field>
      <Field label="Số năm kinh nghiệm" error={errors.years}>
        <input name="years" type="number" inputMode="numeric" min={0} max={60} defaultValue={values.years} className={inputClass(errors.years)} />
      </Field>
      <Field label="Trạng thái" error={errors.status}>
        <select name="status" defaultValue={values.status} className={inputClass(errors.status)}>
          {TEACHER_STATUSES.map((s) => (
            <option key={s} value={s}>{TEACHER_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </Field>

      <div className="col-span-full mt-1 flex justify-end gap-2.5 max-[767px]:[&>button]:flex-1">
        <button type="button" onClick={onCancel} className={FORM_BTN_CANCEL}>Huỷ</button>
        <button type="submit" disabled={pending} className={FORM_BTN_SUBMIT}>
          {pending ? 'Đang lưu…' : mode === 'edit' ? 'Lưu thay đổi' : 'Lưu giáo viên'}
        </button>
      </div>
    </form>
  );
}
