'use client';

import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  EyeIcon,
  LocationIcon,
  PeopleIcon,
  PersonIcon,
  PlusIcon,
  SyncIcon,
  TrashIcon,
  XIcon,
} from '@primer/octicons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import {
  bookMakeupAction,
  cancelMakeupAction,
  createLeaveAction,
  decideLeaveAction,
  leaveOptionsAction,
  makeupOptionsAction,
  type LeaveOptions,
} from '@/app/(app)/don-nghi/actions';
import type { MakeupCandidate } from '@/lib/makeup';
import { dateKeyLabel, vnDateKey, vnTimeLabel, weekdayLabel, weekdayOfKey } from '@/lib/datetime';
import type { LeaveFilter, LeaveListRow, LeaveStatus } from '@/lib/queries/leaves';
import { ActIcon } from '@/components/ui/ActIcon';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Chip, ChipGroup } from '@/components/ui/controls';
import { ComboBox, TextInput } from '@/components-ui';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { Field, FormFooter, FormSection } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageCrumbs } from '@/components/shell/PageCrumbs';
import { Alert, InitialBadge, Pill, type Tone } from '@/components/ui/primitives';
import { Callout, Card, EmptyPanel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
import { ZaloLink } from '@/components/ui/ZaloLink';

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
  { key: 'student', label: 'Học sinh', width: 'minmax(196px,1.55fr)', sortValue: (r) => r.studentName },
  { key: 'session', label: 'Buổi nghỉ', width: 'minmax(180px,1.35fr)', sortValue: (r) => r.startsAt.getTime() },
  { key: 'reason', label: 'Lý do', width: 'minmax(148px,1.3fr)' },
  { key: 'parent', label: 'Người gửi', width: 'minmax(148px,1.15fr)' },
  { key: 'status', label: 'Trạng thái', width: 'minmax(140px,1.1fr)', sortValue: (r) => r.status },
  { key: 'actions', label: 'Thao tác', width: '196px', align: 'end', srOnly: true },
];

// "T3 27/10 16:15–17:30"
function sessionLabel(startsAt: Date, endsAt: Date): string {
  const key = vnDateKey(startsAt);
  return `${weekdayLabel(weekdayOfKey(key))} ${dateKeyLabel(key).slice(0, 5)} ${vnTimeLabel(startsAt)}–${vnTimeLabel(endsAt)}`;
}

