'use client';

import { CreditCardIcon, SearchIcon } from '@primer/octicons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useActionState, useEffect, useState, useTransition, type FormEvent } from 'react';
import {
  loadPaymentsAction,
  recordPaymentAction,
  recordPaymentsBulkAction,
  refundSurplusAction,
  remindTuitionAction,
  voidPaymentAction,
} from '@/app/(app)/hoc-phi/actions';
import { BulkActionBar, TextAreaAutoHeight, TextInput, TextInputNumber } from '@/components-ui';
import { Btn } from '@/components/ui/Btn';
import { Chip, ChipGroup } from '@/components/ui/controls';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { Field, FormFooter } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageCrumbs } from '@/components/shell/PageCrumbs';
import { Alert, Pill, type Tone } from '@/components/ui/primitives';
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
import { dateKeyLabel } from '@/lib/datetime';
import { formatVND } from '@/lib/money';
import type { InvoiceFilter, InvoiceRow, InvoiceTotals, PaymentRow } from '@/lib/queries/tuition';
import { TUITION_PER_SESSION } from '@/lib/tuition';
import type { ActionResult } from '@/lib/validation/student';
import { QrImage } from './QrImage';

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
  { key: 'fullName', label: 'Học sinh', width: 'minmax(190px,1.9fr)' },
  { key: 'paid', label: 'Đã nộp', width: '104px' },
  { key: 'discount', label: 'Giảm trừ', width: '92px' },
  { key: 'bought', label: 'Buổi đã mua', width: '108px', sortValue: (r) => r.sessionsBought },
  { key: 'done', label: 'Đã học', width: '82px', sortValue: (r) => r.sessionsDone },
  { key: 'left', label: 'Còn lại', width: '92px', sortValue: (r) => r.sessionsLeft },
  { key: 'balance', label: 'Tiền trước/nợ', width: '138px', sortValue: (r) => r.balance },
  { key: 'status', label: 'Trạng thái', width: '158px', sortValue: (r) => r.state },
  // Đủ chỗ cho hai nút có chữ "Ghi thu", "Hoàn số dư" trên một dòng không tràn cột
  { key: 'actions', label: 'Thao tác', width: '164px', align: 'end', srOnly: true },
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
  totalDebt: _totalDebt,
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
  void _totalDebt;
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
        return (
          <input
            type="checkbox"
            checked={picked.has(r.id)}
            onChange={() => togglePick(r.id)}
            aria-label={`Chọn ${r.fullName} để ghi thu`}
            className="size-4 accent-[var(--control-checked-bgColor-rest)]"
          />
        );
      case 'fullName':
        return (
          <div className="flex min-w-0 items-baseline justify-between gap-2" title={`${r.fullName} · ${r.code} · ${r.className}`}>
            <Link href={`/hoc-sinh/${r.id}`} data-link="true" className="min-w-0 truncate text-sm font-normal text-[var(--fgColor-link)] hover:underline">
              {r.fullName}
            </Link>
            <small className="shrink-0 text-xs text-[var(--fgColor-muted)]">
              {r.className}
            </small>
          </div>
        );
      case 'paid':
        return <span className="text-sm tabular-nums text-[var(--fgColor-default)]">{formatVND(r.paid)}</span>;
      case 'discount':
        return <span className="text-sm tabular-nums text-[var(--fgColor-default)]">{r.discount ? formatVND(r.discount) : ''}</span>;
      case 'bought':
        return <span className="text-sm tabular-nums text-[var(--fgColor-default)]">{r.sessionsBought} buổi</span>;
      case 'done':
        return <span className="text-sm tabular-nums text-[var(--fgColor-default)]">{r.sessionsDone} buổi</span>;
      case 'left':
        return <SessionsLeft row={r} />;
      case 'balance':
        return <BalanceText balance={r.balance} />;
      case 'status':
        return (
          <div className="flex items-center gap-1 whitespace-nowrap">
            <Pill tone={STATE_META[r.state].tone}>{STATE_META[r.state].label}</Pill>
            {r.overdue && <Pill tone="blush">Quá hạn</Pill>}
          </div>
        );
      case 'actions':
        return (
          <div className="flex justify-end gap-1">
            {canManage && <Btn size="small" onClick={() => setPaying(r)}>Ghi thu</Btn>}
            {canManage && needsPay(r) && (
              <Btn size="small" onClick={() => remind(r)} disabled={pending}>
                Nhắc
              </Btn>
            )}
            {canRefund(r) && <Btn size="small" onClick={() => setRefunding(r)}>Hoàn số dư</Btn>}
          </div>
        );
      default:
        return null;
    }
  };

  const card = (r: InvoiceRow) => (
    <Card>
      {canManage && (
        <label className="mb-1 flex items-center gap-2 text-sm text-[var(--fgColor-muted)]">
          <input
            type="checkbox"
            checked={picked.has(r.id)}
            onChange={() => togglePick(r.id)}
            className="size-4 accent-[var(--control-checked-bgColor-rest)]"
          />
          Chọn để ghi thu
        </label>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/hoc-sinh/${r.id}`} className="text-sm font-medium text-[var(--fgColor-link)] underline underline-offset-2">
            {r.fullName}
          </Link>
          <small className="block truncate text-xs text-[var(--fgColor-muted)]">
            {r.code} · {r.className}
          </small>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Pill tone={STATE_META[r.state].tone}>{STATE_META[r.state].label}</Pill>
          {r.overdue && <Pill tone="blush">Quá hạn</Pill>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-3 py-2.5 text-center">
        <div>
          <small className="block text-xs text-[var(--fgColor-muted)]">Đã mua</small>
          <b className="text-sm tabular-nums text-[var(--fgColor-default)]">{r.sessionsBought} buổi</b>
        </div>
        <div>
          <small className="block text-xs text-[var(--fgColor-muted)]">Đã học</small>
          <b className="text-sm tabular-nums text-[var(--fgColor-default)]">{r.sessionsDone} buổi</b>
        </div>
        <div>
          <small className="block text-xs text-[var(--fgColor-muted)]">Còn lại</small>
          <SessionsLeft row={r} />
        </div>
        <div>
          <small className="block text-xs text-[var(--fgColor-muted)]">Đã nộp</small>
          <b className="text-sm tabular-nums text-[var(--fgColor-default)]">{formatVND(r.paid)}</b>
        </div>
        <div>
          <small className="block text-xs text-[var(--fgColor-muted)]">Giảm trừ</small>
          <b className="text-sm tabular-nums text-[var(--fgColor-default)]">{formatVND(r.discount)}</b>
        </div>
        <div>
          <small className="block text-xs text-[var(--fgColor-muted)]">Tiền trước/nợ</small>
          <BalanceText balance={r.balance} />
        </div>
      </div>
      {canManage && (
        <div className={`grid gap-2 ${needsPay(r) ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <Btn block variant="primary" onClick={() => setPaying(r)}>
            Ghi thu
          </Btn>
          {needsPay(r) && (
            <Btn block onClick={() => remind(r)} disabled={pending}>
              Nhắc đóng
            </Btn>
          )}
        </div>
      )}
      {canRefund(r) && (
        <Btn block onClick={() => setRefunding(r)}>
          Hoàn số dư
        </Btn>
      )}
    </Card>
  );

  return (
    <section className="relative flex flex-col">
      <PageCrumbs crumbs={['Tài chính', 'Học phí']} />
      <h1 className="sr-only">Học phí</h1>

      <TotalsStrip totals={totals} />

      <DataGrid
        label="Học phí theo buổi"
        columns={canManage ? [SELECT_COL, ...COLUMNS] : COLUMNS}
        rows={rows}
        rowKey={(r) => r.id}
        cell={cell}
        card={card}
        from="md"
        title={
          <ChipGroup label="Lọc học phí">
            {FILTERS.map((f) => (
              <Chip key={f.key} selected={filter === f.key} count={counts[f.key]} onClick={() => go({ f: f.key })}>
                {f.label}
              </Chip>
            ))}
          </ChipGroup>
        }
        actionComponent={
          <>
            <form
              role="search"
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                go({ q: search });
              }}
              className="flex items-center gap-1.5"
            >
              <div className="w-52 max-w-full">
                <TextInput
                  block
                  type="search"
                  leadingVisual={SearchIcon}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm tên hoặc mã HS-…"
                  className="[&::-webkit-search-cancel-button]:hidden"
                />
              </div>
              <Btn type="submit" variant="ghost">
                Tìm
              </Btn>
            </form>
            {canManage && rows.length > 0 && needRows.length > 0 && (
              <Btn onClick={() => setPicked(new Set(needRows.map((r) => r.id)))}>
                Chọn cần đóng ({needRows.length})
              </Btn>
            )}
          </>
        }
        empty={<EmptyPanel title="Không có học sinh phù hợp với bộ lọc này." />}
      />

      {canManage && pickedRows.length > 0 && !bulkOpen && !paying && !refunding && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 h-20 min-[1200px]:left-[232px] [&>*]:pointer-events-auto">
          <BulkActionBar
            count={pickedRows.length}
            itemLabel="học sinh"
            onClear={() => setPicked(new Set())}
            actions={[
              {
                key: 'bulk-pay',
                label: `Ghi thu cho ${pickedRows.length} học sinh`,
                icon: CreditCardIcon,
                onClick: () => setBulkOpen(true),
              },
            ]}
          />
        </div>
      )}

      {paying && (
        <PaymentDialog
          row={paying}
          canManage={canManage}
          onClose={() => setPaying(null)}
          onDone={(m) => {
            setPaying(null);
            notify(m);
            router.refresh();
          }}
        />
      )}
      {bulkOpen && pickedRows.length > 0 && (
        <BulkPaymentDialog
          rows={pickedRows}
          onClose={() => setBulkOpen(false)}
          onDone={(m) => {
            setBulkOpen(false);
            setPicked(new Set());
            notify(m);
            router.refresh();
          }}
        />
      )}
      {refunding && (
        <RefundDialog
          row={refunding}
          onClose={() => setRefunding(null)}
          onDone={(m) => {
            setRefunding(null);
            notify(m);
            router.refresh();
          }}
        />
      )}
      <Toast message={message} />
    </section>
  );
}

