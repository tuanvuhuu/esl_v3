import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PROFILE_TABS, StudentProfile, type ProfileTab } from '@/components/students/profile/StudentProfile';
import { NoAccess } from '@/components/ui/NoAccess';
import { listHistoryForStudent } from '@/lib/queries/learning';
import { listStudentAssignments } from '@/lib/queries/assignments';
import { listParentChoices } from '@/lib/queries/parents';
import { getStudentDetail } from '@/lib/queries/students';
import { hasPermission } from '@/lib/permissions';
import { getCurrentPermissions } from '@/lib/session';

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

// Hồ sơ học sinh trên trang riêng (điện thoại và đường dẫn trực tiếp). Tab nằm trên URL.
export default function StudentProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileData params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function ProfileSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải hồ sơ" className="flex flex-col gap-4">
      <div className="h-10 w-40 animate-pulse rounded-xl bg-stone" />
      <div className="h-56 w-full animate-pulse rounded-[24px] bg-stone" />
    </section>
  );
}

async function ProfileData({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  await connection();
  const { id: rawId } = await params;
  if (!/^\d+$/.test(rawId)) notFound();
  const id = Number(rawId);
  const sp = await searchParams;

  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'students.view')) return <NoAccess title="Hồ sơ học sinh" />;

  const tabRaw = first(sp.tab);
  const tab: ProfileTab = (PROFILE_TABS.map((t) => t.key) as string[]).includes(tabRaw) ? (tabRaw as ProfileTab) : 'tong-quan';

  const student = await getStudentDetail(id);
  if (!student) notFound();
  const [history, assignments, parentChoices] = await Promise.all([
    listHistoryForStudent(id),
    listStudentAssignments(id),
    tab === 'phu-huynh' ? listParentChoices() : Promise.resolve([]),
  ]);

  return (
    <StudentProfile
      base={`/hoc-sinh/${id}`}
      tab={tab}
      student={student}
      history={history}
      assignments={assignments}
      parentChoices={parentChoices}
      perms={{
        tuition: hasPermission(granted, 'tuition.manage'),
        parents: hasPermission(granted, 'parents.manage'),
        learning: hasPermission(granted, 'learning.manage'),
      }}
    />
  );
}
