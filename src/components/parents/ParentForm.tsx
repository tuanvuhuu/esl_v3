'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import { createParentAction, updateParentAction, type ParentFormValues } from '@/app/(app)/phu-huynh/actions';
import type { ActionResult } from '@/lib/validation/student';
import { ComboBox, SelectBox, TextAreaAutoHeight, TextInput } from '@/components-ui';
import { Btn } from '@/components/ui/Btn';
import { Field, FormFooter, FormSection } from '@/components/ui/Field';
import { Alert } from '@/components/ui/primitives';
import { PARENT_RELATION_LABELS } from '@/lib/parent-labels';
import type { StudentChoice } from '@/lib/queries/parents';

const EMPTY: ParentFormValues = { fullName: '', phone: '', email: '', note: '' };
const INITIAL: ActionResult = { ok: false };
const RELATION_OPTIONS = (['mother', 'father', 'guardian', 'other'] as const).map((r) => ({ value: r, label: PARENT_RELATION_LABELS[r] }));

// Form thêm và sửa phụ huynh. Dùng trong hộp thoại Modal. Thêm mới thì chọn được con ngay (students), không bắt buộc.
export function ParentForm({
  mode,
  parentId,
  initial,
  students = [],
  onDone,
  onCancel,
}: {
  mode: 'create' | 'edit';
  parentId?: number;
  initial?: ParentFormValues;
  students?: StudentChoice[];
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const values = initial ?? EMPTY;
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result = mode === 'edit' && parentId ? await updateParentAction(parentId, prev, formData) : await createParentAction(prev, formData);
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

      <FormSection title="Thông tin liên hệ" description="Số điện thoại dùng để đối chiếu tự động khi phụ huynh kết nối Telegram.">
        <Field label="Họ và tên *" error={errors.fullName}>
          <TextInput
            block
            name="fullName"
            aria-label="Họ và tên *"
            defaultValue={values.fullName}
            placeholder="VD: Nguyễn Văn Hùng"
            autoComplete="off"
            validationStatus={errors.fullName ? 'error' : undefined}
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
        <Field label="Email" error={errors.email} wide>
          <TextInput
            block
            name="email"
            aria-label="Email"
            type="email"
            defaultValue={values.email}
            placeholder="VD: phuhuynh@example.com"
            autoComplete="off"
            validationStatus={errors.email ? 'error' : undefined}
          />
        </Field>
      </FormSection>

      {mode === 'create' && students.length > 0 && (
        <FormSection title="Liên kết học sinh" description="Không bắt buộc. Có thể gán ngay hoặc bổ sung sau từ danh sách.">
          <Field label="Con học ở trung tâm" error={errors.studentIds} wide hint="Gõ để tìm, chọn được nhiều học sinh.">
            <ComboBox
              name="studentIds"
              label="Con học ở trung tâm"
              multiple
              defaultValues={[]}
              placeholder="Chưa chọn"
              options={students.map((s) => ({ value: String(s.id), label: `${s.fullName} · ${s.className}` }))}
              error={Boolean(errors.studentIds)}
              block
            />
          </Field>
          <Field label="Quan hệ với con" error={errors.relation} wide>
            <SelectBox
              name="relation"
              label="Quan hệ với con"
              defaultValue="mother"
              options={RELATION_OPTIONS}
              error={Boolean(errors.relation)}
              block
            />
          </Field>
        </FormSection>
      )}

      <FormSection title="Ghi chú" grid={false}>
        <Field label="Ghi chú" error={errors.note}>
          <TextAreaAutoHeight
            name="note"
            aria-label="Ghi chú"
            defaultValue={values.note}
            rows={3}
            placeholder="Giờ liên hệ thuận tiện, lưu ý…"
            error={Boolean(errors.note)}
          />
        </Field>
      </FormSection>

      <FormFooter>
        <Btn onClick={onCancel}>Huỷ</Btn>
        <Btn type="submit" variant="primary" loading={pending} disabled={pending}>
          {pending ? 'Đang lưu…' : mode === 'edit' ? 'Lưu thay đổi' : 'Lưu phụ huynh'}
        </Btn>
      </FormFooter>
    </form>
  );
}
