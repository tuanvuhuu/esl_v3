import { connection } from 'next/server';
import { Suspense } from 'react';
import { WordListsView } from '@/components/word-lists/WordListsView';
import { NoAccess } from '@/components/ui/NoAccess';
import { getAllowedCampusIds } from '@/lib/campus-access';
import { getCampusContext } from '@/lib/campus-context';
import { hasPermission } from '@/lib/permissions';
import { listClassChoices } from '@/lib/queries/classes';
import { listLessons } from '@/lib/queries/lessons';
import { listWordLists } from '@/lib/queries/word-lists';
import { getCurrentPermissions } from '@/lib/session';

// Danh sách từ cho trò chơi (35.14), theo cơ sở đang xem. Dữ liệu đọc trong Suspense (cacheComponents đang bật).
export default function WordListsPage() {
  return (
    <Suspense fallback={<section aria-busy="true" aria-label="Đang tải danh sách từ" className="h-[320px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />}>
      <WordListsData />
    </Suspense>
  );
}

async function WordListsData() {
  await connection();
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'students.view')) return <NoAccess title="Danh sách từ" />;
  const [{ scope }, allowed] = await Promise.all([getCampusContext(), getAllowedCampusIds()]);
  const [lists, classes, lessons] = await Promise.all([listWordLists(scope, allowed), listClassChoices(scope), listLessons(scope)]);
  return (
    <WordListsView
      lists={lists}
      classes={classes.map((c) => ({ id: c.id, name: c.name }))}
      lessons={lessons.map((l) => ({ id: l.id, title: l.title }))}
      canManage={hasPermission(granted, 'assignments.manage')}
    />
  );
}
