'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import { createParentAction, updateParentAction, type ParentFormValues } from '@/app/(app)/phu-huynh/actions';
import type { ActionResult } from '@/lib/validation/student';
import { Field, FORM_BTN_CANCEL, FORM_BTN_SUBMIT, inputClass } from '@/components/ui/Field';

const EMPTY: ParentFormValues = { fullName: '', phone: '', email: '', note: '' };
const INITIAL: ActionResult = { ok: false };

// Form thêm và sửa phụ huynh. Dùng trong hộp thoại Modal.
export function ParentForm({
  mode,
  parentId,
  initial,
  onDone,
  onCancel,
}: {
  mode: 'create' | 'edit';
  parentId?: number;
  initial?: ParentFormValues;
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
        <div role="alert" className="col-span-full rounded-xl bg-blush px-3.5 py-2.5 text-base font-semibold text-blush-ink">{state.message}</div>
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
      <Field label="Ghi chú" error={errors.note} wide>
        <textarea name="note" defaultValue={values.note} rows={3} placeholder="Giờ liên hệ thuận tiện, lưu ý…" className={`${inputClass(errors.note)} h-auto py-2.5`} />
      </Field>
      <div className="col-span-full mt-1 flex justify-end gap-2.5 max-[767px]:[&>button]:flex-1">
        <button type="button" onClick={onCancel} className={FORM_BTN_CANCEL}>Huỷ</button>
        <button type="submit" disabled={pending} className={FORM_BTN_SUBMIT}>
          {pending ? 'Đang lưu…' : mode === 'edit' ? 'Lưu thay đổi' : 'Lưu phụ huynh'}
        </button>
      </div>
    </form>
  );
}
