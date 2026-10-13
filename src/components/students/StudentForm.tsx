'use client';

import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { createStudentAction, updateStudentAction, type StudentFormValues } from '@/app/(app)/hoc-sinh/actions';
import { formatVND } from '@/lib/money';
import { todayIsoVN, type ActionResult } from '@/lib/validation/student';
import { Field, inputClass } from '@/components/ui/Field';

export type ClassOption = { id: number; name: string; course: string; teacherName: string; fee: number };
export type ParentChoice = { id: number; fullName: string; phone: string };

const STATUS_OPTIONS = [
  { value: 'trial', label: 'Học thử' },
  { value: 'active', label: 'Đang học' },
  { value: 'paused', label: 'Bảo lưu' },
  { value: 'finished', label: 'Đã nghỉ' },
] as const;

const RELATION_OPTIONS = [
  { value: 'father', label: 'Bố' },
  { value: 'mother', label: 'Mẹ' },
  { value: 'guardian', label: 'Người giám hộ' },
  { value: 'other', label: 'Khác' },
] as const;

const EMPTY: StudentFormValues = {
  fullName: '',
  gender: 'female',
  dob: '',
  classId: 0,
  status: 'trial',
  startDate: '',
  note: '',
  parentId: '',
  parentName: '',
  parentPhone: '',
  parentRelation: 'father',
};

const INITIAL: ActionResult = { ok: false };

// Form thêm và sửa học sinh. Dùng trong hộp thoại Modal.
export function StudentForm({
  mode,
  studentId,
  initial,
  classes,
  parents,
  onDone,
  onCancel,
}: {
  mode: 'create' | 'edit';
  studentId?: number;
  initial?: StudentFormValues;
  classes: ClassOption[];
  parents: ParentChoice[];
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const values = initial ?? { ...EMPTY, classId: classes[0]?.id ?? 0, startDate: todayIsoVN() };
  const [classId, setClassId] = useState(values.classId);
  const [parentId, setParentId] = useState(values.parentId);
  const selectedClass = classes.find((c) => c.id === classId);

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result =
      mode === 'edit' && studentId ? await updateStudentAction(studentId, prev, formData) : await createStudentAction(prev, formData);
    if (result.ok) onDone(result.message ?? 'Đã lưu');
    return result;
  }, INITIAL);

  const errors = state.fieldErrors ?? {};
  const usingExistingParent = parentId !== '';

  // Gọi action thủ công: React không tự reset ô nhập sau khi lỗi, người dùng không mất dữ liệu đã gõ (E-028)
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-3 min-[768px]:gap-x-4 min-[768px]:gap-y-3">
      {state.message && !state.ok && (
        <div role="alert" className="col-span-full rounded-xl bg-blush px-3.5 py-2.5 text-base font-semibold text-blush-ink">
          {state.message}
        </div>
      )}

      <Field label="Họ và tên *" error={errors.fullName} wide>
        <input name="fullName" defaultValue={values.fullName} placeholder="VD: Nguyễn Minh Anh" autoComplete="off" className={inputClass(errors.fullName)} />
      </Field>

      <Field label="Ngày sinh *" error={errors.dob}>
        <input name="dob" type="date" defaultValue={values.dob} className={inputClass(errors.dob)} />
      </Field>

      <Field label="Giới tính">
        <select name="gender" defaultValue={values.gender} className={inputClass()}>
          <option value="female">Nữ</option>
          <option value="male">Nam</option>
        </select>
      </Field>

      <Field label="Trạng thái">
        <select name="status" defaultValue={values.status} className={inputClass()}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Phụ huynh *" error={errors.parentId} wide hint="Chọn người đã có trong danh sách, hoặc để 'Thêm phụ huynh mới' và nhập bên dưới.">
        <select name="parentId" value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputClass(errors.parentId)}>
          <option value="">Thêm phụ huynh mới</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>{p.fullName} · {p.phone}</option>
          ))}
        </select>
      </Field>

      {!usingExistingParent && (
        <>
          <Field label="Tên phụ huynh *" error={errors.parentName}>
            <input name="parentName" defaultValue={values.parentName} placeholder="Họ tên phụ huynh" autoComplete="off" className={inputClass(errors.parentName)} />
          </Field>
          <Field label="SĐT phụ huynh *" error={errors.parentPhone}>
            <input name="parentPhone" type="tel" inputMode="tel" defaultValue={values.parentPhone} placeholder="09xx xxx xxx" autoComplete="off" className={inputClass(errors.parentPhone)} />
          </Field>
        </>
      )}

      <Field label="Quan hệ">
        <select name="parentRelation" defaultValue={values.parentRelation} className={inputClass()}>
          {RELATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>

      <label className="flex min-w-0 items-center gap-2.5 self-end pb-2.5 text-sm font-bold text-ink-2">
        <input name="parentPrimary" type="checkbox" defaultChecked className="size-4 accent-[var(--primary-deep)]" />
        Liên hệ chính
      </label>

      <Field label="Ngày bắt đầu" error={errors.startDate}>
        <input name="startDate" type="date" defaultValue={values.startDate} className={inputClass(errors.startDate)} />
      </Field>

      <Field label="Lớp học *" error={errors.classId} wide>
        <select name="classId" value={classId} onChange={(e) => setClassId(Number(e.target.value))} className={inputClass(errors.classId)}>
          <option value={0} disabled>Chọn lớp</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.course}</option>
          ))}
        </select>
      </Field>

      {selectedClass && (
        <div className="col-span-full rounded-[18px] bg-lav px-4 py-3 text-base leading-relaxed text-lav-ink">
          <b className="text-ink">{selectedClass.course}</b>
          <br />
          {selectedClass.teacherName} · Học phí <b className="text-ink">{formatVND(selectedClass.fee)}</b>
        </div>
      )}

      <Field label="Ghi chú" error={errors.note} wide>
        <textarea name="note" defaultValue={values.note} rows={3} placeholder="Mục tiêu, nhu cầu đặc biệt, lịch rảnh…" className={`${inputClass(errors.note)} h-auto py-2.5`} />
      </Field>

      <div className="col-span-full mt-1 flex justify-end gap-2.5 max-[767px]:[&>button]:flex-1">
        <button type="button" onClick={onCancel} className="h-11 rounded-xl border border-line bg-surface px-5 text-base font-bold text-ink">
          Huỷ
        </button>
        <button type="submit" disabled={pending} className="h-11 rounded-xl bg-primary px-5 text-base font-bold text-on-primary disabled:opacity-60">
          {pending ? 'Đang lưu…' : mode === 'edit' ? 'Lưu thay đổi' : 'Lưu học sinh'}
        </button>
      </div>
    </form>
  );
}

