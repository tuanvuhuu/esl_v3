import { connection } from 'next/server';
import { Suspense } from 'react';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { NoAccess } from '@/components/ui/NoAccess';
import { addDaysKey, todayKeyVN, vnDayBounds, weekStartKey } from '@/lib/datetime';
import { hasPermission } from '@/lib/permissions';
import { listClassChoices } from '@/lib/queries/classes';
import { listSessionsBetween } from '@/lib/queries/sessions';
import { listTeacherChoices } from '@/lib/queries/teachers';
import { getCurrentPermissions } from '@/lib/session';
import { isRealIsoDate } from '@/lib/validation/student';

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

// Đường dẫn lịch giữ nguyên bộ lọc, chỉ đổi tuần
function scheduleHref(week: string, cls: string, teacher: string): string {
  const params = new URLSearchParams({ w: week });
  if (cls) params.set('cls', cls);
  if (teacher) params.set('teacher', teacher);
  return `/lich-hoc?${params.toString()}`;
}

// Lịch học theo tuần. Tuần, lớp và giáo viên nằm trên URL.
export default function SchedulePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<ScheduleSkeleton />}>
      <ScheduleData searchParams={searchParams} />
    </Suspense>
  );
}

function ScheduleSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải lịch học" className="flex flex-col gap-4">
      <div className="h-9 w-56 animate-pulse rounded-xl bg-stone" />
      <div className="h-10 w-full max-w-md animate-pulse rounded-xl bg-stone" />
      <div className="h-[420px] w-full animate-pulse rounded-[24px] bg-stone" />
    </section>
  );
}

async function ScheduleData({ searchParams }: { searchParams: Promise<SearchParams> }) {
  // Giờ hiện tại chỉ có khi có yêu cầu của người dùng, không tính lúc prerender (docs: connection())
  await connection();
  const sp = await searchParams;
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'students.view')) return <NoAccess title="Lịch học" />;

  const wRaw = first(sp.w);
  const today = todayKeyVN();
  const week = weekStartKey(wRaw && isRealIsoDate(wRaw) ? wRaw : today);
  const clsRaw = first(sp.cls);
  const teacherRaw = first(sp.teacher);
  const cls = /^\d+$/.test(clsRaw) ? clsRaw : '';
  const teacher = /^\d+$/.test(teacherRaw) ? teacherRaw : '';

  const from = vnDayBounds(week).start;
  const to = vnDayBounds(addDaysKey(week, 7)).start;
  const [sessions, classes, teachers] = await Promise.all([
    listSessionsBetween(from, to, { classId: cls ? Number(cls) : null, teacherId: teacher ? Number(teacher) : null }),
    listClassChoices(),
    listTeacherChoices(),
  ]);

  return (
    <ScheduleView
      weekStart={week}
      sessions={sessions}
      classes={classes.map((c) => ({ id: c.id, name: c.name }))}
      teachers={teachers.map((t) => ({ id: t.id, name: t.name, subject: t.subject }))}
      filters={{ cls, teacher }}
      canManage={hasPermission(granted, 'classes.manage')}
      prevHref={scheduleHref(addDaysKey(week, -7), cls, teacher)}
      nextHref={scheduleHref(addDaysKey(week, 7), cls, teacher)}
      todayHref={scheduleHref(today, cls, teacher)}
    />
  );
}
