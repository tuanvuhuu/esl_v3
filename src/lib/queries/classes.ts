// Truy vấn lớp học: danh sách, chi tiết, lựa chọn cho bộ lọc. Chỉ chạy trên server.
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { campuses, classes, classSessions, students, teachers } from '@/db/schema';
import type { CampusScope } from '@/lib/campus';
import { vnDateKey } from '@/lib/datetime';
import { describeSchedule } from '@/lib/schedule';
import { campusCond } from '@/lib/queries/campuses';

export type ClassRow = {
  id: number;
  name: string;
  course: string;
  campusId: number;
  campusName: string;
  teacherId: number;
  teacherName: string; // giáo viên chủ nhiệm
  assistantId: number | null;
  assistantName: string | null;
  foreignTeacherId: number | null;
  foreignTeacherName: string | null;
  schedule: string; // "T2 · T4 · T6 · 18:30–20:30"
  weekdays: string; // "T2,T4,T6"
  startTime: string;
  endTime: string;
  room: string;
  fee: number;
  capacity: number;
  studentCount: number;
  sessionsTotal: number;
  sessionsDone: number;
  nextSessionAt: string | null; // ISO, buổi đã lên lịch gần nhất từ bây giờ
};

type RawClass = {
  id: number; name: string; course: string; campus_id: number; campus_name: string; teacher_id: number; teacher_name: string;
  weekdays: string; start_time: string; end_time: string; room: string; fee: number; capacity: number; sessions_total: number;
  student_count: number; sessions_done: number; next_at: Date | null;
  assistant_id: number | null; assistant_name: string | null; foreign_teacher_id: number | null; foreign_name: string | null;
};

// Các lớp trong cơ sở đang xem (scope null: mọi cơ sở), hoặc một lớp nếu có id. 'any': không lọc theo cơ sở.
// Kèm sĩ số, buổi đã học và buổi sắp tới.
async function selectClasses(scope: CampusScope | 'any', id?: number): Promise<ClassRow[]> {
  const byId = id === undefined ? sql`TRUE` : sql`c.id = ${id}`;
  const byCampus = scope === 'any' ? sql`TRUE` : campusCond(scope, sql`c.campus_id`);
  const result = await db.execute<RawClass>(sql`
    SELECT c.id, c.name, c.course, c.campus_id, cp.name AS campus_name, c.teacher_id, t.name AS teacher_name,
      c.assistant_id, a.name AS assistant_name, c.foreign_teacher_id, f.name AS foreign_name,
      c.weekdays, c.start_time, c.end_time, c.room, c.fee, c.capacity, c.sessions_total,
      (SELECT COUNT(*)::int FROM students s WHERE s.class_id = c.id) AS student_count,
      (SELECT COUNT(*)::int FROM class_sessions cs WHERE cs.class_id = c.id AND cs.status = 'done') AS sessions_done,
      (SELECT MIN(cs.starts_at) FROM class_sessions cs WHERE cs.class_id = c.id AND cs.status = 'planned' AND cs.starts_at >= NOW()) AS next_at
    FROM classes c
    JOIN teachers t ON t.id = c.teacher_id
    LEFT JOIN teachers a ON a.id = c.assistant_id
    LEFT JOIN teachers f ON f.id = c.foreign_teacher_id
    JOIN campuses cp ON cp.id = c.campus_id
    WHERE ${byId} AND ${byCampus}
    ORDER BY c.name, c.id
  `);
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    course: r.course,
    campusId: r.campus_id,
    campusName: r.campus_name,
    teacherId: r.teacher_id,
    teacherName: r.teacher_name,
    assistantId: r.assistant_id,
    assistantName: r.assistant_name,
    foreignTeacherId: r.foreign_teacher_id,
    foreignTeacherName: r.foreign_name,
    schedule: describeSchedule(r.weekdays, r.start_time, r.end_time),
    weekdays: r.weekdays,
    startTime: r.start_time,
    endTime: r.end_time,
    room: r.room,
    fee: r.fee,
    capacity: r.capacity,
    studentCount: r.student_count,
    sessionsTotal: r.sessions_total,
    sessionsDone: r.sessions_done,
    nextSessionAt: r.next_at ? new Date(r.next_at).toISOString() : null,
  }));
}

