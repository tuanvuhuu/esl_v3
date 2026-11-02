'use client';

import { startTransition, useActionState, useState, type FormEvent } from 'react';
import { saveSettingsAction } from '@/app/(app)/cai-dat/actions';
import type { CenterSettings } from '@/lib/queries/settings';
import type { ActionResult } from '@/lib/validation/student';
import { ComboBox, TextInput, TextInputNumber } from '@/components-ui';
import { Btn } from '@/components/ui/Btn';
import { Field } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert } from '@/components/ui/primitives';
import { Panel } from '@/components/ui/surfaces';
import { QrImage } from '@/components/tuition/QrImage';
import { BANKS, isBankReady, vietQrPayload } from '@/lib/vietqr';

const INITIAL: ActionResult = { ok: false };

// Cài đặt trung tâm, chia ba nhóm. Lưu một lần cho cả ba nhóm.
export function SettingsForm({ settings, canManage }: { settings: CenterSettings; canManage: boolean }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(saveSettingsAction, INITIAL);
  const errors = state.fieldErrors ?? {};
  const [bankBin, setBankBin] = useState(settings.bankBin);
  const [bankAccount, setBankAccount] = useState(settings.bankAccount);
  const account = bankAccount.replace(/[\s.-]/g, '');

  // Gọi action thủ công để ô nhập không bị reset khi có lỗi (E-028)
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <section className="flex flex-col">
      <PageHeader crumbs={['Hệ thống', 'Cài đặt']} title="Cài đặt" subtitle="Thông tin trung tâm, quy định học phí và thông báo. Thay đổi áp dụng cho toàn hệ thống." />

      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 min-[1200px]:grid-cols-2">
        {state.message && !state.ok && (
          <Alert className="col-span-full">{state.message}</Alert>
        )}
        {state.ok && state.message && (
          <Alert tone="ok" className="col-span-full">{state.message}</Alert>
        )}

        <Panel title="Thông tin trung tâm">
          <div className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
            <Field label="Tên trung tâm *" error={errors.centerName} wide>
              <TextInput block name="centerName" defaultValue={settings.centerName} disabled={!canManage} validationStatus={errors.centerName ? 'error' : undefined} />
            </Field>
            <Field label="Địa chỉ" error={errors.address} wide>
              <TextInput block name="address" defaultValue={settings.address} disabled={!canManage} validationStatus={errors.address ? 'error' : undefined} />
            </Field>
            <Field label="Hotline" error={errors.hotline}>
              <TextInput block name="hotline" type="tel" inputMode="tel" defaultValue={settings.hotline} disabled={!canManage} validationStatus={errors.hotline ? 'error' : undefined} />
            </Field>
            <Field label="Email" error={errors.email}>
              <TextInput block name="email" type="email" defaultValue={settings.email} disabled={!canManage} validationStatus={errors.email ? 'error' : undefined} />
            </Field>
            <Field label="Giờ làm việc" error={errors.workingHours} wide>
              <TextInput block name="workingHours" defaultValue={settings.workingHours} placeholder="VD: T2 – T7, 8:00 – 21:00" disabled={!canManage} validationStatus={errors.workingHours ? 'error' : undefined} />
            </Field>
          </div>
        </Panel>

        <Panel title="Quy định học phí">
          <div className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
            <Field label="Ngày đến hạn trong tháng *" error={errors.dueDay} hint="Hạn đóng là ngày này của tháng sau tháng khai giảng (từ 1 đến 28)">
              <TextInputNumber
                name="dueDay"
                min={1}
                max={28}
                thousandSeparator={false}
                defaultValue={settings.dueDay}
                disabled={!canManage}
                error={Boolean(errors.dueDay)}
              />
            </Field>
            <Field label="Đơn vị tiền">
              <TextInput block value={settings.currency} readOnly disabled />
            </Field>
          </div>
        </Panel>

        <Panel title="Tài khoản nhận học phí" className="min-[1200px]:col-span-2">
          <div className="grid grid-cols-1 gap-4 min-[768px]:grid-cols-[minmax(0,1fr)_auto]">
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
                  inputMode="numeric"
                  autoComplete="off"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  disabled={!canManage}
                  validationStatus={errors.bankAccount ? 'error' : undefined}
                  className="tabular-nums"
                />
              </Field>
              <Field label="Tên chủ tài khoản" error={errors.bankAccountName} wide hint="Hiện trong tin nhắc học phí để phụ huynh đối chiếu">
                <TextInput
                  block
                  name="bankAccountName"
                  defaultValue={settings.bankAccountName}
                  placeholder="VD: TRUNG TAM ANH NGU ESL"
                  autoComplete="off"
                  disabled={!canManage}
                  validationStatus={errors.bankAccountName ? 'error' : undefined}
                />
              </Field>
              <p className="col-span-full text-sm text-[var(--fgColor-muted)]">
                Có tài khoản thì tin nhắc học phí qua Telegram kèm mã QR: phụ huynh quét bằng app ngân hàng, số tiền còn thiếu và nội dung (mã học sinh) điền sẵn.
              </p>
            </div>
            {isBankReady({ bin: bankBin, account }) && (
              <figure className="flex flex-col items-center gap-1.5 justify-self-center">
                <QrImage payload={vietQrPayload({ bin: bankBin, account, amount: 0, note: '' })} size={140} label="Mã QR tài khoản nhận học phí" />
                <figcaption className="text-xs text-[var(--fgColor-muted)]">Quét thử bằng app ngân hàng</figcaption>
              </figure>
            )}
          </div>
        </Panel>

        <Panel title="Thông báo" className="min-[1200px]:col-span-2">
          <div className="flex flex-col gap-1">
            <Toggle name="notifySmsBeforeDue" label="Nhắc đóng học phí trước hạn" defaultChecked={settings.notifySmsBeforeDue} disabled={!canManage} />
            <Toggle name="notifyWeeklyReport" label="Gửi báo cáo tuần cho quản trị" defaultChecked={settings.notifyWeeklyReport} disabled={!canManage} />
            <Toggle name="notifyAbsentAlert" label="Báo khi học sinh vắng liên tiếp" defaultChecked={settings.notifyAbsentAlert} disabled={!canManage} />
            <Toggle name="notifyNewClass" label="Báo khi có lớp mới" defaultChecked={settings.notifyNewClass} disabled={!canManage} />
          </div>
          <p className="mt-3 text-sm text-[var(--fgColor-muted)]">Các thông báo này được lưu. Chưa có kênh gửi SMS hay email, nên hiện chỉ ghi nhận cài đặt.</p>
        </Panel>

        <div className="col-span-full flex justify-end">
          <Btn type="submit" variant="primary" loading={pending} disabled={pending || !canManage} className="max-[767px]:w-full">
            {pending ? 'Đang lưu…' : 'Lưu cài đặt'}
          </Btn>
        </div>
      </form>
    </section>
  );
}

function Toggle({ name, label, defaultChecked, disabled }: { name: string; label: string; defaultChecked: boolean; disabled: boolean }) {
  return (
    <label className="flex min-h-[var(--ctl-h-touch)] cursor-pointer items-center justify-between gap-4 rounded-[var(--borderRadius-medium)] px-2 py-2 text-sm font-normal text-[var(--fgColor-default)] transition-colors hover:bg-[var(--bgColor-muted)]">
      {label}
      <input type="checkbox" name={name} defaultChecked={defaultChecked} disabled={disabled} className="size-4 shrink-0 accent-[var(--control-checked-bgColor-rest)]" />
    </label>
  );
}
