// Truy vấn nhân sự giảng dạy: giáo viên, giáo viên nước ngoài, trợ giảng. Chỉ chạy trên server.
// Mỗi người có một vai trò (staffRole). Nhân sự dạy ở một hoặc nhiều cơ sở (bảng teacher_campuses). Lớp thuộc đúng một cơ sở.
import { and, asc, eq, inArray, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { campuses, classes, teacherCampuses, teachers } from '@/db/schema';
import type { CampusScope } from '@/lib/campus';
import { getAllowedCampusIds } from '@/lib/campus-access';
import type { StaffRole } from '@/lib/validation/teacher';

export type TeacherRow = {
  id: number;
  name: string;
  subject: string;
  phone: string;
  years: number;
  status: 'active' | 'leave';
  staffRole: StaffRole;
  campusIds: number[];
  campusNames: string[];
  classes: { id: number; name: string }[]; // các lớp người này giữ một vị trí nào đó
};

export type TeacherChoice = { id: number; name: string; subject: string; staffRole: StaffRole; campusIds: number[] };

// Vị trí của người trong một lớp: giáo viên chủ nhiệm, giáo viên nước ngoài hoặc trợ giảng (trùng tên với vai trò)
export type ClassSlot = StaffRole;

// Mọi liên kết giáo viên - cơ sở, kèm tên cơ sở, theo thứ tự tạo cơ sở
async function campusLinks() {
  return db
    .select({ teacherId: teacherCampuses.teacherId, campusId: teacherCampuses.campusId, campusName: campuses.name })
    .from(teacherCampuses)
    .innerJoin(campuses, eq(campuses.id, teacherCampuses.campusId))
    .orderBy(asc(campuses.id));
}

// Nhân sự đang dạy ở cơ sở đang xem (scope null: tất cả). Mỗi người kèm mọi cơ sở họ dạy.
function inScope(scope: CampusScope) {
  if (scope === null) return undefined;
  return inArray(
    teachers.id,
    db.select({ id: teacherCampuses.teacherId }).from(teacherCampuses).where(eq(teacherCampuses.campusId, scope)),
  );
}

// Danh sách nhân sự kèm các lớp đang giữ vị trí. Đổi tên tự cập nhật ở lớp vì lớp tham chiếu theo id.
export async function listTeachers(scope: CampusScope): Promise<TeacherRow[]> {
  const [rows, classRows, links] = await Promise.all([
    db.select().from(teachers).where(inScope(scope)).orderBy(asc(teachers.name)),
    db
      .select({ id: classes.id, name: classes.name, teacherId: classes.teacherId, assistantId: classes.assistantId, foreignTeacherId: classes.foreignTeacherId })
      .from(classes)
      .orderBy(asc(classes.name)),
    campusLinks(),
  ]);
  return rows.map((t) => {
    const mine = links.filter((l) => l.teacherId === t.id);
    return {
      id: t.id,
      name: t.name,
      subject: t.subject,
      phone: t.phone,
      years: t.years,
      status: t.status,
      staffRole: t.staffRole,
      campusIds: mine.map((l) => l.campusId),
      campusNames: mine.map((l) => l.campusName),
      classes: classRows
        .filter((c) => c.teacherId === t.id || c.assistantId === t.id || c.foreignTeacherId === t.id)
        .map((c) => ({ id: c.id, name: c.name })),
    };
  });
}

// Danh sách chọn nhân sự, trong cơ sở đang xem. campusIds để form lớp lọc theo cơ sở đã chọn, staffRole để lọc theo vị trí.
export async function listTeacherChoices(scope: CampusScope): Promise<TeacherChoice[]> {
  const [rows, links] = await Promise.all([
    db
      .select({ id: teachers.id, name: teachers.name, subject: teachers.subject, staffRole: teachers.staffRole })
      .from(teachers)
      .where(inScope(scope))
      .orderBy(asc(teachers.name)),
    campusLinks(),
  ]);
  const allowed = await getAllowedCampusIds();
  return rows
    .map((t) => ({ ...t, campusIds: links.filter((l) => l.teacherId === t.id).map((l) => l.campusId) }))
    .filter((t) => allowed === null || t.campusIds.some((c) => allowed.includes(c)));
}

// Cơ sở mà một người dạy, dùng để điền form sửa
export async function campusIdsOfTeacher(teacherId: number): Promise<number[]> {
  const rows = await db
    .select({ campusId: teacherCampuses.campusId })
    .from(teacherCampuses)
    .where(eq(teacherCampuses.teacherId, teacherId))
    .orderBy(asc(teacherCampuses.campusId));
  return rows.map((r) => r.campusId);
}

// Người này có dạy ở cơ sở này không. Dùng khi tạo, sửa lớp và đổi giáo viên của buổi học.
export async function teacherTeachesCampus(teacherId: number, campusId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: teacherCampuses.id })
    .from(teacherCampuses)
    .where(and(eq(teacherCampuses.teacherId, teacherId), eq(teacherCampuses.campusId, campusId)))
    .limit(1);
  return !!row;
}

// Các lớp người này giữ vị trí nào: chủ nhiệm (teacher), giáo viên nước ngoài (foreign) hoặc trợ giảng (assistant).
// Đổi vai trò phải bỏ hết vị trí của vai trò cũ trước.
export async function classSlotsOfTeacher(teacherId: number): Promise<{ classId: number; className: string; slot: ClassSlot }[]> {
  const rows = await db
    .select({ id: classes.id, name: classes.name, teacherId: classes.teacherId, assistantId: classes.assistantId, foreignTeacherId: classes.foreignTeacherId })
    .from(classes)
    .where(or(eq(classes.teacherId, teacherId), eq(classes.assistantId, teacherId), eq(classes.foreignTeacherId, teacherId)))
    .orderBy(asc(classes.name));
  return rows.flatMap((r) => {
    const out: { classId: number; className: string; slot: ClassSlot }[] = [];
    if (r.teacherId === teacherId) out.push({ classId: r.id, className: r.name, slot: 'teacher' });
    if (r.foreignTeacherId === teacherId) out.push({ classId: r.id, className: r.name, slot: 'foreign' });
    if (r.assistantId === teacherId) out.push({ classId: r.id, className: r.name, slot: 'assistant' });
    return out;
  });
}

// Số lớp người này đang giữ ít nhất một vị trí. Dùng khi xoá: còn lớp thì không xoá được.
export async function countClassesOfTeacher(teacherId: number): Promise<number> {
  const slots = await classSlotsOfTeacher(teacherId);
  return new Set(slots.map((s) => s.classId)).size;
}
