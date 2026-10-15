'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import { createCampusAction, updateCampusAction } from '@/app/(app)/co-so/actions';
import { Field, FORM_BTN_CANCEL, FORM_BTN_SUBMIT, inputClass, FormFooter } from '@/components/ui/Field';
import type { ActionResult } from '@/lib/validation/student';
import { Alert } from '@/components/ui/primitives';

const INITIAL: ActionResult = { ok: false };

// Form thêm và sửa cơ sở. Sửa thì truyền campusId và giá trị hiện có.
export function CampusForm({
  campusId,
  initial,
  onDone,
  onCancel,
}: {
  campusId?: number;
  initial?: { name: string; address: string };
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const values = initial ?? { name: '', address: '' };
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result = campusId ? await updateCampusAction(campusId, prev, formData) : await createCampusAction(prev, formData);
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

  const isCreate = !campusId;

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3.5">
      {state.message && !state.ok && (
        <Alert>{state.message}</Alert>
      )}

      <Field label="Tên cơ sở *" error={errors.name} hint="VD: Cơ sở Quận 3">
        <input name="name" defaultValue={values.name} autoComplete="off" className={inputClass(errors.name)} />
      </Field>
      <Field label="Địa chỉ" error={errors.address}>
        <input name="address" defaultValue={values.address} autoComplete="off" className={inputClass(errors.address)} />
      </Field>

      <FormFooter>
        <button type="button" onClick={onCancel} className={FORM_BTN_CANCEL}>Huỷ</button>
        <button type="submit" disabled={pending} className={FORM_BTN_SUBMIT}>
          {pending ? 'Đang lưu…' : isCreate ? 'Thêm cơ sở' : 'Lưu thay đổi'}
        </button>
      </FormFooter>
    </form>
  );
}