// Dải tổng ngoài bảng: đã nộp, giảm trừ, buổi đã mua, tiền trước hoặc nợ của mọi học sinh trong phạm vi đang xem
function TotalsStrip({ totals }: { totals: InvoiceTotals }) {
  const label = totals.balance < 0 ? 'Đang nợ' : totals.balance > 0 ? 'Tiền trước' : 'Tiền trước/nợ';
  const items: { label: string; value: string; tone: string }[] = [
    { label: 'Đã nộp', value: formatVND(totals.paid), tone: 'text-[var(--fgColor-default)]' },
    { label: 'Giảm trừ', value: formatVND(totals.discount), tone: 'text-[var(--fgColor-default)]' },
    { label: 'Buổi đã mua', value: `${totals.sessionsBought.toLocaleString('vi-VN')} buổi`, tone: 'text-[var(--fgColor-default)]' },
    {
      label,
      value: formatVND(Math.abs(totals.balance)),
      tone: totals.balance < 0 ? 'text-[var(--fgColor-danger)]' : totals.balance > 0 ? 'text-[var(--fgColor-success)]' : 'text-[var(--fgColor-muted)]',
    },
  ];
  return (
    <dl className="mb-2 grid grid-cols-2 gap-2 min-[768px]:grid-cols-4" aria-label="Tổng học phí">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-baseline justify-between gap-2 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-3 py-1.5"
        >
          <dt className="text-xs text-[var(--fgColor-muted)]">{it.label}</dt>
          <dd className={`m-0 text-sm font-medium tabular-nums ${it.tone}`}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// Buổi còn lại: âm là học quá số buổi đã mua (đang nợ buổi)
function SessionsLeft({ row }: { row: InvoiceRow }) {
  if (row.sessionsLeft < 0) return <b className="text-sm font-semibold text-[var(--fgColor-danger)]">Nợ {-row.sessionsLeft} buổi</b>;
  const low = row.sessionsLeft <= LOW_SESSIONS;
  return (
    <b className={`text-sm tabular-nums ${low ? 'font-semibold text-[var(--fgColor-attention)]' : 'font-normal text-[var(--fgColor-default)]'}`}>
      {row.sessionsLeft} buổi
    </b>
  );
}

// Tiền trước (dương) hay nợ (âm) của một học sinh, có chữ để không chỉ dựa vào màu
function BalanceText({ balance }: { balance: number }) {
  if (balance < 0) return <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-[var(--fgColor-danger)]">Nợ {formatVND(-balance)}</span>;
  if (balance > 0) return <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-[var(--fgColor-success)]">Trước {formatVND(balance)}</span>;
  return <span className="whitespace-nowrap text-sm tabular-nums text-[var(--fgColor-muted)]">{formatVND(0)}</span>;
}

// Ô tiền: hiện "2.500.000", gửi số nguyên qua ô ẩn cùng tên
function MoneyField({
  name,
  value,
  onChange,
  invalid,
  label,
}: {
  name: string;
  value: string;
  onChange: (digits: string) => void;
  invalid?: string;
  label: string;
}) {
  return (
    <>
      <TextInputNumber
        thousandSeparator="."
        max={1_000_000_000}
        aria-label={label}
        value={value}
        onTextChange={onChange}
        placeholder="0"
        error={Boolean(invalid)}
        className="tabular-nums"
      />
      <input type="hidden" name={name} value={value || '0'} />
    </>
  );
}

// Hộp thoại ghi thu: số tiền, giảm trừ, số buổi được cộng xem ngay; có lịch sử thu của học sinh
function PaymentDialog({
  row,
  canManage,
  onClose,
  onDone,
}: {
  row: InvoiceRow;
  canManage: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
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
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      const result = await recordPaymentAction(Number(row.id), prev, formData);
      if (result.ok) onDone(result.message ?? 'Đã ghi nhận');
      return result;
    },
    { ok: false },
  );
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
    <Modal
      open
      title={`Ghi thu học phí · ${row.fullName}`}
      subtitle={`${row.className} · đã mua ${row.sessionsBought} buổi, đã học ${row.sessionsDone}, ${now}`}
      onClose={onClose}
      labelledBy="payment-title"
    >
      <div className="flex flex-col gap-4 pb-2">
        <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
          {state.message && !state.ok && <Alert className="col-span-full">{state.message}</Alert>}
          <Field
            label="Học phí (VND)"
            error={errors.fee}
            hint={feeValue > 0 ? `${addedSessions} buổi × ${PRICE}` : `${PRICE} một buổi, đăng ký bao nhiêu cũng được`}
          >
            <MoneyField name="fee" value={fee} onChange={setFee} invalid={errors.fee} label="Học phí (VND)" />
          </Field>
          <Field label="Giảm trừ (VND)" error={errors.discount} hint="Trừ vào số tiền phụ huynh trả, không đổi số buổi">
            <MoneyField name="discount" value={discount} onChange={setDiscount} invalid={errors.discount} label="Giảm trừ (VND)" />
          </Field>
          <Field label="Ghi chú" error={errors.note} wide>
            <TextAreaAutoHeight
              name="note"
              rows={2}
              maxLength={200}
              placeholder="VD: Đóng tiền mặt, đăng ký khoá tiếp"
              error={Boolean(errors.note)}
            />
          </Field>
          <p
            role="status"
            className="col-span-full rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-accent-muted)] bg-[var(--bgColor-accent-muted)] px-3 py-2 text-sm text-[var(--fgColor-default)]"
          >
            Phụ huynh trả <b className={pay < 0 ? 'text-[var(--fgColor-danger)]' : ''}>{formatVND(Math.max(0, pay))}</b>
            {discountValue > 0 ? ` (học phí ${formatVND(feeValue)} − giảm trừ ${formatVND(discountValue)})` : ''}. Cộng <b>{addedSessions} buổi</b>.
            <br />
            Sau khi thu: <b>đã mua {boughtAfter} buổi</b>, đã học {row.sessionsDone},{' '}
            {leftAfter >= 0 ? <b>còn {leftAfter} buổi</b> : <b className="text-[var(--fgColor-danger)]">còn nợ {-leftAfter} buổi</b>}.
          </p>
          <FormFooter className="col-span-full">
            <Btn onClick={onClose} disabled={pending}>
              Huỷ
            </Btn>
            <Btn type="submit" variant="primary" loading={pending} disabled={pending || feeValue <= 0 || pay < 0}>
              {pending ? 'Đang ghi…' : 'Ghi nhận thu'}
            </Btn>
          </FormFooter>
        </form>

        {qr && (
          <div className="flex items-center gap-3 border-t border-[var(--borderColor-muted)] pt-3 max-[767px]:flex-col max-[767px]:items-start">
            <QrImage payload={qr.payload} size={132} label={`Mã QR chuyển khoản học phí của ${row.fullName}`} />
            <div className="min-w-0">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--fgColor-muted)]">Chuyển khoản</h3>
              <p className="text-sm text-[var(--fgColor-muted)]">
                Phụ huynh quét bằng app ngân hàng: nội dung điền sẵn{row.debt > 0 ? ', số tiền đang nợ' : ', số tiền tự nhập'}.
              </p>
              <p className="mt-1 break-words text-sm text-[var(--fgColor-default)]">{qr.bankLine}</p>
            </div>
          </div>
        )}

        <div className="border-t border-[var(--borderColor-muted)] pt-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--fgColor-muted)]">Lịch sử thu</h3>
          {historyError && <p className="text-sm text-[var(--fgColor-danger)]">{historyError}</p>}
          {!history && !historyError && <p className="text-sm text-[var(--fgColor-muted)]">Đang tải…</p>}
          {history && history.length === 0 && <p className="text-sm text-[var(--fgColor-muted)]">Chưa có khoản thu nào.</p>}
          {voidError && <Alert className="mb-2">{voidError}</Alert>}
          {history && history.length > 0 && (
            <ul className="flex flex-col gap-2">
              {history.map((p) => {
                const label = p.kind === 'refund' ? 'Hoàn tiền' : p.kind === 'void' ? 'Huỷ khoản' : '';
                const struck = p.voided ? 'line-through text-[var(--fgColor-muted)]' : '';
                return (
                  <li key={p.id} className="flex flex-col gap-1.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`min-w-0 text-[var(--fgColor-muted)] ${p.voided ? 'line-through' : ''}`}>
                        {dateKeyLabel(p.paidDate)}
                        {label ? ` · ${label}` : ''}
                        {p.discount > 0 ? ` · giảm trừ ${formatVND(p.discount)}` : ''}
                        {p.note ? ` · ${p.note}` : ''}
                        {p.voided ? ' · đã huỷ' : ''}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <b className={`tabular-nums ${struck || 'text-[var(--fgColor-default)]'}`}>{formatVND(p.amount)}</b>
                        {canManage && p.kind === 'payment' && !p.voided && voidId !== p.id && (
                          <Btn
                            onClick={() => {
                              setVoidId(p.id);
                              setVoidReason('');
                              setVoidError(null);
                            }}
                          >
                            Huỷ
                          </Btn>
                        )}
                      </span>
                    </div>
                    {voidId === p.id && (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <TextInput
                            block
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            placeholder="Lý do huỷ (VD: ghi nhầm số tiền)"
                            aria-label="Lý do huỷ khoản thu"
                          />
                        </div>
                        <Btn variant="danger" loading={voiding} onClick={() => confirmVoid(p)} disabled={voiding}>
                          Xác nhận huỷ
                        </Btn>
                        <Btn onClick={() => setVoidId(null)} disabled={voiding}>
                          Không huỷ
                        </Btn>
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
    <Modal
      open
      title={`Hoàn số dư · ${row.fullName}`}
      subtitle={`Tiền trước ${formatVND(row.balance)} (${row.sessionsLeft} buổi chưa học)`}
      onClose={onClose}
      labelledBy="refund-title"
    >
      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3.5 pb-2 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
        {error && <Alert className="col-span-full">{error}</Alert>}
        <Field label="Số tiền hoàn (VND) *" hint={`Tối đa ${formatVND(max)}`}>
          <TextInputNumber
            name="amount"
            min={1}
            max={max}
            thousandSeparator="."
            value={amount}
            onTextChange={setAmount}
            error={Boolean(error)}
          />
        </Field>
        <Field label="Ghi chú">
          <TextInput
            block
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: nghỉ học từ tháng 10"
            autoComplete="off"
          />
        </Field>
        <FormFooter className="col-span-full">
          <Btn onClick={onClose} disabled={pending}>
            Huỷ
          </Btn>
          <Btn type="submit" variant="primary" loading={pending} disabled={pending}>
            {pending ? 'Đang hoàn…' : 'Hoàn tiền'}
          </Btn>
        </FormFooter>
      </form>
    </Modal>
  );
}

// Ghi thu cho nhiều học sinh đã chọn: mỗi người mặc định thu số đang nợ (hoặc để trống), sửa được từng số tiền.
function BulkPaymentDialog({ rows, onClose, onDone }: { rows: InvoiceRow[]; onClose: () => void; onDone: (message: string) => void }) {
  const [amounts, setAmounts] = useState<Record<number, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.debt > 0 ? String(r.debt) : ''])),
  );
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
    <Modal
      open
      title={`Ghi thu cho ${rows.length} học sinh`}
      subtitle={`Mỗi người mặc định thu số đang nợ. ${PRICE} một buổi, nộp bao nhiêu cũng được.`}
      onClose={onClose}
      labelledBy="bulk-payment-title"
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-3.5 pb-2">
        {error && <Alert>{error}</Alert>}
        <ul className="flex max-h-[50vh] flex-col divide-y divide-[var(--borderColor-muted)] overflow-y-auto">
          {rows.map((r) => {
            const a = Number(amounts[r.id] || 0);
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <b className="block truncate text-sm font-medium text-[var(--fgColor-default)]">{r.fullName}</b>
                  <small className="block truncate text-xs text-[var(--fgColor-muted)]">
                    {r.code} · {r.sessionsLeft < 0 ? `nợ ${-r.sessionsLeft} buổi` : `còn ${r.sessionsLeft} buổi`}
                    {a > 0 ? ` · +${Math.floor(a / TUITION_PER_SESSION)} buổi` : ''}
                  </small>
                </div>
                <div className="w-36 shrink-0">
                  <TextInputNumber
                    aria-label={`Số tiền thu ${r.fullName} (VND)`}
                    thousandSeparator="."
                    max={1_000_000_000}
                    isAlignRight
                    value={amounts[r.id]}
                    onTextChange={(raw) =>
                      setAmounts((prev) => ({
                        ...prev,
                        [r.id]: raw,
                      }))
                    }
                    placeholder="0"
                    error={badIds.has(r.id)}
                    className="tabular-nums"
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-[var(--fgColor-muted)]">
          Tổng thu: <b className="tabular-nums text-[var(--fgColor-default)]">{formatVND(total)}</b> từ {rows.length} học sinh. Bấm xác nhận là ghi ngay.
        </p>
        <Field label="Ghi chú chung" hint="VD: đóng tiền mặt tại lớp">
          <TextAreaAutoHeight
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder="VD: đóng tiền mặt tại lớp"
          />
        </Field>
        <FormFooter>
          <Btn onClick={onClose} disabled={pending}>
            Huỷ
          </Btn>
          <Btn type="submit" variant="primary" loading={pending} disabled={pending || badIds.size > 0}>
            {pending ? 'Đang ghi…' : `Xác nhận đã nộp (${rows.length})`}
          </Btn>
        </FormFooter>
      </form>
    </Modal>
  );
}
