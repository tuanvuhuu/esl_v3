import { connection } from 'next/server';
import { Suspense } from 'react';
import { QuestionBankView } from '@/components/questions/QuestionBankView';
import { NoAccess } from '@/components/ui/NoAccess';
import { hasPermission } from '@/lib/permissions';
import { listQuestionBank } from '@/lib/queries/question-bank';
import { getCurrentPermissions } from '@/lib/session';

// Ngân hàng câu hỏi dùng chung. Chỉ người được soạn bài tập mới vào. Dữ liệu đọc trong Suspense (cacheComponents đang bật).
export default function QuestionBankPage() {
  return (
    <Suspense fallback={<BankSkeleton />}>
      <BankData />
    </Suspense>
  );
}

function BankSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải ngân hàng câu hỏi" className="flex flex-col gap-4">
      <div className="h-9 w-64 animate-pulse rounded-xl bg-stone" />
      <div className="h-[380px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />
    </section>
  );
}

async function BankData() {
  await connection();
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'assignments.manage')) return <NoAccess title="Ngân hàng câu hỏi" />;
  const questions = await listQuestionBank();
  return <QuestionBankView questions={questions} />;
}
