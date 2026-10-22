// Đơn xin nghỉ học qua bot (docs/KICH-BAN-TELEGRAM.md mục 1.4, 1.5). Chỉ chạy trên server.
// Mọi mã trong nút bấm (học sinh, buổi, đơn) đều được kiểm lại: phụ huynh đúng của học sinh, buổi thuộc lớp của học sinh,
// người duyệt có quyền điểm danh và làm việc ở cơ sở của lớp (E-072).
import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { leaveRequests, students } from '@/db/schema';
import { vnDateKey, vnDateTimeLabel } from '@/lib/datetime';
import { sendMessage } from './api';
import { parentChatsOfStudent, sendAndRecord, sendCopyToSuperAdmins, staffChatsOfClass, type Chat } from './core';
import {
  cleanLeaveReason,
  isLeaveReasonCode,
  LEAVE_DRAFT_MINUTES,
  LEAVE_REASONS,
  LEAVE_STATUS_LABELS,
  leaveReasonKeyboard,
} from './prefs';

export const LEAVE_FORBIDDEN = 'Bạn không có quyền duyệt đơn này';

type Kid = { id: number; full_name: string; class_name: string };

async function kidsOf(parentId: number): Promise<Kid[]> {
  const result = await db.execute<Kid>(sql`
    SELECT s.id, s.full_name, c.name AS class_name
    FROM student_parents sp JOIN students s ON s.id = sp.student_id JOIN classes c ON c.id = s.class_id
    WHERE sp.parent_id = ${parentId} AND s.status IN ('active', 'trial')
    ORDER BY s.full_name`);
  return result.rows;
}

async function isParentOfStudent(parentId: number, studentId: number): Promise<boolean> {
  const rows = await db.execute(sql`SELECT 1 FROM student_parents WHERE parent_id = ${parentId} AND student_id = ${studentId} LIMIT 1`);
  return rows.rows.length > 0;
}

export type LeaveRow = {
  id: number;
  status: keyof typeof LEAVE_STATUS_LABELS;
  reason: string;
  student_id: number;
  session_id: number;
  parent_id: number | null;
  decided_by_name: string | null;
  decided_at: Date | null;
  starts_at: Date;
  room: string;
  session_teacher_id: number | null;
  class_id: number;
  class_name: string;
  student_name: string;
  parent_name: string | null;
};

async function loadLeave(requestId: number): Promise<LeaveRow | null> {
  if (!Number.isInteger(requestId)) return null;
  const [row] = (
    await db.execute<LeaveRow>(sql`
      SELECT lr.id, lr.status, lr.reason, lr.student_id, lr.session_id, lr.parent_id, lr.decided_at,
        a.full_name AS decided_by_name, cs.starts_at, cs.room, cs.teacher_id AS session_teacher_id,
        c.id AS class_id, c.name AS class_name, s.full_name AS student_name, p.full_name AS parent_name
      FROM leave_requests lr
      JOIN class_sessions cs ON cs.id = lr.session_id
      JOIN students s ON s.id = lr.student_id
      JOIN classes c ON c.id = cs.class_id
      LEFT JOIN parents p ON p.id = lr.parent_id
      LEFT JOIN accounts a ON a.id = lr.decided_by_account_id
      WHERE lr.id = ${requestId}
      LIMIT 1`)
  ).rows;
  return row ?? null;
}

const reasonText = (reason: string) => (reason ? `Lý do: ${reason}` : 'Lý do: không ghi');

// ---------- Phụ huynh: chọn con, chọn buổi, chọn lý do ----------

export async function startLeave(chat: Chat): Promise<void> {
  if (!chat.parentId) return;
  const kids = await kidsOf(chat.parentId);
  if (kids.length === 0) {
    await sendAndRecord(chat, 'Chưa có học sinh nào đang học gắn với Quý phụ huynh. Liên hệ văn phòng trung tâm để được hỗ trợ.', 'command', null);
    return;
  }
  if (kids.length === 1) {
    await promptSessions(chat, kids[0].id);
    return;
  }
  await sendAndRecord(chat, 'Quý phụ huynh muốn xin nghỉ cho con nào?', 'command', null, {
    inline_keyboard: kids.map((k) => [{ text: `Em ${k.full_name} (${k.class_name})`, callback_data: `leave_kid:${k.id}` }]),
  });
}

