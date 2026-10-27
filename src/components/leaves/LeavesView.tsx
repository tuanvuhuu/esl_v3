'use client';

import { ZaloLink } from '@/components/ui/ZaloLink';
import { CalendarPlus, Check, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { bookMakeupAction, cancelMakeupAction, createLeaveAction, decideLeaveAction, leaveOptionsAction, makeupOptionsAction, type LeaveOptions } from '@/app/(app)/don-nghi/actions';
import type { MakeupCandidate } from '@/lib/makeup';
import { dateKeyLabel, vnDateKey, vnTimeLabel, weekdayLabel, weekdayOfKey } from '@/lib/datetime';
import type { LeaveFilter, LeaveListRow, LeaveStatus } from '@/lib/queries/leaves';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Chip, ChipGroup } from '@/components/ui/controls';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { Field, FormFooter, FORM_BTN_CANCEL, FORM_BTN_SUBMIT, inputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert, Pill, type Tone } from '@/components/ui/primitives';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';

const STATUS_META: Record<LeaveStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Chờ duyệt', tone: 'butter' },
  approved: { label: 'Đã duyệt', tone: 'mint' },
  denied: { label: 'Từ chối', tone: 'blush' },
  cancelled: { label: 'Phụ huynh huỷ', tone: 'stone' },
};

const FILTERS: { key: LeaveFilter; label: string }[] = [
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'denied', label: 'Từ chối' },
  { key: 'cancelled', label: 'Đã huỷ' },
  { key: 'all', label: 'Tất cả' },
];

const COLUMNS: GridColumn<LeaveListRow>[] = [
  { key: 'student', label: 'Học sinh', width: 'minmax(170px,1.4fr)', sortValue: (r) => r.studentName },
  { key: 'session', label: 'Buổi nghỉ', width: 'minmax(150px,1.1fr)', sortValue: (r) => r.startsAt.getTime() },
  { key: 'reason', label: 'Lý do', width: 'minmax(150px,1.4fr)' },
  { key: 'parent', label: 'Người gửi', width: 'minmax(140px,1fr)' },
  { key: 'status', label: 'Trạng thái', width: 'minmax(150px,1fr)', sortValue: (r) => r.status },
  { key: 'actions', label: 'Thao tác', width: '190px', align: 'end', srOnly: true },
];

// "T3 27/10 16:15–17:30"
function sessionLabel(startsAt: Date, endsAt: Date): string {
  const key = vnDateKey(startsAt);
  return `${weekdayLabel(weekdayOfKey(key))} ${dateKeyLabel(key).slice(0, 5)} ${vnTimeLabel(startsAt)}–${vnTimeLabel(endsAt)}`;
}

