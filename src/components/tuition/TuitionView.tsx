'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState, useTransition, startTransition, type FormEvent } from 'react';
import { loadPaymentsAction, recordPaymentAction, remindTuitionAction } from '@/app/(app)/hoc-phi/actions';
import type { InvoiceFilter, InvoiceRow, PaymentRow } from '@/lib/queries/tuition';
import { formatVND } from '@/lib/money';
import { dateKeyLabel } from '@/lib/datetime';
import type { ActionResult } from '@/lib/validation/student';
import { Field, FORM_BTN_CANCEL, FORM_BTN_SUBMIT, inputClass, FormFooter } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pill, type Tone, Alert } from '@/components/ui/primitives';
import { Toast, useToast } from '@/components/ui/Toast';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { EmptyPanel, Card } from '@/components/ui/surfaces';
import { Btn } from '@/components/ui/Btn';
import { QrImage } from './QrImage';
import { Chip, ChipGroup, TextInput } from '@/components/ui/controls';

const STATE_META: Record<InvoiceRow['state'], { label: string; tone: Tone }> = {
  paid: { label: 'Đã đóng', tone: 'mint' },
  partial: { label: 'Còn nợ', tone: 'butter' },
  unpaid: { label: 'Chưa đóng', tone: 'blush' },
};

const COLUMNS: GridColumn<InvoiceRow>[] = [
  { key: 'fullName', label: 'Học sinh', width: 'minmax(180px,1.6fr)' },
  { key: 'fee', label: 'Học phí', width: 'minmax(110px,1fr)' },
  { key: 'paid', label: 'Đã thu', width: 'minmax(110px,1fr)' },
  { key: 'debt', label: 'Còn nợ', width: 'minmax(110px,1fr)' },
  { key: 'due', label: 'Hạn đóng', width: 'minmax(120px,1fr)', sortValue: (r) => r.dueDate },
  { key: 'status', label: 'Trạng thái', width: 'minmax(110px,1fr)', sortValue: (r) => r.state },
  // Đủ chỗ cho hai nút có chữ "Ghi thu", "Nhắc" trên một dòng
  { key: 'actions', label: 'Thao tác', width: '150px', align: 'end', srOnly: true },
];

const FILTERS: { key: InvoiceFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'paid', label: 'Đã đóng' },
  { key: 'partial', label: 'Còn nợ' },
  { key: 'unpaid', label: 'Chưa đóng' },
  { key: 'overdue', label: 'Quá hạn' },
];

