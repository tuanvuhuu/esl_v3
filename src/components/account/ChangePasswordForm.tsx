'use client';

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from 'react';
import { changePasswordAction } from '@/app/(app)/doi-mat-khau/actions';
import type { ActionResult } from '@/lib/validation/student';
import { Field, FORM_BTN_SUBMIT, FormFooter, inputClass } from '@/components/ui/Field';
import { Alert } from '@/components/ui/primitives';
import { Panel } from '@/components/ui/surfaces';

const INITIAL: ActionResult = { ok: false };

// Form đổi mật khẩu dùng chung cho khu quản lý và khu học sinh. Thành công thì xoá trắng các ô.
export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(changePasswordAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  // Gọi action thủ công để ô nhập không bị xoá khi có lỗi (E-028)
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <Panel title="Mật khẩu" className="w-full">
      <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        {state.message && !state.ok && <Alert>{state.message}</Alert>}
        {state.ok && state.message && <Alert tone="ok">{state.message}</Alert>}

        <Field label="Mật khẩu hiện tại *" error={errors.currentPassword}>
          <input name="currentPassword" type="password" autoComplete="current-password" className={inputClass(errors.currentPassword)} />
        </Field>
        <Field label="Mật khẩu mới *" error={errors.newPassword} hint="Ít nhất 10 ký tự">
          <input name="newPassword" type="password" autoComplete="new-password" className={inputClass(errors.newPassword)} />
        </Field>
        <Field label="Nhập lại mật khẩu mới *" error={errors.confirmPassword}>
          <input name="confirmPassword" type="password" autoComplete="new-password" className={inputClass(errors.confirmPassword)} />
        </Field>

        <FormFooter>
          <button type="submit" disabled={pending} className={`${FORM_BTN_SUBMIT} max-[767px]:w-full`}>
            {pending ? 'Đang lưu…' : 'Đổi mật khẩu'}
          </button>
        </FormFooter>
      </form>
    </Panel>
  );
}
