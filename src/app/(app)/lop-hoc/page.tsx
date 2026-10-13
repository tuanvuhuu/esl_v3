import { Suspense } from 'react';
import { ClassList } from '@/components/classes/ClassList';
import { NoAccess } from '@/components/ui/NoAccess';
import { hasPermission } from '@/lib/permissions';
import { listClasses } from '@/lib/queries/classes';
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
        <div className="h-[260px] animate-pulse rounded-[20px] bg-stone" />
        <div className="h-[260px] animate-pulse rounded-[20px] bg-stone" />
        <div className="h-[260px] animate-pulse rounded-[20px] bg-stone" />
      </div>
    </section>
  );
}

async function ClassesData() {
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'students.view')) return <NoAccess title="Lớp học" />;
  const [classes, teachers] = await Promise.all([listClasses(), listTeacherChoices()]);
  return (
    <ClassList
      classes={classes}
      teachers={teachers.map((t) => ({ id: t.id, name: t.name, subject: t.subject }))}
      canManage={hasPermission(granted, 'classes.manage')}
    />
  );
}
