'use server';

import { and, asc, eq, gt, inArray, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { classSessions, leaveRequests, students } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { requireClassAccess } from '@/lib/campus-access';
import { getCurrentAccount } from '@/lib/session';
import { vnDateTimeLabel, vnTimeLabel } from '@/lib/datetime';
import { bookMakeup, cancelMakeup, makeupCandidates, type MakeupCandidate } from '@/lib/makeup';
import { parentChatsOfStudent, safely, sendAndRecord, staffChatsOfClass } from '@/lib/telegram/core';
import { applyLeaveDecision, canDecideLeave } from '@/lib/telegram/leave';
import { LEAVE_REASON_MAX } from '@/lib/telegram/prefs';
import type { ActionResult } from '@/lib/validation/student';

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action đơn nghỉ:', error);
  return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
}

async function currentAccountId(): Promise<number> {
  await requirePermission('attendance.record');
  const account = await getCurrentAccount();
  if (!account) throw new ForbiddenError('Bạn cần đăng nhập lại.');
  return account.id;
}

function refresh() {
  revalidatePath('/don-nghi');
  revalidatePath('/diem-danh');
}

// Duyệt hoặc từ chối đơn trong app: cùng quy tắc và cùng tin báo phụ huynh như nút trên bot
export async function decideLeaveAction(id: number, approve: boolean): Promise<ActionResult> {
  try {
    const accountId = await currentAccountId();
    if (!Number.isInteger(id)) return { ok: false, message: 'Không tìm thấy đơn.' };
    const r = await applyLeaveDecision(accountId, id, approve);
    if (!r.ok) return { ok: false, message: r.message };
    await writeAudit({ action: approve ? 'approve' : 'deny', entity: 'leave', entityId: id, summary: `${approve ? 'Duyệt' : 'Từ chối'} đơn nghỉ của ${r.leave.student_name} buổi ${r.when}` });
    refresh();
    return { ok: true, message: approve ? `Đã duyệt đơn nghỉ của ${r.leave.student_name}` : `Đã từ chối đơn nghỉ của ${r.leave.student_name}` };
  } catch (error) {
    return errorResult(error);
  }
}

export type LeaveOptions = {
  students: { id: number; name: string }[];
  sessions: { id: number; startsAt: Date; endsAt: Date }[];
};

// Học sinh đang học và các buổi sắp tới của lớp, cho hộp Ghi đơn nghỉ
export async function leaveOptionsAction(classId: number): Promise<{ ok: true; options: LeaveOptions } | { ok: false; message: string }> {
  try {
    await currentAccountId();
    await requireClassAccess(classId);
    const [kids, sessions] = await Promise.all([
      db
        .select({ id: students.id, name: students.fullName })
        .from(students)
        .where(and(eq(students.classId, classId), inArray(students.status, ['active', 'trial'])))
        .orderBy(asc(students.fullName)),
      db
        .select({ id: classSessions.id, startsAt: classSessions.startsAt, endsAt: classSessions.endsAt })
        .from(classSessions)
        .where(and(eq(classSessions.classId, classId), ne(classSessions.status, 'cancelled'), gt(classSessions.startsAt, new Date())))
        .orderBy(asc(classSessions.startsAt))
        .limit(12),
    ]);
    return { ok: true, options: { students: kids, sessions } };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi đọc học sinh, buổi học cho đơn nghỉ:', error);
    return { ok: false, message: 'Không đọc được dữ liệu. Thử lại sau ít phút.' };
  }
}

