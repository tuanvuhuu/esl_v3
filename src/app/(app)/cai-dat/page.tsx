import { Suspense } from 'react';
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { LevelSettings } from '@/components/levels/LevelSettings';
import { FileCleanup } from '@/components/settings/FileCleanup';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { TelegramSettings, type IntegrationStatus } from '@/components/settings/TelegramSettings';
import { blobDriver } from '@/lib/blob-store';
import { isUnrestricted } from '@/lib/campus-access';
import { botToken, getMe, getWebhookInfo, webhookSecret } from '@/lib/telegram/api';
import { NoAccess } from '@/components/ui/NoAccess';
import { hasPermission } from '@/lib/permissions';
import { listOrphanFiles } from '@/lib/queries/files';
import { listLevels } from '@/lib/queries/levels';
import { getCenterSettings } from '@/lib/queries/settings';
import { getCurrentPermissions } from '@/lib/session';

// Cài đặt trung tâm. Dữ liệu đọc trong Suspense (cacheComponents đang bật).
export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsData />
    </Suspense>
  );
}

function SettingsSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải cài đặt" className="flex flex-col gap-4">
      <div className="h-9 w-40 animate-pulse rounded-xl bg-stone" />
      <div className="h-[420px] w-full animate-pulse rounded-[var(--radius-panel)] bg-stone" />
    </section>
  );
}

async function SettingsData() {
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'settings.manage')) return <NoAccess title="Cài đặt" />;
  const settings = await getCenterSettings();
  const levels = await listLevels();
  const orphans = await listOrphanFiles();
  const megabytes = (orphans.reduce((sum, f) => sum + f.sizeBytes, 0) / (1024 * 1024)).toFixed(1);
  const canManage = hasPermission(granted, 'settings.manage');
  return (
    <div className="flex flex-col gap-6">
      <SettingsForm settings={settings} canManage={canManage} />
      <LevelSettings levels={levels} canManage={canManage} />
      <FileCleanup count={orphans.length} megabytes={megabytes} canManage={canManage} />
      <TelegramSettings status={await integrationStatus()} canSetup={await isUnrestricted()} />
    </div>
  );
}

// Trạng thái Telegram và nơi lưu tệp. Gọi Telegram chỉ khi đã có token.
async function integrationStatus(): Promise<IntegrationStatus> {
  const configured = botToken() !== null;
  const [me, hook, statsRow] = await Promise.all([
    configured ? getMe() : null,
    configured ? getWebhookInfo() : null,
    db.execute<{
      parents_count: number;
      staff_count: number;
      failed_recent: number;
    }>(sql`
      SELECT
        (SELECT COUNT(*)::int FROM telegram_chats WHERE parent_id IS NOT NULL AND active = true) AS parents_count,
        (SELECT COUNT(*)::int FROM telegram_chats WHERE account_id IS NOT NULL AND active = true) AS staff_count,
        (SELECT COUNT(*)::int FROM telegram_messages WHERE delivered = false AND created_at >= NOW() - interval '7 days') AS failed_recent
    `),
  ]);

  const stats = statsRow.rows[0];

  return {
    storage: blobDriver(),
    botConfigured: configured,
    botUsername: me && me.ok ? me.result.username : null,
    botError: me && !me.ok ? me.description : null,
    webhookUrl: hook && hook.ok ? hook.result.url || null : null,
    webhookError: hook && hook.ok ? (hook.result.last_error_message ?? null) : null,
    secretConfigured: webhookSecret() !== null,
    linkedParentsCount: stats?.parents_count ?? 0,
    linkedStaffCount: stats?.staff_count ?? 0,
    failedMessagesRecentCount: stats?.failed_recent ?? 0,
  };
}