// Năm buổi sắp tới chưa bắt đầu. Buổi đã có đơn chờ duyệt hoặc đã duyệt không có nút, chỉ ghi trạng thái.
export async function promptSessions(chat: Chat, studentId: number): Promise<string | undefined> {
  if (!chat.parentId || !(await isParentOfStudent(chat.parentId, studentId))) return 'Không tìm thấy học sinh này.';
  const [kid] = await db.select({ name: students.fullName }).from(students).where(eq(students.id, studentId)).limit(1);
  const sessions = await db.execute<{ id: number; starts_at: Date; room: string; topic: string; leave_status: string | null }>(sql`
    SELECT cs.id, cs.starts_at, cs.room, cs.topic, lr.status AS leave_status
    FROM class_sessions cs
    JOIN students s ON s.class_id = cs.class_id
    LEFT JOIN leave_requests lr ON lr.session_id = cs.id AND lr.student_id = s.id
    WHERE s.id = ${studentId} AND cs.status = 'planned' AND cs.starts_at > now()
    ORDER BY cs.starts_at
    LIMIT 5`);
  if (sessions.rows.length === 0) {
    await sendAndRecord(chat, `Em ${kid?.name ?? ''} không có buổi học nào sắp tới để xin nghỉ.`, 'command', null);
    return;
  }
  const lines = [`Chọn buổi muốn xin nghỉ cho em ${kid?.name ?? ''}:`];
  const buttons: { text: string; callback_data: string }[][] = [];
  for (const s of sessions.rows) {
    const label = `${vnDateTimeLabel(new Date(s.starts_at))}${s.room ? ` · P.${s.room}` : ''}`;
    if (s.leave_status === 'pending' || s.leave_status === 'approved') {
      lines.push(`• ${label}: đơn ${LEAVE_STATUS_LABELS[s.leave_status]}`);
    } else {
      buttons.push([{ text: label, callback_data: `leave_sess:${studentId}:${s.id}` }]);
    }
  }
  if (buttons.length === 0) lines.push('', 'Các buổi sắp tới đều đã có đơn.');
  await sendAndRecord(chat, lines.join('\n'), 'command', null, buttons.length ? { inline_keyboard: buttons } : undefined);
}

// Phụ huynh chọn buổi: tạo đơn nháp (hoặc mở lại đơn đã từ chối, đã huỷ) rồi hỏi lý do
export async function chooseSession(chat: Chat, studentId: number, sessionId: number): Promise<string> {
  if (!chat.parentId || !Number.isInteger(studentId) || !Number.isInteger(sessionId)) return 'Không xin nghỉ được buổi này.';
  if (!(await isParentOfStudent(chat.parentId, studentId))) return 'Không tìm thấy học sinh này.';
  const [ok] = (
    await db.execute<{ id: number }>(sql`
      SELECT cs.id FROM class_sessions cs JOIN students s ON s.class_id = cs.class_id
      WHERE cs.id = ${sessionId} AND s.id = ${studentId} AND cs.status = 'planned' AND cs.starts_at > now()`)
  ).rows;
  if (!ok) return 'Buổi này đã bắt đầu, đã huỷ hoặc không thuộc lớp của con.';

  const [opened] = (
    await db.execute<{ id: number }>(sql`
      INSERT INTO leave_requests (student_id, session_id, parent_id, status)
      VALUES (${studentId}, ${sessionId}, ${chat.parentId}, 'draft')
      ON CONFLICT (student_id, session_id) DO UPDATE
        SET status = 'draft', reason = '', parent_id = EXCLUDED.parent_id, decided_by_account_id = NULL, decided_at = NULL, updated_at = now()
        WHERE leave_requests.status IN ('draft', 'denied', 'cancelled')
      RETURNING id`)
  ).rows;
  if (!opened) {
    const [existing] = await db
      .select({ status: leaveRequests.status })
      .from(leaveRequests)
      .where(and(eq(leaveRequests.studentId, studentId), eq(leaveRequests.sessionId, sessionId)))
      .limit(1);
    return `Buổi này đã có đơn ${LEAVE_STATUS_LABELS[existing?.status ?? 'pending']}.`;
  }
  const leave = await loadLeave(opened.id);
  await sendAndRecord(
    chat,
    `Xin nghỉ cho em ${leave?.student_name ?? ''} buổi ${leave ? vnDateTimeLabel(new Date(leave.starts_at)) : ''}.\n\nQuý phụ huynh chọn lý do bên dưới, hoặc gõ lý do vào ô chat (trong ${LEAVE_DRAFT_MINUTES} phút).`,
    'command',
    null,
    leaveReasonKeyboard(opened.id),
  );
  return 'Chọn lý do xin nghỉ';
}

