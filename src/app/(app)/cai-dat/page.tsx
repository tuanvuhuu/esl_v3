import { Suspense } from 'react';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { NoAccess } from '@/components/ui/NoAccess';
import { hasPermission } from '@/lib/permissions';
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
      <div className="h-[420px] w-full animate-pulse rounded-[24px] bg-stone" />
    </section>
  );
}

async function SettingsData() {
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'settings.manage')) return <NoAccess title="Cài đặt" />;
  const settings = await getCenterSettings();
  return <SettingsForm settings={settings} canManage={hasPermission(granted, 'settings.manage')} />;
}
