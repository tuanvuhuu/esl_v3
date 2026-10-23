import { Suspense } from 'react';
import { ParentList } from '@/components/parents/ParentList';
import { NoAccess } from '@/components/ui/NoAccess';
import { hasPermission } from '@/lib/permissions';
import { listParents, listStudentChoicesForParents } from '@/lib/queries/parents';
import { getCurrentPermissions } from '@/lib/session';
import { getCampusContext } from '@/lib/campus-context';

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
  // Danh sách theo cơ sở đang xem ở thanh trên (để dữ liệu thật và dữ liệu thử không lẫn). Học sinh để gán lấy từ mọi cơ sở được làm việc.
  const { scope } = await getCampusContext();
  const [parents, students] = await Promise.all([listParents(scope), listStudentChoicesForParents()]);
  return <ParentList parents={parents} students={students} canManage={hasPermission(granted, 'parents.manage')} />;
}
