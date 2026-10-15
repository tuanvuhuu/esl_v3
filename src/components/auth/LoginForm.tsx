'use client';

import { startTransition, useActionState, useState, useTransition, type FormEvent } from 'react';
import { devQuickLoginAction, loginAction } from '@/app/dang-nhap/actions';
import { ROLE_CODES, ROLE_LABELS, type Role } from '@/lib/permissions';
import type { ActionResult } from '@/lib/validation/student';
import { BTN_BASE, BTN_GHOST } from '@/components/ui/Btn';
import { Field, FORM_BTN_SUBMIT, inputClass } from '@/components/ui/Field';
import { Alert } from '@/components/ui/primitives';

const INITIAL: ActionResult = { ok: false };

// Form đăng nhập. Mật khẩu không được điền sẵn; lỗi hiện ngay trong ô.
// quickLogin: bật nút đăng nhập nhanh theo vai trò (tạm thời, chỉ khi phát triển).
export function LoginForm({ quickLogin = false }: { quickLogin?: boolean }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(loginAction, INITIAL);
  const [quickPending, startQuick] = useTransition();
  const [quickError, setQuickError] = useState<string | null>(null);
  const errors = state.fieldErrors ?? {};

  // Gọi action thủ công để ô nhập không bị reset khi có lỗi (E-028)
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  // Thành công thì action chuyển hướng về Tổng quan; chỉ lỗi mới trả về
  function quick(role: Role) {
    setQuickError(null);
    startQuick(async () => {
      const r = await devQuickLoginAction(role);
      if (!r.ok) setQuickError(r.message ?? 'Không đăng nhập được');
    });
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <section className="flex w-[min(400px,100%)] flex-col gap-6 rounded-[var(--radius-panel)] bg-surface p-6 shadow-lift max-[767px]:p-5">
        <header className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-[18px] bg-primary text-2xl font-extrabold text-on-primary" aria-hidden>E</span>
          <div>
            <h1 className="text-2xl font-extrabold text-ink">ESL Center</h1>
            <p className="mt-1 text-base text-muted">Đăng nhập để tiếp tục</p>
          </div>
        </header>

        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {state.message && !state.ok && (
            <Alert>{state.message}</Alert>
          )}
          <Field label="Email" error={errors.email}>
            <input name="email" type="text" autoComplete="username" inputMode="email" placeholder="Email, hoặc mã học sinh HS-0001" className={inputClass(errors.email)} />
          </Field>
          <Field label="Mật khẩu" error={errors.password}>
            <input name="password" type="password" autoComplete="current-password" className={inputClass(errors.password)} />
          </Field>
          <button type="submit" disabled={pending} className={`${FORM_BTN_SUBMIT} mt-1 w-full`}>
            {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        {quickLogin && (
          <section aria-label="Đăng nhập nhanh theo quyền (tạm thời, chỉ khi phát triển)" className="flex flex-col gap-2.5 border-t border-line pt-4">
            <p className="text-sm font-normal text-muted">Đăng nhập nhanh theo quyền (tạm thời, chỉ khi phát triển)</p>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_CODES.map((role) => (
                <button
                  key={role}
                  type="button"
                  disabled={quickPending}
                  onClick={() => quick(role)}
                  className={`${BTN_BASE} ${BTN_GHOST}`}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
            {quickError && <Alert inline>{quickError}</Alert>}
          </section>
        )}

        <p className="text-center text-sm text-muted">Quên mật khẩu? Liên hệ quản trị trung tâm để đặt lại.</p>
      </section>
    </main>
  );
}
