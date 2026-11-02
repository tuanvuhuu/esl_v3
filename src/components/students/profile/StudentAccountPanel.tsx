'use client';

import { KeyIcon, PersonAddIcon } from '@primer/octicons-react';
import { useState, useTransition } from 'react';
import { createStudentAccountAction, resetStudentPasswordAction, type IssuedPassword } from '@/app/(app)/hoc-sinh/account-actions';
import { Btn } from '@/components/ui/Btn';
import { Modal } from '@/components/ui/Modal';
import { Toast, useToast } from '@/components/ui/Toast';
import { Alert, Pill } from '@/components/ui/primitives';
import { Panel } from '@/components/ui/surfaces';
import { FormFooter } from '@/components/ui/Field';

// Tài khoản học sinh trong hồ sơ: tạo tài khoản, hoặc đặt lại mật khẩu. Mật khẩu tạm chỉ hiện một lần.
export function StudentAccountPanel({
  studentId,
  code,
  hasAccount,
  canManage,
}: {
  studentId: number;
  code: string;
  hasAccount: boolean;
  canManage: boolean;
}) {
  const { message, notify } = useToast();
  const [issued, setIssued] = useState<Extract<IssuedPassword, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(kind: 'create' | 'reset') {
    startTransition(async () => {
      const r = kind === 'create' ? await createStudentAccountAction(studentId) : await resetStudentPasswordAction(studentId);
      if (!r.ok) return setError(r.message);
      setError(null);
      setIssued(r);
    });
  }

  return (
    <Panel
      title="Tài khoản học sinh"
      action={<Pill tone={hasAccount ? 'mint' : 'stone'}>{hasAccount ? 'Đã kích hoạt' : 'Chưa tạo'}</Pill>}
      className="tsukuba-rise"
    >
      <div className="flex flex-col gap-3 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
        <div className="min-w-0">
          {hasAccount ? (
            <p className="text-sm text-[var(--fgColor-muted)]">
              Học sinh đăng nhập bằng mã{' '}
              <code className="rounded bg-[var(--bgColor-neutral-muted)] px-2 py-0.5 font-mono text-xs text-[var(--fgColor-default)]">
                {code}
              </code>{' '}
              và mật khẩu để làm bài trực tuyến tại khu học sinh.
            </p>
          ) : (
            <p className="text-sm text-[var(--fgColor-muted)]">
              Học sinh chưa có tài khoản. Tạo tài khoản để đăng nhập bằng mã{' '}
              <code className="rounded bg-[var(--bgColor-neutral-muted)] px-2 py-0.5 font-mono text-xs text-[var(--fgColor-default)]">
                {code}
              </code>{' '}
              và làm bài trực tuyến.
            </p>
          )}
          {error && (
            <Alert inline className="mt-2">
              {error}
            </Alert>
          )}
        </div>

        <div className="shrink-0">
          {hasAccount ? (
            <Btn variant="ghost" leadingVisual={KeyIcon} loading={pending} onClick={() => run('reset')} disabled={!canManage || pending}>
              {pending ? 'Đang đặt lại…' : 'Đặt lại mật khẩu'}
            </Btn>
          ) : (
            <Btn variant="primary" leadingVisual={PersonAddIcon} loading={pending} onClick={() => run('create')} disabled={!canManage || pending}>
              {pending ? 'Đang tạo…' : 'Tạo tài khoản học sinh'}
            </Btn>
          )}
        </div>
      </div>

      <Modal
        open={issued !== null}
        size="md"
        title="Mật khẩu tạm thời"
        subtitle="Chỉ hiển thị một lần. Ghi lại và gửi cho học sinh trước khi đóng hộp thoại."
        onClose={() => {
          if (issued) notify(issued.message);
          setIssued(null);
        }}
        labelledBy="student-password-title"
      >
        {issued && (
          <div className="flex flex-col gap-4">
            <div className="rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] p-4">
              <dl className="flex flex-col gap-2.5 text-sm">
                <div className="flex items-center justify-between gap-4 border-b border-dashed border-[var(--borderColor-muted)] pb-2.5">
                  <dt className="text-[var(--fgColor-muted)]">Mã đăng nhập</dt>
                  <dd>
                    <code className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-2.5 py-1 font-mono text-sm font-semibold text-[var(--fgColor-default)]">
                      {issued.code}
                    </code>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--fgColor-muted)]">Mật khẩu tạm</dt>
                  <dd>
                    <code
                      aria-label="Mật khẩu tạm thời"
                      className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-accent-emphasis)] bg-[var(--primary-soft)] px-2.5 py-1 font-mono text-sm font-semibold text-[var(--primary-deep)]"
                    >
                      {issued.password}
                    </code>
                  </dd>
                </div>
              </dl>
            </div>
            <FormFooter>
              <Btn
                variant="primary"
                onClick={() => {
                  notify(issued.message);
                  setIssued(null);
                }}
              >
                Đã ghi lại
              </Btn>
            </FormFooter>
          </div>
        )}
      </Modal>

      <Toast message={message} />
    </Panel>
  );
}
