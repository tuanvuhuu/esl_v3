import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { GameHub } from '@/components/games/GameHub';
import { NoAccess } from '@/components/ui/NoAccess';
import { ForbiddenError } from '@/lib/authz';
import { requireClassAccess } from '@/lib/campus-access';
import { hasPermission } from '@/lib/permissions';
import { getWordListHeader, getWordListItems } from '@/lib/queries/word-lists';
import { getCurrentPermissions } from '@/lib/session';

// Giáo viên chơi thử danh sách từ (35.15), giống hệt màn học sinh thấy.
export default function WordListPlayPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<section aria-busy="true" className="h-[360px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />}>
      <WordListPlayData params={params} />
    </Suspense>
  );
}

async function WordListPlayData({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id: raw } = await params;
  if (!/^\d+$/.test(raw)) notFound();
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'students.view')) return <NoAccess title="Danh sách từ" />;
  const list = await getWordListHeader(Number(raw));
  if (!list) notFound();
  if (list.classId) {
    try {
      await requireClassAccess(list.classId);
    } catch (error) {
      if (error instanceof ForbiddenError) return <NoAccess title="Danh sách từ" />;
      throw error;
    }
  }
  const words = await getWordListItems(list.id);
  return <GameHub title={list.name} words={words} backHref="/tu-vung" backLabel="Danh sách từ" />;
}
