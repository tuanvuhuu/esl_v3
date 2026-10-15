'use client';

import { useActionState, useState, useTransition, startTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { cancelSessionAction, restoreSessionAction, updateSessionAction } from '@/app/(app)/lich-hoc/actions';
import type { SessionRow } from '@/lib/queries/sessions';
import type { ActionResult } from '@/lib/validation/student';
import { BTN_BASE, BTN_DANGER, BTN_GHOST } from '@/components/ui/Btn';
import { Field, FORM_BTN_SUBMIT, inputClass } from '@/components/ui/Field';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { Modal } from '@/components/ui/Modal';
import { Toast, useToast } from '@/components/ui/Toast';
import { Pill, Alert } from '@/components/ui/primitives';
import { sessionState } from './ScheduleView';
import { Notice } from '@/components/ui/surfaces';

const INITIAL: ActionResult = { ok: false };

type Teacher = { id: number; name: string; subject: string };

// Hộp thoại một buổi học: sửa khi chưa học, huỷ có lý do, khôi phục khi đã huỷ, chỉ xem khi đã học xong
export function SessionDialog({
  session,
  teachers,
  canManage,
  onClose,
}: {
  session: SessionRow | null;
  teachers: Teacher[];
  canManage: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { message, notify } = useToast();

  // Sau khi lưu, huỷ hoặc khôi phục thì đóng hộp thoại, làm mới dữ liệu và báo kết quả
  function finish(text: string) {
    notify(text);
    router.refresh();
    onClose();
  }

  return (
    <>
      <Toast message={message} />
      <Modal
        open={!!session}
        title={session ? `Buổi ${session.sessionNo} · ${session.className}` : ''}
        subtitle={session ? session.course : undefined}
        onClose={onClose}
        labelledBy="session-title"
      >
        {session && (
          <div className="flex flex-col gap-4 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={sessionState(session).tone}>{sessionState(session).label}</Pill>
              <span className="text-base font-bold text-ink">{session.timeLabel}</span>
              <span className="text-base text-muted">· {session.teacherName}{session.room ? ` · ${session.room}` : ''}</span>
            </div>

            {session.status === 'done' && (
              <Notice>Buổi này đã học xong nên không sửa được. Điểm danh xem ở màn Điểm danh.</Notice>
            )}

            {session.status === 'cancelled' && (
              <div className="flex flex-col gap-3 rounded-[var(--radius-ctl)] bg-blush px-3 py-2.5">
                <p className="text-base text-blush-ink">Lý do huỷ: {session.cancelReason || 'Không ghi lý do'}</p>
                {canManage && <RestoreButton id={session.id} onDone={finish} onError={notify} />}
              </div>
            )}

            {session.status === 'planned' && canManage && (
              <>
                <EditSessionForm session={session} teachers={teachers} onDone={finish} />
                <CancelSessionForm id={session.id} onDone={finish} />
              </>
            )}

            {session.status === 'planned' && !canManage && (
              <Notice>Bạn không có quyền sửa lịch học.</Notice>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

function EditSessionForm({ session, teachers, onDone }: { session: SessionRow; teachers: Teacher[]; onDone: (m: string) => void }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result = await updateSessionAction(session.id, prev, formData);
    if (result.ok) onDone(result.message ?? 'Đã lưu');
    return result;
  }, INITIAL);
  const errors = state.fieldErrors ?? {};
  const [start, end] = session.timeLabel.split('–');

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
      <Field label="Ngày học *" error={errors.date}>
        <input name="date" type="date" defaultValue={session.dateKey} className={inputClass(errors.date)} />
      </Field>
      <Field label="Giáo viên *" error={errors.teacherId}>
        <SelectPanel
          name="teacherId"
          label="Giáo viên *"
          defaultValue={String(session.teacherId)}
          options={teachers.map((t) => ({ value: String(t.id), label: `${t.name} · ${t.subject}` }))}
          error={!!errors.teacherId}
          block
        />
      </Field>
      <Field label="Giờ bắt đầu *" error={errors.startTime}>
        <input name="startTime" type="time" defaultValue={start} className={inputClass(errors.startTime)} />
      </Field>
      <Field label="Giờ kết thúc *" error={errors.endTime}>
        <input name="endTime" type="time" defaultValue={end} className={inputClass(errors.endTime)} />
      </Field>
      <Field label="Phòng" error={errors.room}>
        <input name="room" defaultValue={session.room} className={inputClass(errors.room)} />
      </Field>
      <Field label="Chủ đề buổi học" error={errors.topic}>
        <input name="topic" defaultValue={session.topic} placeholder="VD: Writing Task 2" className={inputClass(errors.topic)} />
      </Field>
      <div className="col-span-full flex justify-end">
        <button type="submit" disabled={pending} className={FORM_BTN_SUBMIT}>{pending ? 'Đang lưu…' : 'Lưu buổi học'}</button>
      </div>
    </form>
  );
}

function CancelSessionForm({ id, onDone }: { id: number; onDone: (m: string) => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function cancel() {
    start(async () => {
      const r = await cancelSessionAction(id, reason);
      if (!r.ok) {
        setError(r.fieldErrors?.cancelReason ?? r.message ?? 'Không huỷ được buổi này');
        return;
      }
      onDone(r.message ?? 'Đã huỷ buổi');
    });
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-[var(--radius-ctl)] border border-line px-3 py-3">
      <label className="flex flex-col gap-1.5 text-sm font-normal text-ink-2">
        Huỷ buổi này (ghi lý do)
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="VD: Giáo viên nghỉ đột xuất"
          className={inputClass(error ?? undefined)}
        />
        {error && <span className="text-sm font-semibold text-blush-ink">{error}</span>}
      </label>
      <div className="flex justify-end">
        <button type="button" onClick={cancel} disabled={pending} className={`${BTN_BASE} ${BTN_DANGER}`}>
          {pending ? 'Đang huỷ…' : 'Huỷ buổi học'}
        </button>
      </div>
    </div>
  );
}

function RestoreButton({ id, onDone, onError }: { id: number; onDone: (m: string) => void; onError: (m: string) => void }) {
  const [pending, start] = useTransition();
  function restore() {
    start(async () => {
      const r = await restoreSessionAction(id);
      if (r.ok) onDone(r.message ?? 'Đã khôi phục');
      else onError(r.message ?? 'Không khôi phục được');
    });
  }
  return (
    <button type="button" onClick={restore} disabled={pending} className={`${BTN_BASE} ${BTN_GHOST} w-fit`}>
      {pending ? 'Đang khôi phục…' : 'Khôi phục buổi học'}
    </button>
  );
}
