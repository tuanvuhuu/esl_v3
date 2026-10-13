// Truy vấn điểm danh. Chỉ chạy trên server.
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { attendance, students } from '@/db/schema';

export type Mark = 'present' | 'late' | 'absent';
export type RosterRow = {
  id: number;
  fullName: string;
  status: 'active' | 'trial';
  sessionsDone: number;
  mark: Mark | null; // null = chưa điểm danh buổi này
};

// Học sinh đang học của lớp (đang học và học thử) kèm dấu điểm danh của buổi có ngày dateKey
export async function listRoster(classId: number, dateKey: string): Promise<RosterRow[]> {
  const [roster, marks] = await Promise.all([
    db
      .select({ id: students.id, fullName: students.fullName, status: students.status, sessionsDone: students.sessionsDone })
      .from(students)
      .where(and(eq(students.classId, classId), inArray(students.status, ['active', 'trial'])))
      .orderBy(asc(students.fullName)),
    db
      .select({ studentId: attendance.studentId, mark: attendance.mark })
      .from(attendance)
      .where(and(eq(attendance.classId, classId), eq(attendance.sessionDate, dateKey))),
  ]);
  const byStudent = new Map(marks.map((m) => [m.studentId, m.mark]));
  return roster.map((s) => ({
    id: s.id,
    fullName: s.fullName,
    status: s.status as 'active' | 'trial',
    sessionsDone: s.sessionsDone,
    mark: byStudent.get(s.id) ?? null,
  }));
}