// Màn Đơn nghỉ: duyệt, từ chối đơn phụ huynh gửi qua bot; ghi đơn hộ khi phụ huynh gọi điện. Web là bảng (giữ nguyên DataGrid overflowY === 0), điện thoại là thẻ.
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
  const [detailFor, setDetailFor] = useState<LeaveListRow | null>(null);

  function unbook(row: LeaveListRow) {
    startTransition(async () => {
      const r = await cancelMakeupAction(row.id);
      notify(r.message ?? (r.ok ? 'Đã bỏ' : 'Không bỏ được'));
      setToUnbook(null);
      setDetailFor(null);
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
      setDetailFor(null);
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
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="tabular-nums text-[var(--fgColor-muted)]">
          Học bù: lớp {m.className} · {sessionLabel(new Date(m.startsAt), new Date(m.endsAt))}
        </span>
        <button
          type="button"
          data-link="true"
          onClick={() => setMakeupFor(r)}
          className="inline-flex items-center gap-1 text-[var(--fgColor-accent)] underline underline-offset-2"
        >
          <SyncIcon size={12} aria-hidden />
          Đổi
        </button>
        <button
          type="button"
          data-link="true"
          onClick={() => setToUnbook(r)}
          className="inline-flex items-center gap-1 text-blush-ink underline underline-offset-2"
        >
          <TrashIcon size={12} aria-hidden />
          Bỏ
        </button>
      </div>
    ) : (
      <button
        type="button"
        data-link="true"
        onClick={() => setMakeupFor(r)}
        className="inline-flex items-center gap-1 self-start text-xs font-medium text-[var(--fgColor-accent)] underline underline-offset-2"
      >
        <CalendarIcon size={13} aria-hidden />
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
      {r.decidedBy && <small className="text-xs text-[var(--fgColor-muted)]">{r.decidedBy}</small>}
      {withMakeup && makeupLine(r)}
    </div>
  );

  const decideButtons = (r: LeaveListRow, block = false) => (
    <>
      <Btn
        variant="primary"
        block={block}
        leadingVisual={CheckIcon}
        onClick={() => decide(r, true)}
        disabled={pending}
        aria-label={`Duyệt đơn của ${r.studentName}`}
      >
        Duyệt
      </Btn>
      <Btn
        variant="danger"
        block={block}
        leadingVisual={XIcon}
        onClick={() => setToDeny(r)}
        disabled={pending}
        aria-label={`Từ chối đơn của ${r.studentName}`}
      >
        Từ chối
      </Btn>
    </>
  );

  const cell = (r: LeaveListRow, key: string) => {
    switch (key) {
      case 'student':
        return (
          <div className="flex min-w-0 items-center gap-2" title={`${r.studentName} · ${r.className}`}>
            <InitialBadge name={r.studentName} seed={r.studentId} />
            <Link
              href={`/hoc-sinh/${r.studentId}`}
              data-link="true"
              className="min-w-0 truncate text-[13.5px] font-medium text-[var(--fgColor-default)] transition-colors hover:text-[var(--primary)] hover:underline"
            >
              {r.studentName}
            </Link>
            <span className="inline-flex shrink-0 items-center rounded-[5px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--primary-deep)]">
              {r.className}
            </span>
          </div>
        );
      case 'session':
        return (
          <button
            type="button"
            data-link="true"
            onClick={() => setDetailFor(r)}
            className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/70 px-2 py-1 font-mono text-xs font-medium tabular-nums text-[var(--fgColor-default)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]/50 hover:text-[var(--primary-deep)]"
          >
            <CalendarIcon size={12} className="shrink-0 text-[var(--fgColor-muted)]" aria-hidden />
            <span>{sessionLabel(r.startsAt, r.endsAt)}</span>
          </button>
        );
      case 'reason':
        return (
          <span className="block truncate text-[13px] text-[var(--ink-2)]" title={r.reason ?? ''}>
            {r.reason || <span className="text-[var(--fgColor-muted)] opacity-60">—</span>}
          </span>
        );
      case 'parent':
        return r.parentName ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="truncate text-[13px] font-medium text-[var(--fgColor-default)]">{r.parentName}</span>
            {r.parentPhone && (
              <span className="inline-flex items-center gap-1.5">
                <a
                  href={`tel:${r.parentPhone}`}
                  data-link="true"
                  className="font-mono text-xs font-normal tabular-nums text-[var(--fgColor-accent)] hover:underline"
                >
                  {r.parentPhone}
                </a>
                <ZaloLink phone={r.parentPhone} name={r.parentName} variant="link" />
              </span>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center rounded-[5px] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--ink-2)]">
            Giáo vụ ghi
          </span>
        );
      case 'status':
        return statusCell(r);
      case 'actions':
        return (
          <div className="flex items-center justify-end gap-1.5">
            {canDecide(r) && decideButtons(r)}
            <ActIcon
              quiet
              label={`Xem chi tiết đơn của ${r.studentName}`}
              icon={EyeIcon}
              onClick={() => setDetailFor(r)}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const card = (r: LeaveListRow) => (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <InitialBadge name={r.studentName} seed={r.studentId} size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/hoc-sinh/${r.studentId}`}
                data-link="true"
                className="text-[15px] font-semibold text-[var(--fgColor-default)] hover:text-[var(--primary)] hover:underline"
              >
                {r.studentName}
              </Link>
              <span className="inline-flex items-center rounded-[5px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--primary-deep)]">
                {r.className}
              </span>
            </div>
            <small className="mt-1 block font-mono text-xs tabular-nums text-[var(--fgColor-muted)]">
              {sessionLabel(r.startsAt, r.endsAt)}
            </small>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {statusCell(r, false)}
          <ActIcon quiet label={`Xem chi tiết đơn của ${r.studentName}`} icon={EyeIcon} onClick={() => setDetailFor(r)} />
        </div>
      </div>
      {r.reason && <p className="m-0 text-sm text-[var(--ink-2)]">Lý do: {r.reason}</p>}
      {makeupLine(r)}
      <small className="text-xs text-[var(--fgColor-muted)]">
        {r.parentName ? (
          <>
            Gửi bởi <b className="font-medium text-[var(--fgColor-default)]">{r.parentName}</b>
            {r.parentPhone && (
              <>
                {' · '}
                <a
                  href={`tel:${r.parentPhone}`}
                  data-link="true"
                  className="font-mono tabular-nums text-[var(--fgColor-accent)] underline underline-offset-2"
                >
                  {r.parentPhone}
                </a>{' '}
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
      <PageCrumbs crumbs={['Đào tạo', 'Đơn nghỉ']} />
      <h1 className="sr-only">Đơn nghỉ</h1>

      <DataGrid
        label="Đơn nghỉ"
        columns={COLUMNS}
        rows={rows}
        rowKey={(r) => r.id}
        cell={cell}
        card={card}
        from="md"
        fill
        title={
          <ChipGroup label="Lọc đơn nghỉ">
            {FILTERS.map((f) => (
              <Chip key={f.key} selected={filter === f.key} count={counts[f.key]} onClick={() => go({ f: f.key })}>
                {f.label}
              </Chip>
            ))}
          </ChipGroup>
        }
        actionComponent={
          <>
            <ComboBox
              label="Lớp"
              auto
              variant="bar"
              icon={<PeopleIcon size={14} className="text-[var(--fgColor-muted)]" aria-hidden />}
              value={classId ? String(classId) : ''}
              onChange={(v) => go({ cls: v ? Number(v) : null })}
              options={[{ value: '', label: 'Tất cả lớp' }, ...classes.map((c) => ({ value: String(c.id), label: c.name }))]}
            />
            <Btn variant="primary" leadingVisual={PlusIcon} onClick={() => setAdding(true)}>
              Ghi đơn nghỉ
            </Btn>
          </>
        }
        empty={<EmptyPanel title={filter === 'pending' ? 'Không có đơn nào chờ duyệt.' : 'Không có đơn phù hợp với bộ lọc này.'} />}
      />

      {detailFor && (
        <LeaveDetailDialog
          row={detailFor}
          makeup={makeups[detailFor.id]}
          pending={pending}
          canDecide={canDecide(detailFor)}
          canMakeup={canMakeup(detailFor)}
          onClose={() => setDetailFor(null)}
          onApprove={() => decide(detailFor, true)}
          onDeny={() => {
            const target = detailFor;
            setDetailFor(null);
            setToDeny(target);
          }}
          onOpenMakeup={() => {
            const target = detailFor;
            setDetailFor(null);
            setMakeupFor(target);
          }}
          onUnbookMakeup={() => {
            const target = detailFor;
            setDetailFor(null);
            setToUnbook(target);
          }}
        />
      )}

      <ConfirmDialog
        open={!!toDeny}
        title="Từ chối đơn nghỉ?"
        text={
          toDeny
            ? `Đơn của ${toDeny.studentName} buổi ${sessionLabel(toDeny.startsAt, toDeny.endsAt)}. Phụ huynh nhận tin báo đơn chưa được duyệt, Thầy/Cô nhớ liên hệ lại.`
            : ''
        }
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

// Hộp thoại Chi tiết & Duyệt đơn nghỉ chuẩn 01. TSUKUBA
function LeaveDetailDialog({
  row,
  makeup,
  pending,
  canDecide,
  canMakeup,
  onClose,
  onApprove,
  onDeny,
  onOpenMakeup,
  onUnbookMakeup,
}: {
  row: LeaveListRow;
  makeup?: { className: string; startsAt: Date; endsAt: Date };
  pending: boolean;
  canDecide: boolean;
  canMakeup: boolean;
  onClose: () => void;
  onApprove: () => void;
  onDeny: () => void;
  onOpenMakeup: () => void;
  onUnbookMakeup: () => void;
}) {
  return (
    <Modal
      open
      size="md"
      title={`Đơn xin nghỉ · ${row.studentName}`}
      subtitle={`Lớp ${row.className} · ${sessionLabel(row.startsAt, row.endsAt)}`}
      onClose={onClose}
      labelledBy="leave-detail-title"
    >
      <div className="flex flex-col gap-3.5">
        <div className="overflow-hidden rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/60 p-3.5">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--borderColor-muted)] pb-2.5">
            <Pill tone={row.status === 'pending' && row.past ? 'stone' : STATUS_META[row.status].tone}>
              {row.status === 'pending' && row.past ? 'Quá hạn duyệt' : STATUS_META[row.status].label}
            </Pill>
            <span className="font-mono text-xs tabular-nums text-[var(--fgColor-muted)]">
              {sessionLabel(row.startsAt, row.endsAt)}
            </span>
          </div>

          <dl className="m-0 grid grid-cols-[6.75rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-xs text-[var(--fgColor-muted)]">Học sinh</dt>
            <dd className="m-0 font-semibold text-[var(--fgColor-default)]">
              <Link href={`/hoc-sinh/${row.studentId}`} data-link="true" className="text-[var(--fgColor-link)] hover:underline">
                {row.studentName}
              </Link>
            </dd>

            <dt className="text-xs text-[var(--fgColor-muted)]">Lớp học</dt>
            <dd className="m-0 font-mono text-xs text-[var(--fgColor-default)]">{row.className}</dd>

            <dt className="text-xs text-[var(--fgColor-muted)]">Người gửi</dt>
            <dd className="m-0 text-[var(--fgColor-default)]">
              {row.parentName ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span>{row.parentName}</span>
                  {row.parentPhone && (
                    <>
                      <a
                        href={`tel:${row.parentPhone}`}
                        data-link="true"
                        className="font-mono text-xs tabular-nums text-[var(--fgColor-accent)] hover:underline"
                      >
                        {row.parentPhone}
                      </a>
                      <ZaloLink phone={row.parentPhone} name={row.parentName} variant="link" />
                    </>
                  )}
                </span>
              ) : (
                <span className="text-[var(--fgColor-muted)]">Giáo vụ ghi nhận</span>
              )}
            </dd>

            <dt className="text-xs text-[var(--fgColor-muted)]">Lý do nghỉ</dt>
            <dd className="m-0 text-[var(--fgColor-default)]">{row.reason || 'Không ghi lý do'}</dd>

            {row.decidedBy && (
              <>
                <dt className="text-xs text-[var(--fgColor-muted)]">Xử lý bởi</dt>
                <dd className="m-0 text-[var(--fgColor-default)]">{row.decidedBy}</dd>
              </>
            )}
          </dl>
        </div>

        {canMakeup && (
          <FormSection title="Lịch học bù" grid={false}>
            {makeup ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <b className="font-semibold text-[var(--fgColor-default)]">Lớp {makeup.className}</b>
                  <span className="ml-2 font-mono text-xs tabular-nums text-[var(--fgColor-muted)]">
                    {sessionLabel(new Date(makeup.startsAt), new Date(makeup.endsAt))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Btn variant="ghost" leadingVisual={SyncIcon} onClick={onOpenMakeup}>
                    Đổi buổi bù
                  </Btn>
                  <Btn variant="danger" leadingVisual={TrashIcon} onClick={onUnbookMakeup}>
                    Bỏ học bù
                  </Btn>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-[var(--fgColor-muted)]">Chưa xếp buổi học bù cho đơn nghỉ này.</span>
                <Btn variant="primary" leadingVisual={CalendarIcon} onClick={onOpenMakeup}>
                  Xếp học bù
                </Btn>
              </div>
            )}
          </FormSection>
        )}

        <FormFooter>
          <Btn onClick={onClose}>Đóng</Btn>
          {canDecide && (
            <>
              <Btn variant="danger" leadingVisual={XIcon} onClick={onDeny} disabled={pending}>
                Từ chối
              </Btn>
              <Btn variant="primary" leadingVisual={CheckIcon} loading={pending} onClick={onApprove} disabled={pending}>
                Duyệt đơn
              </Btn>
            </>
          )}
        </FormFooter>
      </div>
    </Modal>
  );
}

// Ghi đơn nghỉ hộ phụ huynh: chọn lớp, học sinh, buổi sắp tới, lý do. Đơn được duyệt ngay.
function AddLeaveDialog({
  classes,
  defaultClassId,
  onClose,
  onDone,
}: {
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
    <Modal
      open
      size="md"
      title="Ghi đơn nghỉ"
      subtitle="Khi phụ huynh gọi điện hoặc nhắn ngoài bot. Đơn được duyệt ngay và ghi nhận vắng có phép."
      onClose={onClose}
      labelledBy="add-leave-title"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
        className="flex flex-col gap-3.5"
      >
        {(error.message || loadError) && <Alert>{error.message ?? loadError}</Alert>}

        <Callout tone="info">
          Đơn ghi trực tiếp bởi giáo vụ/giáo viên được duyệt tự động và đồng bộ sang trạng thái <b>Có phép</b> ở màn Điểm danh.
        </Callout>

        <FormSection title="Thông tin đơn xin nghỉ" description="Chọn lớp, học sinh và buổi học sắp tới cần xin phép.">
          <Field label="Lớp *">
            <ComboBox
              label="Lớp của học sinh"
              block
              value={classId}
              onChange={(next) => {
                if (next) chooseClass(next);
              }}
              options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            />
          </Field>
          <Field
            label="Học sinh *"
            error={errors.studentId}
            hint={options && options.students.length === 0 ? 'Lớp chưa có học sinh đang học' : undefined}
          >
            <ComboBox
              label="Học sinh nghỉ"
              block
              value={studentId}
              onChange={(val) => {
                if (val) setStudentId(val);
              }}
              disabled={!options || options.students.length === 0}
              options={(options?.students ?? []).map((s) => ({ value: String(s.id), label: s.name }))}
              error={Boolean(errors.studentId)}
            />
          </Field>
          <Field
            label="Buổi nghỉ *"
            error={errors.sessionId}
            hint={options && options.sessions.length === 0 ? 'Lớp không còn buổi sắp tới' : undefined}
          >
            <ComboBox
              label="Buổi nghỉ"
              block
              value={sessionId}
              onChange={(val) => {
                if (val) setSessionId(val);
              }}
              disabled={!options || options.sessions.length === 0}
              options={(options?.sessions ?? []).map((s) => ({
                value: String(s.id),
                label: sessionLabel(new Date(s.startsAt), new Date(s.endsAt)),
              }))}
              error={Boolean(errors.sessionId)}
            />
          </Field>
          <Field label="Lý do">
            <TextInput
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              placeholder="VD: Ốm, phụ huynh gọi điện báo"
              autoComplete="off"
              aria-label="Lý do"
              block
            />
          </Field>
        </FormSection>

        <FormFooter>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn type="submit" variant="primary" loading={saving} disabled={saving || !studentId || !sessionId}>
            {saving ? 'Đang ghi…' : 'Ghi đơn nghỉ'}
          </Btn>
        </FormFooter>
      </form>
    </Modal>
  );
}

// Chọn buổi học bù: buổi sắp tới của lớp khác cùng trình độ, cùng cơ sở, còn chỗ, không trùng giờ lớp của học sinh
function MakeupDialog({
  row,
  onClose,
  onDone,
}: {
  row: LeaveListRow;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
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
    <Modal
      open
      size="md"
      title={`Xếp học bù · ${row.studentName}`}
      subtitle={`Nghỉ buổi ${sessionLabel(row.startsAt, row.endsAt)} lớp ${row.className}. Chọn một buổi của lớp cùng trình độ.`}
      onClose={onClose}
      labelledBy="makeup-title"
    >
      <div className="flex flex-col gap-3.5">
        {/* Tsukuba .kv summary box */}
        <div className="rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/60 p-3.5">
          <dl className="m-0 grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
            <dt className="text-xs text-[var(--fgColor-muted)]">Học sinh</dt>
            <dd className="m-0 font-semibold text-[var(--fgColor-default)]">{row.studentName}</dd>
            <dt className="text-xs text-[var(--fgColor-muted)]">Buổi nghỉ</dt>
            <dd className="m-0 font-mono text-xs tabular-nums text-[var(--fgColor-default)]">
              Lớp {row.className} · {sessionLabel(row.startsAt, row.endsAt)}
            </dd>
          </dl>
        </div>

        {error && <Alert>{error}</Alert>}

        <FormSection
          title="Buổi học bù phù hợp (21 ngày tới)"
          description="Lọc các lớp cùng trình độ, cùng cơ sở, còn chỗ trống và không trùng lịch chính."
          grid={false}
        >
          {!list && !error && <p className="m-0 text-sm text-[var(--fgColor-muted)]">Đang tìm buổi phù hợp…</p>}
          {list && list.length === 0 && (
            <p className="m-0 text-sm text-[var(--fgColor-muted)]">
              Không có buổi phù hợp trong 21 ngày tới (lớp cùng trình độ, cùng cơ sở, còn chỗ, không trùng giờ lớp của em).
            </p>
          )}
          {list && list.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {list.map((c) => (
                <li
                  key={c.sessionId}
                  className="flex items-center justify-between gap-3 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-3 py-2.5 transition-colors hover:border-[var(--borderColor-accent-emphasis)] hover:bg-[var(--bgColor-accent-muted)]"
                >
                  <div className="min-w-0">
                    <b className="flex flex-wrap items-center gap-1.5 text-sm font-semibold tabular-nums text-[var(--fgColor-default)]">
                      <ClockIcon size={13} className="shrink-0 text-[var(--fgColor-muted)]" aria-hidden />
                      {sessionLabel(new Date(c.startsAt), new Date(c.endsAt))} · lớp {c.className}
                    </b>
                    <small className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-[var(--fgColor-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <PersonIcon size={12} aria-hidden />
                        {c.teacherName}
                      </span>
                      {c.room && (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <LocationIcon size={12} aria-hidden />
                          {c.room}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums text-mint-ink">
                        <PeopleIcon size={12} aria-hidden />
                        còn {c.seatsLeft} chỗ
                      </span>
                    </small>
                  </div>
                  <Btn variant="primary" leadingVisual={CheckIcon} onClick={() => choose(c)} disabled={saving}>
                    Chọn
                  </Btn>
                </li>
              ))}
            </ul>
          )}
        </FormSection>

        <FormFooter>
          <Btn onClick={onClose}>Đóng</Btn>
        </FormFooter>
      </div>
    </Modal>
  );
}
