'use client';

import { Button } from '@primer/react';
import { startTransition, useActionState, useEffect, useRef, type FormEvent } from 'react';
import { changePasswordAction } from '@/app/(app)/doi-mat-khau/actions';
import { PasswordToggleInput } from '@/components-ui';
import { Field, FormFooter } from '@/components/ui/Field';
import { Alert } from '@/components/ui/primitives';
import { Panel } from '@/components/ui/surfaces';
import type { ActionResult } from '@/lib/validation/student';

const INITIAL: ActionResult = { ok: false };

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(changePasswordAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

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
          <PasswordToggleInput
            name="currentPassword"
            autoComplete="current-password"
            error={Boolean(errors.currentPassword)}
          />
        </Field>
        <Field label="Mật khẩu mới *" error={errors.newPassword} hint="Ít nhất 10 ký tự">
          <PasswordToggleInput
            name="newPassword"
            autoComplete="new-password"
            error={Boolean(errors.newPassword)}
          />
        </Field>
        <Field label="Nhập lại mật khẩu mới *" error={errors.confirmPassword}>
          <PasswordToggleInput
            name="confirmPassword"
            autoComplete="new-password"
            error={Boolean(errors.confirmPassword)}
          />
        </Field>

        <FormFooter>
          <Button type="submit" variant="primary" loading={pending} disabled={pending} className="max-[767px]:!w-full">
            {pending ? 'Đang lưu…' : 'Đổi mật khẩu'}
          </Button>
        </FormFooter>
      </form>
    </Panel>
  );
}
