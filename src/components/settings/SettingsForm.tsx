'use client';

import { startTransition, useActionState, type FormEvent, type ReactNode } from 'react';
import { saveSettingsAction } from '@/app/(app)/cai-dat/actions';
import type { CenterSettings } from '@/lib/queries/settings';
import type { ActionResult } from '@/lib/validation/student';
import { Field, FORM_BTN_SUBMIT, inputClass } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';

const INITIAL: ActionResult = { ok: false };

// Cài đặt trung tâm, chia ba nhóm. Lưu một lần cho cả ba nhóm.
export function SettingsForm({ settings, canManage }: { settings: CenterSettings; canManage: boolean }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(saveSettingsAction, INITIAL);
  const errors = state.fieldErrors ?? {};

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
          <div role="alert" className="col-span-full rounded-xl bg-blush px-3.5 py-2.5 text-base font-semibold text-blush-ink">{state.message}</div>
        )}
        {state.ok && state.message && (
          <div role="status" className="col-span-full rounded-xl bg-mint px-3.5 py-2.5 text-base font-semibold text-mint-ink">{state.message}</div>
        )}

        <Card title="Thông tin trung tâm">
          <div className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
            <Field label="Tên trung tâm *" error={errors.centerName} wide>
              <input name="centerName" defaultValue={settings.centerName} disabled={!canManage} className={inputClass(errors.centerName)} />
            </Field>
            <Field label="Địa chỉ" error={errors.address} wide>
              <input name="address" defaultValue={settings.address} disabled={!canManage} className={inputClass(errors.address)} />
            </Field>
            <Field label="Hotline" error={errors.hotline}>
              <input name="hotline" type="tel" inputMode="tel" defaultValue={settings.hotline} disabled={!canManage} className={inputClass(errors.hotline)} />
            </Field>
            <Field label="Email" error={errors.email}>
              <input name="email" type="email" defaultValue={settings.email} disabled={!canManage} className={inputClass(errors.email)} />
            </Field>
            <Field label="Giờ làm việc" error={errors.workingHours} wide>
              <input name="workingHours" defaultValue={settings.workingHours} placeholder="VD: T2 – T7, 8:00 – 21:00" disabled={!canManage} className={inputClass(errors.workingHours)} />
            </Field>
          </div>
        </Card>

        <Card title="Quy định học phí">
          <div className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
            <Field label="Ngày đến hạn trong tháng *" error={errors.dueDay} hint="Hạn đóng là ngày này của tháng sau tháng khai giảng (từ 1 đến 28)">
              <input name="dueDay" type="number" inputMode="numeric" min={1} max={28} step={1} defaultValue={settings.dueDay} disabled={!canManage} className={inputClass(errors.dueDay)} />
            </Field>
            <Field label="Phí trễ hạn (%)" error={errors.lateFeePercent} hint="Lưu để dùng sau, chưa tự cộng vào hoá đơn">
              <input name="lateFeePercent" type="number" inputMode="numeric" min={0} max={50} step={1} defaultValue={settings.lateFeePercent} disabled={!canManage} className={inputClass(errors.lateFeePercent)} />
            </Field>
            <Field label="Đơn vị tiền">
              <input value={settings.currency} readOnly className={inputClass()} />
            </Field>
          </div>
        </Card>

        <Card title="Thông báo" wide>
          <div className="flex flex-col gap-1">
            <Toggle name="notifySmsBeforeDue" label="Nhắc đóng học phí trước hạn" defaultChecked={settings.notifySmsBeforeDue} disabled={!canManage} />
            <Toggle name="notifyWeeklyReport" label="Gửi báo cáo tuần cho quản trị" defaultChecked={settings.notifyWeeklyReport} disabled={!canManage} />
            <Toggle name="notifyAbsentAlert" label="Báo khi học sinh vắng liên tiếp" defaultChecked={settings.notifyAbsentAlert} disabled={!canManage} />
            <Toggle name="notifyNewClass" label="Báo khi có lớp mới" defaultChecked={settings.notifyNewClass} disabled={!canManage} />
          </div>
          <p className="mt-3 text-sm text-muted">Các thông báo này được lưu. Chưa có kênh gửi SMS hay email, nên hiện chỉ ghi nhận cài đặt.</p>
        </Card>

        <div className="col-span-full flex justify-end">
          <button type="submit" disabled={pending || !canManage} className={`${FORM_BTN_SUBMIT} max-[767px]:w-full`}>
            {pending ? 'Đang lưu…' : 'Lưu cài đặt'}
          </button>
        </div>
      </form>
    </section>
  );
}

function Card({ title, wide = false, children }: { title: string; wide?: boolean; children: ReactNode }) {
  return (
    <section className={`rounded-[24px] bg-surface p-5 shadow-card max-[767px]:p-4 ${wide ? 'min-[1200px]:col-span-2' : ''}`}>
      <h2 className="mb-3 text-lg font-extrabold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Toggle({ name, label, defaultChecked, disabled }: { name: string; label: string; defaultChecked: boolean; disabled: boolean }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-xl px-1 py-2 text-base font-semibold text-ink">
      {label}
      <input type="checkbox" name={name} defaultChecked={defaultChecked} disabled={disabled} className="size-5 shrink-0 accent-[var(--primary-deep)]" />
    </label>
  );
}
