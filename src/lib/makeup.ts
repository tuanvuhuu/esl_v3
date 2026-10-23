// Học bù (37.12): học sinh nghỉ có phép chọn một buổi của lớp khác cùng trình độ, cùng cơ sở. Chỉ chạy trên server.
// Dùng chung cho màn Đơn nghỉ trong app và bot Telegram. Quyền (ai được xếp) kiểm ở nơi gọi.
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { makeupBookings } from '@/db/schema';

export type MakeupCandidate = { sessionId: number; classId: number; className: string; startsAt: Date; endsAt: Date; room: string; teacherName: string; seatsLeft: number };
export type MakeupBooking = { leaveId: number; sessionId: number; className: string; startsAt: Date; endsAt: Date };

type LeaveInfo = { id: number; status: string; student_id: number; student_name: string; class_id: number; class_name: string; campus_id: number; level_id: number | null; course: string; starts_at: Date };

async function leaveInfo(leaveId: number): Promise<LeaveInfo | null> {
  if (!Number.isInteger(leaveId)) return null;
  const [row] = (
    await db.execute<LeaveInfo>(sql`
      SELECT lr.id, lr.status, s.id AS student_id, s.full_name AS student_name, c.id AS class_id, c.name AS class_name,
        c.campus_id, c.level_id, c.course, cs.starts_at
      FROM leave_requests lr
      JOIN students s ON s.id = lr.student_id
      JOIN class_sessions cs ON cs.id = lr.session_id
      JOIN classes c ON c.id = cs.class_id
      WHERE lr.id = ${leaveId}`)
  ).rows;
  return row ?? null;
}

// Buổi bù phù hợp: lớp khác cùng cơ sở, cùng trình độ (cùng mã trình độ; lớp không có trình độ thì cùng tên khoá học),
// buổi chưa học trong 21 ngày tới, lớp còn chỗ (sĩ số cộng học sinh học bù đã đặt), không trùng giờ một buổi của lớp mình.
export async function makeupCandidates(leaveId: number, limit = 8): Promise<MakeupCandidate[]> {
  const leave = await leaveInfo(leaveId);
  if (!leave || leave.status !== 'approved') return [];
  const sameLevel = leave.level_id !== null ? sql`c.level_id = ${leave.level_id}` : sql`c.level_id IS NULL AND lower(trim(c.course)) = lower(trim(${leave.course}))`;
  const rows = await db.execute<{ session_id: number; class_id: number; class_name: string; starts_at: Date; ends_at: Date; room: string; teacher_name: string; seats_left: number }>(sql`
    SELECT cs.id AS session_id, c.id AS class_id, c.name AS class_name, cs.starts_at, cs.ends_at, cs.room, t.name AS teacher_name,
      c.capacity
        - (SELECT COUNT(*) FROM students s2 WHERE s2.class_id = c.id AND s2.status IN ('active', 'trial'))
        - (SELECT COUNT(*) FROM makeup_bookings mb WHERE mb.session_id = cs.id) AS seats_left
    FROM class_sessions cs
    JOIN classes c ON c.id = cs.class_id
    JOIN teachers t ON t.id = cs.teacher_id
    WHERE c.campus_id = ${leave.campus_id} AND c.id <> ${leave.class_id} AND ${sameLevel}
      AND cs.status = 'planned' AND cs.starts_at > now() AND cs.starts_at < now() + interval '21 days'
      AND NOT EXISTS (
        SELECT 1 FROM class_sessions own WHERE own.class_id = ${leave.class_id} AND own.status <> 'cancelled'
          AND own.starts_at < cs.ends_at AND own.ends_at > cs.starts_at)
    ORDER BY cs.starts_at
    LIMIT 40`);
  return rows.rows
    .filter((r) => Number(r.seats_left) > 0)
    .slice(0, limit)
    .map((r) => ({
      sessionId: Number(r.session_id),
      classId: Number(r.class_id),
      className: r.class_name,
      startsAt: new Date(r.starts_at),
      endsAt: new Date(r.ends_at),
      room: r.room,
      teacherName: r.teacher_name,
      seatsLeft: Number(r.seats_left),
    }));
}

