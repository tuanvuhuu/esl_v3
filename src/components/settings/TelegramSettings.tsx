'use client';

import { SyncIcon } from '@primer/octicons-react';
import { useState, useTransition } from 'react';
import { setupWebhookAction } from '@/app/(app)/tin-nhan/actions';
import { Btn } from '@/components/ui/Btn';
import { Alert, Pill } from '@/components/ui/primitives';
import { Notice, Panel } from '@/components/ui/surfaces';

export type IntegrationStatus = {
  storage: 'supabase' | 'disk';
  botConfigured: boolean;
  botUsername: string | null;
  botError: string | null;
  webhookUrl: string | null;
  webhookError: string | null;
  secretConfigured: boolean;
  linkedParentsCount: number;
  linkedStaffCount: number;
  failedMessagesRecentCount: number;
};

// Trạng thái Telegram và nơi lưu tệp chuẩn 01. TSUKUBA, kèm nút cài webhook (P34). Khoá và token chỉ nằm trong biến môi trường.
export function TelegramSettings({ status, canSetup }: { status: IntegrationStatus; canSetup: boolean }) {
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const ready = status.botConfigured && Boolean(status.webhookUrl) && status.secretConfigured;

  return (
    <Panel
      title="Telegram và lưu tệp"
      action={<Pill tone={ready ? 'mint' : 'butter'}>{ready ? 'Hoạt động tốt' : 'Cần cấu hình'}</Pill>}
      className="tsukuba-rise"
    >
      <div className="flex flex-col gap-3.5">
        <dl className="m-0 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/50 px-3.5 py-1 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-[var(--borderColor-muted)] py-2">
            <dt className="text-xs text-[var(--fgColor-muted)]">Nơi lưu tệp</dt>
            <dd className="m-0">
              {status.storage === 'supabase' ? (
                <Pill tone="mint">Supabase Storage</Pill>
              ) : (
                <Pill tone="butter">Ổ đĩa máy chủ (chỉ dùng khi chạy thử)</Pill>
              )}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dashed border-[var(--borderColor-muted)] py-2">
            <dt className="text-xs text-[var(--fgColor-muted)]">Bot Telegram</dt>
            <dd className="m-0 font-mono text-xs text-[var(--fgColor-default)]">
              {status.botConfigured
                ? status.botUsername
                  ? `@${status.botUsername}`
                  : (status.botError ?? 'Đã có token')
                : 'Chưa cấu hình'}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dashed border-[var(--borderColor-muted)] py-2">
            <dt className="text-xs text-[var(--fgColor-muted)]">Webhook</dt>
            <dd className="m-0 max-w-full break-all font-mono text-xs text-[var(--fgColor-default)]">
              {status.webhookUrl || 'Chưa cài'}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dashed border-[var(--borderColor-muted)] py-2">
            <dt className="text-xs text-[var(--fgColor-muted)]">Phụ huynh & nhân sự kết nối</dt>
            <dd className="m-0 text-xs tabular-nums text-[var(--fgColor-default)]">
              <b>{status.linkedParentsCount}</b> phụ huynh · <b>{status.linkedStaffCount}</b> tài khoản
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 py-2">
            <dt className="text-xs text-[var(--fgColor-muted)]">Tin lỗi gần đây (7 ngày)</dt>
            <dd className="m-0 text-xs tabular-nums">
              {status.failedMessagesRecentCount > 0 ? (
                <span className="font-semibold text-[var(--fgColor-danger)]">{status.failedMessagesRecentCount} tin chưa gửi được</span>
              ) : (
                <span className="text-[var(--fgColor-muted)]">0 tin lỗi</span>
              )}
            </dd>
          </div>
        </dl>

        {status.webhookError && <Alert>Lỗi gần nhất từ Telegram: {status.webhookError}</Alert>}
        {(!status.botConfigured || !status.secretConfigured || status.storage === 'disk') && (
          <Notice>
            Đặt trong biến môi trường (Vercel → Settings → Environment Variables): TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET (chuỗi ngẫu nhiên từ 16 ký tự) và
            SUPABASE_S3_ENDPOINT, SUPABASE_ACCESS_KEY_ID, SUPABASE_SECRET_ACCESS_KEY, SUPABASE_STORAGE_BUCKET. Sau đó deploy lại rồi bấm Cài webhook trên bản đã deploy.
          </Notice>
        )}
        {result && (result.ok ? <Alert tone="ok">{result.message}</Alert> : <Alert>{result.message}</Alert>)}
        {canSetup && (
          <div className="flex justify-end">
            <Btn
              leadingVisual={pending ? undefined : SyncIcon}
              loading={pending}
              onClick={() => startTransition(async () => setResult(await setupWebhookAction()))}
              disabled={pending || !status.botConfigured || !status.secretConfigured}
            >
              {pending ? 'Đang cài…' : 'Cài webhook'}
            </Btn>
          </div>
        )}
      </div>
    </Panel>
  );
}
