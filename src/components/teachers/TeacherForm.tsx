'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import { createTeacherAction, updateTeacherAction, type TeacherFormValues } from '@/app/(app)/giao-vien/actions';
import { STAFF_ROLES, STAFF_ROLE_LABELS, TEACHER_STATUSES, TEACHER_STATUS_LABELS } from '@/lib/validation/teacher';
import type { ActionResult } from '@/lib/validation/student';
import { ComboBox, SelectBox, TextInput, TextInputNumber } from '@/components-ui';
import { Btn } from '@/components/ui/Btn';
import { Field, FormFooter, FormSection } from '@/components/ui/Field';
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
    <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
      {state.message && !state.ok && (
        <Alert>{state.message}</Alert>
      )}

      <FormSection title="Hồ sơ giảng viên" description="Họ tên, số điện thoại liên lạc và chuyên môn chính.">
        <Field label="Họ và tên *" error={errors.name} wide>
          <TextInput
            block
            name="name"
            aria-label="Họ và tên *"
            defaultValue={values.name}
            placeholder="VD: Cô Thu Hà"
            autoComplete="off"
            validationStatus={errors.name ? 'error' : undefined}
          />
        </Field>
        <Field label="Số điện thoại *" error={errors.phone}>
          <TextInput
            block
            name="phone"
            aria-label="Số điện thoại *"
            type="tel"
            inputMode="tel"
            defaultValue={values.phone}
            placeholder="09xx xxx xxx"
            autoComplete="off"
            validationStatus={errors.phone ? 'error' : undefined}
          />
        </Field>
        <Field label="Môn dạy *" error={errors.subject}>
          <TextInput
            block
            name="subject"
            aria-label="Môn dạy *"
            defaultValue={values.subject}
            placeholder="VD: IELTS"
            autoComplete="off"
            validationStatus={errors.subject ? 'error' : undefined}
          />
        </Field>
        <Field label="Số năm kinh nghiệm" error={errors.years} wide>
          <TextInputNumber
            name="years"
            aria-label="Số năm kinh nghiệm"
            min={0}
            max={60}
            thousandSeparator={false}
            defaultValue={values.years}
            error={Boolean(errors.years)}
          />
        </Field>
      </FormSection>

      <FormSection title="Phân công & cơ sở" description="Trợ giảng và giáo viên nước ngoài được chọn theo đúng vị trí của lớp.">
        <Field label="Vai trò *" error={errors.staffRole}>
          <SelectBox
            name="staffRole"
            label="Vai trò *"
            defaultValue={values.staffRole}
            options={STAFF_ROLES.map((r) => ({ value: r, label: STAFF_ROLE_LABELS[r] }))}
            error={Boolean(errors.staffRole)}
            block
          />
        </Field>
        <Field label="Trạng thái" error={errors.status}>
          <SelectBox
            name="status"
            label="Trạng thái"
            defaultValue={values.status}
            options={TEACHER_STATUSES.map((s) => ({ value: s, label: TEACHER_STATUS_LABELS[s] }))}
            error={Boolean(errors.status)}
            block
          />
        </Field>
        <Field label="Cơ sở dạy *" error={errors.campusIds} wide hint="Có thể dạy ở một hoặc nhiều cơ sở.">
          <ComboBox
            name="campusIds"
            label="Cơ sở dạy *"
            multiple
            defaultValues={values.campusIds.length > 0 ? values.campusIds : [String(defaultCampusId)]}
            options={campuses.map((c) => ({ value: String(c.id), label: c.name }))}
            error={Boolean(errors.campusIds)}
            block
          />
        </Field>
      </FormSection>

      <FormFooter>
        <Btn onClick={onCancel}>Huỷ</Btn>
        <Btn type="submit" variant="primary" loading={pending} disabled={pending}>
          {pending ? 'Đang lưu…' : mode === 'edit' ? 'Lưu thay đổi' : 'Lưu giáo viên'}
        </Btn>
      </FormFooter>
    </form>
  );
}
