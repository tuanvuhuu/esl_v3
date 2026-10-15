'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import { createTeacherAction, updateTeacherAction, type TeacherFormValues } from '@/app/(app)/giao-vien/actions';
import { STAFF_ROLES, STAFF_ROLE_LABELS, TEACHER_STATUSES, TEACHER_STATUS_LABELS } from '@/lib/validation/teacher';
import type { ActionResult } from '@/lib/validation/student';
import { Field, FORM_BTN_CANCEL, FORM_BTN_SUBMIT, inputClass, FormFooter } from '@/components/ui/Field';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { Alert } from '@/components/ui/primitives';

export type CampusChoice = { id: number; name: string };

const EMPTY: TeacherFormValues = { name: '', subject: '', phone: '', years: 0, status: 'active', staffRole: 'teacher', campusIds: [] };
const INITIAL: ActionResult = { ok: false };

// Form thêm và sửa giáo viên. Dùng trong hộp thoại Modal.
// Thêm mới thì cơ sở dạy mặc định là cơ sở đang xem (defaultCampusId).
export function TeacherForm({
  mode,
  teacherId,
  initial,
  campuses,
  defaultCampusId,
  onDone,
  onCancel,
}: {
  mode: 'create' | 'edit';
  teacherId?: number;
  initial?: TeacherFormValues;
  campuses: CampusChoice[];
  defaultCampusId: number;
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
        <Alert className="col-span-full">{state.message}</Alert>
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
      <Field label="Vai trò *" error={errors.staffRole} hint="Trợ giảng và giáo viên nước ngoài chỉ được chọn cho đúng vị trí của lớp">
        <SelectPanel
          name="staffRole"
          label="Vai trò *"
          defaultValue={values.staffRole}
          options={STAFF_ROLES.map((r) => ({ value: r, label: STAFF_ROLE_LABELS[r] }))}
          error={!!errors.staffRole}
          block
        />
      </Field>
      <Field label="Trạng thái" error={errors.status}>
        <SelectPanel
          name="status"
          label="Trạng thái"
          defaultValue={values.status}
          options={TEACHER_STATUSES.map((s) => ({ value: s, label: TEACHER_STATUS_LABELS[s] }))}
          error={!!errors.status}
          block
        />
      </Field>
      <Field label="Cơ sở dạy *" error={errors.campusIds} wide hint="Có thể dạy ở một hoặc nhiều cơ sở">
        <SelectPanel
          name="campusIds"
          label="Cơ sở dạy *"
          multiple
          defaultValues={values.campusIds.length > 0 ? values.campusIds : [String(defaultCampusId)]}
          options={campuses.map((c) => ({ value: String(c.id), label: c.name }))}
          error={!!errors.campusIds}
          block
        />
      </Field>

      <FormFooter className="col-span-full">
        <button type="button" onClick={onCancel} className={FORM_BTN_CANCEL}>Huỷ</button>
        <button type="submit" disabled={pending} className={FORM_BTN_SUBMIT}>
          {pending ? 'Đang lưu…' : mode === 'edit' ? 'Lưu thay đổi' : 'Lưu giáo viên'}
        </button>
      </FormFooter>
    </form>
  );
}
