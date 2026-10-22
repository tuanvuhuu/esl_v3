'use client';

// Thêm một buổi riêng cho lớp (học bù, học thêm, ôn thi) ở màn Lịch học. Chọn lớp thì giáo viên và phòng điền sẵn theo lớp.
// Kiểm trùng giáo viên, phòng ngay khi nhập; máy chủ kiểm lại khi lưu.
import { startTransition, useActionState, useEffect, useState, type FormEvent } from 'react';
import { checkSessionAction, createSessionAction } from '@/app/(app)/lich-hoc/actions';
import { durationLabel, finishTime, typingTime } from '@/components/classes/DayTimeRows';
import { Btn } from '@/components/ui/Btn';
import { Field, FormFooter, inputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/primitives';
import { SelectPanel } from '@/components/ui/SelectPanel';
import type { ActionResult } from '@/lib/validation/student';

export type ClassPick = { id: number; name: string; teacherId: number; room: string };
const INITIAL: ActionResult = { ok: false };
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function AddSessionDialog({
  open,
  classes,
  teachers,
  defaultDate,
  defaultClassId,
  onClose,
  onDone,
}: {
  open: boolean;
  classes: ClassPick[];
  teachers: { id: number; name: string }[];
  defaultDate: string;
  defaultClassId?: number | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const first = classes.find((c) => c.id === defaultClassId) ?? classes[0];
  const [classId, setClassId] = useState(first ? String(first.id) : '');
  const [teacherId, setTeacherId] = useState(first ? String(first.teacherId) : '');
  const [room, setRoom] = useState(first?.room ?? '');
  const [date, setDate] = useState(defaultDate);
  const [start, setStart] = useState('18:00');
  const [end, setEnd] = useState('19:30');
  const [topic, setTopic] = useState('Buổi học bù');
  const [check, setCheck] = useState<string[] | null>(null);

  // Đổi lớp thì giáo viên và phòng theo lớp mới
  function chooseClass(id: string) {
    setClassId(id);
    const c = classes.find((x) => String(x.id) === id);
    if (c) {
      setTeacherId(String(c.teacherId));
      setRoom(c.room);
    }
  }

  // Đổi giờ bắt đầu thì giờ kết thúc dời theo, giữ độ dài buổi
  function changeStart(value: string) {
    if (TIME.test(value) && TIME.test(start) && TIME.test(end) && end > start) {
      const next = toMin(value) + toMin(end) - toMin(start);
      if (next < 24 * 60) setEnd(toTime(next));
    }
    setStart(value);
  }

  useEffect(() => {
    if (!open || !classId) return;
    const timer = setTimeout(async () => {
      const r = await checkSessionAction({ classId: Number(classId), date, startTime: start, endTime: end, teacherId: Number(teacherId), room });
      setCheck(r.ok ? r.conflicts : null);
    }, 400);
    return () => clearTimeout(timer);
  }, [open, classId, date, start, end, teacherId, room]);

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const r = await createSessionAction(Number(classId), prev, formData);
    if (r.ok) onDone(r.message ?? 'Đã thêm buổi');
    return r;
  }, INITIAL);
  const errors = state.fieldErrors ?? {};

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  }

  const timesOk = TIME.test(start) && TIME.test(end) && end > start;
  return (
    <Modal open={open} title="Thêm buổi học" subtitle="Học bù, học thêm hoặc ôn thi. Số buổi của lớp tự đánh lại theo ngày." onClose={onClose} labelledBy="add-session-title">
      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
        {state.message && !state.ok && <Alert className="col-span-full">{state.message}</Alert>}
        <Field label="Lớp *">
          <SelectPanel label="Lớp của buổi học" block value={classId} onChange={chooseClass} options={classes.map((c) => ({ value: String(c.id), label: c.name }))} />
        </Field>
        <Field label="Ngày học *" error={errors.date}>
          <input name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass(errors.date)} />
        </Field>
        <Field label="Giờ bắt đầu *" error={errors.startTime}>
          <input
            name="startTime"
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="18:00"
            autoComplete="off"
            value={start}
            onChange={(e) => changeStart(typingTime(e.target.value))}
            onBlur={(e) => changeStart(finishTime(e.target.value))}
            className={`${inputClass(errors.startTime)} tabular-nums`}
          />
        </Field>
        <Field label="Giờ kết thúc *" error={errors.endTime ?? (start && end && TIME.test(start) && TIME.test(end) && end <= start ? 'Giờ kết thúc phải sau giờ bắt đầu' : undefined)} hint={timesOk ? durationLabel(start, end) : undefined}>
          <input
            name="endTime"
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="19:30"
            autoComplete="off"
            value={end}
            onChange={(e) => setEnd(typingTime(e.target.value))}
            onBlur={(e) => setEnd(finishTime(e.target.value))}
            className={`${inputClass(errors.endTime)} tabular-nums`}
          />
        </Field>
        <Field label="Giáo viên *" error={errors.teacherId}>
          <SelectPanel name="teacherId" label="Giáo viên dạy buổi này" block value={teacherId} onChange={setTeacherId} options={teachers.map((t) => ({ value: String(t.id), label: t.name }))} error={!!errors.teacherId} />
        </Field>
        <Field label="Phòng" error={errors.room}>
          <input name="room" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="VD: P.201" autoComplete="off" className={inputClass(errors.room)} />
        </Field>
        <Field label="Chủ đề buổi học" error={errors.topic} wide>
          <input name="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="VD: Buổi học bù ngày 20/10" autoComplete="off" className={inputClass(errors.topic)} />
        </Field>
        {check && timesOk && (
          <div className="col-span-full">
            {check.length > 0 ? <Alert inline>Trùng lịch: {check.join('; ')}.</Alert> : <Alert inline tone="ok">Không trùng lịch giáo viên, phòng và lớp.</Alert>}
          </div>
        )}
        <FormFooter className="col-span-full">
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn type="submit" variant="primary" disabled={pending || !classId}>
            {pending ? 'Đang thêm…' : 'Thêm buổi'}
          </Btn>
        </FormFooter>
      </form>
    </Modal>
  );
}
