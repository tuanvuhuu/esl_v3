'use client';

// Form đăng nhập chuẩn LoginPage.module.css của dự án 01. TSUKUBA trên nền @primer/react v38 + Octicons.
import { PersonIcon, RocketIcon } from '@primer/octicons-react';
import { Button } from '@primer/react';
import { startTransition, useActionState, useState, useTransition, type FormEvent } from 'react';
import { devQuickLoginAction, loginAction } from '@/app/dang-nhap/actions';
import { PasswordToggleInput, TextInput } from '@/components-ui';
import { BTN_BASE, BTN_GHOST } from '@/components/ui/Btn';
import { Field } from '@/components/ui/Field';
import { Alert } from '@/components/ui/primitives';
import { ROLE_CODES, ROLE_LABELS, type Role } from '@/lib/permissions';
import type { ActionResult } from '@/lib/validation/student';

const INITIAL: ActionResult = { ok: false };

export function LoginForm({
  quickLogin = false,
  demo = false,
  next = '',
}: {
  quickLogin?: boolean;
  demo?: boolean;
  next?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(loginAction, INITIAL);
  const [quickPending, startQuick] = useTransition();
  const [quickError, setQuickError] = useState<string | null>(null);
  const errors = state.fieldErrors ?? {};

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  function quick(role: Role) {
    setQuickError(null);
    startQuick(async () => {
      const r = await devQuickLoginAction(role);
      if (!r.ok) setQuickError(r.message ?? 'Không đăng nhập được');
    });
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--bgColor-muted)] px-4 py-8">
      <section className="tsukuba-rise flex w-[min(460px,100%)] flex-col gap-5 rounded-2xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-6 shadow-[0_8px_30px_rgba(31,35,40,0.06)] max-[767px]:p-5">
        <header className="flex items-center gap-3.5 border-b border-[var(--borderColor-muted)] pb-4">
          <span
            className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--primary)] text-base font-bold tracking-tight text-[var(--on-primary)]"
            aria-hidden
          >
            ESL
          </span>
          <div className="min-w-0">
            <h1 className="m-0 text-lg font-semibold leading-snug text-[var(--fgColor-default)]">ESL Center · Đăng nhập</h1>
            <p className="mt-0.5 text-[13px] text-[var(--fgColor-muted)]">Hệ thống quản lý đào tạo &amp; trung tâm tiếng Anh</p>
          </div>
        </header>

        <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
          {next && <input type="hidden" name="next" value={next} />}
          {state.message && !state.ok && <Alert>{state.message}</Alert>}

          <Field label="Email hoặc mã học sinh" error={errors.email}>
            <TextInput
              block
              name="email"
              type="text"
              autoComplete="username"
              inputMode="email"
              leadingVisual={PersonIcon}
              placeholder="Email, hoặc mã học sinh HS-00001"
              validationStatus={errors.email ? 'error' : undefined}
            />
          </Field>

          <Field label="Mật khẩu" error={errors.password}>
            <PasswordToggleInput
              name="password"
              autoComplete="current-password"
              error={Boolean(errors.password)}
            />
          </Field>

          <Button type="submit" variant="primary" block loading={pending} disabled={pending} className="mt-1">
            {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </Button>
        </form>

        {demo && (
          <a href="/hoc-thu" className={`${BTN_BASE} ${BTN_GHOST} -mt-1.5 w-full`}>
            <RocketIcon size={15} aria-hidden />
            Vào học thử, không cần đăng nhập
          </a>
        )}

        {quickLogin && (
          <section
            aria-label="Đăng nhập nhanh theo quyền (tạm thời, chỉ khi phát triển)"
            className="flex flex-col gap-2.5 rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/65 p-3.5"
          >
            <p className="text-xs font-semibold text-[var(--fgColor-default)]">
              Đăng nhập nhanh theo vai trò <span className="font-normal text-[var(--fgColor-muted)]">(môi trường phát triển)</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_CODES.map((role) => (
                <Button key={role} type="button" variant="default" disabled={quickPending} onClick={() => quick(role)}>
                  {ROLE_LABELS[role]}
                </Button>
              ))}
            </div>
            {quickError && <Alert inline>{quickError}</Alert>}
          </section>
        )}

        <p className="text-center text-xs text-[var(--fgColor-muted)]">
          Quên mật khẩu? Liên hệ quản trị trung tâm để đặt lại.
        </p>
      </section>
    </main>
  );
}
