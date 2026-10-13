import { Suspense } from 'react';
import { StudentList } from '@/components/students/StudentList';
import { PROFILE_TABS, StudentProfile, type ProfileTab } from '@/components/students/profile/StudentProfile';
import { listHistoryForStudent } from '@/lib/queries/learning';
import { listStudentAssignments } from '@/lib/queries/assignments';
import { getStudentDetail, listClassOptions, listStudents, type StatusFilter, type TuitionFilter } from '@/lib/queries/students';
import { listParentChoices } from '@/lib/queries/parents';
import { hasPermission, type Permission } from '@/lib/permissions';
import { studentsHref } from '@/lib/student-url';
import { getCurrentPermissions } from '@/lib/session';

type SearchParams = Record<string, string | string[] | undefined>;

const PAGE_SIZE = 8;
const STATUSES = ['active', 'trial', 'paused', 'finished'] as const;
const TUITIONS = ['paid', 'partial', 'unpaid'] as const;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

function intParam(value: string | string[] | undefined, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(first(value), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

// Danh sách học sinh. Bộ lọc và trang nằm trên URL, nên tải lại trang hay chia sẻ link vẫn đúng.
// Dữ liệu đọc trong Suspense để trang stream (cacheComponents đang bật trong next.config.ts).
export default function StudentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<StudentsSkeleton />}>
      <StudentsData searchParams={searchParams} />
    </Suspense>
  );
}

function StudentsSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải danh sách học sinh" className="flex flex-col gap-4">
      <div className="h-9 w-40 animate-pulse rounded-xl bg-stone" />
      <div className="h-10 w-full max-w-md animate-pulse rounded-xl bg-stone" />
      <div className="h-[420px] w-full animate-pulse rounded-[24px] bg-stone" />
    </section>
  );
}

async function StudentsData({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;

  const q = first(sp.q).slice(0, 80);
  const statusRaw = first(sp.status);
  const status = (STATUSES as readonly string[]).includes(statusRaw) ? statusRaw : 'all';
  const clsRaw = first(sp.cls);
  const classId = /^\d+$/.test(clsRaw) ? Number(clsRaw) : null;
  const tuitionRaw = first(sp.tuition);
  const tuition = (TUITIONS as readonly string[]).includes(tuitionRaw) ? tuitionRaw : 'all';
  const page = intParam(sp.p, 1, 500, 1);
  const loadedPages = intParam(sp.n, 1, 500, 1);

  // Lấy đủ để phục vụ cả trang máy tính và số trang điện thoại đã tải
  const limit = Math.max(page, loadedPages) * PAGE_SIZE;
  const [result, classes, parents, granted] = await Promise.all([
    listStudents({ q, status: status as StatusFilter, classId, tuition: tuition as TuitionFilter }, { limit, offset: 0 }),
    listClassOptions(),
    listParentChoices(),
    getCurrentPermissions(),
  ]);

  const permissions = new Set(granted);
  const pageCount = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const rows = result.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const phoneRows = result.rows.slice(0, loadedPages * PAGE_SIZE);
  const filters = { q, status, cls: classId ? String(classId) : '', tuition };

  // Ngăn kéo hồ sơ (máy tính): dựng sẵn khi có ?h=. Điện thoại không dùng, vì có trang riêng.
  const hRaw = first(sp.h);
  const drawer = /^\d+$/.test(hRaw) && hasPermission(permissions, 'students.view')
    ? await buildDrawer(Number(hRaw), first(sp.tab), filters, page, loadedPages, permissions)
    : null;

  return (
    <StudentList
      rows={rows}
      phoneRows={phoneRows}
      total={result.total}
      page={page}
      pageCount={pageCount}
      loadedPages={loadedPages}
      filters={filters}
      classes={classes.map((c) => ({ id: c.id, name: c.name, course: c.course, teacherName: c.teacherName, fee: c.fee }))}
      parents={parents}
      statusCounts={result.statusCounts}
      canEdit={hasPermission(permissions, 'students.edit')}
      canDelete={hasPermission(permissions, 'students.delete')}
      drawer={drawer}
    />
  );
}

// Hồ sơ trong ngăn kéo. Tab và bộ lọc đều giữ trên URL để đóng ngăn kéo thì danh sách vẫn đúng.
async function buildDrawer(
  id: number,
  tabRaw: string,
  filters: { q: string; status: string; cls: string; tuition: string },
  page: number,
  loadedPages: number,
  permissions: Set<Permission>,
) {
  const student = await getStudentDetail(id);
  if (!student) return null;
  const tab: ProfileTab = (PROFILE_TABS.map((t) => t.key) as string[]).includes(tabRaw) ? (tabRaw as ProfileTab) : 'tong-quan';
  const [history, assignments, parentChoices] = await Promise.all([
    listHistoryForStudent(id),
    listStudentAssignments(id),
    tab === 'phu-huynh' ? listParentChoices() : Promise.resolve([]),
  ]);
  const listParams = { ...filters, p: page, n: loadedPages };
  return (
    <StudentProfile
      base={studentsHref({ ...listParams, h: String(id) })}
      tab={tab}
      student={student}
      history={history}
      assignments={assignments}
      parentChoices={parentChoices}
      perms={{
        tuition: hasPermission(permissions, 'tuition.manage'),
        parents: hasPermission(permissions, 'parents.manage'),
        learning: hasPermission(permissions, 'learning.manage'),
      }}
      drawerClose={studentsHref(listParams)}
    />
  );
}
