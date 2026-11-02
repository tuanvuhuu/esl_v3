import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { GameHub } from '@/components/games/GameHub';
import { enrolledStudent } from '@/lib/queries/student-portal';
import { getWordListHeader, getWordListItems } from '@/lib/queries/word-lists';
import { getCurrentAccount } from '@/lib/session';

// Trò chơi từ vựng của học sinh (35.15). Chỉ mở được danh sách của lớp mình hoặc danh sách dùng chung.
export default function StudentGamePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<section aria-busy="true" className="h-[360px] animate-pulse rounded-xl bg-[var(--bgColor-muted)]" />}>
      <StudentGameData params={params} />
    </Suspense>
  );
}

async function StudentGameData({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id: raw } = await params;
  if (!/^\d+$/.test(raw)) notFound();
  const account = await getCurrentAccount();
  if (!account || account.studentId === null) redirect('/dang-nhap');
  const [student, list] = await Promise.all([enrolledStudent(account.studentId), getWordListHeader(Number(raw))]);
  if (!student || !list || (list.classId !== null && list.classId !== student.classId)) notFound();
  const words = await getWordListItems(list.id);
  return (
    <div className="tsukuba-rise mx-auto w-full max-w-[540px] rounded-2xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-4 min-[640px]:p-5">
      <GameHub title={list.name} words={words} backHref="/cua-toi" backLabel="Bài của tôi" recordListId={list.id} />
    </div>
  );
}