// Lớp trong cơ sở đang xem (scope null: mọi cơ sở)
export function listClasses(scope: CampusScope): Promise<ClassRow[]> {
  return selectClasses(scope);
}

// Danh sách lớp cho bộ lọc và chọn lớp, trong cơ sở đang xem. Kèm tên cơ sở để phân biệt khi xem tất cả.
export async function listClassChoices(scope: CampusScope): Promise<{ id: number; name: string; teacherName: string; campusName: string; campusId: number }[]> {
  return db
    .select({ id: classes.id, name: classes.name, teacherName: teachers.name, campusName: campuses.name, campusId: classes.campusId })
    .from(classes)
    .innerJoin(teachers, eq(teachers.id, classes.teacherId))
    .innerJoin(campuses, eq(campuses.id, classes.campusId))
    .where(scope === null ? undefined : eq(classes.campusId, scope))
    .orderBy(asc(classes.name), asc(campuses.id));
}

export type ClassDetail = ClassRow & {
  startDateKey: string; // ngày của buổi đầu tiên, theo giờ Việt Nam
  cancelledCount: number;
  students: { id: number; fullName: string; status: 'active' | 'trial' | 'paused' | 'finished'; sessionsDone: number }[];
  upcoming: { id: number; sessionNo: number; startsAt: string; endsAt: string; room: string; topic: string; teacherName: string }[];
};

// Giá trị gốc của một lớp, dùng để điền form sửa và kiểm tra thay đổi
export async function getClassForm(id: number) {
  const [row] = await db
    .select({
      name: classes.name,
      course: classes.course,
      campusId: classes.campusId,
      teacherId: classes.teacherId,
      assistantId: classes.assistantId,
      foreignTeacherId: classes.foreignTeacherId,
      room: classes.room,
      fee: classes.fee,
      capacity: classes.capacity,
    })
    .from(classes)
    .where(eq(classes.id, id))
    .limit(1);
  return row ?? null;
}

// Chi tiết một lớp. Trả về null nếu không tồn tại.
export async function getClassDetail(id: number): Promise<ClassDetail | null> {
  const [row] = await selectClasses('any', id);
  if (!row) return null;

  const studentRows = await db
    .select({ id: students.id, fullName: students.fullName, status: students.status, sessionsDone: students.sessionsDone })
    .from(students)
    .where(eq(students.classId, id))
    .orderBy(asc(students.fullName));

  const upcoming = await db.execute<{
    id: number; session_no: number; starts_at: Date; ends_at: Date; room: string; topic: string; teacher_name: string;
  }>(sql`
    SELECT cs.id, cs.session_no, cs.starts_at, cs.ends_at, cs.room, cs.topic, t.name AS teacher_name
    FROM class_sessions cs JOIN teachers t ON t.id = cs.teacher_id
    WHERE cs.class_id = ${id} AND cs.status = 'planned' AND cs.starts_at >= NOW()
    ORDER BY cs.starts_at
    LIMIT 6
  `);

  const [first] = await db
    .select({ startsAt: classSessions.startsAt })
    .from(classSessions)
    .where(eq(classSessions.classId, id))
    .orderBy(asc(classSessions.sessionNo))
    .limit(1);

  const [cancelled] = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(classSessions)
    .where(sql`${classSessions.classId} = ${id} AND ${classSessions.status} = 'cancelled'`);

  return {
    ...row,
    startDateKey: first ? vnDateKey(first.startsAt) : '',
    cancelledCount: Number(cancelled?.n ?? 0),
    students: studentRows,
    upcoming: upcoming.rows.map((r) => ({
      id: r.id,
      sessionNo: r.session_no,
      startsAt: new Date(r.starts_at).toISOString(),
      endsAt: new Date(r.ends_at).toISOString(),
      room: r.room,
      topic: r.topic,
      teacherName: r.teacher_name,
    })),
  };
}
