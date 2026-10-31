'use client';

import { startTransition, useActionState, useEffect, useState, type FormEvent } from 'react';
import { checkStudentCodeAction, createStudentAction, suggestStudentCodeAction, tuitionPreviewAction, updateStudentAction, type StudentFormValues, type TuitionPreview } from '@/app/(app)/hoc-sinh/actions';
import { dateKeyLabel } from '@/lib/datetime';
import { formatVND } from '@/lib/money';
import { TUITION_PER_SESSION } from '@/lib/tuition';
import { todayIsoVN, type ActionResult } from '@/lib/validation/student';
import { Field, FORM_BTN_CANCEL, FORM_BTN_SUBMIT, inputClass, textareaClass, FormFooter } from '@/components/ui/Field';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { Alert } from '@/components/ui/primitives';

// campusId: lớp thuộc cơ sở nào. Form học sinh chọn cơ sở trước, rồi chỉ hiện lớp của cơ sở đó.
export type ClassOption = { id: number; name: string; course: string; teacherName: string; fee: number; campusId: number };
export type CampusChoice = { id: number; name: string };
export type ParentChoice = { id: number; fullName: string; phone: string };

const STATUS_OPTIONS = [
  { value: 'trial', label: 'Học thử' },
  { value: 'active', label: 'Đang học' },
  { value: 'paused', label: 'Bảo lưu' },
  { value: 'finished', label: 'Đã nghỉ' },
];

const RELATION_OPTIONS = [
  { value: 'father', label: 'Bố' },
  { value: 'mother', label: 'Mẹ' },
  { value: 'guardian', label: 'Người giám hộ' },
  { value: 'other', label: 'Khác' },
];

const EMPTY: StudentFormValues = {
  fullName: '',
  gender: 'female',
  dob: '',
  classId: 0,
  status: 'active',
  startDate: '',
  tuitionFee: null,
  tuitionDiscount: 0,
  note: '',
  parentId: '',
  parentName: '',
  parentPhone: '',
  parentRelation: 'father',
};

const INITIAL: ActionResult = { ok: false };

