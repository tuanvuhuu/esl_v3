import { connection } from 'next/server';
import { Suspense } from 'react';
import { AttendanceView } from '@/components/attendance/AttendanceView';
import { NoAccess } from '@/components/ui/NoAccess';
import { hasPermission } from '@/lib/permissions';
import { listRoster } from '@/lib/queries/attendance';
import { listClassChoices } from '@/lib/queries/classes';
import { listSessionsOfClass, type SessionRow } from '@/lib/queries/sessions';
import { getCurrentPermissions } from '@/lib/session';

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

// Buổi mặc định: buổi đã bắt đầu gần nhất và chưa huỷ; nếu chưa có thì buổi đầu tiên chưa học
function defaultSession(list: SessionRow[]): SessionRow | null {
  const started = list.filter((s) => s.isPast && s.status !== 'cancelled');
  if (started.length > 0) return started[started.length - 1];
  return list.find((s) => s.status !== 'cancelled') ?? null;
}

// Điểm danh. Lớp và buổi nằm trên URL. Dữ liệu đọc trong Suspense (cacheComponents đang bật).
export default function AttendancePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<AttendanceSkeleton />}>
      <AttendanceData searchParams={searchParams} />
    </Suspense>
  );
}

function AttendanceSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải điểm danh" className="flex flex-col gap-4">
      <div className="h-9 w-48 animate-pulse rounded-xl bg-stone" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-stone" />
      <div className="h-[360px] w-full animate-pulse rounded-[24px] bg-stone" />
    </section>
  );
}

async function AttendanceData({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const sp = await searchParams;
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'attendance.record')) return <NoAccess title="Điểm danh" />;

  const classes = await listClassChoices();
  if (classes.length === 0) {
    return <AttendanceView classes={[]} classId={0} sessions={[]} session={null} roster={[]} canRecord />;
  }
  const clsRaw = first(sp.cls);
  const classId = classes.some((c) => String(c.id) === clsRaw) ? Number(clsRaw) : classes[0].id;

  const sessions = await listSessionsOfClass(classId);
  const sRaw = first(sp.s);
  const session = sessions.find((s) => String(s.id) === sRaw) ?? defaultSession(sessions);
  const roster = session ? await listRoster(classId, session.dateKey) : [];

  // key theo lớp và buổi: đổi buổi thì trạng thái đánh dấu được khởi tạo lại từ dữ liệu
  return (
    <AttendanceView
      key={`${classId}-${session?.id ?? 0}`}
      classes={classes.map((c) => ({ id: c.id, name: c.name }))}
      classId={classId}
      sessions={sessions}
      session={session}
      roster={roster}
      canRecord={hasPermission(granted, 'attendance.record')}
    />
  );
}
