import { Suspense } from 'react';
import { StudentList } from '@/components/students/StudentList';
import { PROFILE_TABS, StudentProfile, type ProfileTab } from '@/components/students/profile/StudentProfile';
import { getCampusContext } from '@/lib/campus-context';
import { withCampusNames } from '@/lib/campus';
import { listHistoryForStudent } from '@/lib/queries/learning';
import { studentSkillHistory } from '@/lib/queries/skills';
import { listStudentAssignments } from '@/lib/queries/assignments';
import {
  getStudentDetail,
  listClassOptions,
  listStudents,
  type SortOrder,
  type StatusFilter,
  type StudentSort,
  type StudentSortField,
  type TuitionFilter,
} from '@/lib/queries/students';
import { listParentChoices } from '@/lib/queries/parents';
import { hasPermission, type Permission } from '@/lib/permissions';
import { idListParam, listParam } from '@/lib/list-param';
import { studentsHref } from '@/lib/student-url';
import { getCurrentPermissions } from '@/lib/session';
import { passes, requireStudentAccess } from '@/lib/campus-access';

type SearchParams = Record<string, string | string[] | undefined>;

const PAGE_SIZE = 20;
const STATUSES = ['active', 'trial', 'paused', 'finished'] as const;
const TUITIONS = ['paid', 'partial', 'unpaid'] as const;
const SORT_FIELDS: readonly StudentSortField[] = [
  'name',
  'code',
  'gender',
  'class',
  'progress',
  'attendance',
  'tuition',
  'status',
];

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
      <div className="h-[var(--ctl-h)] w-full max-w-md animate-pulse rounded-[var(--radius-ctl)] bg-stone" />
      <div className="h-[420px] w-full animate-pulse rounded-[var(--radius-panel)] bg-stone" />
    </section>
  );
}

async function StudentsData({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;

  const q = first(sp.q).slice(0, 80);
  const statusRaw = first(sp.status);
  const status = (STATUSES as readonly string[]).includes(statusRaw) ? statusRaw : 'all';
  // Lớp và học phí chọn nhiều, trên URL viết "1,2". Danh sách rỗng nghĩa là không lọc.
  const classIds = idListParam(sp.cls);
  const tuitions = listParam(sp.tuition).filter((t): t is TuitionFilter => (TUITIONS as readonly string[]).includes(t));
  const page = intParam(sp.p, 1, 500, 1);
  const loadedPages = intParam(sp.n, 1, 500, 1);

  const sortRaw = first(sp.sort);
  const orderRaw = first(sp.order);
  const sortField = (SORT_FIELDS as readonly string[]).includes(sortRaw) ? (sortRaw as StudentSortField) : undefined;
  const sortOrder: SortOrder = orderRaw === 'desc' ? 'desc' : 'asc';
  const sort: StudentSort | undefined = sortField ? { field: sortField, order: sortOrder } : undefined;

  // Lấy đủ để phục vụ cả trang máy tính và số trang điện thoại đã tải
  const limit = Math.max(page, loadedPages) * PAGE_SIZE;
  const { campuses, scope } = await getCampusContext();
  // Bộ lọc lớp theo cơ sở đang xem. Form thêm, sửa học sinh lấy mọi lớp, rồi tự lọc theo cơ sở được chọn trong form.
  const [result, classOptions, allClassOptions, parents, granted] = await Promise.all([
    listStudents({ q, status: status as StatusFilter, classIds, tuitions }, { limit, offset: 0 }, scope, sort),
    listClassOptions(scope),
    listClassOptions(null), // đã lọc theo cơ sở được làm việc
    listParentChoices(),
    getCurrentPermissions(),
  ]);
  const classes = withCampusNames(classOptions, scope === null);

  const permissions = new Set(granted);
  const pageCount = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const rows = result.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const phoneRows = result.rows.slice(0, loadedPages * PAGE_SIZE);
  const filters = {
    q,
    status,
    cls: classIds.join(','),
    tuition: tuitions.join(','),
    sort: sortField,
    order: sortField ? sortOrder : undefined,
  };

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
      classes={classes.map((c) => ({ id: c.id, name: c.name, course: c.course, teacherName: c.teacherName, fee: c.fee, campusId: c.campusId }))}
      formClasses={allClassOptions.map((c) => ({ id: c.id, name: c.name, course: c.course, teacherName: c.teacherName, fee: c.fee, campusId: c.campusId }))}
      campuses={campuses}
      defaultCampusId={scope ?? campuses[0]?.id ?? 0}
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
  filters: { q: string; status: string; cls: string; tuition: string; sort?: string; order?: string },
  page: number,
  loadedPages: number,
  permissions: Set<Permission>,
) {
  // Học sinh ở cơ sở ngoài phạm vi: không mở hồ sơ (P32)
  if (!(await passes(() => requireStudentAccess(id)))) return null;
  const student = await getStudentDetail(id);
  if (!student) return null;
  const tab: ProfileTab = (PROFILE_TABS.map((t) => t.key) as string[]).includes(tabRaw) ? (tabRaw as ProfileTab) : 'tong-quan';
  const [history, assignments, parentChoices, skills] = await Promise.all([
    listHistoryForStudent(id),
    listStudentAssignments(id),
    tab === 'phu-huynh' ? listParentChoices() : Promise.resolve([]),
    tab === 'ky-nang' ? studentSkillHistory(id) : Promise.resolve(null),
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
      skills={skills}
      perms={{
        tuition: hasPermission(permissions, 'tuition.manage'),
        parents: hasPermission(permissions, 'parents.manage'),
        learning: hasPermission(permissions, 'learning.manage'),
        assignments: hasPermission(permissions, 'assignments.manage'),
      }}
      drawerClose={studentsHref(listParams)}
    />
  );
}
