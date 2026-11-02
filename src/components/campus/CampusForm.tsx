'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import { createCampusAction, updateCampusAction } from '@/app/(app)/co-so/actions';
import { TextInput } from '@/components-ui';
import { Btn } from '@/components/ui/Btn';
import { Field, FormFooter } from '@/components/ui/Field';
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
        <TextInput block name="name" defaultValue={values.name} autoComplete="off" validationStatus={errors.name ? 'error' : undefined} />
      </Field>
      <Field label="Địa chỉ" error={errors.address}>
        <TextInput block name="address" defaultValue={values.address} autoComplete="off" validationStatus={errors.address ? 'error' : undefined} />
      </Field>

      <FormFooter>
        <Btn onClick={onCancel}>Huỷ</Btn>
        <Btn type="submit" variant="primary" loading={pending} disabled={pending}>
          {pending ? 'Đang lưu…' : isCreate ? 'Thêm cơ sở' : 'Lưu thay đổi'}
        </Btn>
      </FormFooter>
    </form>
  );
}
