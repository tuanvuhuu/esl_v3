import { connection } from 'next/server';
import { Suspense } from 'react';
import { LessonsView } from '@/components/lessons/LessonsView';
import { NoAccess } from '@/components/ui/NoAccess';
import { getCampusContext } from '@/lib/campus-context';
import { hasPermission } from '@/lib/permissions';
import { listLessons } from '@/lib/queries/lessons';
import { getCurrentPermissions } from '@/lib/session';

// Bài giảng theo cơ sở đang chọn ở thanh trên. Dữ liệu đọc trong Suspense (cacheComponents đang bật).
export default function LessonsPage() {
  return (
    <Suspense fallback={<LessonsSkeleton />}>
      <LessonsData />
    </Suspense>
  );
}

function LessonsSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải bài giảng" className="flex flex-col gap-4">
      <div className="h-9 w-48 animate-pulse rounded-xl bg-stone" />
      <div className="h-[320px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />
    </section>
  );
}

async function LessonsData() {
  await connection();
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'students.view')) return <NoAccess title="Bài giảng" />;
  const { campuses, scope } = await getCampusContext();
  const lessons = await listLessons(scope);
  return <LessonsView lessons={lessons} campuses={campuses} scope={scope} canManage={hasPermission(granted, 'assignments.manage')} />;
}