// Nút lý do: lv_r:<đơn>:<mã>
export async function chooseReason(chat: Chat, requestId: number, code: string): Promise<string> {
  if (!isLeaveReasonCode(code)) return 'Lý do không hợp lệ.';
  return submitLeave(chat, requestId, LEAVE_REASONS[code]);
}

// Phụ huynh gõ lý do sau khi chọn buổi. Trả về true nếu tin này đã được dùng làm lý do.
export async function takeTypedReason(chat: Chat, text: string): Promise<boolean> {
  if (!chat.parentId) return false;
  const reason = cleanLeaveReason(text);
  if (!reason) return false;
  const [draft] = await db
    .select({ id: leaveRequests.id })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.parentId, chat.parentId),
        eq(leaveRequests.status, 'draft'),
        gt(leaveRequests.updatedAt, new Date(Date.now() - LEAVE_DRAFT_MINUTES * 60_000)),
      ),
    )
    .orderBy(desc(leaveRequests.updatedAt))
    .limit(1);
  if (!draft) return false;
  await submitLeave(chat, draft.id, reason);
  return true;
}

// Nháp thành chờ duyệt (một lần, nhờ điều kiện status = 'draft'), báo phụ huynh, giáo viên lớp và quản trị
async function submitLeave(chat: Chat, requestId: number, reason: string): Promise<string> {
  if (!chat.parentId || !Number.isInteger(requestId)) return 'Không tìm thấy đơn.';
  const [moved] = (
    await db.execute<{ id: number }>(sql`
      UPDATE leave_requests lr SET status = 'pending', reason = ${reason}, updated_at = now()
      FROM class_sessions cs, student_parents sp
      WHERE lr.id = ${requestId} AND lr.status = 'draft' AND cs.id = lr.session_id AND cs.starts_at > now()
        AND sp.student_id = lr.student_id AND sp.parent_id = ${chat.parentId}
      RETURNING lr.id`)
  ).rows;
  if (!moved) {
    const current = await loadLeave(requestId);
    return current ? `Đơn này đang ${LEAVE_STATUS_LABELS[current.status]}.` : 'Không tìm thấy đơn.';
  }
  const leave = await loadLeave(requestId);
  if (!leave) return 'Không tìm thấy đơn.';
  const when = vnDateTimeLabel(new Date(leave.starts_at));

  await sendAndRecord(
    chat,
    `✓ Đã gửi đơn xin nghỉ cho em ${leave.student_name} buổi ${when} (lớp ${leave.class_name}).\n${reasonText(leave.reason)}\n\nThầy/Cô sẽ duyệt và bot báo lại cho Quý phụ huynh. Đổi ý thì bấm Huỷ đơn.`,
    'leave',
    null,
    { inline_keyboard: [[{ text: '✕ Huỷ đơn', callback_data: `lv_x:${leave.id}` }]] },
  );

  const staffText = `📢 ĐƠN XIN NGHỈ HỌC #${leave.id}\nPhụ huynh ${leave.parent_name ?? ''} xin cho em ${leave.student_name} (lớp ${leave.class_name}) nghỉ buổi ${when}.\n${reasonText(leave.reason)}\n\nThầy/Cô duyệt đơn bằng nút bên dưới:`;
  const keyboard = {
    inline_keyboard: [
      [
        { text: '✓ Duyệt', callback_data: `leave_appr:${leave.id}` },
        { text: '✕ Từ chối', callback_data: `leave_deny:${leave.id}` },
      ],
    ],
  };
  const staff = await staffChatsOfClass(leave.class_id, leave.session_teacher_id ? [leave.session_teacher_id] : []);
  for (const c of staff) await sendAndRecord(c, staffText, 'leave', null, keyboard);
  await sendCopyToSuperAdmins(`[Bản sao] ${staffText.split('\n\n')[0]}`);
  return 'Đã gửi đơn xin nghỉ';
}

