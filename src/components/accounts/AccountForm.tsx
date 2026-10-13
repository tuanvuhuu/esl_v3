'use client';

import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { createAccountAction, updateAccountAction, type AccountFormValues } from '@/app/(app)/tai-khoan/actions';
import { ROLE_CODES, ROLE_LABELS } from '@/lib/permissions';
import type { ActionResult } from '@/lib/validation/student';

export type TeacherOption = { id: number; name: string; linkedAccountId: number | null };

const EMPTY: AccountFormValues = { fullName: '', email: '', role: 'teacher', status: 'active', teacherId: '' };
const INITIAL: ActionResult = { ok: false };

// Form mời (thêm) và sửa tài khoản. Vai trò Giáo viên phải chọn một giáo viên.
export function AccountForm({
  mode,
  accountId,
  initial,
  teachers,
  onDone,
  onCancel,
}: {
  mode: 'create' | 'edit';
  accountId?: number;
  initial?: AccountFormValues;
  teachers: TeacherOption[];
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const values = initial ?? EMPTY;
  const [role, setRole] = useState(values.role);

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result =
      mode === 'edit' && accountId ? await updateAccountAction(accountId, prev, formData) : await createAccountAction(prev, formData);
    if (result.ok) onDone(result.message ?? 'Đã lưu');
    return result;
  }, INITIAL);

  const errors = state.fieldErrors ?? {};
  // Giáo viên đã gắn với tài khoản khác: vẫn hiện, nhưng ghi chú để biết
  const available = teachers.filter((t) => t.linkedAccountId === null || (accountId && t.linkedAccountId === accountId));

  // Gọi action thủ công để ô nhập không bị reset khi có lỗi
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
        <input name="fullName" defaultValue={values.fullName} autoComplete="off" className={inputClass(errors.fullName)} />
      </Field>
      <Field label="Email *" error={errors.email}>
        <input name="email" type="email" defaultValue={values.email} autoComplete="off" className={inputClass(errors.email)} />
      </Field>
      <Field label="Vai trò *" error={errors.role}>
        <select name="role" value={role} onChange={(e) => setRole(e.target.value as typeof role)} className={inputClass(errors.role)}>
          {ROLE_CODES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </Field>
      <Field label="Trạng thái" error={errors.status}>
        <select name="status" defaultValue={values.status} className={inputClass(errors.status)}>
          <option value="active">Hoạt động</option>
          <option value="locked">Tạm khoá</option>
        </select>
      </Field>

      {role === 'teacher' && (
        <Field label="Giáo viên tương ứng *" error={errors.teacherId} wide>
          <select name="teacherId" defaultValue={values.teacherId} className={inputClass(errors.teacherId)}>
            <option value="">Chọn giáo viên</option>
            {available.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>
      )}
      {role !== 'teacher' && <input type="hidden" name="teacherId" value="" />}

      <div className="col-span-full mt-1 flex justify-end gap-2.5 max-[767px]:[&>button]:flex-1">
        <button type="button" onClick={onCancel} className="h-11 rounded-xl border border-line bg-surface px-5 text-base font-bold text-ink">Huỷ</button>
        <button type="submit" disabled={pending} className="h-11 rounded-xl bg-primary px-5 text-base font-bold text-on-primary disabled:opacity-60">
          {pending ? 'Đang lưu…' : mode === 'edit' ? 'Lưu thay đổi' : 'Gửi lời mời'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, wide, children }: { label: string; error?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 text-sm font-bold text-ink-2 ${wide ? 'min-[768px]:col-span-full' : ''}`}>
      {label}
      {children}
      {error && <span className="text-sm font-semibold text-blush-ink">{error}</span>}
    </label>
  );
}

function inputClass(error?: string) {
  return `h-11 w-full min-w-0 rounded-[14px] border bg-bg px-3.5 text-input font-medium text-ink outline-none focus:border-primary-deep focus:bg-surface ${error ? 'border-blush-ink' : 'border-transparent'}`;
}
