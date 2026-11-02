import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { WordListDetailView } from '@/components/word-lists/WordListDetailView';
import { NoAccess } from '@/components/ui/NoAccess';
import { ForbiddenError } from '@/lib/authz';
import { requireClassAccess } from '@/lib/campus-access';
import { hasPermission } from '@/lib/permissions';
import { getWordListHeader, getWordListItems } from '@/lib/queries/word-lists';
import { getCurrentPermissions } from '@/lib/session';

// Giáo viên xem chi tiết từ vựng và chơi thử danh sách từ (35.15).
export default function WordListPlayPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <section aria-busy="true" className="grid grid-cols-1 gap-5 min-[1024px]:grid-cols-[minmax(0,1.35fr)_minmax(380px,460px)]">
          <div className="h-[420px] animate-pulse rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]" />
          <div className="h-[420px] animate-pulse rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]" />
        </section>
      }
    >
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
  return <WordListDetailView title={list.name} words={words} />;
}
