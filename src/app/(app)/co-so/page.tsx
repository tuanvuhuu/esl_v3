import { Suspense } from 'react';
import { CampusList } from '@/components/campus/CampusList';
import { NoAccess } from '@/components/ui/NoAccess';
import { hasPermission } from '@/lib/permissions';
import { listCampusRows } from '@/lib/queries/campuses';
import { getCurrentPermissions } from '@/lib/session';

// Danh sách cơ sở. Dữ liệu đọc trong Suspense (cacheComponents đang bật).
export default function CampusesPage() {
  return (
    <Suspense fallback={<CampusesSkeleton />}>
      <CampusesData />
    </Suspense>
  );
}

function CampusesSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải cơ sở" className="flex flex-col gap-4">
      <div className="h-9 w-48 animate-pulse rounded-xl bg-stone" />
      <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-2 min-[1200px]:grid-cols-3">
        <div className="h-[180px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />
        <div className="h-[180px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />
      </div>
    </section>
  );
}

async function CampusesData() {
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'settings.manage')) return <NoAccess title="Cơ sở" />;
  const campuses = await listCampusRows();
  return <CampusList campuses={campuses} canManage={hasPermission(granted, 'settings.manage')} />;
}
