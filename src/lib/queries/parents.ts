// Truy vấn phụ huynh và liên kết với học sinh. Chỉ chạy trên server.
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { campuses, classes, parents, studentParents, students, telegramChats } from '@/db/schema';
import { getAllowedCampusIds } from '@/lib/campus-access';
import type { CampusScope } from '@/lib/campus';

export type ParentRow = {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  note: string;
  children: { studentId: number; studentName: string; relation: 'father' | 'mother' | 'guardian' | 'other'; isPrimary: boolean }[];
  telegramLinked: boolean; // có chat Telegram đang nhận tin của trung tâm (P34)
};

// Liên kết phụ huynh - học sinh kèm cơ sở của học sinh, để lọc theo phạm vi tài khoản (P32)
async function linksWithCampus() {
  return db
    .select({ parentId: studentParents.parentId, campusId: classes.campusId })
    .from(studentParents)
    .innerJoin(students, eq(students.id, studentParents.studentId))
    .innerJoin(classes, eq(classes.id, students.classId));
}

// Phụ huynh thấy được: chưa gắn học sinh nào, hoặc có ít nhất một con học ở cơ sở trong phạm vi
export async function visibleParentIds(): Promise<Set<number> | null> {
  const allowed = await getAllowedCampusIds();
  if (allowed === null) return null;
  const links = await linksWithCampus();
  const linked = new Set(links.map((l) => l.parentId));
  const visible = new Set(links.filter((l) => allowed.includes(l.campusId)).map((l) => l.parentId));
  const all = await db.select({ id: parents.id }).from(parents);
  for (const p of all) if (!linked.has(p.id)) visible.add(p.id);
  return visible;
}

// Phụ huynh kèm các con (chỉ các con trong phạm vi). Tìm kiếm không dấu làm ở lớp giao diện (dữ liệu nhỏ).
// scope: cơ sở đang xem ở thanh trên. Có cơ sở thì chỉ hiện phụ huynh có con học ở cơ sở đó, cùng phụ huynh chưa gắn con.
export async function listParents(scope: CampusScope = null): Promise<ParentRow[]> {
  const allowed = await getAllowedCampusIds();
  const visible = await visibleParentIds();
  const [parentRows, linkRows] = await Promise.all([
    db.select().from(parents).orderBy(asc(parents.fullName)),
    db
      .select({
        parentId: studentParents.parentId,
        studentId: students.id,
        studentName: students.fullName,
        relation: studentParents.relation,
        isPrimary: studentParents.isPrimary,
        campusId: classes.campusId,
      })
      .from(studentParents)
      .innerJoin(students, eq(students.id, studentParents.studentId))
      .innerJoin(classes, eq(classes.id, students.classId))
      .orderBy(asc(students.fullName)),
  ]);
  const linkedRows = await db.select({ parentId: telegramChats.parentId }).from(telegramChats).where(eq(telegramChats.active, true));
  const linked = new Set(linkedRows.map((r) => r.parentId));
  const inView = (campusId: number) => (allowed === null || allowed.includes(campusId)) && (scope === null || campusId === scope);
  const hasAnyChild = new Set(linkRows.map((l) => l.parentId));
  return parentRows
    .filter((p) => visible === null || visible.has(p.id))
    .map((p) => ({
      telegramLinked: linked.has(p.id),
      id: p.id,
      fullName: p.fullName,
      phone: p.phone,
      email: p.email,
      note: p.note,
      children: linkRows
        .filter((l) => l.parentId === p.id && inView(l.campusId))
        .map((l) => ({ studentId: l.studentId, studentName: l.studentName, relation: l.relation, isPrimary: l.isPrimary })),
    }))
    .filter((p) => scope === null || p.children.length > 0 || !hasAnyChild.has(p.id));
}

// Danh sách chọn phụ huynh cho form học sinh
export async function listParentChoices(): Promise<{ id: number; fullName: string; phone: string }[]> {
  const visible = await visibleParentIds();
  const rows = await db.select({ id: parents.id, fullName: parents.fullName, phone: parents.phone }).from(parents).orderBy(asc(parents.fullName));
  return visible === null ? rows : rows.filter((r) => visible.has(r.id));
}

// Học sinh để chọn khi gán cho phụ huynh. Kèm lớp và cơ sở để phân biệt học sinh trùng tên.
export type StudentChoice = { id: number; fullName: string; className: string; campusName: string };

export async function listStudentChoicesForParents(): Promise<StudentChoice[]> {
  const allowed = await getAllowedCampusIds();
  const rows = await db
    .select({ id: students.id, fullName: students.fullName, className: classes.name, campusName: campuses.name, campusId: classes.campusId })
    .from(students)
    .innerJoin(classes, eq(classes.id, students.classId))
    .innerJoin(campuses, eq(campuses.id, classes.campusId))
    .orderBy(asc(students.fullName), asc(students.id));
  return rows.filter((r) => allowed === null || allowed.includes(r.campusId)).map((r) => ({ id: r.id, fullName: r.fullName, className: r.className, campusName: r.campusName }));
}

export async function getParent(id: number) {
  const [row] = await db.select().from(parents).where(eq(parents.id, id)).limit(1);
  return row ?? null;
}

// Danh sách id phụ huynh có con học các lớp mà giáo viên này dạy (P34.12)
export async function teacherVisibleParentIds(teacherId: number): Promise<Set<number>> {
  const rows = await db
    .select({ parentId: studentParents.parentId })
    .from(studentParents)
    .innerJoin(students, eq(students.id, studentParents.studentId))
    .innerJoin(classes, eq(classes.id, students.classId))
    .where(
      sql`(${classes.teacherId} = ${teacherId} OR ${classes.assistantId} = ${teacherId} OR ${classes.foreignTeacherId} = ${teacherId})`
    );
  return new Set(rows.map((r) => r.parentId));
}
