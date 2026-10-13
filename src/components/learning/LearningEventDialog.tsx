'use client';

import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { addLearningEventAction } from '@/app/(app)/lich-su-hoc-tap/actions';
import { LEARNING_EVENT_LABELS, LEARNING_EVENT_TYPES } from '@/lib/validation/learning';
import { todayKeyVN } from '@/lib/datetime';
import type { ActionResult } from '@/lib/validation/student';
import { Field, FORM_BTN_CANCEL, FORM_BTN_SUBMIT, inputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Toast, useToast } from '@/components/ui/Toast';

const INITIAL: ActionResult = { ok: false };

// Nút và hộp thoại thêm ghi chú hoặc sự kiện học tập cho một học sinh
export function LearningEventButton({ studentId, studentName }: { studentId: number; studentName: string }) {
  const [open, setOpen] = useState(false);
  const { message, notify } = useToast();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-base font-bold text-on-primary">
        Thêm ghi chú
      </button>
      <Toast message={message} />
      {open && <EventDialog studentId={studentId} studentName={studentName} onClose={() => setOpen(false)} onDone={(m) => { setOpen(false); notify(m); }} />}
    </>
  );
}

function EventDialog({ studentId, studentName, onClose, onDone }: { studentId: number; studentName: string; onClose: () => void; onDone: (m: string) => void }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result = await addLearningEventAction(studentId, prev, formData);
    if (result.ok) {
      router.refresh();
      onDone(result.message ?? 'Đã ghi');
    }
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
    <Modal open title={`Thêm vào lịch sử · ${studentName}`} subtitle="Ghi chú, thăng cấp, kiểm tra hoặc đổi trạng thái. Các ô có dấu * là bắt buộc." onClose={onClose} labelledBy="learning-event-title">
      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3.5 pb-2 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
        {state.message && !state.ok && (
          <div role="alert" className="col-span-full rounded-xl bg-blush px-3.5 py-2.5 text-base font-semibold text-blush-ink">{state.message}</div>
        )}
        <Field label="Loại *" error={errors.eventType}>
          <select name="eventType" defaultValue="note" className={inputClass(errors.eventType)}>
            {LEARNING_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{LEARNING_EVENT_LABELS[t]}</option>
            ))}
          </select>
        </Field>
        <Field label="Ngày *" error={errors.occurredDate}>
          <input name="occurredDate" type="date" defaultValue={todayKeyVN()} className={inputClass(errors.occurredDate)} />
        </Field>
        <Field label="Tiêu đề *" error={errors.title} wide>
          <input name="title" placeholder="VD: Lên Band 6.0 · Ghi chú: cần luyện phát âm" autoComplete="off" className={inputClass(errors.title)} />
        </Field>
        <Field label="Chi tiết" error={errors.detail} wide>
          <textarea name="detail" rows={3} className={`${inputClass(errors.detail)} h-auto py-2.5`} />
        </Field>
        <div className="col-span-full mt-1 flex justify-end gap-2.5 max-[767px]:[&>button]:flex-1">
          <button type="button" onClick={onClose} className={FORM_BTN_CANCEL}>Huỷ</button>
          <button type="submit" disabled={pending} className={FORM_BTN_SUBMIT}>{pending ? 'Đang ghi…' : 'Ghi vào lịch sử'}</button>
        </div>
      </form>
    </Modal>
  );
}