// Đặt (hoặc đổi) buổi bù cho một đơn nghỉ đã duyệt. Buổi phải nằm trong danh sách phù hợp ngay lúc đặt.
export async function bookMakeup(input: { leaveId: number; sessionId: number; accountId?: number | null; parentId?: number | null }): Promise<{ ok: true; studentName: string; studentId: number; candidate: MakeupCandidate } | { ok: false; message: string }> {
  const leave = await leaveInfo(input.leaveId);
  if (!leave) return { ok: false, message: 'Không tìm thấy đơn nghỉ.' };
  if (leave.status !== 'approved') return { ok: false, message: 'Chỉ đơn nghỉ đã duyệt mới xếp học bù được.' };
  const candidate = (await makeupCandidates(input.leaveId, 40)).find((c) => c.sessionId === input.sessionId);
  if (!candidate) return { ok: false, message: 'Buổi này không còn phù hợp để học bù (đã đủ chỗ, trùng giờ hoặc đã qua). Chọn buổi khác.' };
  await db
    .insert(makeupBookings)
    .values({ leaveRequestId: leave.id, studentId: leave.student_id, sessionId: candidate.sessionId, bookedByAccountId: input.accountId ?? null, bookedByParentId: input.parentId ?? null })
    .onConflictDoUpdate({
      target: makeupBookings.leaveRequestId,
      set: { sessionId: candidate.sessionId, bookedByAccountId: input.accountId ?? null, bookedByParentId: input.parentId ?? null, updatedAt: new Date() },
    });
  return { ok: true, studentName: leave.student_name, studentId: leave.student_id, candidate };
}

export async function cancelMakeup(leaveId: number): Promise<boolean> {
  const removed = await db.delete(makeupBookings).where(eq(makeupBookings.leaveRequestId, leaveId)).returning({ id: makeupBookings.id });
  return removed.length > 0;
}

// Buổi bù đã đặt của các đơn nghỉ (cho màn Đơn nghỉ)
export async function makeupsOfLeaves(leaveIds: number[]): Promise<Map<number, MakeupBooking>> {
  const map = new Map<number, MakeupBooking>();
  if (leaveIds.length === 0) return map;
  const rows = await db.execute<{ leave_request_id: number; session_id: number; class_name: string; starts_at: Date; ends_at: Date }>(sql`
    SELECT mb.leave_request_id, mb.session_id, c.name AS class_name, cs.starts_at, cs.ends_at
    FROM makeup_bookings mb JOIN class_sessions cs ON cs.id = mb.session_id JOIN classes c ON c.id = cs.class_id
    WHERE mb.leave_request_id = ANY(${`{${leaveIds.join(',')}}`}::int[])`);
  for (const r of rows.rows) {
    map.set(Number(r.leave_request_id), { leaveId: Number(r.leave_request_id), sessionId: Number(r.session_id), className: r.class_name, startsAt: new Date(r.starts_at), endsAt: new Date(r.ends_at) });
  }
  return map;
}

// Học sinh học bù trong một buổi (thêm vào danh sách điểm danh của buổi đó)
export async function makeupStudentsOfSession(sessionId: number): Promise<{ id: number; fullName: string; fromClass: string }[]> {
  const rows = await db.execute<{ id: number; full_name: string; from_class: string }>(sql`
    SELECT s.id, s.full_name, c.name AS from_class
    FROM makeup_bookings mb JOIN students s ON s.id = mb.student_id JOIN classes c ON c.id = s.class_id
    WHERE mb.session_id = ${sessionId}
    ORDER BY s.full_name`);
  return rows.rows.map((r) => ({ id: Number(r.id), fullName: r.full_name, fromClass: r.from_class }));
}
