'use client';

import { CheckIcon, CreditCardIcon } from '@primer/octicons-react';
import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { saveSettingsAction } from '@/app/(app)/cai-dat/actions';
import { ComboBox, TextInput, TextInputNumber } from '@/components-ui';
import { QrImage } from '@/components/tuition/QrImage';
import { Btn } from '@/components/ui/Btn';
import { Field } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert, Pill } from '@/components/ui/primitives';
import { Panel } from '@/components/ui/surfaces';
import type { CenterSettings } from '@/lib/queries/settings';
import type { ActionResult } from '@/lib/validation/student';
import { BANKS, isBankReady, vietQrPayload } from '@/lib/vietqr';

const INITIAL: ActionResult = { ok: false };

// Cài đặt trung tâm chuẩn 01. TSUKUBA: chia bốn bề mặt rõ ràng + khung xem trước VietQR chuẩn ngân hàng + thanh lưu gọn.
export function SettingsForm({ settings, canManage }: { settings: CenterSettings; canManage: boolean }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(saveSettingsAction, INITIAL);
  const errors = state.fieldErrors ?? {};
  const [bankBin, setBankBin] = useState(settings.bankBin);
  const [bankAccount, setBankAccount] = useState(settings.bankAccount);
  const account = bankAccount.replace(/[\s.-]/g, '');
  const selectedBank = BANKS.find((b) => b.bin === bankBin);

  // Gọi action thủ công để ô nhập không bị reset khi có lỗi (E-028)
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Hệ thống', 'Cài đặt']}
        title="Cài đặt"
        subtitle="Thông tin trung tâm, quy định học phí và thông báo. Thay đổi áp dụng cho toàn hệ thống."
      />

      <form onSubmit={submit} noValidate className="tsukuba-rise grid grid-cols-1 gap-4 min-[1200px]:grid-cols-2">
        {state.message && !state.ok && <Alert className="col-span-full">{state.message}</Alert>}
        {state.ok && state.message && (
          <Alert tone="ok" className="col-span-full">
            {state.message}
          </Alert>
        )}

        <Panel title="Thông tin trung tâm" action={<Pill tone="stone">Hồ sơ đơn vị</Pill>}>
          <div className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
            <Field label="Tên trung tâm *" error={errors.centerName} wide>
              <TextInput
                block
                name="centerName"
                aria-label="Tên trung tâm *"
                defaultValue={settings.centerName}
                disabled={!canManage}
                validationStatus={errors.centerName ? 'error' : undefined}
              />
            </Field>
            <Field label="Địa chỉ" error={errors.address} wide>
              <TextInput
                block
                name="address"
                aria-label="Địa chỉ"
                defaultValue={settings.address}
                disabled={!canManage}
                validationStatus={errors.address ? 'error' : undefined}
              />
            </Field>
            <Field label="Hotline" error={errors.hotline}>
              <TextInput
                block
                name="hotline"
                type="tel"
                inputMode="tel"
                aria-label="Hotline"
                defaultValue={settings.hotline}
                disabled={!canManage}
                validationStatus={errors.hotline ? 'error' : undefined}
              />
            </Field>
            <Field label="Email" error={errors.email}>
              <TextInput
                block
                name="email"
                type="email"
                aria-label="Email"
                defaultValue={settings.email}
                disabled={!canManage}
                validationStatus={errors.email ? 'error' : undefined}
              />
            </Field>
            <Field label="Giờ làm việc" error={errors.workingHours} wide>
              <TextInput
                block
                name="workingHours"
                aria-label="Giờ làm việc"
                defaultValue={settings.workingHours}
                placeholder="VD: T2 – T7, 8:00 – 21:00"
                disabled={!canManage}
                validationStatus={errors.workingHours ? 'error' : undefined}
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Quy định học phí" action={<Pill tone="lav">Chu kỳ thu</Pill>}>
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
              <Field
                label="Ngày đến hạn trong tháng *"
                error={errors.dueDay}
                hint="Hạn đóng là ngày này của tháng sau tháng khai giảng (từ 1 đến 28)"
              >
                <TextInputNumber
                  name="dueDay"
                  aria-label="Ngày đến hạn trong tháng *"
                  min={1}
                  max={28}
                  thousandSeparator={false}
                  defaultValue={settings.dueDay}
                  disabled={!canManage}
                  error={Boolean(errors.dueDay)}
                  className="tabular-nums"
                />
              </Field>
              <Field label="Đơn vị tiền" hint="Mặc định toàn trung tâm">
                <TextInput block aria-label="Đơn vị tiền" value={settings.currency} readOnly disabled className="font-mono" />
              </Field>
            </div>
            <div className="rounded-[var(--borderRadius-medium)] border border-dashed border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)]/60 px-3 py-2.5 text-xs leading-relaxed text-[var(--fgColor-muted)]">
              Hệ thống tự động đối chiếu ngày đến hạn (1–28 hàng tháng) để gắn nhãn <b>Quá hạn</b> trên sổ thu và kích hoạt lịch nhắc học phí qua Telegram.
            </div>
          </div>
        </Panel>

        <Panel
          title="Tài khoản nhận học phí"
          action={<Pill tone={isBankReady({ bin: bankBin, account }) ? 'mint' : 'stone'}>{isBankReady({ bin: bankBin, account }) ? 'VietQR sẵn sàng' : 'Chưa thiết lập'}</Pill>}
          className="min-[1200px]:col-span-2"
        >
          <div className="grid grid-cols-1 gap-4 min-[768px]:grid-cols-[minmax(0,1fr)_220px] min-[768px]:items-start">
            <div className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
              <Field label="Ngân hàng" error={errors.bankBin}>
                <ComboBox
                  name="bankBin"
                  label="Ngân hàng"
                  block
                  value={bankBin}
                  onChange={setBankBin}
                  disabled={!canManage}
                  options={[{ value: '', label: 'Chưa chọn' }, ...BANKS.map((b) => ({ value: b.bin, label: b.name }))]}
                  error={Boolean(errors.bankBin)}
                />
              </Field>
              <Field label="Số tài khoản" error={errors.bankAccount}>
                <TextInput
                  block
                  name="bankAccount"
                  aria-label="Số tài khoản"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="VD: 0011001234567"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  disabled={!canManage}
                  validationStatus={errors.bankAccount ? 'error' : undefined}
                  className="font-mono tabular-nums"
                />
              </Field>
              <Field
                label="Tên chủ tài khoản"
                error={errors.bankAccountName}
                wide
                hint="Hiện trong tin nhắc học phí và hộp Ghi thu để phụ huynh đối chiếu"
              >
                <TextInput
                  block
                  name="bankAccountName"
                  aria-label="Tên chủ tài khoản"
                  defaultValue={settings.bankAccountName}
                  placeholder="VD: TRUNG TAM ANH NGU ESL"
                  autoComplete="off"
                  disabled={!canManage}
                  validationStatus={errors.bankAccountName ? 'error' : undefined}
                  className="font-mono"
                />
              </Field>
              <p className="m-0 text-xs leading-relaxed text-[var(--fgColor-muted)] min-[768px]:col-span-full">
                Khi cấu hình đủ ngân hàng và số tài khoản, hộp thoại <b>Ghi thu</b> và tin nhắc học phí qua Telegram sẽ đính kèm mã VietQR điền sẵn số tiền còn thiếu kèm mã học sinh.
              </p>
            </div>

            {isBankReady({ bin: bankBin, account }) ? (
              <figure className="m-0 flex flex-col items-center gap-2 rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/60 p-3 text-center">
                <QrImage
                  payload={vietQrPayload({ bin: bankBin, account, amount: 0, note: '' })}
                  size={140}
                  label="Mã QR tài khoản nhận học phí"
                />
                <figcaption className="flex flex-col gap-0.5 text-xs">
                  {selectedBank && <b className="font-medium text-[var(--fgColor-default)]">{selectedBank.name}</b>}
                  <span className="font-mono text-[11px] text-[var(--fgColor-muted)]">{account}</span>
                  <span className="text-[11px] text-[var(--fgColor-muted)]">Quét thử bằng app ngân hàng</span>
                </figcaption>
              </figure>
            ) : (
              <div className="flex min-h-[188px] flex-col items-center justify-center gap-2 rounded-[var(--borderRadius-large)] border border-dashed border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/40 p-4 text-center text-xs text-[var(--fgColor-muted)]">
                <span className="grid size-9 place-items-center rounded-full bg-[var(--bgColor-neutral-muted)] text-[var(--fgColor-muted)]">
                  <CreditCardIcon size={16} aria-hidden />
                </span>
                <span>Chọn ngân hàng và nhập số tài khoản để xem trước mã VietQR.</span>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Thông báo tự động" action={<Pill tone="stone">4 tuỳ chọn</Pill>} className="min-[1200px]:col-span-2">
          <div className="divide-y divide-[var(--borderColor-muted)] overflow-hidden rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]">
            <Toggle
              name="notifySmsBeforeDue"
              label="Nhắc đóng học phí trước hạn"
              description="Tự động cảnh báo các học sinh sắp hết buổi hoặc đến kỳ đóng học phí"
              defaultChecked={settings.notifySmsBeforeDue}
              disabled={!canManage}
            />
            <Toggle
              name="notifyWeeklyReport"
              label="Gửi báo cáo tuần cho quản trị"
              description="Tổng hợp doanh thu, chuyên cần và biến động sĩ số cuối mỗi tuần"
              defaultChecked={settings.notifyWeeklyReport}
              disabled={!canManage}
            />
            <Toggle
              name="notifyAbsentAlert"
              label="Báo khi học sinh vắng liên tiếp"
              description="Gửi cảnh báo cho giáo viên phụ trách khi học sinh nghỉ 3 buổi liên tiếp"
              defaultChecked={settings.notifyAbsentAlert}
              disabled={!canManage}
            />
            <Toggle
              name="notifyNewClass"
              label="Báo khi có lớp mới"
              description="Thông báo cho nhân sự cơ sở khi lớp học mới được khởi tạo"
              defaultChecked={settings.notifyNewClass}
              disabled={!canManage}
            />
          </div>
          <p className="m-0 mt-2.5 text-xs text-[var(--fgColor-muted)]">
            Các tuỳ chọn trên được lưu làm cấu hình mặc định cho kênh bot Telegram và thông báo nội bộ.
          </p>
        </Panel>

        <div className="col-span-full flex flex-wrap items-center justify-between gap-3 rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] border-l-[3px] border-l-[var(--primary)] bg-[var(--bgColor-default)] px-4 py-3 shadow-[var(--shadow)]">
          <span className="text-xs font-medium text-[var(--ink-2)]">
            Mọi thay đổi áp dụng ngay cho toàn bộ cơ sở sau khi lưu.
          </span>
          <Btn
            type="submit"
            variant="primary"
            leadingVisual={pending ? undefined : CheckIcon}
            loading={pending}
            disabled={pending || !canManage}
            className="max-[767px]:w-full"
          >
            {pending ? 'Đang lưu…' : 'Lưu cài đặt'}
          </Btn>
        </div>
      </form>
    </section>
  );
}

function Toggle({
  name,
  label,
  description,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
  disabled: boolean;
}) {
  return (
    <label className="flex min-h-[var(--ctl-h-touch)] cursor-pointer items-center justify-between gap-4 px-3.5 py-2.5 text-sm font-normal text-[var(--fgColor-default)] transition-colors hover:bg-[var(--bgColor-muted)]/60">
      <span className="min-w-0">
        <span className="block font-medium text-[var(--fgColor-default)]">{label}</span>
        <span className="block text-xs text-[var(--fgColor-muted)]">{description}</span>
      </span>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="size-4 shrink-0 accent-[var(--control-checked-bgColor-rest)]"
      />
    </label>
  );
}
