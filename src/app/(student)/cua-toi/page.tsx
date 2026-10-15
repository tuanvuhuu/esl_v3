import { connection } from 'next/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { SubmissionPill } from '@/components/assignments/SubmissionPill';
import { vnDateTimeLabel } from '@/lib/datetime';
import { studentAssignmentList } from '@/lib/queries/student-portal';
import { getCurrentAccount } from '@/lib/session';

// Bài tập của lớp học sinh. Dữ liệu đọc trong Suspense (cacheComponents đang bật).
export default function StudentHomePage() {
  return (
    <Suspense fallback={<section aria-busy="true" className="h-[240px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />}>
      <StudentHomeData />
    </Suspense>
  );
}

async function StudentHomeData() {
  await connection();
  const account = await getCurrentAccount();
  if (!account || account.studentId === null) redirect('/dang-nhap');
  const rows = await studentAssignmentList(account.studentId);

  return (
    <section className="flex flex-col gap-4">
      <PageHeader crumbs={['Khu học sinh']} title="Bài của tôi" subtitle="Bài tập của lớp bạn. Bấm vào bài để làm và nộp." titleOnTopbar={false} />

      {rows.length === 0 ? (
        <EmptyPanel title="Lớp chưa có bài tập" hint="Khi giáo viên giao bài, bài sẽ hiện ở đây." />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Link href={`/cua-toi/${r.id}`} className="min-w-0 text-base font-normal text-ink [overflow-wrap:anywhere] hover:underline">
                    {r.title}
                  </Link>
                  <SubmissionPill status={r.status} />
                </div>
                <small className="text-sm text-muted">
                  Hạn {vnDateTimeLabel(r.dueAt)} · tối đa {r.maxScore} điểm
                  {r.status === 'graded' && r.score !== null ? ` · Điểm ${r.score}/${r.maxScore}` : ''}
                </small>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
