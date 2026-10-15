// Truy vấn buổi học (class_sessions). Chỉ chạy trên server.
import { and, asc, eq, gte, inArray, lt } from 'drizzle-orm';
import { db } from '@/db/client';
import { classes, classSessions, teachers } from '@/db/schema';
import type { CampusScope } from '@/lib/campus';
import { vnDateKey, vnTimeLabel } from '@/lib/datetime';

export type SessionRow = {
  id: number;
  classId: number;
  className: string;
  course: string;
  sessionNo: number;
  dateKey: string; // YYYY-MM-DD theo giờ Việt Nam
  startsAt: string; // ISO
  endsAt: string; // ISO
  timeLabel: string; // "18:30–20:30"
  teacherId: number;
  teacherName: string;
  room: string;
  topic: string;
  status: 'planned' | 'done' | 'cancelled';
  cancelReason: string;
  isPast: boolean; // đã qua giờ bắt đầu
};

function toRow(
  r: {
    id: number; classId: number; className: string; course: string; sessionNo: number; startsAt: Date; endsAt: Date;
    teacherId: number; teacherName: string; room: string; topic: string; status: SessionRow['status']; cancelReason: string;
  },
  now: Date,
): SessionRow {
  return {
    id: r.id,
    classId: r.classId,
    className: r.className,
    course: r.course,
    sessionNo: r.sessionNo,
    dateKey: vnDateKey(r.startsAt),
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
    timeLabel: `${vnTimeLabel(r.startsAt)}–${vnTimeLabel(r.endsAt)}`,
    teacherId: r.teacherId,
    teacherName: r.teacherName,
    room: r.room,
    topic: r.topic,
    status: r.status,
    cancelReason: r.cancelReason,
    isPast: r.startsAt.getTime() < now.getTime(),
  };
}

const selectSession = () =>
  db
    .select({
      id: classSessions.id,
      classId: classSessions.classId,
      className: classes.name,
      course: classes.course,
      sessionNo: classSessions.sessionNo,
      startsAt: classSessions.startsAt,
      endsAt: classSessions.endsAt,
      teacherId: classSessions.teacherId,
      teacherName: teachers.name,
      room: classSessions.room,
      topic: classSessions.topic,
      status: classSessions.status,
      cancelReason: classSessions.cancelReason,
    })
    .from(classSessions)
    .innerJoin(classes, eq(classes.id, classSessions.classId))
    .innerJoin(teachers, eq(teachers.id, classSessions.teacherId));

// Buổi học trong khoảng [from, to) của cơ sở đang xem (scope null: mọi cơ sở).
// Có thể lọc theo nhiều lớp hoặc nhiều giáo viên. Danh sách rỗng nghĩa là không lọc.
export async function listSessionsBetween(
  from: Date,
  to: Date,
  scope: CampusScope,
  filter: { classIds?: number[]; teacherIds?: number[] } = {},
): Promise<SessionRow[]> {
  const now = new Date();
  const conditions = [gte(classSessions.startsAt, from), lt(classSessions.startsAt, to)];
  if (scope !== null) conditions.push(eq(classes.campusId, scope));
  if (filter.classIds?.length) conditions.push(inArray(classSessions.classId, filter.classIds));
  if (filter.teacherIds?.length) conditions.push(inArray(classSessions.teacherId, filter.teacherIds));
  const rows = await selectSession().where(and(...conditions)).orderBy(asc(classSessions.startsAt));
  return rows.map((r) => toRow(r, now));
}

// Một buổi học, hoặc null nếu không có
export async function getSessionRow(id: number): Promise<SessionRow | null> {
  const [row] = await selectSession().where(eq(classSessions.id, id)).limit(1);
  return row ? toRow(row, new Date()) : null;
}

// Buổi học của một lớp, theo số thứ tự buổi
export async function listSessionsOfClass(classId: number): Promise<SessionRow[]> {
  const now = new Date();
  const rows = await selectSession().where(eq(classSessions.classId, classId)).orderBy(asc(classSessions.sessionNo));
  return rows.map((r) => toRow(r, now));
}
