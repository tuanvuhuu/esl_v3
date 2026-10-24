import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { GradingView } from '@/components/assignments/GradingView';
import { ItemGradingView } from '@/components/assignments/ItemGradingView';
import { NoAccess } from '@/components/ui/NoAccess';
import { hasPermission } from '@/lib/permissions';
import { listItemGradingRows, listItemsOfAssignment } from '@/lib/queries/assignment-items';
import { getAssignmentBase, listGradingRows } from '@/lib/queries/assignments';
import { listQuestionBank } from '@/lib/queries/question-bank';
import { getCurrentAccount, getCurrentPermissions } from '@/lib/session';
import { passes, requireAssignmentAccess } from '@/lib/campus-access';

// Chấm điểm một bài tập. Dữ liệu đọc trong Suspense (cacheComponents đang bật).
// ?hs=<mã học sinh>: mở thẳng hộp chấm bài của học sinh đó (liên kết từ bảng theo dõi lớp, 35.20)
export default function GradingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ hs?: string }> }) {
  return (
    <Suspense fallback={<GradingSkeleton />}>
      <GradingData params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function GradingSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải bài tập" className="flex flex-col gap-4">
      <div className="h-9 w-64 animate-pulse rounded-xl bg-stone" />
      <div className="h-[380px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />
    </section>
  );
}

async function GradingData({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ hs?: string }> }) {
  await connection();
  const { id: raw } = await params;
  const { hs } = await searchParams;
  if (!/^\d+$/.test(raw)) notFound();
  const id = Number(raw);

  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'students.view')) return <NoAccess title="Bài tập" />;

  if (!(await passes(() => requireAssignmentAccess(id)))) notFound();
  const base = await getAssignmentBase(id);
  if (!base) notFound();
  const canManage = hasPermission(granted, 'assignments.manage');
  const assignment = {
    id: base.id,
    title: base.title,
    className: base.className,
    dueAt: base.dueAt.toISOString(),
    maxScore: base.maxScore,
    description: base.description,
    levelCode: base.levelCode,
  };

  // Ngân hàng câu hỏi chỉ đọc khi người xem được soạn câu (để chép vào bài)
  const bank = canManage ? await listQuestionBank() : [];

  // Bài có câu hỏi: chấm từng câu. Bài chưa có câu: bảng nhập điểm như trước.
  const items = await listItemsOfAssignment(id);
  if (items.length > 0) {
    const rows = await listItemGradingRows(id, base.classId, items);
    const account = await getCurrentAccount();
    return (
      <ItemGradingView
        assignment={assignment}
        items={items}
        rows={rows}
        bank={bank}
        canManage={canManage}
        currentAccountId={account?.id ?? null}
        initialStudentId={hs && /^\d+$/.test(hs) ? Number(hs) : null}
      />
    );
  }
  const rows = await listGradingRows(id, base.classId);
  return <GradingView assignment={assignment} rows={rows} bank={bank} canManage={canManage} />;
}