// Màn Đơn nghỉ: duyệt, từ chối đơn phụ huynh gửi qua bot; ghi đơn hộ khi phụ huynh gọi điện. Web là bảng, điện thoại là thẻ.
export function LeavesView({
  rows,
  counts,
  filter,
  classId,
  classes,
  makeups,
}: {
  rows: LeaveListRow[];
  counts: Record<LeaveFilter, number>;
  filter: LeaveFilter;
  classId: number | null;
  classes: { id: number; name: string }[];
  makeups: Record<number, { className: string; startsAt: Date; endsAt: Date }>;
}) {
  const router = useRouter();
  const { message, notify } = useToast();
  const [pending, startTransition] = useTransition();
  const [toDeny, setToDeny] = useState<LeaveListRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [makeupFor, setMakeupFor] = useState<LeaveListRow | null>(null);
  const [toUnbook, setToUnbook] = useState<LeaveListRow | null>(null);

  function unbook(row: LeaveListRow) {
    startTransition(async () => {
      const r = await cancelMakeupAction(row.id);
      notify(r.message ?? (r.ok ? 'Đã bỏ' : 'Không bỏ được'));
      setToUnbook(null);
      router.refresh();
    });
  }

  function go(next: { f?: LeaveFilter; cls?: number | null }) {
    const params = new URLSearchParams();
    const f = next.f ?? filter;
    const cls = next.cls === undefined ? classId : next.cls;
    if (f !== 'pending') params.set('f', f);
    if (cls) params.set('cls', String(cls));
    const qs = params.toString();
    router.push(qs ? `/don-nghi?${qs}` : '/don-nghi', { scroll: false });
  }

  function decide(row: LeaveListRow, approve: boolean) {
    startTransition(async () => {
      const r = await decideLeaveAction(row.id, approve);
      notify(r.message ?? (r.ok ? 'Đã lưu' : 'Không lưu được'));
      setToDeny(null);
      router.refresh();
    });
  }

  const canDecide = (r: LeaveListRow) => r.status === 'pending' && !r.past;
  // Học bù chỉ cho đơn đã duyệt (37.12)
  const canMakeup = (r: LeaveListRow) => r.status === 'approved';

  // Dòng học bù dưới trạng thái: buổi đã xếp, hoặc nút xếp học bù
  const makeupLine = (r: LeaveListRow) => {
    if (!canMakeup(r)) return null;
    const m = makeups[r.id];
    return m ? (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="text-ink-2">Học bù: lớp {m.className} · {sessionLabel(new Date(m.startsAt), new Date(m.endsAt))}</span>
        <button type="button" onClick={() => setMakeupFor(r)} className="text-link underline underline-offset-2">Đổi</button>
        <button type="button" onClick={() => setToUnbook(r)} className="text-blush-ink underline underline-offset-2">Bỏ</button>
      </div>
    ) : (
      <button type="button" onClick={() => setMakeupFor(r)} className="inline-flex items-center gap-1.5 self-start text-sm text-link underline underline-offset-2">
        <CalendarPlus className="size-4" aria-hidden />
        Xếp học bù
      </button>
    );
  };

  // withMakeup: bảng hiện dòng học bù ngay dưới trạng thái; thẻ điện thoại để dòng này thành hàng riêng
  const statusCell = (r: LeaveListRow, withMakeup = true) => (
    <div className="flex flex-col items-start gap-0.5">
      <Pill tone={r.status === 'pending' && r.past ? 'stone' : STATUS_META[r.status].tone}>
        {r.status === 'pending' && r.past ? 'Quá hạn duyệt' : STATUS_META[r.status].label}
      </Pill>
      {r.decidedBy && <small className="text-xs text-muted">{r.decidedBy}</small>}
      {withMakeup && makeupLine(r)}
    </div>
  );

  const decideButtons = (r: LeaveListRow, block = false) => (
    <>
      <Btn variant="primary" block={block} onClick={() => decide(r, true)} disabled={pending} aria-label={`Duyệt đơn của ${r.studentName}`}>
        <Check className="size-4" aria-hidden />
        Duyệt
      </Btn>
      <Btn variant="danger" block={block} onClick={() => setToDeny(r)} disabled={pending} aria-label={`Từ chối đơn của ${r.studentName}`}>
        <X className="size-4" aria-hidden />
        Từ chối
      </Btn>
    </>
  );

  const cell = (r: LeaveListRow, key: string) => {
    switch (key) {
      case 'student':
        return (
          <div className="min-w-0">
            <Link href={`/hoc-sinh/${r.studentId}`} className="text-base font-normal text-link underline underline-offset-2">{r.studentName}</Link>
            <small className="block text-xs text-muted">{r.className}</small>
          </div>
        );
      case 'session':
        return <span className="text-base text-ink tabular-nums">{sessionLabel(r.startsAt, r.endsAt)}</span>;
      case 'reason':
        return <span className="text-base text-ink-2">{r.reason}</span>;
      case 'parent':
        return r.parentName ? (
          <div className="min-w-0">
            <span className="block text-base text-ink">{r.parentName}</span>
            {r.parentPhone && (
              <span className="flex flex-wrap items-center gap-2">
                <a href={`tel:${r.parentPhone}`} className="text-sm font-normal text-link underline underline-offset-2">{r.parentPhone}</a>
                <ZaloLink phone={r.parentPhone} name={r.parentName} variant="link" />
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted">Giáo vụ ghi</span>
        );
      case 'status':
        return statusCell(r);
      case 'actions':
        return <div className="flex justify-end gap-1.5">{canDecide(r) && decideButtons(r)}</div>;
      default:
        return null;
    }
  };

  const card = (r: LeaveListRow) => (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/hoc-sinh/${r.studentId}`} className="text-base font-normal text-link underline underline-offset-2">{r.studentName}</Link>
          <small className="block text-xs text-muted">{r.className} · {sessionLabel(r.startsAt, r.endsAt)}</small>
        </div>
        {statusCell(r, false)}
      </div>
      {r.reason && <p className="text-base text-ink-2">Lý do: {r.reason}</p>}
      {makeupLine(r)}
      <small className="text-sm text-muted">
        {r.parentName ? (
          <>
            Gửi bởi {r.parentName}
            {r.parentPhone && (
              <>
                {' · '}
                <a href={`tel:${r.parentPhone}`} className="text-link underline underline-offset-2">{r.parentPhone}</a>
                {' '}
                <ZaloLink phone={r.parentPhone} name={r.parentName} variant="link" />
              </>
            )}
          </>
        ) : (
          'Giáo vụ ghi'
        )}
      </small>
      {canDecide(r) && <div className="grid grid-cols-2 gap-2">{decideButtons(r, true)}</div>}
    </Card>
  );

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Đơn nghỉ']}
        title="Đơn nghỉ"
        subtitle="Đơn phụ huynh gửi qua Telegram. Duyệt thì ghi vắng có phép vào điểm danh và báo lại phụ huynh."
        actions={
          <Btn variant="primary" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden />
            Ghi đơn nghỉ
          </Btn>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ChipGroup label="Lọc đơn nghỉ">
          {FILTERS.map((f) => (
            <Chip key={f.key} selected={filter === f.key} count={counts[f.key]} onClick={() => go({ f: f.key })}>
              {f.label}
            </Chip>
          ))}
        </ChipGroup>
        <SelectPanel
          label="Lớp"
          auto
          value={classId ? String(classId) : ''}
          onChange={(v) => go({ cls: v ? Number(v) : null })}
          options={[{ value: '', label: 'Tất cả lớp' }, ...classes.map((c) => ({ value: String(c.id), label: c.name }))]}
        />
      </div>

      <DataGrid
        label="Đơn nghỉ"
        columns={COLUMNS}
        rows={rows}
        rowKey={(r) => r.id}
        cell={cell}
        card={card}
        from="md"
        empty={<EmptyPanel title={filter === 'pending' ? 'Không có đơn nào chờ duyệt.' : 'Không có đơn phù hợp với bộ lọc này.'} />}
      />

      <ConfirmDialog
        open={!!toDeny}
        title="Từ chối đơn nghỉ?"
        text={toDeny ? `Đơn của ${toDeny.studentName} buổi ${sessionLabel(toDeny.startsAt, toDeny.endsAt)}. Phụ huynh nhận tin báo đơn chưa được duyệt, Thầy/Cô nhớ liên hệ lại.` : ''}
        confirmLabel="Từ chối đơn"
        pending={pending}
        onConfirm={() => toDeny && decide(toDeny, false)}
        onCancel={() => setToDeny(null)}
      />

      {makeupFor && (
        <MakeupDialog
          row={makeupFor}
          onClose={() => setMakeupFor(null)}
          onDone={(m) => {
            setMakeupFor(null);
            notify(m);
            router.refresh();
          }}
        />
      )}
      <ConfirmDialog
        open={!!toUnbook}
        title="Bỏ buổi học bù?"
        text={toUnbook ? `${toUnbook.studentName} sẽ không còn trong danh sách điểm danh của buổi học bù.` : ''}
        confirmLabel="Bỏ học bù"
        pending={pending}
        onConfirm={() => toUnbook && unbook(toUnbook)}
        onCancel={() => setToUnbook(null)}
      />

      {adding && (
        <AddLeaveDialog
          classes={classes}
          defaultClassId={classId}
          onClose={() => setAdding(false)}
          onDone={(m) => {
            setAdding(false);
            notify(m);
            router.refresh();
          }}
        />
      )}
      <Toast message={message} />
    </section>
  );
}

// Ghi đơn nghỉ hộ phụ huynh: chọn lớp, học sinh, buổi sắp tới, lý do. Đơn được duyệt ngay.
function AddLeaveDialog({ classes, defaultClassId, onClose, onDone }: {
  classes: { id: number; name: string }[];
  defaultClassId: number | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [classId, setClassId] = useState(String(defaultClassId ?? classes[0]?.id ?? ''));
  const [options, setOptions] = useState<LeaveOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<{ message?: string; fieldErrors?: Record<string, string> }>({});
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    if (!classId) return;
    let alive = true;
    leaveOptionsAction(Number(classId)).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setOptions(r.options);
        setLoadError(null);
        setStudentId(r.options.students[0] ? String(r.options.students[0].id) : '');
        setSessionId(r.options.sessions[0] ? String(r.options.sessions[0].id) : '');
      } else setLoadError(r.message);
    });
    return () => {
      alive = false;
    };
  }, [classId]);

  function chooseClass(next: string) {
    setOptions(null);
    setClassId(next);
  }

  function submit() {
    startSaving(async () => {
      const r = await createLeaveAction({ studentId: Number(studentId), sessionId: Number(sessionId), reason });
      if (r.ok) onDone(r.message ?? 'Đã ghi đơn nghỉ');
      else setError({ message: r.message, fieldErrors: r.fieldErrors });
    });
  }

  const errors = error.fieldErrors ?? {};
  return (
    <Modal open title="Ghi đơn nghỉ" subtitle="Khi phụ huynh gọi điện hoặc nhắn ngoài bot. Đơn được duyệt ngay và ghi vắng có phép." onClose={onClose} labelledBy="add-leave-title">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
        className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[768px]:gap-x-4"
      >
        {(error.message || loadError) && <Alert className="col-span-full">{error.message ?? loadError}</Alert>}
        <Field label="Lớp *">
          <SelectPanel label="Lớp của học sinh" block value={classId} onChange={chooseClass} options={classes.map((c) => ({ value: String(c.id), label: c.name }))} />
        </Field>
        <Field label="Học sinh *" error={errors.studentId} hint={options && options.students.length === 0 ? 'Lớp chưa có học sinh đang học' : undefined}>
          <SelectPanel
            label="Học sinh nghỉ"
            block
            value={studentId}
            onChange={setStudentId}
            disabled={!options || options.students.length === 0}
            options={(options?.students ?? []).map((s) => ({ value: String(s.id), label: s.name }))}
            error={!!errors.studentId}
          />
        </Field>
        <Field label="Buổi nghỉ *" error={errors.sessionId} hint={options && options.sessions.length === 0 ? 'Lớp không còn buổi sắp tới' : undefined}>
          <SelectPanel
            label="Buổi nghỉ"
            block
            value={sessionId}
            onChange={setSessionId}
            disabled={!options || options.sessions.length === 0}
            options={(options?.sessions ?? []).map((s) => ({ value: String(s.id), label: sessionLabel(new Date(s.startsAt), new Date(s.endsAt)) }))}
            error={!!errors.sessionId}
          />
        </Field>
        <Field label="Lý do">
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="VD: Ốm, phụ huynh gọi điện báo" autoComplete="off" className={inputClass()} />
        </Field>
        <FormFooter className="col-span-full">
          <button type="button" onClick={onClose} className={FORM_BTN_CANCEL}>Huỷ</button>
          <button type="submit" disabled={saving || !studentId || !sessionId} className={FORM_BTN_SUBMIT}>{saving ? 'Đang ghi…' : 'Ghi đơn nghỉ'}</button>
        </FormFooter>
      </form>
    </Modal>
  );
}

// Chọn buổi học bù: buổi sắp tới của lớp khác cùng trình độ, cùng cơ sở, còn chỗ, không trùng giờ lớp của học sinh
function MakeupDialog({ row, onClose, onDone }: { row: LeaveListRow; onClose: () => void; onDone: (message: string) => void }) {
  const [list, setList] = useState<MakeupCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    let alive = true;
    makeupOptionsAction(row.id).then((r) => {
      if (!alive) return;
      if (r.ok) setList(r.candidates);
      else setError(r.message);
    });
    return () => {
      alive = false;
    };
  }, [row.id]);

  function choose(c: MakeupCandidate) {
    startSaving(async () => {
      const r = await bookMakeupAction(row.id, c.sessionId);
      if (r.ok) onDone(r.message ?? 'Đã xếp học bù');
      else setError(r.message ?? 'Không xếp được');
    });
  }

  return (
    <Modal open title={`Xếp học bù · ${row.studentName}`} subtitle={`Nghỉ buổi ${sessionLabel(row.startsAt, row.endsAt)} lớp ${row.className}. Chọn một buổi của lớp cùng trình độ.`} onClose={onClose} labelledBy="makeup-title">
      <div className="flex flex-col gap-3 pb-2">
        {error && <Alert>{error}</Alert>}
        {!list && !error && <p className="text-sm text-muted">Đang tìm buổi phù hợp…</p>}
        {list && list.length === 0 && <p className="text-sm text-ink-2">Không có buổi phù hợp trong 21 ngày tới (lớp cùng trình độ, cùng cơ sở, còn chỗ, không trùng giờ lớp của em).</p>}
        {list && list.length > 0 && (
          <ul className="flex flex-col divide-y divide-line">
            {list.map((c) => (
              <li key={c.sessionId} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <b className="block text-base text-ink">{sessionLabel(new Date(c.startsAt), new Date(c.endsAt))} · lớp {c.className}</b>
                  <small className="block text-sm text-muted">{c.teacherName}{c.room ? ` · ${c.room}` : ''} · còn {c.seatsLeft} chỗ</small>
                </div>
                <Btn variant="primary" onClick={() => choose(c)} disabled={saving}>Chọn</Btn>
              </li>
            ))}
          </ul>
        )}
        <FormFooter>
          <button type="button" onClick={onClose} className={FORM_BTN_CANCEL}>Đóng</button>
        </FormFooter>
      </div>
    </Modal>
  );
}
