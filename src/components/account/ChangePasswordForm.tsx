'use client';

import { KeyIcon, ShieldLockIcon } from '@primer/octicons-react';
import { startTransition, useActionState, useEffect, useRef, type FormEvent } from 'react';
import { changePasswordAction } from '@/app/(app)/doi-mat-khau/actions';
import { PasswordToggleInput } from '@/components-ui';
import { Btn } from '@/components/ui/Btn';
import { Field, FormFooter, FormSection } from '@/components/ui/Field';
import { Alert, Pill } from '@/components/ui/primitives';
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
    <Panel
      title="Đổi mật khẩu đăng nhập"
      action={<Pill tone="stone">Bảo mật phiên</Pill>}
      className="tsukuba-rise w-full"
    >
      <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        {state.message && !state.ok && <Alert>{state.message}</Alert>}
        {state.ok && state.message && <Alert tone="ok">{state.message}</Alert>}

        <div className="flex items-start gap-2.5 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)]/60 px-3 py-2.5 text-xs text-[var(--fgColor-muted)]">
          <ShieldLockIcon size={15} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden />
          <span>
            Mật khẩu mới cần tối thiểu <b>10 ký tự</b>. Sau khi cập nhật, toàn bộ phiên đăng nhập trên các thiết bị khác sẽ tự động hết hiệu lực.
          </span>
        </div>

        <FormSection title="Thông tin xác thực" grid={false}>
          <div className="flex flex-col gap-3.5">
            <Field label="Mật khẩu hiện tại *" error={errors.currentPassword}>
              <PasswordToggleInput
                name="currentPassword"
                aria-label="Mật khẩu hiện tại *"
                autoComplete="current-password"
                error={Boolean(errors.currentPassword)}
              />
            </Field>
            <Field label="Mật khẩu mới *" error={errors.newPassword} hint="Ít nhất 10 ký tự">
              <PasswordToggleInput
                name="newPassword"
                aria-label="Mật khẩu mới *"
                autoComplete="new-password"
                error={Boolean(errors.newPassword)}
              />
            </Field>
            <Field label="Nhập lại mật khẩu mới *" error={errors.confirmPassword}>
              <PasswordToggleInput
                name="confirmPassword"
                aria-label="Nhập lại mật khẩu mới *"
                autoComplete="new-password"
                error={Boolean(errors.confirmPassword)}
              />
            </Field>
          </div>
        </FormSection>

        <FormFooter>
          <Btn
            type="submit"
            variant="primary"
            leadingVisual={pending ? undefined : KeyIcon}
            loading={pending}
            disabled={pending}
            className="max-[767px]:w-full"
          >
            {pending ? 'Đang lưu…' : 'Đổi mật khẩu'}
          </Btn>
        </FormFooter>
      </form>
    </Panel>
  );
}
