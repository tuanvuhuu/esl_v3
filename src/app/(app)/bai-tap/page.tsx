import { connection } from 'next/server';
import { Suspense } from 'react';
import { AssignmentsView } from '@/components/assignments/AssignmentsView';
import { NoAccess } from '@/components/ui/NoAccess';
import { getCampusContext } from '@/lib/campus-context';
import { withCampusNames } from '@/lib/campus';
import { hasPermission } from '@/lib/permissions';
import { listAssignmentsOfClass } from '@/lib/queries/assignments';
import { listClassChoices } from '@/lib/queries/classes';
import { listLessonChoices } from '@/lib/queries/lessons';
import { getCurrentPermissions } from '@/lib/session';

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

// Bài tập theo lớp. Lớp nằm trên URL. Dữ liệu đọc trong Suspense (cacheComponents đang bật).
export default function AssignmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<AssignmentsSkeleton />}>
      <AssignmentsData searchParams={searchParams} />
    </Suspense>
  );
}

function AssignmentsSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải bài tập" className="flex flex-col gap-4">
      <div className="h-9 w-40 animate-pulse rounded-xl bg-stone" />
      <div className="h-[var(--ctl-h)] w-full max-w-sm animate-pulse rounded-[var(--radius-ctl)] bg-stone" />
      <div className="h-[220px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />
    </section>
  );
}

async function AssignmentsData({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const sp = await searchParams;
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'students.view')) return <NoAccess title="Bài tập" />;

  const { scope } = await getCampusContext();
  const classes = withCampusNames(await listClassChoices(scope), scope === null);
  const clsRaw = first(sp.cls);
  const classId = classes.some((c) => String(c.id) === clsRaw) ? Number(clsRaw) : (classes[0]?.id ?? 0);
  const assignments = classId ? await listAssignmentsOfClass(classId) : [];

  const canManage = hasPermission(granted, 'assignments.manage');
  return (
    <AssignmentsView
      classes={classes.map((c) => ({ id: c.id, name: c.name, campusId: c.campusId }))}
      lessons={canManage ? await listLessonChoices() : []}
      classId={classId}
      assignments={assignments}
      canManage={canManage}
    />
  );
}