// Phụ huynh huỷ đơn còn chờ duyệt, buổi chưa bắt đầu
export async function cancelLeave(chat: Chat, requestId: number): Promise<string> {
  if (!chat.parentId || !Number.isInteger(requestId)) return 'Không tìm thấy đơn.';
  const [moved] = (
    await db.execute<{ id: number }>(sql`
      UPDATE leave_requests lr SET status = 'cancelled', updated_at = now()
      FROM class_sessions cs, student_parents sp
      WHERE lr.id = ${requestId} AND lr.status IN ('draft', 'pending') AND cs.id = lr.session_id AND cs.starts_at > now()
        AND sp.student_id = lr.student_id AND sp.parent_id = ${chat.parentId}
      RETURNING lr.id`)
  ).rows;
  const leave = await loadLeave(requestId);
  if (!moved) {
    if (!leave) return 'Không tìm thấy đơn.';
    return `Đơn đang ${LEAVE_STATUS_LABELS[leave.status]} nên không huỷ được. Quý phụ huynh nhắn trực tiếp cho Thầy/Cô.`;
  }
  if (!leave) return 'Đã huỷ đơn';
  const when = vnDateTimeLabel(new Date(leave.starts_at));
  await sendAndRecord(chat, `Đã huỷ đơn xin nghỉ buổi ${when} của em ${leave.student_name}. Em đi học bình thường.`, 'leave', null);
  const staff = await staffChatsOfClass(leave.class_id, leave.session_teacher_id ? [leave.session_teacher_id] : []);
  for (const c of staff) await sendAndRecord(c, `Phụ huynh đã HUỶ đơn xin nghỉ #${leave.id} của em ${leave.student_name} (lớp ${leave.class_name}) buổi ${when}.`, 'leave', null);
  return 'Đã huỷ đơn';
}

// ---------- Giáo viên: duyệt, từ chối, xem đơn chờ ----------

// Tài khoản còn hoạt động, có quyền điểm danh (quản trị có mọi quyền), làm việc ở cơ sở của lớp (quản trị không cần
// dòng account_campuses), và buổi học thuộc đúng lớp của học sinh. Quy tắc giống src/lib/campus-access.ts.
export async function canDecideLeave(accountId: number, studentId: number, sessionId: number): Promise<boolean> {
  if (!Number.isInteger(studentId) || !Number.isInteger(sessionId)) return false;
  const [row] = (
    await db.execute<{ ok: boolean }>(sql`
      SELECT true AS ok
      FROM accounts a
      JOIN students s ON s.id = ${studentId}
      JOIN class_sessions cs ON cs.id = ${sessionId} AND cs.class_id = s.class_id
      JOIN classes c ON c.id = s.class_id
      WHERE a.id = ${accountId} AND a.status = 'active'
        AND (a.role = 'admin' OR (
          EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role = a.role AND rp.permission = 'attendance.record' AND rp.granted = true)
          AND EXISTS (SELECT 1 FROM account_campuses ac WHERE ac.account_id = a.id AND ac.campus_id = c.campus_id)))
      LIMIT 1`)
  ).rows;
  return Boolean(row?.ok);
}

