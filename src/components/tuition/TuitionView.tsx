'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState, useTransition, startTransition, type FormEvent } from 'react';
import { loadPaymentsAction, recordPaymentAction, recordPaymentsBulkAction, refundSurplusAction, remindTuitionAction, voidPaymentAction } from '@/app/(app)/hoc-phi/actions';
import type { InvoiceFilter, InvoiceRow, InvoiceTotals, PaymentRow } from '@/lib/queries/tuition';
import { TUITION_PER_SESSION } from '@/lib/tuition';
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

const PRICE = formatVND(TUITION_PER_SESSION);
// Sắp hết buổi đã mua: còn từ mức này trở xuống thì cần đóng tiếp
const LOW_SESSIONS = 2;
const needsPay = (r: InvoiceRow) => r.debt > 0 || (r.sessionsLeft <= LOW_SESSIONS && (r.status === 'active' || r.status === 'trial'));

const COLUMNS: GridColumn<InvoiceRow>[] = [
  { key: 'fullName', label: 'Học sinh', width: 'minmax(180px,1.6fr)' },
  { key: 'paid', label: 'Đã nộp', width: 'minmax(110px,1fr)' },
  { key: 'discount', label: 'Giảm trừ', width: 'minmax(100px,1fr)' },
  { key: 'bought', label: 'Buổi đã mua', width: 'minmax(96px,0.8fr)', sortValue: (r) => r.sessionsBought },
  { key: 'done', label: 'Đã học', width: 'minmax(80px,0.7fr)', sortValue: (r) => r.sessionsDone },
  { key: 'left', label: 'Còn lại', width: 'minmax(110px,0.9fr)', sortValue: (r) => r.sessionsLeft },
  { key: 'balance', label: 'Tiền trước/nợ', width: 'minmax(130px,1fr)', sortValue: (r) => r.balance },
  { key: 'status', label: 'Trạng thái', width: 'minmax(110px,1fr)', sortValue: (r) => r.state },
  // Đủ chỗ cho hai nút có chữ "Ghi thu", "Nhắc" trên một dòng
  { key: 'actions', label: 'Thao tác', width: '150px', align: 'end', srOnly: true },
];

// Cột chọn dòng để ghi thu nhiều học sinh cùng lúc (chỉ hiện với người có quyền thu)
const SELECT_COL: GridColumn<InvoiceRow> = { key: 'select', label: 'Chọn', width: '44px', srOnly: true };

const FILTERS: { key: InvoiceFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'paid', label: 'Đã đóng' },
  { key: 'partial', label: 'Còn nợ' },
  { key: 'unpaid', label: 'Chưa đóng' },
  { key: 'overdue', label: 'Quá hạn' },
];

