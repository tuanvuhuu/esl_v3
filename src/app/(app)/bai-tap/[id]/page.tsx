import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { GradingView } from '@/components/assignments/GradingView';
import { NoAccess } from '@/components/ui/NoAccess';
import { hasPermission } from '@/lib/permissions';
import { getAssignmentBase, listGradingRows } from '@/lib/queries/assignments';
import { getCurrentPermissions } from '@/lib/session';

// Chấm điểm một bài tập. Dữ liệu đọc trong Suspense (cacheComponents đang bật).
export default function GradingPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<GradingSkeleton />}>
      <GradingData params={params} />
    </Suspense>
  );
}

function GradingSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải bài tập" className="flex flex-col gap-4">
      <div className="h-9 w-64 animate-pulse rounded-xl bg-stone" />
      <div className="h-[380px] animate-pulse rounded-[24px] bg-stone" />
    </section>
  );
}

async function GradingData({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id: raw } = await params;
  if (!/^\d+$/.test(raw)) notFound();
  const id = Number(raw);

  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'students.view')) return <NoAccess title="Bài tập" />;

  const base = await getAssignmentBase(id);
  if (!base) notFound();
  const rows = await listGradingRows(id, base.classId);

  return (
    <GradingView
      assignment={{
        id: base.id,
        title: base.title,
        className: base.className,
        dueAt: base.dueAt.toISOString(),
        maxScore: base.maxScore,
        description: base.description,
      }}
      rows={rows}
      canManage={hasPermission(granted, 'assignments.manage')}
    />
  );
}
