'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import { createParentAction, updateParentAction, type ParentFormValues } from '@/app/(app)/phu-huynh/actions';
import type { ActionResult } from '@/lib/validation/student';
import { Field, FORM_BTN_CANCEL, FORM_BTN_SUBMIT, inputClass, textareaClass, FormFooter } from '@/components/ui/Field';
import { Alert } from '@/components/ui/primitives';
import { SelectPanel } from '@/components/ui/SelectPanel';
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
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
      {state.message && !state.ok && (
        <Alert className="col-span-full">{state.message}</Alert>
      )}
      <Field label="Họ và tên *" error={errors.fullName}>
        <input name="fullName" defaultValue={values.fullName} placeholder="VD: Nguyễn Văn Hùng" autoComplete="off" className={inputClass(errors.fullName)} />
      </Field>
      <Field label="Số điện thoại *" error={errors.phone}>
        <input name="phone" type="tel" inputMode="tel" defaultValue={values.phone} placeholder="09xx xxx xxx" autoComplete="off" className={inputClass(errors.phone)} />
      </Field>
      <Field label="Email" error={errors.email}>
        <input name="email" type="email" defaultValue={values.email} autoComplete="off" className={inputClass(errors.email)} />
      </Field>
      {mode === 'create' && students.length > 0 && (
        <>
          <Field label="Con học ở trung tâm" error={errors.studentIds} hint="Không bắt buộc. Gõ để tìm, chọn được nhiều con.">
            <SelectPanel
              name="studentIds"
              label="Con học ở trung tâm"
              multiple
              defaultValues={[]}
              placeholder="Chưa chọn"
              options={students.map((s) => ({ value: String(s.id), label: `${s.fullName} · ${s.className}` }))}
              block
            />
          </Field>
          <Field label="Quan hệ với con" error={errors.relation}>
            <SelectPanel name="relation" label="Quan hệ với con" defaultValue="mother" options={RELATION_OPTIONS} block />
          </Field>
        </>
      )}
      <Field label="Ghi chú" error={errors.note} wide>
        <textarea name="note" defaultValue={values.note} rows={3} placeholder="Giờ liên hệ thuận tiện, lưu ý…" className={textareaClass(errors.note)} />
      </Field>
      <FormFooter className="col-span-full">
        <button type="button" onClick={onCancel} className={FORM_BTN_CANCEL}>Huỷ</button>
        <button type="submit" disabled={pending} className={FORM_BTN_SUBMIT}>
          {pending ? 'Đang lưu…' : mode === 'edit' ? 'Lưu thay đổi' : 'Lưu phụ huynh'}
        </button>
      </FormFooter>
    </form>
  );
}
