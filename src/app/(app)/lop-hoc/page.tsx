import { Suspense } from 'react';
import { ClassList } from '@/components/classes/ClassList';
import { NoAccess } from '@/components/ui/NoAccess';
import { getCampusContext } from '@/lib/campus-context';
import { hasPermission } from '@/lib/permissions';
import { listClasses } from '@/lib/queries/classes';
import { listLevels } from '@/lib/queries/levels';
import { listTeacherChoices } from '@/lib/queries/teachers';
import { getCurrentPermissions } from '@/lib/session';

// Danh sách lớp. Dữ liệu đọc trong Suspense (cacheComponents đang bật).
export default function ClassesPage() {
  return (
    <Suspense fallback={<ClassesSkeleton />}>
      <ClassesData />
    </Suspense>
  );
}

function ClassesSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải lớp học" className="flex flex-col gap-4">
      <div className="h-9 w-48 animate-pulse rounded-xl bg-stone" />
      <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-2 min-[1200px]:grid-cols-3">
        <div className="h-[260px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />
        <div className="h-[260px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />
        <div className="h-[260px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />
      </div>
    </section>
  );
}

async function ClassesData() {
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'students.view')) return <NoAccess title="Lớp học" />;
  const { campuses, scope } = await getCampusContext();
  // Form lớp lọc giáo viên theo cơ sở đã chọn, nên lấy đủ mọi giáo viên kèm cơ sở dạy
  const [classes, teachers, levels] = await Promise.all([listClasses(scope), listTeacherChoices(null), listLevels()]);
  return (
    <ClassList
      classes={classes}
      teachers={teachers.map((t) => ({ id: t.id, name: t.name, subject: t.subject, staffRole: t.staffRole, campusIds: t.campusIds }))}
      campuses={campuses}
      levels={levels.map((l) => ({ id: l.id, code: l.code, name: l.name }))}
      defaultCampusId={scope ?? campuses[0]?.id ?? 0}
      showCampus={scope === null}
      canManage={hasPermission(granted, 'classes.manage')}
    />
  );
}
