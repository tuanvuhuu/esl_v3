'use client';

import { useState, useTransition } from 'react';
import { createStudentAccountAction, resetStudentPasswordAction, type IssuedPassword } from '@/app/(app)/hoc-sinh/account-actions';
import { Btn } from '@/components/ui/Btn';
import { Modal } from '@/components/ui/Modal';
import { Toast, useToast } from '@/components/ui/Toast';
import { Alert } from '@/components/ui/primitives';
import { Panel } from '@/components/ui/surfaces';
import { FormFooter } from '@/components/ui/Field';

// Tài khoản học sinh trong hồ sơ: tạo tài khoản, hoặc đặt lại mật khẩu. Mật khẩu tạm chỉ hiện một lần.
export function StudentAccountPanel({ studentId, code, hasAccount, canManage }: { studentId: number; code: string; hasAccount: boolean; canManage: boolean }) {
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
    <Panel title="Tài khoản học sinh" className="flex flex-col gap-3">
      {hasAccount ? (
        <p className="text-base text-ink-2">
          Học sinh đăng nhập bằng mã <b className="font-normal text-ink">{code}</b> và mật khẩu, rồi làm bài ở khu học sinh.
        </p>
      ) : (
        <p className="text-base text-ink-2">
          Học sinh chưa có tài khoản. Tạo tài khoản để học sinh vào khu học sinh bằng mã {code} và làm bài trực tuyến.
        </p>
      )}
      {error && (
        <Alert inline>
          {error}
        </Alert>
      )}
      <div>
        {hasAccount ? (
          <Btn variant="ghost" onClick={() => run('reset')} disabled={!canManage || pending}>
            {pending ? 'Đang đặt lại…' : 'Đặt lại mật khẩu'}
          </Btn>
        ) : (
          <Btn variant="primary" onClick={() => run('create')} disabled={!canManage || pending}>
            {pending ? 'Đang tạo…' : 'Tạo tài khoản học sinh'}
          </Btn>
        )}
      </div>

      <Modal
        open={issued !== null}
        title="Mật khẩu tạm thời"
        subtitle="Chỉ hiện một lần. Đưa cho học sinh rồi đóng. Học sinh nên đổi mật khẩu khi có chức năng đổi."
        onClose={() => {
          if (issued) notify(issued.message);
          setIssued(null);
        }}
        labelledBy="student-password-title"
      >
        {issued && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-base">
              <dt className="text-ink-2">Mã đăng nhập</dt>
              <dd>
                <code className="font-semibold text-ink">{issued.code}</code>
              </dd>
              <dt className="text-ink-2">Mật khẩu tạm</dt>
              <dd>
                <code aria-label="Mật khẩu tạm thời" className="font-semibold text-ink">
                  {issued.password}
                </code>
              </dd>
            </dl>
            <FormFooter>
              <Btn variant="primary" onClick={() => {
                notify(issued.message);
                setIssued(null);
              }}>
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
