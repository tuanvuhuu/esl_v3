import { connection } from 'next/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ReviewSession } from '@/components/games/ReviewSession';
import { EmptyPanel } from '@/components/ui/surfaces';
import { reviewSession } from '@/lib/queries/word-box';
import { getCurrentAccount } from '@/lib/session';

// Ôn từ hôm nay của học sinh (35.18): tối đa 10 từ đến hạn trong hộp từ.
export default function WordReviewPage() {
  return (
    <Suspense fallback={<section aria-busy="true" className="h-[360px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />}>
      <WordReviewData />
    </Suspense>
  );
}

async function WordReviewData() {
  await connection();
  const account = await getCurrentAccount();
  if (!account || account.studentId === null) redirect('/dang-nhap');
  const { due, others } = await reviewSession(account.studentId);
  if (due.length === 0) {
    return (
      <section className="mx-auto flex w-full max-w-[480px] flex-col gap-4 py-2">
        <EmptyPanel title="Hôm nay con ôn xong rồi" hint="Từ mới vào hộp khi con chơi trò chơi từ vựng. Hẹn con lần ôn tới." />
        <Link href="/cua-toi" className="self-start text-sm font-bold text-link underline underline-offset-2">Về trang của con</Link>
      </section>
    );
  }
  return <ReviewSession due={due} others={others} />;
}