// Nút cũ (trước P37) mang leave_appr:<học sinh>:<buổi>; nút mới mang leave_appr:<đơn>. Nút cũ chưa có đơn thì tạo đơn chờ duyệt.
// Kiểm quyền trước khi tạo đơn, để người không có quyền không làm đổi dữ liệu.
export async function resolveLeaveRef(accountId: number | null, parts: string[]): Promise<number | null> {
  if (parts.length === 1) {
    const id = Number(parts[0]);
    return Number.isInteger(id) ? id : null;
  }
  const studentId = Number(parts[0]);
  const sessionId = Number(parts[1]);
  if (!accountId || !(await canDecideLeave(accountId, studentId, sessionId))) return null;
  const [row] = (
    await db.execute<{ id: number }>(sql`
      INSERT INTO leave_requests (student_id, session_id, status) VALUES (${studentId}, ${sessionId}, 'pending')
      ON CONFLICT (student_id, session_id) DO UPDATE SET updated_at = leave_requests.updated_at
      RETURNING id`)
  ).rows;
  return row ? Number(row.id) : null;
}

// Duyệt hoặc từ chối một đơn, dùng chung cho nút trên bot và màn Đơn nghỉ trong app.
// Chỉ đơn đang chờ duyệt mới đổi được (một người quyết). Duyệt thì ghi vắng vào sổ điểm danh.
// Báo phụ huynh qua Telegram và gửi bản sao cho quản trị (trừ chính người duyệt).
export async function applyLeaveDecision(
  accountId: number,
  requestId: number,
  approve: boolean,
): Promise<{ ok: true; leave: LeaveRow; when: string } | { ok: false; message: string }> {
  const leave = await loadLeave(requestId);
  if (!leave || !(await canDecideLeave(accountId, leave.student_id, leave.session_id))) return { ok: false, message: LEAVE_FORBIDDEN };

  const [moved] = (
    await db.execute<{ id: number }>(sql`
      UPDATE leave_requests SET status = ${approve ? 'approved' : 'denied'}, decided_by_account_id = ${accountId}, decided_at = now(), updated_at = now()
      WHERE id = ${requestId} AND status = 'pending'
      RETURNING id`)
  ).rows;
  if (!moved) {
    if (leave.status === 'approved' || leave.status === 'denied') {
      const by = leave.decided_by_name ? ` bởi ${leave.decided_by_name}` : '';
      const at = leave.decided_at ? ` lúc ${vnDateTimeLabel(new Date(leave.decided_at))}` : '';
      return { ok: false, message: `Đơn này đã ${LEAVE_STATUS_LABELS[leave.status]}${by}${at}.` };
    }
    return { ok: false, message: `Đơn này ${LEAVE_STATUS_LABELS[leave.status]}, không cần duyệt.` };
  }

  const when = vnDateTimeLabel(new Date(leave.starts_at));
  const [decider] = (await db.execute<{ name: string }>(sql`
    SELECT COALESCE(t.name, a.full_name) AS name FROM accounts a LEFT JOIN teachers t ON t.id = a.teacher_id WHERE a.id = ${accountId}`)).rows;
  const deciderName = decider?.name ?? 'Giáo viên';

  if (approve) {
    // Ghi vắng vào sổ điểm danh ngày của buổi (theo giờ Việt Nam)
    await db.execute(sql`
      INSERT INTO attendance (student_id, class_id, session_date, mark, created_at, updated_at)
      VALUES (${leave.student_id}, ${leave.class_id}, ${vnDateKey(new Date(leave.starts_at))}::date, 'absent', now(), now())
      ON CONFLICT (student_id, session_date) DO UPDATE SET mark = 'absent', updated_at = now()`);
  }

  const parentText = approve
    ? `✓ Đơn xin nghỉ buổi ${when} của em ${leave.student_name} đã được Thầy/Cô ${deciderName} duyệt. Chúc em mau khoẻ, hẹn em buổi sau!`
    : `Đơn xin nghỉ buổi ${when} của em ${leave.student_name} chưa được duyệt. Thầy/Cô ${deciderName} sẽ liên hệ trực tiếp với Quý phụ huynh.`;
  for (const pc of await parentChatsOfStudent(leave.student_id)) await sendAndRecord(pc, parentText, 'leave', accountId);
  await sendCopyToSuperAdmins(`[Bản sao] Thầy/Cô ${deciderName} đã ${approve ? 'DUYỆT' : 'TỪ CHỐI'} đơn nghỉ #${leave.id} của em ${leave.student_name} (lớp ${leave.class_name}) buổi ${when}.`, accountId);
  return { ok: true, leave, when };
}

