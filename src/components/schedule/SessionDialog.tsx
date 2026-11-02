'use client';

import { CheckCircleIcon, HistoryIcon } from '@primer/octicons-react';
import Link from 'next/link';
import { useActionState, useState, useTransition, startTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { cancelSessionAction, restoreSessionAction, updateSessionAction } from '@/app/(app)/lich-hoc/actions';
import { ComboBox, DateInput, TextAreaAutoHeight, TextInput, TimeInput24h } from '@/components-ui';
import { dateKeyLabel, weekdayLabel, weekdayOfKey } from '@/lib/datetime';
import type { SessionRow } from '@/lib/queries/sessions';
import type { ActionResult } from '@/lib/validation/student';
import { Btn } from '@/components/ui/Btn';
import { Field, FormSection } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Toast, useToast } from '@/components/ui/Toast';
import { Pill, Alert } from '@/components/ui/primitives';
import { Callout, Notice } from '@/components/ui/surfaces';
import { sessionState } from './ScheduleView';

const INITIAL: ActionResult = { ok: false };

type Teacher = { id: number; name: string; subject: string };

// Hộp thoại một buổi học chuẩn 01. TSUKUBA: tóm tắt .kv trên đầu, bên dưới là khối dời lịch và huỷ buổi
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

  const isEditable = session?.status === 'planned' && canManage;

  return (
    <>
      <Toast message={message} />
      <Modal
        open={!!session}
        size={isEditable ? 'lg' : 'md'}
        title={session ? `Buổi ${session.sessionNo} · ${session.className}` : ''}
        subtitle={session ? session.course : undefined}
        onClose={onClose}
        labelledBy="session-title"
      >
        {session && (
          <div className="flex flex-col gap-3.5">
            {/* Tsukuba .kv metadata summary box */}
            <div className="overflow-hidden rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/60 p-3.5">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--borderColor-muted)] pb-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={sessionState(session).tone}>{sessionState(session).label}</Pill>
                  <span className="font-mono text-xs font-semibold tabular-nums text-[var(--fgColor-default)]">
                    {weekdayLabel(weekdayOfKey(session.dateKey))}, {dateKeyLabel(session.dateKey)} · {session.timeLabel}
                  </span>
                </div>
                {session.status !== 'cancelled' && (
                  <Link
                    href={`/diem-danh?cls=${session.classId}&d=${session.dateKey}`}
                    data-link="true"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--fgColor-link)] hover:underline"
                  >
                    <CheckCircleIcon size={13} aria-hidden />
                    Mở điểm danh
                  </Link>
                )}
              </div>

              <dl className="m-0 grid grid-cols-[6.75rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm min-[640px]:grid-cols-[6.75rem_minmax(0,1fr)_5.5rem_minmax(0,1fr)]">
                <dt className="text-xs text-[var(--fgColor-muted)]">Lớp học</dt>
                <dd className="m-0 truncate font-semibold text-[var(--fgColor-default)]">{session.className}</dd>

                <dt className="text-xs text-[var(--fgColor-muted)]">Phòng học</dt>
                <dd className="m-0 font-mono text-xs text-[var(--fgColor-default)]">{session.room || 'Chưa xếp'}</dd>

                <dt className="text-xs text-[var(--fgColor-muted)]">Giáo viên</dt>
                <dd className="m-0 truncate text-[var(--fgColor-default)]">{session.teacherName}</dd>

                <dt className="text-xs text-[var(--fgColor-muted)]">Chủ đề</dt>
                <dd className="m-0 truncate text-[var(--fgColor-default)]">
                  {session.topic || <span className="text-[var(--fgColor-muted)]">Theo phân phối chương trình</span>}
                </dd>
              </dl>
            </div>

            {session.status === 'done' && (
              <Notice>Buổi này đã học xong nên không sửa được. Điểm danh xem ở màn Điểm danh.</Notice>
            )}

            {session.status === 'cancelled' && (
              <div className="flex flex-col gap-3 rounded-[var(--borderRadius-large)] border border-[var(--borderColor-danger-muted,var(--borderColor-default))] bg-blush p-3.5">
                <Callout tone="danger">
                  Lý do huỷ: <b className="font-semibold">{session.cancelReason || 'Không ghi lý do'}</b>
                </Callout>
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
    <form onSubmit={submit} noValidate>
      <FormSection
        title="Điều chỉnh & dời lịch buổi học"
        description="Thay đổi ngày giờ, giáo viên phụ trách, phòng học hoặc nội dung riêng cho buổi này."
      >
        {state.message && !state.ok && <Alert className="min-[768px]:col-span-full">{state.message}</Alert>}

        <Field label="Ngày học *" error={errors.date}>
          <DateInput name="date" defaultValue={session.dateKey} aria-label="Ngày học *" error={Boolean(errors.date)} />
        </Field>
        <Field label="Giáo viên *" error={errors.teacherId}>
          <ComboBox
            name="teacherId"
            label="Giáo viên *"
            defaultValue={String(session.teacherId)}
            options={teachers.map((t) => ({ value: String(t.id), label: `${t.name} · ${t.subject}` }))}
            error={Boolean(errors.teacherId)}
            block
          />
        </Field>
        <Field label="Giờ bắt đầu *" error={errors.startTime}>
          <TimeInput24h name="startTime" ariaLabel="Giờ bắt đầu *" defaultValue={start} error={Boolean(errors.startTime)} />
        </Field>
        <Field label="Giờ kết thúc *" error={errors.endTime}>
          <TimeInput24h name="endTime" ariaLabel="Giờ kết thúc *" defaultValue={end} error={Boolean(errors.endTime)} />
        </Field>
        <Field label="Phòng" error={errors.room}>
          <TextInput
            name="room"
            defaultValue={session.room}
            autoComplete="off"
            aria-label="Phòng"
            block
            validationStatus={errors.room ? 'error' : undefined}
          />
        </Field>
        <Field label="Chủ đề buổi học" error={errors.topic}>
          <TextInput
            name="topic"
            defaultValue={session.topic}
            placeholder="VD: Writing Task 2"
            autoComplete="off"
            aria-label="Chủ đề buổi học"
            block
            validationStatus={errors.topic ? 'error' : undefined}
          />
        </Field>
        <div className="flex justify-end min-[768px]:col-span-full">
          <Btn type="submit" variant="primary" loading={pending} disabled={pending}>
            {pending ? 'Đang lưu…' : 'Lưu buổi học'}
          </Btn>
        </div>
      </FormSection>
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
    <FormSection
      title="Huỷ buổi học"
      description="Phụ huynh và giáo viên sẽ nhận được thông báo huỷ lịch kèm lý do."
      grid={false}
    >
      <div className="flex flex-col gap-2.5">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-[var(--fgColor-default)]">
          Huỷ buổi này (ghi lý do)
          <TextAreaAutoHeight
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="VD: Giáo viên nghỉ đột xuất, sẽ xếp học bù tuần sau"
            error={Boolean(error)}
          />
          {error && <span className="text-xs font-medium text-blush-ink">{error}</span>}
        </label>
        <div className="flex justify-end">
          <Btn variant="danger" loading={pending} onClick={cancel} disabled={pending}>
            {pending ? 'Đang huỷ…' : 'Huỷ buổi học'}
          </Btn>
        </div>
      </div>
    </FormSection>
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
    <div>
      <Btn leadingVisual={HistoryIcon} loading={pending} onClick={restore} disabled={pending}>
        {pending ? 'Đang khôi phục…' : 'Khôi phục buổi học'}
      </Btn>
    </div>
  );
}