// Màn học phí theo buổi: đã nộp quy ra buổi, trừ dần theo buổi đã học. Web là bảng, điện thoại là thẻ.
export function TuitionView({
  rows,
  counts,
  totalDebt,
  totals,
  filter,
  q,
  canManage,
}: {
  rows: InvoiceRow[];
  counts: Record<InvoiceFilter, number>;
  totalDebt: number;
  totals: InvoiceTotals;
  filter: InvoiceFilter;
  q: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const { message, notify } = useToast();
  const [paying, setPaying] = useState<InvoiceRow | null>(null);
  // Học sinh được chọn để ghi thu hàng loạt
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const pickedRows = canManage ? rows.filter((r) => picked.has(r.id)) : [];
  const needRows = rows.filter(needsPay);
  function togglePick(id: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const [refunding, setRefunding] = useState<InvoiceRow | null>(null);
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

  const canRefund = (r: InvoiceRow) => canManage && r.balance > 0 && r.paid > 0 && (r.status === 'finished' || r.status === 'paused');

  const cell = (r: InvoiceRow, key: string) => {
    switch (key) {
      case 'select':
        return <input type="checkbox" checked={picked.has(r.id)} onChange={() => togglePick(r.id)} aria-label={`Chọn ${r.fullName} để ghi thu`} className="size-4 accent-[var(--primary-deep)]" />;
      case 'fullName':
        return (
          <div className="min-w-0">
            <Link href={`/hoc-sinh/${r.id}`} className="text-base font-normal text-link underline underline-offset-2">{r.fullName}</Link>
            <small className="block truncate text-xs text-muted">{r.code} · {r.className}</small>
          </div>
        );
      case 'paid':
        return <span className="text-base text-ink tabular-nums">{formatVND(r.paid)}</span>;
      case 'discount':
        return <span className="text-base text-ink tabular-nums">{r.discount ? formatVND(r.discount) : ''}</span>;
      case 'bought':
        return <span className="text-base text-ink tabular-nums">{r.sessionsBought} buổi</span>;
      case 'done':
        return <span className="text-base text-ink tabular-nums">{r.sessionsDone} buổi</span>;
      case 'left':
        return <SessionsLeft row={r} />;
      case 'balance':
        return <BalanceText balance={r.balance} />;
      case 'status':
        return (
          <div className="flex flex-wrap gap-1">
            <Pill tone={STATE_META[r.state].tone}>{STATE_META[r.state].label}</Pill>
            {r.overdue && <Pill tone="blush">Quá hạn</Pill>}
          </div>
        );
      case 'actions':
        return (
          <div className="flex justify-end gap-1.5">
            {canManage && <Btn onClick={() => setPaying(r)}>Ghi thu</Btn>}
            {canManage && needsPay(r) && <Btn onClick={() => remind(r)} disabled={pending}>Nhắc</Btn>}
            {canRefund(r) && <Btn onClick={() => setRefunding(r)}>Hoàn số dư</Btn>}
          </div>
        );
      default:
        return null;
    }
  };

  const card = (r: InvoiceRow) => (
    <Card>
      {canManage && (
        <label className="mb-2 flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={picked.has(r.id)} onChange={() => togglePick(r.id)} className="size-4 accent-[var(--primary-deep)]" />
          Chọn để ghi thu
        </label>
      )}
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
        <div><small className="block text-xs text-muted">Đã mua</small><b className="text-sm text-ink">{r.sessionsBought} buổi</b></div>
        <div><small className="block text-xs text-muted">Đã học</small><b className="text-sm text-ink">{r.sessionsDone} buổi</b></div>
        <div><small className="block text-xs text-muted">Còn lại</small><SessionsLeft row={r} /></div>
        <div><small className="block text-xs text-muted">Đã nộp</small><b className="text-sm text-ink">{formatVND(r.paid)}</b></div>
        <div><small className="block text-xs text-muted">Giảm trừ</small><b className="text-sm text-ink">{formatVND(r.discount)}</b></div>
        <div><small className="block text-xs text-muted">Tiền trước/nợ</small><BalanceText balance={r.balance} /></div>
      </div>
      {canManage && (
        <div className={`grid gap-2 ${needsPay(r) ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <Btn block variant="primary" onClick={() => setPaying(r)}>Ghi thu</Btn>
          {needsPay(r) && <Btn block onClick={() => remind(r)} disabled={pending}>Nhắc đóng</Btn>}
        </div>
      )}
      {canRefund(r) && <Btn block onClick={() => setRefunding(r)}>Hoàn số dư</Btn>}
    </Card>
  );

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Tài chính', 'Học phí']}
        title="Học phí"
        subtitle={`Học phí ${PRICE} một buổi. Nộp bao nhiêu thì cộng bấy nhiêu buổi, học buổi nào trừ buổi đó. Đang nợ ${formatVND(totalDebt)}.`}
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

      <TotalsStrip totals={totals} />

      {canManage && rows.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {pickedRows.length === 0 ? (
            needRows.length > 0 && <Btn onClick={() => setPicked(new Set(needRows.map((r) => r.id)))}>Chọn tất cả cần đóng ({needRows.length})</Btn>
          ) : (
            <>
              <div role="status" className="min-w-0 flex-1 rounded-[var(--radius-ctl)] bg-primary-soft px-3 py-2 text-sm text-ink">
                <b>Đã chọn {pickedRows.length} học sinh</b>
              </div>
              <Btn onClick={() => setPicked(new Set())}>Bỏ chọn</Btn>
              <Btn variant="primary" onClick={() => setBulkOpen(true)}>Ghi thu cho {pickedRows.length} học sinh</Btn>
            </>
          )}
        </div>
      )}

      <DataGrid
        label="Học phí theo buổi"
        columns={canManage ? [SELECT_COL, ...COLUMNS] : COLUMNS}
        rows={rows}
        rowKey={(r) => r.id}
        cell={cell}
        card={card}
        from="md"
        empty={<EmptyPanel title="Không có học sinh phù hợp với bộ lọc này." />}
      />

      {paying && <PaymentDialog row={paying} canManage={canManage} onClose={() => setPaying(null)} onDone={(m) => { setPaying(null); notify(m); router.refresh(); }} />}
      {bulkOpen && pickedRows.length > 0 && (
        <BulkPaymentDialog
          rows={pickedRows}
          onClose={() => setBulkOpen(false)}
          onDone={(m) => { setBulkOpen(false); setPicked(new Set()); notify(m); router.refresh(); }}
        />
      )}
      {refunding && <RefundDialog row={refunding} onClose={() => setRefunding(null)} onDone={(m) => { setRefunding(null); notify(m); router.refresh(); }} />}
      <Toast message={message} />
    </section>
  );
}

// Dải tổng ngoài bảng: đã nộp, giảm trừ, buổi đã mua, tiền trước hoặc nợ của mọi học sinh trong phạm vi đang xem
function TotalsStrip({ totals }: { totals: InvoiceTotals }) {
  const label = totals.balance < 0 ? 'Đang nợ' : totals.balance > 0 ? 'Tiền trước' : 'Tiền trước/nợ';
  const items: { label: string; value: string; tone: string }[] = [
    { label: 'Đã nộp', value: formatVND(totals.paid), tone: 'text-ink' },
    { label: 'Giảm trừ', value: formatVND(totals.discount), tone: 'text-ink' },
    { label: 'Buổi đã mua', value: `${totals.sessionsBought.toLocaleString('vi-VN')} buổi`, tone: 'text-ink' },
    { label, value: formatVND(Math.abs(totals.balance)), tone: totals.balance < 0 ? 'text-blush-ink' : totals.balance > 0 ? 'text-mint-ink' : 'text-muted' },
  ];
  return (
    <dl className="mb-4 grid grid-cols-2 gap-2.5 min-[768px]:grid-cols-4" aria-label="Tổng học phí">
      {items.map((it) => (
        <div key={it.label} className="rounded-[var(--radius-panel)] bg-surface p-3.5 shadow-card">
          <dt className="text-xs text-muted">{it.label}</dt>
          <dd className={`mt-0.5 text-lg font-extrabold tabular-nums ${it.tone}`}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// Buổi còn lại: âm là học quá số buổi đã mua (đang nợ buổi)
function SessionsLeft({ row }: { row: InvoiceRow }) {
  if (row.sessionsLeft < 0) return <b className="text-sm font-bold text-blush-ink">Nợ {-row.sessionsLeft} buổi</b>;
  const low = row.sessionsLeft <= LOW_SESSIONS;
  return <b className={`text-sm tabular-nums ${low ? 'font-bold text-butter-ink' : 'font-normal text-ink'}`}>{row.sessionsLeft} buổi</b>;
}

// Tiền trước (dương) hay nợ (âm) của một học sinh, có chữ để không chỉ dựa vào màu
function BalanceText({ balance }: { balance: number }) {
  if (balance < 0) return <span className="text-base font-bold text-blush-ink">Nợ {formatVND(-balance)}</span>;
  if (balance > 0) return <span className="text-base font-bold text-mint-ink">Trước {formatVND(balance)}</span>;
  return <span className="text-base text-muted">{formatVND(0)}</span>;
}

// Ô tiền: hiện "2.500.000", gửi số nguyên qua ô ẩn cùng tên
function MoneyField({ name, value, onChange, invalid, label }: { name: string; value: string; onChange: (digits: string) => void; invalid?: string; label: string }) {
  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        value={value ? Number(value).toLocaleString('vi-VN') : ''}
        placeholder="0"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 10))}
        className={`${inputClass(invalid)} tabular-nums`}
      />
      <input type="hidden" name={name} value={value || '0'} />
    </>
  );
}

// Hộp thoại ghi thu: số tiền, giảm trừ, số buổi được cộng xem ngay; có lịch sử thu của học sinh
function PaymentDialog({ row, canManage, onClose, onDone }: { row: InvoiceRow; canManage: boolean; onClose: () => void; onDone: (message: string) => void }) {
  const [history, setHistory] = useState<PaymentRow[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [voidId, setVoidId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState<string | null>(null);
  const [voiding, startVoid] = useTransition();
  const [qr, setQr] = useState<{ payload: string; bankLine: string } | null>(null);
  // Học phí của số buổi đăng ký; mặc định bằng số đang nợ. Phụ huynh trả = học phí − giảm trừ.
  const [fee, setFee] = useState(row.debt > 0 ? String(row.debt) : '');
  const [discount, setDiscount] = useState('');
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result = await recordPaymentAction(Number(row.id), prev, formData);
    if (result.ok) onDone(result.message ?? 'Đã ghi nhận');
    return result;
  }, { ok: false });
  const errors = state.fieldErrors ?? {};

  // Xem trước: số buổi được cộng theo học phí, tiền phụ huynh trả, số buổi sau khi thu
  const feeValue = Number(fee || 0);
  const discountValue = Number(discount || 0);
  const pay = feeValue - discountValue;
  const addedSessions = Math.floor(feeValue / TUITION_PER_SESSION);
  const boughtAfter = Math.floor(Math.max(0, row.credit + feeValue) / TUITION_PER_SESSION);
  const leftAfter = boughtAfter - row.sessionsDone;

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

  // Huỷ khoản thu đã ghi nhầm: ghi dòng huỷ có lý do, rồi đóng hộp và làm mới số liệu
  function confirmVoid(p: PaymentRow) {
    setVoidError(null);
    startVoid(async () => {
      const r = await voidPaymentAction(p.id, voidReason);
      if (r.ok) onDone(r.message ?? 'Đã huỷ khoản thu');
      else setVoidError(r.message ?? 'Không huỷ được');
    });
  }

  const now = row.sessionsLeft < 0 ? `đang nợ ${-row.sessionsLeft} buổi` : `còn ${row.sessionsLeft} buổi`;
  return (
    <Modal open title={`Ghi thu học phí · ${row.fullName}`} subtitle={`${row.className} · đã mua ${row.sessionsBought} buổi, đã học ${row.sessionsDone}, ${now}`} onClose={onClose} labelledBy="payment-title">
      <div className="flex flex-col gap-4 pb-2">
        <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
          {state.message && !state.ok && (
            <Alert className="col-span-full">{state.message}</Alert>
          )}
          <Field label="Học phí (VND)" error={errors.fee} hint={feeValue > 0 ? `${addedSessions} buổi × ${PRICE}` : `${PRICE} một buổi, đăng ký bao nhiêu cũng được`}>
            <MoneyField name="fee" value={fee} onChange={setFee} invalid={errors.fee} label="Học phí (VND)" />
          </Field>
          <Field label="Giảm trừ (VND)" error={errors.discount} hint="Trừ vào số tiền phụ huynh trả, không đổi số buổi">
            <MoneyField name="discount" value={discount} onChange={setDiscount} invalid={errors.discount} label="Giảm trừ (VND)" />
          </Field>
          <Field label="Ghi chú" error={errors.note}>
            <input name="note" placeholder="VD: Đóng tiền mặt, đăng ký khoá tiếp" autoComplete="off" className={inputClass(errors.note)} />
          </Field>
          <p role="status" className="col-span-full rounded-[var(--radius-ctl)] bg-primary-soft px-3 py-2 text-sm text-ink">
            Phụ huynh trả <b className={pay < 0 ? 'text-blush-ink' : ''}>{formatVND(Math.max(0, pay))}</b>
            {discountValue > 0 ? ` (học phí ${formatVND(feeValue)} − giảm trừ ${formatVND(discountValue)})` : ''}. Cộng <b>{addedSessions} buổi</b>.
            <br />
            Sau khi thu: <b>đã mua {boughtAfter} buổi</b>, đã học {row.sessionsDone},{' '}
            {leftAfter >= 0 ? <b>còn {leftAfter} buổi</b> : <b className="text-blush-ink">còn nợ {-leftAfter} buổi</b>}.
          </p>
          <FormFooter className="col-span-full">
            <button type="button" onClick={onClose} className={FORM_BTN_CANCEL}>Huỷ</button>
            <button type="submit" disabled={pending || feeValue <= 0 || pay < 0} className={FORM_BTN_SUBMIT}>{pending ? 'Đang ghi…' : 'Ghi nhận thu'}</button>
          </FormFooter>
        </form>

        {qr && (
          <div className="flex items-center gap-3 border-t border-line pt-3 max-[767px]:flex-col max-[767px]:items-start">
            <QrImage payload={qr.payload} size={132} label={`Mã QR chuyển khoản học phí của ${row.fullName}`} />
            <div className="min-w-0">
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Chuyển khoản</h3>
              <p className="text-sm text-ink-2">Phụ huynh quét bằng app ngân hàng: nội dung điền sẵn{row.debt > 0 ? ', số tiền đang nợ' : ', số tiền tự nhập'}.</p>
              <p className="mt-1 break-words text-sm text-ink">{qr.bankLine}</p>
            </div>
          </div>
        )}

        <div className="border-t border-line pt-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Lịch sử thu</h3>
          {historyError && <p className="text-sm text-blush-ink">{historyError}</p>}
          {!history && !historyError && <p className="text-sm text-muted">Đang tải…</p>}
          {history && history.length === 0 && <p className="text-sm text-muted">Chưa có khoản thu nào.</p>}
          {voidError && <p role="alert" className="mb-2 text-sm text-blush-ink">{voidError}</p>}
          {history && history.length > 0 && (
            <ul className="flex flex-col gap-2">
              {history.map((p) => {
                const label = p.kind === 'refund' ? 'Hoàn tiền' : p.kind === 'void' ? 'Huỷ khoản' : '';
                const struck = p.voided ? 'line-through text-muted' : '';
                return (
                  <li key={p.id} className="flex flex-col gap-1.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`min-w-0 ${p.voided ? 'text-muted line-through' : 'text-muted'}`}>
                        {dateKeyLabel(p.paidDate)}
                        {label ? ` · ${label}` : ''}
                        {p.discount > 0 ? ` · giảm trừ ${formatVND(p.discount)}` : ''}
                        {p.note ? ` · ${p.note}` : ''}
                        {p.voided ? ' · đã huỷ' : ''}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <b className={struck || 'text-ink'}>{formatVND(p.amount)}</b>
                        {canManage && p.kind === 'payment' && !p.voided && voidId !== p.id && (
                          <Btn onClick={() => { setVoidId(p.id); setVoidReason(''); setVoidError(null); }}>Huỷ</Btn>
                        )}
                      </span>
                    </div>
                    {voidId === p.id && (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={voidReason}
                          onChange={(e) => setVoidReason(e.target.value)}
                          placeholder="Lý do huỷ (VD: ghi nhầm số tiền)"
                          aria-label="Lý do huỷ khoản thu"
                          className={`${inputClass()} min-w-0 flex-1`}
                        />
                        <Btn variant="danger" onClick={() => confirmVoid(p)} disabled={voiding}>Xác nhận huỷ</Btn>
                        <Btn onClick={() => setVoidId(null)} disabled={voiding}>Không huỷ</Btn>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

// Hoàn số dư cho học sinh đã nghỉ hoặc đang bảo lưu. Số tiền mặc định là toàn bộ số dư (không vượt tiền đã thu).
function RefundDialog({ row, onClose, onDone }: { row: InvoiceRow; onClose: () => void; onDone: (message: string) => void }) {
  const max = Math.min(row.balance, row.paid);
  const [amount, setAmount] = useState(String(max));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await refundSurplusAction(Number(row.id), Number(amount), note);
      if (r.ok) onDone(r.message ?? 'Đã hoàn');
      else setError(r.message ?? 'Không hoàn được');
    });
  }

  return (
    <Modal open title={`Hoàn số dư · ${row.fullName}`} subtitle={`Tiền trước ${formatVND(row.balance)} (${row.sessionsLeft} buổi chưa học)`} onClose={onClose} labelledBy="refund-title">
      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3.5 pb-2 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
        {error && <Alert className="col-span-full">{error}</Alert>}
        <Field label="Số tiền hoàn (VND) *" hint={`Tối đa ${formatVND(max)}`}>
          <input name="amount" type="number" inputMode="numeric" min={1} max={max} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass()} />
        </Field>
        <Field label="Ghi chú">
          <input name="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: nghỉ học từ tháng 10" autoComplete="off" className={inputClass()} />
        </Field>
        <FormFooter className="col-span-full">
          <button type="button" onClick={onClose} className={FORM_BTN_CANCEL}>Huỷ</button>
          <button type="submit" disabled={pending} className={FORM_BTN_SUBMIT}>{pending ? 'Đang hoàn…' : 'Hoàn tiền'}</button>
        </FormFooter>
      </form>
    </Modal>
  );
}

// Ghi thu cho nhiều học sinh đã chọn: mỗi người mặc định thu số đang nợ (hoặc để trống), sửa được từng số tiền.
function BulkPaymentDialog({ rows, onClose, onDone }: { rows: InvoiceRow[]; onClose: () => void; onDone: (message: string) => void }) {
  const [amounts, setAmounts] = useState<Record<number, string>>(() => Object.fromEntries(rows.map((r) => [r.id, r.debt > 0 ? String(r.debt) : ''])));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const plan = rows.map((r) => ({ row: r, amount: Number(amounts[r.id] || 0) }));
  const badIds = new Set(plan.filter((p) => p.amount < 1).map((p) => p.row.id));
  const total = plan.reduce((sum, p) => sum + p.amount, 0);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (badIds.size > 0) {
      setError('Nhập số tiền cho từng học sinh đã chọn.');
      return;
    }
    setError(null);
    start(async () => {
      const r = await recordPaymentsBulkAction({ items: plan.map((p) => ({ studentId: p.row.id, amount: p.amount })), note });
      if (r.ok) onDone(r.message ?? 'Đã ghi thu');
      else setError(r.message ?? 'Không ghi thu được');
    });
  }

  return (
    <Modal open title={`Ghi thu cho ${rows.length} học sinh`} subtitle={`Mỗi người mặc định thu số đang nợ. ${PRICE} một buổi, nộp bao nhiêu cũng được.`} onClose={onClose} labelledBy="bulk-payment-title">
      <form onSubmit={submit} noValidate className="flex flex-col gap-3.5 pb-2">
        {error && <Alert>{error}</Alert>}
        <ul className="flex max-h-[50vh] flex-col divide-y divide-line overflow-y-auto">
          {rows.map((r) => {
            const a = Number(amounts[r.id] || 0);
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <b className="block truncate text-base font-normal text-ink">{r.fullName}</b>
                  <small className="block truncate text-xs text-muted">
                    {r.code} · {r.sessionsLeft < 0 ? `nợ ${-r.sessionsLeft} buổi` : `còn ${r.sessionsLeft} buổi`}
                    {a > 0 ? ` · +${Math.floor(a / TUITION_PER_SESSION)} buổi` : ''}
                  </small>
                </div>
                <input
                  aria-label={`Số tiền thu ${r.fullName} (VND)`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={amounts[r.id] ? Number(amounts[r.id]).toLocaleString('vi-VN') : ''}
                  placeholder="0"
                  onChange={(e) => setAmounts((prev) => ({ ...prev, [r.id]: e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 10) }))}
                  className={`${inputClass(badIds.has(r.id) ? 'sai' : undefined)} h-9 w-36 text-right tabular-nums`}
                />
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-ink-2">Tổng thu: <b className="text-ink">{formatVND(total)}</b> từ {rows.length} học sinh. Bấm xác nhận là ghi ngay.</p>
        <Field label="Ghi chú chung" hint="VD: đóng tiền mặt tại lớp">
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} autoComplete="off" className={inputClass()} />
        </Field>
        <FormFooter>
          <button type="button" onClick={onClose} className={FORM_BTN_CANCEL}>Huỷ</button>
          <button type="submit" disabled={pending || badIds.size > 0} className={FORM_BTN_SUBMIT}>{pending ? 'Đang ghi…' : `Xác nhận đã nộp (${rows.length})`}</button>
        </FormFooter>
      </form>
    </Modal>
  );
}
