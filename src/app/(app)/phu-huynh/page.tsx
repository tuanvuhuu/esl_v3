import { Suspense } from 'react';
import { ParentList } from '@/components/parents/ParentList';
import { NoAccess } from '@/components/ui/NoAccess';
import { hasPermission } from '@/lib/permissions';
import { listParents, listStudentChoicesForParents } from '@/lib/queries/parents';
import { getCurrentPermissions } from '@/lib/session';

// Danh sách phụ huynh. Dữ liệu đọc trong Suspense (cacheComponents đang bật).
export default function ParentsPage() {
  return (
    <Suspense fallback={<ParentsSkeleton />}>
      <ParentsData />
    </Suspense>
  );
}

function ParentsSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải phụ huynh" className="flex flex-col gap-4">
      <div className="h-9 w-48 animate-pulse rounded-xl bg-stone" />
      <div className="h-11 w-full animate-pulse rounded-[var(--radius-ctl)] bg-stone" />
      <div className="h-[420px] w-full animate-pulse rounded-[var(--radius-panel)] bg-stone" />
    </section>
  );
}

async function ParentsData() {
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'students.view')) return <NoAccess title="Phụ huynh" />;
  // Học sinh để gán cho phụ huynh lấy từ mọi cơ sở (phụ huynh dùng chung, không lọc theo cơ sở)
  const [parents, students] = await Promise.all([listParents(), listStudentChoicesForParents()]);
  return <ParentList parents={parents} students={students} canManage={hasPermission(granted, 'parents.manage')} />;
}
