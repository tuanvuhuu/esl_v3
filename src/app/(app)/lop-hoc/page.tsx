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
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="h-4 w-28 animate-pulse rounded bg-[var(--bgColor-muted)]" />
          <div className="h-7 w-48 animate-pulse rounded-md bg-[var(--bgColor-muted)]" />
        </div>
        <div className="h-8 w-28 animate-pulse rounded-[var(--borderRadius-medium)] bg-[var(--bgColor-muted)]" />
      </div>
      <div className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-2 min-[1200px]:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[272px] animate-pulse rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-4"
          >
            <div className="h-5 w-36 rounded bg-[var(--bgColor-muted)]" />
            <div className="mt-2 h-4 w-52 rounded bg-[var(--bgColor-muted)]" />
            <div className="mt-4 h-24 rounded-[var(--borderRadius-medium)] bg-[var(--bgColor-muted)]" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="h-6 rounded bg-[var(--bgColor-muted)]" />
              <div className="h-6 rounded bg-[var(--bgColor-muted)]" />
            </div>
          </div>
        ))}
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
