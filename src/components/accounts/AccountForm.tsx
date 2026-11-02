'use client';

import { ShieldCheckIcon } from '@primer/octicons-react';
import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { createAccountAction, updateAccountAction, type AccountFormValues } from '@/app/(app)/tai-khoan/actions';
import { ComboBox, SelectBox, TextInput } from '@/components-ui';
import { Btn } from '@/components/ui/Btn';
import { Field, FormFooter, FormSection } from '@/components/ui/Field';
import { Alert } from '@/components/ui/primitives';
import type { CampusOption } from '@/lib/campus';
import { ROLE_CODES, ROLE_LABELS } from '@/lib/permissions';
import type { ActionResult } from '@/lib/validation/student';

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
    <form onSubmit={submit} noValidate className="flex flex-col gap-3.5 pb-1">
      {state.message && !state.ok && <Alert>{state.message}</Alert>}

      <FormSection title="Thông tin thành viên">
        <Field label="Họ và tên *" error={errors.fullName}>
          <TextInput
            block
            name="fullName"
            aria-label="Họ và tên *"
            defaultValue={values.fullName}
            placeholder="VD: Nguyễn Thu Trang"
            autoComplete="off"
            validationStatus={errors.fullName ? 'error' : undefined}
          />
        </Field>
        <Field label="Email *" error={errors.email}>
          <TextInput
            block
            name="email"
            type="email"
            aria-label="Email *"
            defaultValue={values.email}
            placeholder="ten@esl-center.vn"
            autoComplete="off"
            validationStatus={errors.email ? 'error' : undefined}
          />
        </Field>
      </FormSection>

      <FormSection title="Vai trò & phạm vi cơ sở">
        <Field label="Vai trò *" error={errors.role}>
          <SelectBox
            name="role"
            label="Vai trò *"
            value={role}
            onChange={(v) => setRole(v as typeof role)}
            options={ROLE_CODES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
            error={Boolean(errors.role)}
            block
          />
        </Field>
        <Field label="Trạng thái" error={errors.status}>
          <SelectBox
            name="status"
            label="Trạng thái"
            defaultValue={values.status}
            options={[
              { value: 'active', label: 'Hoạt động' },
              { value: 'locked', label: 'Tạm khoá' },
            ]}
            error={Boolean(errors.status)}
            block
          />
        </Field>

        {role === 'teacher' && (
          <Field label="Giáo viên tương ứng *" error={errors.teacherId} wide>
            <ComboBox
              name="teacherId"
              label="Giáo viên tương ứng *"
              defaultValue={String(values.teacherId)}
              options={[{ value: '', label: 'Chọn giáo viên' }, ...available.map((t) => ({ value: String(t.id), label: t.name }))]}
              error={Boolean(errors.teacherId)}
              block
            />
          </Field>
        )}
        {role !== 'teacher' && <input type="hidden" name="teacherId" value="" />}

        {/* Cơ sở được làm việc (P32). Quản trị luôn làm việc ở mọi cơ sở nên không cần chọn. */}
        {role !== 'admin' ? (
          <Field label="Cơ sở làm việc *" error={errors.campusIds} wide hint="Chỉ thấy và sửa dữ liệu của các cơ sở được chọn">
            <ComboBox
              name="campusIds"
              label="Cơ sở làm việc *"
              multiple
              defaultValues={values.campusIds.length > 0 ? values.campusIds : campuses.length === 1 ? [String(campuses[0].id)] : []}
              options={campuses.map((c) => ({ value: String(c.id), label: c.name }))}
              error={Boolean(errors.campusIds)}
              block
            />
          </Field>
        ) : (
          <p className="m-0 flex items-center gap-2 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-3 py-2 text-xs text-[var(--fgColor-muted)] min-[768px]:col-span-full">
            <ShieldCheckIcon size={14} className="shrink-0 text-[var(--primary)]" aria-hidden />
            <span>Quản trị làm việc ở mọi cơ sở.</span>
          </p>
        )}
      </FormSection>

      <FormFooter>
        <Btn onClick={onCancel}>Huỷ</Btn>
        <Btn type="submit" variant="primary" loading={pending} disabled={pending}>
          {pending ? 'Đang lưu…' : mode === 'edit' ? 'Lưu thay đổi' : 'Gửi lời mời'}
        </Btn>
      </FormFooter>
    </form>
  );
}
