'use client';

import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { createAccountAction, updateAccountAction, type AccountFormValues } from '@/app/(app)/tai-khoan/actions';
import { ROLE_CODES, ROLE_LABELS } from '@/lib/permissions';
import type { CampusOption } from '@/lib/campus';
import type { ActionResult } from '@/lib/validation/student';
import { Field, FORM_BTN_CANCEL, FORM_BTN_SUBMIT, inputClass, FormFooter } from '@/components/ui/Field';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { Alert } from '@/components/ui/primitives';

export type TeacherOption = { id: number; name: string; linkedAccountId: number | null };

const EMPTY: AccountFormValues = { fullName: '', email: '', role: 'teacher', status: 'active', teacherId: '', campusIds: [] };
const INITIAL: ActionResult = { ok: false };

// Form mời (thêm) và sửa tài khoản. Vai trò Giáo viên phải chọn một giáo viên.
export function AccountForm({
  mode,
  accountId,
  initial,
  teachers,
  campuses,
  onDone,
  onCancel,
}: {
  mode: 'create' | 'edit';
  accountId?: number;
  initial?: AccountFormValues;
  teachers: TeacherOption[];
  campuses: CampusOption[]; // cơ sở trong phạm vi của người đang sửa
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
        <Alert className="col-span-full">{state.message}</Alert>
      )}

      <Field label="Họ và tên *" error={errors.fullName}>
        <input name="fullName" defaultValue={values.fullName} autoComplete="off" className={inputClass(errors.fullName)} />
      </Field>
      <Field label="Email *" error={errors.email}>
        <input name="email" type="email" defaultValue={values.email} autoComplete="off" className={inputClass(errors.email)} />
      </Field>
      <Field label="Vai trò *" error={errors.role}>
        <SelectPanel
          name="role"
          label="Vai trò *"
          value={role}
          onChange={(v) => setRole(v as typeof role)}
          options={ROLE_CODES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
          error={!!errors.role}
          block
        />
      </Field>
      <Field label="Trạng thái" error={errors.status}>
        <SelectPanel
          name="status"
          label="Trạng thái"
          defaultValue={values.status}
          options={[
            { value: 'active', label: 'Hoạt động' },
            { value: 'locked', label: 'Tạm khoá' },
          ]}
          error={!!errors.status}
          block
        />
      </Field>

      {role === 'teacher' && (
        <Field label="Giáo viên tương ứng *" error={errors.teacherId} wide>
          <SelectPanel
            name="teacherId"
            label="Giáo viên tương ứng *"
            defaultValue={String(values.teacherId)}
            options={[{ value: '', label: 'Chọn giáo viên' }, ...available.map((t) => ({ value: String(t.id), label: t.name }))]}
            error={!!errors.teacherId}
            block
          />
        </Field>
      )}
      {role !== 'teacher' && <input type="hidden" name="teacherId" value="" />}

      {/* Cơ sở được làm việc (P32). Quản trị luôn làm việc ở mọi cơ sở nên không cần chọn. */}
      {role !== 'admin' ? (
        <Field label="Cơ sở làm việc *" error={errors.campusIds} wide hint="Chỉ thấy và sửa dữ liệu của các cơ sở được chọn">
          <SelectPanel
            name="campusIds"
            label="Cơ sở làm việc *"
            multiple
            defaultValues={values.campusIds.length > 0 ? values.campusIds : campuses.length === 1 ? [String(campuses[0].id)] : []}
            options={campuses.map((c) => ({ value: String(c.id), label: c.name }))}
            error={!!errors.campusIds}
            block
          />
        </Field>
      ) : (
        <p className="col-span-full text-sm text-muted">Quản trị làm việc ở mọi cơ sở.</p>
      )}

      <FormFooter className="col-span-full">
        <button type="button" onClick={onCancel} className={FORM_BTN_CANCEL}>Huỷ</button>
        <button type="submit" disabled={pending} className={FORM_BTN_SUBMIT}>
          {pending ? 'Đang lưu…' : mode === 'edit' ? 'Lưu thay đổi' : 'Gửi lời mời'}
        </button>
      </FormFooter>
    </form>
  );
}