// Form thêm và sửa học sinh. Dùng trong hộp thoại Modal.
// Thêm mới: chọn sẵn cơ sở đang xem (defaultCampusId) và lớp đầu tiên của cơ sở đó. Sửa: cơ sở của lớp hiện có.
export function StudentForm({
  mode,
  studentId,
  initial,
  classes,
  campuses,
  defaultCampusId,
  parents,
  defaultClassId,
  onDone,
  onCancel,
}: {
  mode: 'create' | 'edit';
  studentId?: number;
  initial?: StudentFormValues;
  classes: ClassOption[];
  campuses: CampusChoice[];
  defaultCampusId: number;
  parents: ParentChoice[];
  defaultClassId?: number; // mở từ trang lớp: chọn sẵn lớp đó
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const firstClassInDefault = classes.find((c) => c.campusId === defaultCampusId)?.id ?? classes[0]?.id ?? 0;
  const presetClass = defaultClassId && classes.some((c) => c.id === defaultClassId) ? defaultClassId : firstClassInDefault;
  const values = initial ?? { ...EMPTY, classId: presetClass, startDate: todayIsoVN() };
  const [classId, setClassId] = useState(values.classId);
  const [campusId, setCampusId] = useState(classes.find((c) => c.id === values.classId)?.campusId ?? defaultCampusId);
  const [parentId, setParentId] = useState(values.parentId);
  const selectedClass = classes.find((c) => c.id === classId);
  const campusClasses = classes.filter((c) => c.campusId === campusId);

  // Ngày bắt đầu học của học sinh (khác ngày khai giảng của lớp). Học phí tính theo buổi khi ghi thu, không nhập ở đây.
  const [startDate, setStartDate] = useState(values.startDate);
  // Thêm mới: lớp chưa khai giảng thì ngày bắt đầu học tự lấy ngày buổi đầu của lớp, cho đến khi người nhập tự chọn ngày
  const [startEdited, setStartEdited] = useState(mode === 'edit');
  const [preview, setPreview] = useState<TuitionPreview | null>(null);
  useEffect(() => {
    let stale = false;
    if (!classId || !startDate) return;
    tuitionPreviewAction(classId, startDate).then((r) => {
      if (stale) return;
      setPreview(r.ok ? r.preview : null);
      if (r.ok && !startEdited) {
        const today = todayIsoVN();
        const target = r.preview.firstKey && r.preview.firstKey > today ? r.preview.firstKey : today;
        if (target !== startDate) {
          setStartDate(target);
          return;
        }
      }
    });
    return () => {
      stale = true;
    };
    // Chỉ tính khi đổi lớp hoặc ngày bắt đầu học
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, startDate]);
  const shownPreview = preview && classId && startDate ? preview : null;

  // Đổi cơ sở thì bỏ lớp không thuộc cơ sở mới, để không lưu nhầm lớp của cơ sở khác
  function chooseCampus(next: string) {
    const id = Number(next);
    setCampusId(id);
    if (selectedClass && selectedClass.campusId !== id) setClassId(0);
  }

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result =
      mode === 'edit' && studentId ? await updateStudentAction(studentId, prev, formData) : await createStudentAction(prev, formData);
    if (result.ok) onDone(result.message ?? 'Đã lưu');
    return result;
  }, INITIAL);

  const errors = state.fieldErrors ?? {};

  // Mã HS khi thêm mới: gợi ý mã tiếp theo, rời ô thì kiểm tra mã đã có học sinh chưa
  const [code, setCode] = useState('');
  const [codeTaken, setCodeTaken] = useState<string | null>(null);
  useEffect(() => {
    if (mode !== 'create') return;
    let alive = true;
    void suggestStudentCodeAction().then((next) => { if (alive) setCode(next); });
    return () => { alive = false; };
  }, [mode]);
  async function checkCode() {
    const value = code.trim();
    if (!value) {
      setCodeTaken(null);
      return;
    }
    const r = await checkStudentCodeAction(value);
    if (!r.ok) setCodeTaken(r.message);
    else setCodeTaken(r.taken ? `Mã ${value.toUpperCase()} đã có học sinh khác. Gợi ý: ${r.suggestion}` : null);
  }
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
        <Alert className="col-span-full">
          {state.message}
        </Alert>
      )}

      {/* Thông tin học sinh trước, rồi nơi học và học phí, cuối cùng là phụ huynh */}
      <FormSection>Học sinh</FormSection>
      <Field label="Họ và tên *" error={errors.fullName} wide>
        <input name="fullName" defaultValue={values.fullName} placeholder="VD: Nguyễn Minh Anh" autoComplete="off" className={inputClass(errors.fullName)} />
      </Field>
      {mode === 'create' && (
        <Field label="Mã HS" error={errors.code ?? codeTaken ?? undefined} hint="Để trống thì hệ thống tự cấp mã tiếp theo.">
          <input
            name="code"
            value={code}
            onChange={(e) => { setCode(e.target.value); setCodeTaken(null); }}
            onBlur={() => void checkCode()}
            placeholder="HS-00001"
            autoComplete="off"
            className={inputClass(errors.code ?? codeTaken ?? undefined)}
          />
        </Field>
      )}

      <Field label="Ngày sinh" error={errors.dob} hint="Để trống nếu chưa biết">
        <input name="dob" type="date" defaultValue={values.dob} className={inputClass(errors.dob)} />
      </Field>

      <Field label="Giới tính">
        <SelectPanel
          name="gender"
          label="Giới tính"
          defaultValue={values.gender}
          options={[
            { value: 'female', label: 'Nữ' },
            { value: 'male', label: 'Nam' },
          ]}
          block
        />
      </Field>

      <Field label="Trạng thái">
        <SelectPanel name="status" label="Trạng thái" defaultValue={values.status} options={STATUS_OPTIONS} block />
      </Field>

      <FormSection>Lớp và học phí</FormSection>
      <Field label="Cơ sở *">
        <SelectPanel
          label="Cơ sở *"
          value={String(campusId)}
          onChange={chooseCampus}
          options={campuses.map((c) => ({ value: String(c.id), label: c.name }))}
          block
        />
      </Field>

      <Field
        label="Lớp học *"
        error={errors.classId}
        hint={campusClasses.length === 0 ? 'Cơ sở này chưa có lớp học. Tạo lớp ở màn Lớp học trước.' : undefined}
      >
        <SelectPanel
          name="classId"
          label="Lớp học *"
          value={String(classId)}
          onChange={(v) => setClassId(Number(v))}
          options={[
            { value: '0', label: 'Chọn lớp', disabled: true },
            ...campusClasses.map((c) => ({ value: String(c.id), label: `${c.name} — ${c.course}` })),
          ]}
          error={!!errors.classId}
          block
        />
      </Field>

      <Field
        label="Ngày bắt đầu học *"
        error={errors.startDate}
        hint={shownPreview?.firstKey ? `Lớp khai giảng ${dateKeyLabel(shownPreview.firstKey)}. Vào giữa khoá thì chọn ngày học buổi đầu.` : 'Ngày học sinh bắt đầu vào lớp'}
      >
        <input name="startDate" type="date" value={startDate} onChange={(e) => {
            setStartDate(e.target.value);
            setStartEdited(true);
          }}
          className={inputClass(errors.startDate)}
        />
      </Field>

      {selectedClass && (
        <div className="col-span-full rounded-[var(--radius-ctl)] bg-lav px-3 py-2.5 text-sm leading-relaxed text-lav-ink" data-testid="class-info">
          <b className="text-ink">{selectedClass.course}</b>
          <br />
          {selectedClass.teacherName} · Học phí <b className="text-ink">{formatVND(TUITION_PER_SESSION)}</b> một buổi
          {shownPreview && <> · {shownPreview.total} buổi{shownPreview.firstKey ? ` · Khai giảng ${dateKeyLabel(shownPreview.firstKey)}` : ''}</>}
        </div>
      )}

      <FormSection>Phụ huynh</FormSection>
      <Field label="Phụ huynh *" error={errors.parentId} wide hint="Chọn người đã có trong danh sách, hoặc để 'Thêm phụ huynh mới' và nhập bên dưới.">
        <SelectPanel
          name="parentId"
          label="Phụ huynh *"
          value={parentId}
          onChange={setParentId}
          options={[
            { value: '', label: 'Thêm phụ huynh mới' },
            ...parents.map((p) => ({ value: String(p.id), label: `${p.fullName} · ${p.phone}` })),
          ]}
          error={!!errors.parentId}
          block
        />
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
        <SelectPanel name="parentRelation" label="Quan hệ" defaultValue={values.parentRelation} options={RELATION_OPTIONS} block />
      </Field>

      <label className="flex min-w-0 items-center gap-2.5 self-end pb-2 text-sm font-normal text-ink-2">
        <input name="parentPrimary" type="checkbox" defaultChecked className="size-4 accent-[var(--primary-deep)]" />
        Liên hệ chính
      </label>

      <Field label="Ghi chú" error={errors.note} wide>
        <textarea name="note" defaultValue={values.note} rows={3} placeholder="Mục tiêu, nhu cầu đặc biệt, lịch rảnh…" className={textareaClass(errors.note)} />
      </Field>

      <FormFooter className="col-span-full">
        <button type="button" onClick={onCancel} className={FORM_BTN_CANCEL}>
          Huỷ
        </button>
        <button type="submit" disabled={pending} className={FORM_BTN_SUBMIT}>
          {pending ? 'Đang lưu…' : mode === 'edit' ? 'Lưu thay đổi' : 'Lưu học sinh'}
        </button>
      </FormFooter>
    </form>
  );
}

// Tiêu đề nhóm trong form học sinh: chia form dài thành ba phần dễ dò
function FormSection({ children }: { children: string }) {
  return <h3 className="col-span-full mt-2 border-b border-line pb-1.5 text-md font-extrabold text-ink first:mt-0">{children}</h3>;
}
