'use client';

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

// Trạng thái Telegram và nơi lưu tệp, kèm nút cài webhook (P34). Khoá và token chỉ nằm trong biến môi trường.
export function TelegramSettings({ status, canSetup }: { status: IntegrationStatus; canSetup: boolean }) {
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Panel title="Telegram và lưu tệp">
      <div className="flex flex-col gap-3">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm min-[768px]:grid-cols-[180px_1fr]">
          <dt className="text-ink-2">Nơi lưu tệp</dt>
          <dd>
            {status.storage === 'supabase' ? (
              <Pill tone="mint">Supabase Storage</Pill>
            ) : (
              <Pill tone="butter">Ổ đĩa máy chủ (chỉ dùng khi chạy thử trên máy)</Pill>
            )}
          </dd>
          <dt className="text-ink-2">Bot Telegram</dt>
          <dd className="text-ink">
            {status.botConfigured ? (status.botUsername ? `@${status.botUsername}` : (status.botError ?? 'Đã có token')) : 'Chưa cấu hình'}
          </dd>
          <dt className="text-ink-2">Webhook</dt>
          <dd className="break-all text-ink">{status.webhookUrl || 'Chưa cài'}</dd>
          <dt className="text-ink-2">Phụ huynh kết nối</dt>
          <dd className="text-ink">{status.linkedParentsCount} phụ huynh</dd>
          <dt className="text-ink-2">Nhân sự kết nối</dt>
          <dd className="text-ink">{status.linkedStaffCount} tài khoản</dd>
          <dt className="text-ink-2">Tin lỗi gần đây (7 ngày)</dt>
          <dd className="text-ink">
            {status.failedMessagesRecentCount > 0 ? (
              <span className="font-semibold text-blush-ink">{status.failedMessagesRecentCount} tin chưa gửi được</span>
            ) : (
              <span className="text-ink-2">0 tin lỗi</span>
            )}
          </dd>
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
          <div>
            <Btn
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
