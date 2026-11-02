'use client';

import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { createAssignmentAction, updateAssignmentAction, type AssignmentFormValues } from '@/app/(app)/bai-tap/actions';
import type { ActionResult } from '@/lib/validation/student';
import {
  ComboBox,
  DateInput,
  SelectBox,
  TextAreaAutoHeight,
  TextInput,
  TextInputNumber,
  TimeInput24h,
} from '@/components-ui';
import { Btn } from '@/components/ui/Btn';
import { Field, FormFooter } from '@/components/ui/Field';
import { Alert } from '@/components/ui/primitives';
import { ASSIGNMENT_MODE_LABELS, ASSIGNMENT_MODES } from '@/lib/validation/assignment';

const INITIAL: ActionResult = { ok: false };

// Form thêm và sửa bài tập. Lớp chọn khi tạo, khi sửa thì giữ nguyên lớp. Bài giảng chỉ hiện những bài dùng ở cơ sở của lớp.
export function AssignmentForm({
  mode,
  assignmentId,
  initial,
  classes,
  lessons,
  defaultClassId,
  defaultDueDate,
  onDone,
  onCancel,
}: {
  mode: 'create' | 'edit';
  assignmentId?: number;
  initial?: AssignmentFormValues;
  classes: { id: number; name: string; campusId: number }[];
  lessons: { id: number; title: string; campusIds: number[] }[];
  defaultClassId: number; // lớp đang xem, để tạo bài ngay trong lớp đó
  defaultDueDate: string;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const values: AssignmentFormValues = initial ?? {
    classId: String(defaultClassId),
    title: '',
    description: '',
    dueDate: defaultDueDate,
    dueTime: '23:59',
    maxScore: 10,
    lessonId: '',
    mode: 'test',
  };
  const [classId, setClassId] = useState(String(values.classId));
  const [title, setTitle] = useState(values.title);
  const [lessonId, setLessonId] = useState(values.lessonId);
  const [workMode, setWorkMode] = useState<string>(values.mode ?? 'test');
  const campusOfClass = classes.find((c) => String(c.id) === classId)?.campusId ?? null;
  const lessonChoices = lessons.filter((l) => campusOfClass !== null && l.campusIds.includes(campusOfClass));
  // Bài giảng đã chọn nhưng không còn thuộc cơ sở của lớp thì hiện là chưa chọn
  const lessonValue = lessonChoices.some((l) => String(l.id) === lessonId) ? lessonId : '';
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
        <Alert className="col-span-full">{state.message}</Alert>
      )}

      {mode === 'create' && (
        <Field label="Lớp *" error={errors.classId} wide>
          <ComboBox
            name="classId"
            label="Lớp *"
            value={classId}
            onChange={setClassId}
            options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            error={Boolean(errors.classId)}
            block
          />
        </Field>
      )}
      <Field label="Tiêu đề *" error={errors.title} wide>
        <TextInput
          aria-label="Tiêu đề *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="VD: Writing Task 2 — Unit 3"
          autoComplete="off"
          block
          validationStatus={errors.title ? 'error' : undefined}
        />
        <input type="hidden" name="title" value={title} />
      </Field>
      <Field label="Hạn nộp (ngày) *" error={errors.dueDate}>
        <DateInput name="dueDate" aria-label="Hạn nộp (ngày) *" defaultValue={values.dueDate} error={Boolean(errors.dueDate)} />
      </Field>
      <Field label="Hạn nộp (giờ) *" error={errors.dueTime}>
        <TimeInput24h name="dueTime" ariaLabel="Hạn nộp (giờ) *" defaultValue={values.dueTime} error={Boolean(errors.dueTime)} />
      </Field>
      <Field label="Điểm tối đa *" error={errors.maxScore}>
        <TextInputNumber
          name="maxScore"
          aria-label="Điểm tối đa *"
          defaultValue={values.maxScore}
          min={1}
          max={100}
          thousandSeparator={false}
          error={Boolean(errors.maxScore)}
        />
      </Field>
      <Field label="Chế độ làm bài" wide hint="Luyện tập: con bấm Kiểm tra từng câu, sai thì làm lại ngay. Kiểm tra: làm một lượt rồi nộp.">
        <SelectBox
          name="mode"
          label="Chế độ làm bài"
          value={workMode}
          onChange={setWorkMode}
          options={ASSIGNMENT_MODES.map((m) => ({ value: m, label: ASSIGNMENT_MODE_LABELS[m] }))}
          block
        />
      </Field>
      <Field label="Bài giảng (không bắt buộc)" error={errors.lessonId} wide hint={lessonChoices.length === 0 ? 'Cơ sở của lớp chưa có bài giảng nào' : undefined}>
        <ComboBox
          name="lessonId"
          label="Bài giảng"
          value={lessonValue}
          onChange={setLessonId}
          options={[{ value: '', label: 'Không gắn bài giảng' }, ...lessonChoices.map((l) => ({ value: String(l.id), label: l.title }))]}
          error={Boolean(errors.lessonId)}
          block
        />
      </Field>
      <Field label="Mô tả" error={errors.description} wide>
        <TextAreaAutoHeight
          name="description"
          aria-label="Mô tả"
          defaultValue={values.description}
          rows={3}
          placeholder="Yêu cầu, tài liệu, lưu ý…"
          error={Boolean(errors.description)}
        />
      </Field>
      <FormFooter className="col-span-full">
        <Btn onClick={onCancel}>Huỷ</Btn>
        <Btn type="submit" variant="primary" disabled={pending}>
          {pending ? 'Đang lưu…' : mode === 'edit' ? 'Lưu thay đổi' : 'Tạo bài tập'}
        </Btn>
      </FormFooter>
    </form>
  );
}
