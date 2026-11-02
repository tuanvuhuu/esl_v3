import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { StudentAssignmentForm } from '@/components/student/StudentAssignmentForm';
import { studentAssignment } from '@/lib/queries/student-portal';
import { getCurrentAccount } from '@/lib/session';

// Một bài của học sinh: đề, câu hỏi, ô làm bài và nút nộp. Chỉ bài thuộc lớp của học sinh mới mở được.
export default function StudentAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <section aria-busy="true" className="flex flex-col gap-4">
          <div className="h-[88px] animate-pulse rounded-2xl border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]" />
          <div className="h-[320px] animate-pulse rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]" />
        </section>
      }
    >
      <StudentAssignmentData params={params} />
    </Suspense>
  );
}

async function StudentAssignmentData({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id: raw } = await params;
  if (!/^\d+$/.test(raw)) notFound();
  const account = await getCurrentAccount();
  if (!account || account.studentId === null) redirect('/dang-nhap');
  const view = await studentAssignment(Number(raw), account.studentId);
  if (!view) notFound();
  return <StudentAssignmentForm view={view} />;
}