// Giáo vụ ghi đơn nghỉ khi phụ huynh gọi điện hoặc nhắn ngoài bot: đơn được duyệt ngay, ghi vắng có phép,
// phụ huynh đã kết nối Telegram nhận tin xác nhận như khi duyệt trên bot.
export async function createLeaveAction(input: { studentId: number; sessionId: number; reason: string }): Promise<ActionResult> {
  try {
    const accountId = await currentAccountId();
    const reason = input.reason.trim().slice(0, LEAVE_REASON_MAX);
    if (!Number.isInteger(input.studentId) || input.studentId <= 0) return { ok: false, message: 'Chọn học sinh.', fieldErrors: { studentId: 'Chọn học sinh' } };
    if (!Number.isInteger(input.sessionId) || input.sessionId <= 0) return { ok: false, message: 'Chọn buổi nghỉ.', fieldErrors: { sessionId: 'Chọn buổi nghỉ' } };
    if (!(await canDecideLeave(accountId, input.studentId, input.sessionId))) return { ok: false, message: 'Bạn không ghi được đơn cho học sinh này.' };
    const [session] = await db.select({ startsAt: classSessions.startsAt, status: classSessions.status }).from(classSessions).where(eq(classSessions.id, input.sessionId)).limit(1);
    if (!session || session.status === 'cancelled') return { ok: false, message: 'Buổi này đã huỷ.', fieldErrors: { sessionId: 'Buổi đã huỷ' } };
    if (session.startsAt <= new Date()) return { ok: false, message: 'Buổi này đã bắt đầu. Ghi vắng ở màn Điểm danh.', fieldErrors: { sessionId: 'Buổi đã bắt đầu' } };

    // Đơn cũ của cùng buổi (đã huỷ, bị từ chối, nháp) được mở lại thành chờ duyệt; đơn đang chờ hoặc đã duyệt thì giữ
    const [row] = (
      await db.execute<{ id: number; status: string }>(sql`
        INSERT INTO leave_requests (student_id, session_id, status, reason) VALUES (${input.studentId}, ${input.sessionId}, 'pending', ${reason})
        ON CONFLICT (student_id, session_id) DO UPDATE SET
          status = CASE WHEN leave_requests.status IN ('pending', 'approved') THEN leave_requests.status ELSE 'pending' END,
          reason = CASE WHEN leave_requests.status IN ('pending', 'approved') THEN leave_requests.reason ELSE ${reason} END,
          decided_by_account_id = CASE WHEN leave_requests.status IN ('pending', 'approved') THEN leave_requests.decided_by_account_id ELSE NULL END,
          decided_at = CASE WHEN leave_requests.status IN ('pending', 'approved') THEN leave_requests.decided_at ELSE NULL END,
          updated_at = now()
        RETURNING id, status`)
    ).rows;
    if (!row) return { ok: false, message: 'Không ghi được đơn.' };
    if (row.status === 'approved') return { ok: false, message: 'Học sinh đã có đơn nghỉ được duyệt cho buổi này.' };

    const r = await applyLeaveDecision(accountId, Number(row.id), true);
    if (!r.ok) return { ok: false, message: r.message };
    await writeAudit({ action: 'create', entity: 'leave', entityId: row.id, summary: `Ghi đơn nghỉ cho ${r.leave.student_name} buổi ${r.when}` });
    refresh();
    return { ok: true, message: `Đã ghi đơn nghỉ cho ${r.leave.student_name} buổi ${r.when}` };
  } catch (error) {
    return errorResult(error);
  }
}

// ---------- Học bù (37.12) ----------

// Đơn nghỉ mà tài khoản này được xếp học bù: cùng quy tắc với duyệt đơn
async function leaveForMakeup(leaveId: number): Promise<{ accountId: number; studentId: number; sessionId: number }> {
  const accountId = await currentAccountId();
  const [leave] = await db.select({ studentId: leaveRequests.studentId, sessionId: leaveRequests.sessionId }).from(leaveRequests).where(eq(leaveRequests.id, leaveId)).limit(1);
  if (!leave || !(await canDecideLeave(accountId, leave.studentId, leave.sessionId))) throw new ForbiddenError('Bạn không xếp học bù được cho đơn này.');
  return { accountId, ...leave };
}

export async function makeupOptionsAction(leaveId: number): Promise<{ ok: true; candidates: MakeupCandidate[] } | { ok: false; message: string }> {
  try {
    await leaveForMakeup(leaveId);
    return { ok: true, candidates: await makeupCandidates(leaveId) };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi tìm buổi học bù:', error);
    return { ok: false, message: 'Không tìm được buổi học bù. Thử lại sau ít phút.' };
  }
}

// Xếp học bù: báo phụ huynh (nếu đã kết nối Telegram) và giáo viên lớp học bù
export async function bookMakeupAction(leaveId: number, sessionId: number): Promise<ActionResult> {
  try {
    const { accountId } = await leaveForMakeup(leaveId);
    const r = await bookMakeup({ leaveId, sessionId, accountId });
    if (!r.ok) return { ok: false, message: r.message };
    const c = r.candidate;
    const when = `${vnDateTimeLabel(c.startsAt)}–${vnTimeLabel(c.endsAt)}`;
    await safely('học bù', async () => {
      for (const chat of await parentChatsOfStudent(r.studentId)) {
        await sendAndRecord(chat, `📅 HỌC BÙ\nEm ${r.studentName} được xếp học bù buổi ${when} cùng lớp ${c.className}${c.room ? `, phòng ${c.room}` : ''}, Thầy/Cô ${c.teacherName}.\n\n— ESL Center`, 'leave', accountId);
      }
      for (const chat of await staffChatsOfClass(c.classId)) {
        await sendAndRecord(chat, `📅 Học bù: em ${r.studentName} học cùng lớp ${c.className} buổi ${when}. Em có trong danh sách điểm danh của buổi này.`, 'leave', null);
      }
    });
    await writeAudit({ action: 'create', entity: 'makeup', entityId: leaveId, summary: `Xếp học bù cho ${r.studentName}: lớp ${c.className} ${when}` });
    refresh();
    return { ok: true, message: `Đã xếp học bù cho ${r.studentName}: lớp ${c.className} ${when}` };
  } catch (error) {
    return errorResult(error);
  }
}

export async function cancelMakeupAction(leaveId: number): Promise<ActionResult> {
  try {
    await leaveForMakeup(leaveId);
    const removed = await cancelMakeup(leaveId);
    if (!removed) return { ok: false, message: 'Đơn này chưa xếp học bù.' };
    await writeAudit({ action: 'delete', entity: 'makeup', entityId: leaveId, summary: 'Bỏ buổi học bù' });
    refresh();
    return { ok: true, message: 'Đã bỏ buổi học bù' };
  } catch (error) {
    return errorResult(error);
  }
}