// Màn học phí: hoá đơn từng học sinh, ghi thu và nhắc đóng. Web là bảng, điện thoại là thẻ.
export function TuitionView({
  rows,
  counts,
  totalDebt,
  filter,
  q,
  canManage,
}: {
  rows: InvoiceRow[];
  counts: Record<InvoiceFilter, number>;
  totalDebt: number;
  filter: InvoiceFilter;
  q: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const { message, notify } = useToast();
  const [paying, setPaying] = useState<InvoiceRow | null>(null);
  const [pending, startRemind] = useTransition();
  const [search, setSearch] = useState(q);

  function go(next: { f?: InvoiceFilter; q?: string }) {
    const params = new URLSearchParams();
    const f = next.f ?? filter;
    const query = next.q ?? search;
    if (f !== 'all') params.set('f', f);
    if (query.trim()) params.set('q', query.trim());
    const qs = params.toString();
    router.push(qs ? `/hoc-phi?${qs}` : '/hoc-phi', { scroll: false });
  }

  function remind(row: InvoiceRow) {
    startRemind(async () => {
      const r = await remindTuitionAction(Number(row.id));
      notify(r.message ?? (r.ok ? 'Đã ghi nhắc' : 'Không ghi được'));
    });
  }

  const cell = (r: InvoiceRow, key: string) => {
    switch (key) {
      case 'fullName':
        return (
          <div className="min-w-0">
            <Link href={`/hoc-sinh/${r.id}`} className="text-base font-normal text-link underline underline-offset-2">{r.fullName}</Link>
            <small className="block truncate text-xs text-muted">{r.code} · {r.className}</small>
          </div>
        );
      case 'fee':
        return <span className="text-base text-ink">{formatVND(r.fee)}</span>;
      case 'paid':
        return <span className="text-base text-ink">{formatVND(r.paid)}</span>;
      case 'debt':
        return <span className={`text-base font-bold ${r.debt > 0 ? 'text-blush-ink' : 'text-muted'}`}>{formatVND(r.debt)}</span>;
      case 'due':
        return (
          <div className="text-sm">
            <span className="text-ink-2">{dateKeyLabel(r.dueDate)}</span>
            {r.overdue && <span className="ml-1.5"><Pill tone="blush">Quá hạn</Pill></span>}
          </div>
        );
      case 'status':
        return <Pill tone={STATE_META[r.state].tone}>{STATE_META[r.state].label}</Pill>;
      case 'actions':
        return (
          <div className="flex justify-end gap-1.5">
            {canManage && r.debt > 0 && (
              <>
                <Btn onClick={() => setPaying(r)}>Ghi thu</Btn>
                <Btn onClick={() => remind(r)} disabled={pending}>Nhắc</Btn>
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const card = (r: InvoiceRow) => (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/hoc-sinh/${r.id}`} className="text-base font-normal text-link underline underline-offset-2">{r.fullName}</Link>
          <small className="block truncate text-xs text-muted">{r.code} · {r.className}</small>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Pill tone={STATE_META[r.state].tone}>{STATE_META[r.state].label}</Pill>
          {r.overdue && <Pill tone="blush">Quá hạn</Pill>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-bg px-3 py-2.5 text-center">
        <div><small className="block text-xs text-muted">Học phí</small><b className="text-sm text-ink">{formatVND(r.fee)}</b></div>
        <div><small className="block text-xs text-muted">Đã thu</small><b className="text-sm text-ink">{formatVND(r.paid)}</b></div>
        <div><small className="block text-xs text-muted">Còn nợ</small><b className={`text-sm ${r.debt > 0 ? 'text-blush-ink' : 'text-ink'}`}>{formatVND(r.debt)}</b></div>
      </div>
      <small className="text-sm text-ink-2">Hạn đóng {dateKeyLabel(r.dueDate)}</small>
      {canManage && r.debt > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <Btn block variant="primary" onClick={() => setPaying(r)}>Ghi thu</Btn>
          <Btn block onClick={() => remind(r)} disabled={pending}>Nhắc đóng</Btn>
        </div>
      )}
    </Card>
  );

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Tài chính', 'Học phí']}
        title="Học phí"
        subtitle={`Hạn đóng là ngày đến hạn trong Cài đặt của tháng sau tháng khai giảng. Còn phải thu ${formatVND(totalDebt)}.`}
      />

      <ChipGroup label="Lọc học phí" className="mb-4">
        {FILTERS.map((f) => (
          <Chip key={f.key} selected={filter === f.key} count={counts[f.key]} onClick={() => go({ f: f.key })}>
            {f.label}
          </Chip>
        ))}
      </ChipGroup>

      <form
        role="search"
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          go({ q: search });
        }}
        className="mb-4 flex items-center gap-2"
      >
        <TextInput
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm học sinh theo tên hoặc mã HS-"
          className="flex-1"
        />
        <Btn type="submit" variant="ghost">Tìm</Btn>
      </form>

      <DataGrid
        label="Hoá đơn học phí"
        columns={COLUMNS}
        rows={rows}
        rowKey={(r) => r.id}
        cell={cell}
        card={card}
        from="md"
        empty={<EmptyPanel title="Không có học sinh phù hợp với bộ lọc này." />}
      />

      {paying && <PaymentDialog row={paying} onClose={() => setPaying(null)} onDone={(m) => { setPaying(null); notify(m); router.refresh(); }} />}
      <Toast message={message} />
    </section>
  );
}

// Hộp thoại ghi thu: số tiền mặc định là số còn nợ, có lịch sử thu của học sinh
function PaymentDialog({ row, onClose, onDone }: { row: InvoiceRow; onClose: () => void; onDone: (message: string) => void }) {
  const [history, setHistory] = useState<PaymentRow[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [qr, setQr] = useState<{ payload: string; bankLine: string } | null>(null);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result = await recordPaymentAction(Number(row.id), prev, formData);
    if (result.ok) onDone(result.message ?? 'Đã ghi nhận');
    return result;
  }, { ok: false });
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    let alive = true;
    loadPaymentsAction(Number(row.id)).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setHistory(r.payments);
        setQr(r.qr);
      } else setHistoryError(r.message);
    });
    return () => {
      alive = false;
    };
  }, [row.id]);

  // Gọi action thủ công để ô nhập không bị reset khi có lỗi (E-028)
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <Modal open title={`Ghi thu học phí · ${row.fullName}`} subtitle={`${row.className} · còn nợ ${formatVND(row.debt)}`} onClose={onClose} labelledBy="payment-title">
      <div className="flex flex-col gap-4 pb-2">
        <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
          {state.message && !state.ok && (
            <Alert className="col-span-full">{state.message}</Alert>
          )}
          <Field label="Số tiền thu (VND) *" error={errors.amount} hint={`Tối đa ${formatVND(row.debt)}`}>
            <input name="amount" type="number" inputMode="numeric" min={1} max={row.debt} step={1} defaultValue={row.debt} className={inputClass(errors.amount)} />
          </Field>
          <Field label="Ghi chú" error={errors.note}>
            <input name="note" placeholder="VD: Đóng tiền mặt" autoComplete="off" className={inputClass(errors.note)} />
          </Field>
          <FormFooter className="col-span-full">
            <button type="button" onClick={onClose} className={FORM_BTN_CANCEL}>Huỷ</button>
            <button type="submit" disabled={pending} className={FORM_BTN_SUBMIT}>{pending ? 'Đang ghi…' : 'Ghi nhận thu'}</button>
          </FormFooter>
        </form>

        {qr && (
          <div className="flex items-center gap-3 border-t border-line pt-3 max-[767px]:flex-col max-[767px]:items-start">
            <QrImage payload={qr.payload} size={132} label={`Mã QR chuyển khoản học phí của ${row.fullName}`} />
            <div className="min-w-0">
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Chuyển khoản</h3>
              <p className="text-sm text-ink-2">Phụ huynh quét bằng app ngân hàng: số tiền còn thiếu và nội dung điền sẵn.</p>
              <p className="mt-1 break-words text-sm text-ink">{qr.bankLine}</p>
            </div>
          </div>
        )}

        <div className="border-t border-line pt-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Lịch sử thu</h3>
          {historyError && <p className="text-sm text-blush-ink">{historyError}</p>}
          {!history && !historyError && <p className="text-sm text-muted">Đang tải…</p>}
          {history && history.length === 0 && <p className="text-sm text-muted">Chưa có khoản thu nào.</p>}
          {history && history.length > 0 && (
            <ul className="flex flex-col gap-2">
              {history.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted">{dateKeyLabel(p.paidDate)}{p.note ? ` · ${p.note}` : ''}</span>
                  <b className="text-ink">{formatVND(p.amount)}</b>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
