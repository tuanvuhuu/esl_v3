// Truy vấn điểm danh. Chỉ chạy trên server.
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { attendance, students } from '@/db/schema';
import { makeupStudentsOfSession } from '@/lib/makeup';

export type Mark = 'present' | 'late' | 'absent';
export type RosterRow = {
  id: number;
  fullName: string;
  status: 'active' | 'trial';
  sessionsDone: number;
  mark: Mark | null; // null = chưa điểm danh buổi này
  makeupFrom: string | null; // học bù: tên lớp gốc của học sinh (37.12)
};

// Học sinh đang học của lớp (đang học và học thử) kèm dấu điểm danh của buổi có ngày dateKey
// sessionId: thêm học sinh lớp khác học bù buổi này (37.12), xếp sau học sinh của lớp
export async function listRoster(classId: number, dateKey: string, sessionId?: number): Promise<RosterRow[]> {
  const [roster, marks, makeups] = await Promise.all([
    db
      .select({ id: students.id, fullName: students.fullName, status: students.status, sessionsDone: students.sessionsDone })
      .from(students)
      .where(and(eq(students.classId, classId), inArray(students.status, ['active', 'trial'])))
      .orderBy(asc(students.fullName)),
    db
      .select({ studentId: attendance.studentId, mark: attendance.mark })
      .from(attendance)
      .where(and(eq(attendance.classId, classId), eq(attendance.sessionDate, dateKey))),
    sessionId ? makeupStudentsOfSession(sessionId) : Promise.resolve([]),
  ]);
  const byStudent = new Map(marks.map((m) => [m.studentId, m.mark]));
  const own = roster.map((s) => ({
    id: s.id,
    fullName: s.fullName,
    status: s.status as 'active' | 'trial',
    sessionsDone: s.sessionsDone,
    mark: byStudent.get(s.id) ?? null,
    makeupFrom: null,
  }));
  const ownIds = new Set(own.map((s) => s.id));
  const guests = makeups
    .filter((m) => !ownIds.has(m.id))
    .map((m) => ({ id: m.id, fullName: m.fullName, status: 'active' as const, sessionsDone: 0, mark: byStudent.get(m.id) ?? null, makeupFrom: m.fromClass }));
  return [...own, ...guests];
}
