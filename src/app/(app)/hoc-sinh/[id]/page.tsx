import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PROFILE_TABS, StudentProfile, type ProfileTab } from '@/components/students/profile/StudentProfile';
import { NoAccess } from '@/components/ui/NoAccess';
import { listHistoryForStudent } from '@/lib/queries/learning';
import { studentSkillHistory } from '@/lib/queries/skills';
import { listStudentAssignments } from '@/lib/queries/assignments';
import { listParentChoices } from '@/lib/queries/parents';
import { getStudentDetail } from '@/lib/queries/students';
import { hasPermission } from '@/lib/permissions';
import { getCurrentPermissions } from '@/lib/session';
import { passes, requireStudentAccess } from '@/lib/campus-access';

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
    <section aria-busy="true" aria-label="Đang tải hồ sơ" className="flex flex-col gap-3.5">
      <div className="h-8 w-36 animate-pulse rounded-[var(--borderRadius-medium)] bg-[var(--bgColor-muted)]" />
      <div className="h-44 w-full animate-pulse rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]" />
      <div className="h-9 w-72 animate-pulse rounded-[var(--borderRadius-medium)] bg-[var(--bgColor-muted)]" />
      <div className="grid gap-3.5 min-[1200px]:grid-cols-2">
        <div className="h-28 animate-pulse rounded-[var(--borderRadius-large)] bg-[var(--bgColor-muted)] min-[1200px]:col-span-2" />
        <div className="h-40 animate-pulse rounded-[var(--borderRadius-large)] bg-[var(--bgColor-muted)]" />
        <div className="h-40 animate-pulse rounded-[var(--borderRadius-large)] bg-[var(--bgColor-muted)]" />
      </div>
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

  if (!(await passes(() => requireStudentAccess(id)))) notFound();
  const student = await getStudentDetail(id);
  if (!student) notFound();
  const [history, assignments, parentChoices, skills] = await Promise.all([
    listHistoryForStudent(id),
    listStudentAssignments(id),
    tab === 'phu-huynh' ? listParentChoices() : Promise.resolve([]),
    tab === 'ky-nang' ? studentSkillHistory(id) : Promise.resolve(null),
  ]);

  return (
    <StudentProfile
      base={`/hoc-sinh/${id}`}
      tab={tab}
      student={student}
      history={history}
      assignments={assignments}
      parentChoices={parentChoices}
      skills={skills}
      perms={{
        tuition: hasPermission(granted, 'tuition.manage'),
        parents: hasPermission(granted, 'parents.manage'),
        learning: hasPermission(granted, 'learning.manage'),
        assignments: hasPermission(granted, 'assignments.manage'),
      }}
    />
  );
}
