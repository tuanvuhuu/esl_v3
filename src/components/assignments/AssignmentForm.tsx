'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import { createAssignmentAction, updateAssignmentAction, type AssignmentFormValues } from '@/app/(app)/bai-tap/actions';
import type { ActionResult } from '@/lib/validation/student';
import { Field, FORM_BTN_CANCEL, FORM_BTN_SUBMIT, inputClass } from '@/components/ui/Field';

const INITIAL: ActionResult = { ok: false };

// Form thêm và sửa bài tập. Lớp chọn khi tạo, khi sửa thì giữ nguyên lớp.
export function AssignmentForm({
  mode,
  assignmentId,
  initial,
  classes,
  defaultClassId,
  defaultDueDate,
  onDone,
  onCancel,
}: {
  mode: 'create' | 'edit';
  assignmentId?: number;
  initial?: AssignmentFormValues;
  classes: { id: number; name: string }[];
  defaultClassId: number; // lớp đang xem, để tạo bài ngay trong lớp đó
  defaultDueDate: string;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const values: AssignmentFormValues = initial ?? { classId: String(defaultClassId), title: '', description: '', dueDate: defaultDueDate, dueTime: '23:59', maxScore: 10 };
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result =
      mode === 'edit' && assignmentId ? await updateAssignmentAction(assignmentId, prev, formData) : await createAssignmentAction(prev, formData);
    if (result.ok) onDone(result.message ?? 'Đã lưu');
    return result;
  }, INITIAL);
  const errors = state.fieldErrors ?? {};

  // Gọi action thủ công để ô nhập không bị reset khi có lỗi (E-028)
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

      {mode === 'create' && (
        <Field label="Lớp *" error={errors.classId} wide>
          <select name="classId" defaultValue={values.classId} className={inputClass(errors.classId)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Tiêu đề *" error={errors.title} wide>
        <input name="title" defaultValue={values.title} placeholder="VD: Writing Task 2 — Unit 3" autoComplete="off" className={inputClass(errors.title)} />
      </Field>
      <Field label="Hạn nộp (ngày) *" error={errors.dueDate}>
        <input name="dueDate" type="date" defaultValue={values.dueDate} className={inputClass(errors.dueDate)} />
      </Field>
      <Field label="Hạn nộp (giờ) *" error={errors.dueTime}>
        <input name="dueTime" type="time" defaultValue={values.dueTime} className={inputClass(errors.dueTime)} />
      </Field>
      <Field label="Điểm tối đa *" error={errors.maxScore}>
        <input name="maxScore" type="number" inputMode="numeric" min={1} max={100} step={1} defaultValue={values.maxScore} className={inputClass(errors.maxScore)} />
      </Field>
      <Field label="Mô tả" error={errors.description} wide>
        <textarea name="description" defaultValue={values.description} rows={3} placeholder="Yêu cầu, tài liệu, lưu ý…" className={`${inputClass(errors.description)} h-auto py-2.5`} />
      </Field>
      <div className="col-span-full mt-1 flex justify-end gap-2.5 max-[767px]:[&>button]:flex-1">
        <button type="button" onClick={onCancel} className={FORM_BTN_CANCEL}>Huỷ</button>
        <button type="submit" disabled={pending} className={FORM_BTN_SUBMIT}>
          {pending ? 'Đang lưu…' : mode === 'edit' ? 'Lưu thay đổi' : 'Tạo bài tập'}
        </button>
      </div>
    </form>
  );
}
