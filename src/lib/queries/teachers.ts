// Truy vấn giáo viên. Chỉ chạy trên server.
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { classes, teachers } from '@/db/schema';

export type TeacherRow = {
  id: number;
  name: string;
  subject: string;
  phone: string;
  years: number;
  status: 'active' | 'leave';
  classes: { id: number; name: string }[];
};

// Danh sách giáo viên kèm các lớp đang dạy. Đổi tên giáo viên tự cập nhật ở lớp vì lớp tham chiếu theo id.
export async function listTeachers(): Promise<TeacherRow[]> {
  const [rows, classRows] = await Promise.all([
    db.select().from(teachers).orderBy(asc(teachers.name)),
    db.select({ id: classes.id, name: classes.name, teacherId: classes.teacherId }).from(classes).orderBy(asc(classes.name)),
  ]);
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    subject: t.subject,
    phone: t.phone,
    years: t.years,
    status: t.status,
    classes: classRows.filter((c) => c.teacherId === t.id).map((c) => ({ id: c.id, name: c.name })),
  }));
}

// Danh sách chọn giáo viên cho form lớp học
export async function listTeacherChoices(): Promise<{ id: number; name: string; subject: string }[]> {
  const rows = await db.select({ id: teachers.id, name: teachers.name, subject: teachers.subject }).from(teachers).orderBy(asc(teachers.name));
  return rows;
}

export async function countClassesOfTeacher(teacherId: number): Promise<number> {
  const rows = await db.select({ id: classes.id }).from(classes).where(eq(classes.teacherId, teacherId));
  return rows.length;
}
