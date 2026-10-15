'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import { assignStudentsAction } from '@/app/(app)/phu-huynh/actions';
import { Field, FORM_BTN_CANCEL, FORM_BTN_SUBMIT, FormFooter } from '@/components/ui/Field';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { PARENT_RELATION_LABELS } from '@/lib/parent-labels';
import type { StudentChoice } from '@/lib/queries/parents';
import type { ActionResult } from '@/lib/validation/student';
import { Alert } from '@/components/ui/primitives';

const INITIAL: ActionResult = { ok: false };

const RELATION_OPTIONS = (['father', 'mother', 'guardian', 'other'] as const).map((r) => ({ value: r, label: PARENT_RELATION_LABELS[r] }));

// Hộp thoại gán học sinh cho một phụ huynh: chọn nhiều học sinh, quan hệ, và có đặt làm liên hệ chính hay không.
export function ParentAssignForm({
  parentId,
  students,
  onDone,
  onCancel,
}: {
  parentId: number;
  students: StudentChoice[];
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result = await assignStudentsAction(parentId, prev, formData);
    if (result.ok) onDone(result.message ?? 'Đã gán học sinh');
    return result;
  }, INITIAL);
  const errors = state.fieldErrors ?? {};

  // Gọi action thủ công để lựa chọn không bị reset khi có lỗi (E-028)
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3.5">
      {state.message && !state.ok && (
        <Alert>
          {state.message}
        </Alert>
      )}

      <Field label="Học sinh *" error={errors.studentIds} hint="Gõ để tìm. Chọn được nhiều học sinh cùng lúc.">
        <SelectPanel
          name="studentIds"
          label="Học sinh *"
          multiple
          defaultValues={[]}
          options={students.map((s) => ({ value: String(s.id), label: `${s.fullName} · ${s.className} · ${s.campusName}` }))}
          error={!!errors.studentIds}
          block
        />
      </Field>

      <Field label="Quan hệ với học sinh *" error={errors.relation}>
        <SelectPanel
          name="relation"
          label="Quan hệ với học sinh *"
          defaultValue="father"
          options={RELATION_OPTIONS}
          error={!!errors.relation}
          block
        />
      </Field>

      <label className="flex min-w-0 items-center gap-2.5 text-sm font-normal text-ink-2">
        <input name="isPrimary" type="checkbox" className="size-4 accent-[var(--primary-deep)]" />
        Đặt làm liên hệ chính của các học sinh này
      </label>

      <FormFooter>
        <button type="button" onClick={onCancel} className={FORM_BTN_CANCEL}>
          Huỷ
        </button>
        <button type="submit" disabled={pending} className={FORM_BTN_SUBMIT}>
          {pending ? 'Đang gán…' : 'Gán học sinh'}
        </button>
      </FormFooter>
    </form>
  );
}