// Nút Duyệt, Từ chối trên bot. Trả về câu trả lời cho nút bấm.
export async function decideLeave(chat: Chat, requestId: number | null, approve: boolean): Promise<string> {
  if (!chat.accountId || requestId === null) return LEAVE_FORBIDDEN;
  const r = await applyLeaveDecision(chat.accountId, requestId, approve);
  if (!r.ok) return r.message;
  await sendMessage(
    chat.chatId,
    approve
      ? `✓ Đã duyệt đơn #${r.leave.id}: em ${r.leave.student_name} nghỉ buổi ${r.when}. Đã ghi vắng có phép vào sổ điểm danh.`
      : `Đã từ chối đơn #${r.leave.id} của em ${r.leave.student_name} buổi ${r.when}. Thầy/Cô nhớ liên hệ phụ huynh.`,
  );
  return approve ? 'Đã duyệt đơn' : 'Đã từ chối đơn';
}

// /donnghi: đơn chờ duyệt mà tài khoản này duyệt được (lớp mình dạy; quản trị thấy mọi đơn), mỗi đơn một tin kèm nút
// Giáo viên: lớp mình dạy. Giáo vụ và vai trò khác có quyền điểm danh: mọi lớp ở cơ sở mình. Quản trị: mọi đơn.
export async function listPendingLeaves(chat: Chat): Promise<void> {
  if (!chat.accountId) return;
  const rows = (
    await db.execute<{ id: number; student_id: number; session_id: number; role: string; teaches: boolean }>(sql`
      SELECT lr.id, lr.student_id, lr.session_id, a.role,
        COALESCE(a.teacher_id IN (c.teacher_id, c.assistant_id, c.foreign_teacher_id, cs.teacher_id), false) AS teaches
      FROM leave_requests lr
      JOIN class_sessions cs ON cs.id = lr.session_id
      JOIN classes c ON c.id = cs.class_id
      JOIN accounts a ON a.id = ${chat.accountId}
      WHERE lr.status = 'pending' AND cs.starts_at > now() - interval '1 day'
      ORDER BY cs.starts_at
      LIMIT 30`)
  ).rows;
  const allowed = [];
  for (const r of rows) {
    if (r.role === 'teacher' && !r.teaches) continue;
    if (await canDecideLeave(chat.accountId, r.student_id, r.session_id)) allowed.push(r);
    if (allowed.length === 10) break;
  }
  if (allowed.length === 0) {
    await sendAndRecord(chat, 'Không có đơn xin nghỉ nào đang chờ Thầy/Cô duyệt.', 'command', null);
    return;
  }
  await sendAndRecord(chat, `Có ${allowed.length} đơn xin nghỉ đang chờ duyệt:`, 'command', null);
  for (const r of allowed) {
    const leave = await loadLeave(r.id);
    if (!leave) continue;
    await sendAndRecord(
      chat,
      `#${leave.id} · Em ${leave.student_name} (lớp ${leave.class_name}) · buổi ${vnDateTimeLabel(new Date(leave.starts_at))}\n${reasonText(leave.reason)}`,
      'command',
      null,
      {
        inline_keyboard: [
          [
            { text: '✓ Duyệt', callback_data: `leave_appr:${leave.id}` },
            { text: '✕ Từ chối', callback_data: `leave_deny:${leave.id}` },
          ],
        ],
      },
    );
  }
}

// Trạng thái đơn của các buổi (cho /lich và nhắc lịch): khoá "học sinh:buổi"
export async function leaveStatusMap(studentIds: number[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (studentIds.length === 0) return map;
  const rows = await db.execute<{ student_id: number; session_id: number; status: string }>(sql`
    SELECT student_id, session_id, status FROM leave_requests
    WHERE student_id = ANY(${`{${studentIds.join(',')}}`}::int[]) AND status IN ('pending', 'approved')`);
  for (const r of rows.rows) map.set(`${r.student_id}:${r.session_id}`, r.status);
  return map;
}
