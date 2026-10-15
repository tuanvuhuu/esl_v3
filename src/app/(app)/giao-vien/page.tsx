import { Suspense } from 'react';
import { TeacherList } from '@/components/teachers/TeacherList';
import { NoAccess } from '@/components/ui/NoAccess';
import { getCampusContext } from '@/lib/campus-context';
import { hasPermission } from '@/lib/permissions';
import { listTeachers } from '@/lib/queries/teachers';
import { getCurrentPermissions } from '@/lib/session';

// Danh sách giáo viên. Dữ liệu đọc trong Suspense (cacheComponents đang bật).
export default function TeachersPage() {
  return (
    <Suspense fallback={<TeachersSkeleton />}>
      <TeachersData />
    </Suspense>
  );
}

function TeachersSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải giáo viên" className="flex flex-col gap-4">
      <div className="h-9 w-48 animate-pulse rounded-xl bg-stone" />
      <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-2 min-[1200px]:grid-cols-3">
        <div className="h-[200px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />
        <div className="h-[200px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />
        <div className="h-[200px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />
      </div>
    </section>
  );
}

async function TeachersData() {
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'students.view')) return <NoAccess title="Giáo viên" />;
  // Giáo viên dạy ở cơ sở đang xem (scope null: tất cả). Ô chọn cơ sở dạy lấy danh sách cơ sở đầy đủ.
  const { campuses, scope } = await getCampusContext();
  const teachers = await listTeachers(scope);
  return (
    <TeacherList
      teachers={teachers}
      campuses={campuses}
      defaultCampusId={scope ?? campuses[0]?.id ?? 0}
      canManage={hasPermission(granted, 'teachers.manage')}
    />
  );
}
