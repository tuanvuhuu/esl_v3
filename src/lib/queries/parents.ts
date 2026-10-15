// Truy vấn phụ huynh và liên kết với học sinh. Chỉ chạy trên server.
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { campuses, classes, parents, studentParents, students } from '@/db/schema';

export type ParentRow = {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  note: string;
  children: { studentId: number; studentName: string; relation: 'father' | 'mother' | 'guardian' | 'other'; isPrimary: boolean }[];
};

// Tất cả phụ huynh kèm các con. Tìm kiếm không dấu làm ở lớp giao diện (dữ liệu nhỏ).
export async function listParents(): Promise<ParentRow[]> {
  const [parentRows, linkRows] = await Promise.all([
    db.select().from(parents).orderBy(asc(parents.fullName)),
    db
      .select({
        parentId: studentParents.parentId,
        studentId: students.id,
        studentName: students.fullName,
        relation: studentParents.relation,
        isPrimary: studentParents.isPrimary,
      })
      .from(studentParents)
      .innerJoin(students, eq(students.id, studentParents.studentId))
      .orderBy(asc(students.fullName)),
  ]);
  return parentRows.map((p) => ({
    id: p.id,
    fullName: p.fullName,
    phone: p.phone,
    email: p.email,
    note: p.note,
    children: linkRows
      .filter((l) => l.parentId === p.id)
      .map((l) => ({ studentId: l.studentId, studentName: l.studentName, relation: l.relation, isPrimary: l.isPrimary })),
  }));
}

// Danh sách chọn phụ huynh cho form học sinh
export async function listParentChoices(): Promise<{ id: number; fullName: string; phone: string }[]> {
  return db.select({ id: parents.id, fullName: parents.fullName, phone: parents.phone }).from(parents).orderBy(asc(parents.fullName));
}

// Học sinh để chọn khi gán cho phụ huynh. Kèm lớp và cơ sở để phân biệt học sinh trùng tên.
export type StudentChoice = { id: number; fullName: string; className: string; campusName: string };

export async function listStudentChoicesForParents(): Promise<StudentChoice[]> {
  return db
    .select({ id: students.id, fullName: students.fullName, className: classes.name, campusName: campuses.name })
    .from(students)
    .innerJoin(classes, eq(classes.id, students.classId))
    .innerJoin(campuses, eq(campuses.id, classes.campusId))
    .orderBy(asc(students.fullName), asc(students.id));
}

export async function getParent(id: number) {
  const [row] = await db.select().from(parents).where(eq(parents.id, id)).limit(1);
  return row ?? null;
}
