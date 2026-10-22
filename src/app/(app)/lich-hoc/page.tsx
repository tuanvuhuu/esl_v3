import { connection } from 'next/server';
import { Suspense } from 'react';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { NoAccess } from '@/components/ui/NoAccess';
import { getCampusContext } from '@/lib/campus-context';
import { withCampusNames } from '@/lib/campus';
import { addDaysKey, daysBetweenKeys, todayKeyVN, vnDayBounds, weekStartKey } from '@/lib/datetime';
import { idListParam } from '@/lib/list-param';
import { hasPermission } from '@/lib/permissions';
import { listClassChoices } from '@/lib/queries/classes';
import { listSessionsBetween } from '@/lib/queries/sessions';
import { listTeacherChoices } from '@/lib/queries/teachers';
import { getCurrentPermissions } from '@/lib/session';
import { isRealIsoDate } from '@/lib/validation/student';

// Khoảng ngày xem tối đa 62 ngày, để danh sách không quá dài
const MAX_SPAN_DAYS = 62;

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

// Đường dẫn lịch giữ nguyên bộ lọc, đổi khoảng ngày (w là ngày bắt đầu, to là ngày kết thúc).
// Lớp và giáo viên viết trên URL dạng "1,2".
function scheduleHref(from: string, to: string, cls: string, teacher: string): string {
  const params = new URLSearchParams({ w: from, to });
  if (cls) params.set('cls', cls);
  if (teacher) params.set('teacher', teacher);
  return `/lich-hoc?${params.toString()}`;
}

// Lịch học. Khoảng ngày, lớp và giáo viên nằm trên URL.
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
      <div className="h-[var(--ctl-h)] w-full max-w-md animate-pulse rounded-[var(--radius-ctl)] bg-stone" />
      <div className="h-[420px] w-full animate-pulse rounded-[var(--radius-panel)] bg-stone" />
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
  const toRaw = first(sp.to);
  const today = todayKeyVN();
  const thisWeek = weekStartKey(today);
  const hasW = wRaw !== '' && isRealIsoDate(wRaw);
  const hasTo = toRaw !== '' && isRealIsoDate(toRaw);
  // w là ngày bắt đầu, to là ngày kết thúc. Chỉ có w thì lấy tuần chứa w. Không có cả hai thì lấy tuần này.
  let from = hasW ? weekStartKey(wRaw) : thisWeek;
  let to = addDaysKey(from, 6);
  if (hasW && hasTo && toRaw >= wRaw) {
    from = wRaw;
    to = toRaw;
  }
  if (daysBetweenKeys(from, to) >= MAX_SPAN_DAYS) to = addDaysKey(from, MAX_SPAN_DAYS - 1);
  const span = daysBetweenKeys(from, to) + 1;

  // Lớp và giáo viên chọn nhiều. Danh sách rỗng nghĩa là không lọc.
  const classIds = idListParam(sp.cls);
  const teacherIds = idListParam(sp.teacher);
  const cls = classIds.join(',');
  const teacher = teacherIds.join(',');

  const startAt = vnDayBounds(from).start;
  const endAt = vnDayBounds(addDaysKey(to, 1)).start;
  const { scope } = await getCampusContext();
  const [sessions, classOptions, teachers] = await Promise.all([
    listSessionsBetween(startAt, endAt, scope, { classIds, teacherIds }),
    listClassChoices(scope),
    listTeacherChoices(scope),
  ]);
  const classes = withCampusNames(classOptions, scope === null);

  return (
    <ScheduleView
      rangeFrom={from}
      rangeTo={to}
      sessions={sessions}
      classes={classes.map((c) => ({ id: c.id, name: c.name, teacherId: c.teacherId, room: c.room }))}
      today={today}
      teachers={teachers.filter((t) => t.staffRole !== 'assistant').map((t) => ({ id: t.id, name: t.name, subject: t.subject }))}
      filters={{ cls, teacher }}
      canManage={hasPermission(granted, 'classes.manage')}
      prevHref={scheduleHref(addDaysKey(from, -span), addDaysKey(to, -span), cls, teacher)}
      nextHref={scheduleHref(addDaysKey(from, span), addDaysKey(to, span), cls, teacher)}    />
  );
}
