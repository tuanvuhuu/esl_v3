// Nghiệp vụ của bot Telegram (P34): kết nối chat, lưu và gửi tin, trả lời lệnh của phụ huynh,
// trao đổi 2 chiều giữa giáo viên và phụ huynh, bản sao cho super admin. Chỉ chạy trên server.
import { and, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { accounts, parents, studentParents, students, teachers, telegramChats, telegramLinkCodes, telegramMessages } from '@/db/schema';
import { CONSENT_LABELS, CONSENT_TERMS, type ConsentPurpose } from '@/lib/consent';
import { isParentOf, recordConsent } from '@/lib/queries/consents';
import { dateKeyLabel, todayKeyVN, vnDateTimeLabel, vnDayBounds } from '@/lib/datetime';
import { formatVND } from '@/lib/money';
import { answerCallbackQuery, editMessageText, sendMessage } from './api';
import { chatOf, record, sendAndRecord, sendCopyToSuperAdmins, type Chat } from './core';
import { cancelLeave, chooseReason, chooseSession, decideLeave, leaveStatusMap, listPendingLeaves, promptSessions, resolveLeaveRef, startLeave, takeTypedReason } from './leave';
import { isNotifyKind, NOTIFY_LABELS, settingsKeyboard, settingsText, toggleMuted } from './prefs';
import {
  CONNECT_HINT,
  HELP_TEXT,
  LINK_CODE_DAYS,
  newLinkCode,
  PARENT_INLINE_MENU,
  PARENT_KEYBOARD,
  parseCommand,
  QUICK_MENU_INLINE,
  STAFF_HELP_TEXT,
  SHARE_PHONE_KEYBOARD,
  STAFF_KEYBOARD,
  normalizePhone,
} from './commands';

export type LinkTarget = { parentId: number } | { accountId: number };

// Tạo mã kết nối mới cho một phụ huynh hoặc tài khoản. Mã cũ chưa dùng của cùng người vẫn còn hạn, không ảnh hưởng.
export async function createLinkCode(target: LinkTarget, createdByAccountId: number | null): Promise<string> {
  const code = newLinkCode();
  await db.insert(telegramLinkCodes).values({
    code,
    parentId: 'parentId' in target ? target.parentId : null,
    accountId: 'accountId' in target ? target.accountId : null,
    createdByAccountId,
    expiresAt: new Date(Date.now() + LINK_CODE_DAYS * 86_400_000),
  });
  return code;
}

export { sendCopyToSuperAdmins };

export type SendSummary = { chats: number; delivered: number };

// Lấy chữ ký nhân viên / giáo viên kèm tên lớp (P34.12)
async function getStaffSignature(accountId: number, parentId?: number | null): Promise<string> {
  const [acc] = await db
    .select({
      id: accounts.id,
      fullName: accounts.fullName,
      teacherId: accounts.teacherId,
    })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);

  if (!acc) return '\n\n— ESL Center';

  if (acc.teacherId) {
    const [t] = await db
      .select({ name: teachers.name })
      .from(teachers)
      .where(eq(teachers.id, acc.teacherId))
      .limit(1);
    const teacherName = t?.name || acc.fullName;

    if (parentId) {
      const classRows = await db.execute<{ class_name: string }>(sql`
        SELECT DISTINCT c.name AS class_name
        FROM classes c
        JOIN students s ON s.class_id = c.id
        JOIN student_parents sp ON sp.student_id = s.id
        WHERE sp.parent_id = ${parentId}
          AND (c.teacher_id = ${acc.teacherId} OR c.assistant_id = ${acc.teacherId} OR c.foreign_teacher_id = ${acc.teacherId})
        LIMIT 2`);
      if (classRows.rows.length > 0) {
        const classNames = classRows.rows.map((r) => r.class_name).join(', ');
        return `\n\n— Thầy/Cô ${teacherName}, GV lớp ${classNames}`;
      }
    }
    return `\n\n— Thầy/Cô ${teacherName}, Giáo viên ESL Center`;
  }

  return `\n\n— ${acc.fullName}, ESL Center`;
}

// Chuyển tiếp tin nhắn của phụ huynh tới Telegram của các giáo viên phụ trách (P34.12)
async function forwardParentMessageToTeachers(parentId: number, parentName: string, text: string): Promise<void> {
  const teacherRows = await db.execute<{ account_id: number; chat_id: number; class_name: string; student_name: string }>(sql`
    SELECT DISTINCT tc.account_id, tc.chat_id, c.name AS class_name, s.full_name AS student_name
    FROM student_parents sp
    JOIN students s ON s.id = sp.student_id
    JOIN classes c ON c.id = s.class_id
    JOIN accounts a ON (a.teacher_id = c.teacher_id OR a.teacher_id = c.assistant_id OR a.teacher_id = c.foreign_teacher_id)
    JOIN telegram_chats tc ON tc.account_id = a.id
    WHERE sp.parent_id = ${parentId} AND tc.active = true`);

  for (const row of teacherRows.rows) {
    const notifyText = `[Tin từ PH #${parentId} - ${parentName} (PH em ${row.student_name} - lớp ${row.class_name})]:\n"${text}"\n\n👉 Bấm Reply (Trả lời) tin nhắn này để gửi lại cho phụ huynh.`;
    await sendMessage(row.chat_id, notifyText);
  }
}

// ---------- Đồng ý của phụ huynh (P35.12) ----------

// Mã ngắn trong callback_data (Telegram giới hạn 64 byte)
const PURPOSE_CODE: Record<ConsentPurpose, string> = { voice_teacher_review: 'v', voice_auto_scoring: 'a' };
const CODE_PURPOSE: Record<string, ConsentPurpose> = { v: 'voice_teacher_review', a: 'voice_auto_scoring' };

// Gửi nội dung xin đồng ý kèm hai nút cho mọi phụ huynh đã kết nối của học sinh. Ghi tên giáo viên gửi.
export async function sendConsentRequest(studentId: number, purpose: ConsentPurpose, sentByAccountId: number, senderName: string): Promise<SendSummary> {
  const [student] = await db.select({ fullName: students.fullName }).from(students).where(eq(students.id, studentId)).limit(1);
  if (!student) return { chats: 0, delivered: 0 };
  const code = PURPOSE_CODE[purpose];
  const text =
    `📝 Xin phép phụ huynh em ${student.fullName}

${CONSENT_LABELS[purpose]}.

${CONSENT_TERMS[purpose]}

` +
    `Phụ huynh bấm một nút bên dưới. Không bấm thì trung tâm coi như chưa đồng ý.
— ${senderName}`;
  const markup = {
    inline_keyboard: [
      [
        { text: '✅ Đồng ý', callback_data: `consent:${code}:y:${studentId}` },
        { text: '✕ Không đồng ý', callback_data: `consent:${code}:n:${studentId}` },
      ],
    ],
  };
  const chats = await db
    .select()
    .from(telegramChats)
    .innerJoin(studentParents, eq(studentParents.parentId, telegramChats.parentId))
    .where(and(eq(studentParents.studentId, studentId), eq(telegramChats.active, true)));
  let delivered = 0;
  for (const row of chats) if (await sendAndRecord(row.telegram_chats, text, 'consent', sentByAccountId, markup)) delivered++;
  return { chats: chats.length, delivered };
}

// Phụ huynh bấm nút đồng ý hoặc không đồng ý. Chỉ phụ huynh của chính học sinh đó mới ghi được.
async function handleConsentCallback(chat: Chat, data: string): Promise<string> {
  const [, code, answer, sid] = data.split(':');
  const purpose = CODE_PURPOSE[code];
  const studentId = Number(sid);
  if (!purpose || !Number.isInteger(studentId) || (answer !== 'y' && answer !== 'n')) return 'Nút này không còn dùng được.';
  if (!chat.parentId || !(await isParentOf(chat.parentId, studentId))) return 'Tài khoản này không phải phụ huynh của học sinh.';
  const granted = answer === 'y';
  await recordConsent({ studentId, purpose, granted, parentId: chat.parentId, channel: 'telegram', recordedByAccountId: null });
  const [student] = await db.select({ fullName: students.fullName }).from(students).where(eq(students.id, studentId)).limit(1);
  const reply = granted
    ? `Trung tâm đã ghi nhận phụ huynh ĐỒNG Ý: ${CONSENT_LABELS[purpose].toLowerCase()} cho em ${student?.fullName ?? ''}. Muốn rút lại, phụ huynh nhắn trung tâm bất cứ lúc nào.`
    : `Trung tâm đã ghi nhận phụ huynh KHÔNG ĐỒNG Ý: ${CONSENT_LABELS[purpose].toLowerCase()} cho em ${student?.fullName ?? ''}. Con vẫn làm các bài không cần ghi âm bình thường.`;
  await sendAndRecord(chat, reply, 'consent', null);
  return granted ? 'Đã ghi nhận đồng ý' : 'Đã ghi nhận không đồng ý';
}

// Gửi cho mọi chat đang hoạt động của các phụ huynh của một học sinh
export async function notifyParentsOfStudent(studentId: number, text: string, kind: string, sentByAccountId: number | null): Promise<SendSummary> {
  const chats = await db
    .select()
    .from(telegramChats)
    .innerJoin(studentParents, eq(studentParents.parentId, telegramChats.parentId))
    .where(and(eq(studentParents.studentId, studentId), eq(telegramChats.active, true)));
  let delivered = 0;
  for (const row of chats) if (await sendAndRecord(row.telegram_chats, text, kind, sentByAccountId)) delivered++;
  return { chats: chats.length, delivered };
}

// Gửi cho các tài khoản nhân viên đã kết nối (ví dụ giáo viên chủ nhiệm khi học sinh nộp bài)
export async function notifyAccounts(accountIds: number[], text: string, kind: string): Promise<SendSummary> {
  if (accountIds.length === 0) return { chats: 0, delivered: 0 };
  const chats = await db.select().from(telegramChats).where(and(inArray(telegramChats.accountId, accountIds), eq(telegramChats.active, true)));
  let delivered = 0;
  for (const chat of chats) if (await sendAndRecord(chat, text, kind, null)) delivered++;
  return { chats: chats.length, delivered };
}

// Trả lời phụ huynh từ màn Tin nhắn hoặc từ Telegram reply (P34.12, 34.13)
export async function replyToParent(parentId: number, text: string, sentByAccountId: number): Promise<SendSummary> {
  const chats = await db.select().from(telegramChats).where(and(eq(telegramChats.parentId, parentId), eq(telegramChats.active, true)));
  const sig = await getStaffSignature(sentByAccountId, parentId);
  const fullText = `${text}${sig}`;

  let delivered = 0;
  for (const chat of chats) {
    if (await sendAndRecord(chat, fullText, 'reply', sentByAccountId)) delivered++;
  }

  // Gửi bản sao cho Super Admin
  const [sender] = await db.select({ name: accounts.fullName }).from(accounts).where(eq(accounts.id, sentByAccountId)).limit(1);
  const [p] = await db.select({ name: parents.fullName }).from(parents).where(eq(parents.id, parentId)).limit(1);
  const kids = await childrenOf(parentId);
  const kidsStr = kids.map((k) => k.full_name).join(', ') || 'học sinh';
  await sendCopyToSuperAdmins(
    `[Bản sao] ${sender?.name ?? 'Nhân viên'} trả lời PH #${parentId} ${p?.name ?? ''} (con: ${kidsStr}):\n"${text}"`,
    sentByAccountId,
  );

  return { chats: chats.length, delivered };
}

export async function isParentLinked(parentId: number): Promise<boolean> {
  const [row] = await db.select({ id: telegramChats.id }).from(telegramChats).where(and(eq(telegramChats.parentId, parentId), eq(telegramChats.active, true))).limit(1);
  return !!row;
}

export async function isAccountLinked(accountId: number): Promise<boolean> {
  const [row] = await db.select({ id: telegramChats.id }).from(telegramChats).where(and(eq(telegramChats.accountId, accountId), eq(telegramChats.active, true))).limit(1);
  return !!row;
}

// ---------- Trả lời lệnh của phụ huynh ----------

async function childrenOf(parentId: number) {
  const result = await db.execute<{ id: number; full_name: string; class_id: number; class_name: string; fee: number; paid: number }>(sql`
    SELECT s.id, s.full_name, c.id AS class_id, c.name AS class_name, COALESCE(s.tuition_fee, c.fee) AS fee,
      COALESCE((SELECT SUM(p.amount) FROM tuition_payments p WHERE p.student_id = s.id), 0)::int AS paid
    FROM student_parents sp JOIN students s ON s.id = sp.student_id JOIN classes c ON c.id = s.class_id
    WHERE sp.parent_id = ${parentId} AND s.status IN ('active', 'trial', 'paused')
    ORDER BY s.full_name`);
  return result.rows;
}

async function scheduleText(parentId: number): Promise<string> {
  const kids = await childrenOf(parentId);
  if (kids.length === 0) return 'Chưa có học sinh nào gắn với phụ huynh này.';
  const leaves = await leaveStatusMap(kids.map((k) => k.id));
  const lines: string[] = ['📅 LỊCH HỌC 7 NGÀY TỚI'];
  for (const kid of kids) {
    const sessions = await db.execute<{ id: number; starts_at: Date; room: string; topic: string; teacher_name: string | null }>(sql`
      SELECT cs.id, cs.starts_at, cs.room, cs.topic, t.name AS teacher_name FROM class_sessions cs LEFT JOIN teachers t ON t.id = cs.teacher_id
      WHERE cs.class_id = ${kid.class_id} AND cs.status = 'planned' AND cs.starts_at >= now() AND cs.starts_at < now() + interval '7 days'
      ORDER BY cs.starts_at LIMIT 7`);
    lines.push('', `${kid.full_name} (lớp ${kid.class_name}):`);
    if (sessions.rows.length === 0) lines.push('  Không có buổi học trong 7 ngày tới.');
    for (const s of sessions.rows) {
      const leave = leaves.get(`${kid.id}:${s.id}`);
      const details = [s.room ? `phòng ${s.room}` : '', s.teacher_name ?? '', s.topic].filter(Boolean).join(' · ');
      lines.push(`  • ${vnDateTimeLabel(new Date(s.starts_at))}${details ? ` · ${details}` : ''}${leave ? ` (đã xin nghỉ: ${leave === 'approved' ? 'đã duyệt' : 'chờ duyệt'})` : ''}`);
    }
  }
  return lines.join('\n');
}

async function tuitionText(parentId: number): Promise<string> {
  const kids = await childrenOf(parentId);
  if (kids.length === 0) return 'Chưa có học sinh nào gắn với phụ huynh này.';
  return kids
    .map((k) => {
      const debt = Math.max(0, k.fee - k.paid);
      return debt > 0 ? `${k.full_name}: còn thiếu ${formatVND(debt)} (đã đóng ${formatVND(k.paid)} / ${formatVND(k.fee)})` : `${k.full_name}: đã đóng đủ ${formatVND(k.fee)}`;
    })
    .join('\n');
}

async function homeworkText(parentId: number): Promise<string> {
  const kids = await childrenOf(parentId);
  if (kids.length === 0) return 'Chưa có học sinh nào gắn với phụ huynh này.';
  const lines: string[] = [];
  for (const kid of kids) {
    const pending = await db.execute<{ title: string; due_at: Date }>(sql`
      SELECT a.title, a.due_at FROM assignments a
      LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = ${kid.id}
      WHERE a.class_id = ${kid.class_id} AND COALESCE(sub.status, 'not_submitted') = 'not_submitted'
      ORDER BY a.due_at LIMIT 10`);
    lines.push(`${kid.full_name}:`);
    if (pending.rows.length === 0) lines.push('  Không có bài nào chưa nộp.');
    for (const a of pending.rows) {
      const due = new Date(a.due_at);
      lines.push(`  • ${a.title} – hạn ${vnDateTimeLabel(due)}${due.getTime() < Date.now() ? ' (đã quá hạn)' : ''}`);
    }
  }
  return lines.join('\n');
}

// Tra cứu điểm và nhận xét bài tập gần nhất (P34.15)
async function scoresText(parentId: number): Promise<string> {
  const kids = await childrenOf(parentId);
  if (kids.length === 0) return 'Chưa có học sinh nào gắn với phụ huynh này.';
  const lines: string[] = [];
  for (const kid of kids) {
    lines.push(`Điểm & nhận xét của ${kid.full_name}:`);
    const rows = await db.execute<{ title: string; score: number | null; max_score: number; updated_at: Date; feedback: string | null }>(sql`
      SELECT a.title, sub.score, a.max_score, sub.updated_at, sub.feedback
      FROM assignment_submissions sub
      JOIN assignments a ON a.id = sub.assignment_id
      WHERE sub.student_id = ${kid.id} AND sub.status = 'graded'
      ORDER BY sub.updated_at DESC LIMIT 5`);
    if (rows.rows.length === 0) {
      lines.push('  Chưa có bài tập nào được chấm điểm gần đây.');
    } else {
      for (const r of rows.rows) {
        const timeStr = r.updated_at ? vnDateTimeLabel(new Date(r.updated_at)) : '';
        const comment = r.feedback ? ` · Nhận xét: "${r.feedback}"` : '';
        lines.push(`  • ${r.title}: ${r.score ?? 0}/${r.max_score} điểm (${timeStr})${comment}`);
      }
    }
  }
  return lines.join('\n');
}

// Tra cứu tình hình chuyên cần 10 buổi gần nhất (P34.15)
async function attendanceText(parentId: number): Promise<string> {
  const kids = await childrenOf(parentId);
  if (kids.length === 0) return 'Chưa có học sinh nào gắn với phụ huynh này.';
  const lines: string[] = [];
  for (const kid of kids) {
    const rows = await db.execute<{ session_date: string; mark: string }>(sql`
      SELECT session_date::text, mark
      FROM attendance
      WHERE student_id = ${kid.id}
      ORDER BY session_date DESC LIMIT 10`);
    if (rows.rows.length === 0) {
      lines.push(`${kid.full_name}: Chưa có dữ liệu điểm danh gần đây.`);
    } else {
      const presentCount = rows.rows.filter((r) => r.mark === 'present').length;
      const lateCount = rows.rows.filter((r) => r.mark === 'late').length;
      const absentCount = rows.rows.filter((r) => r.mark === 'absent').length;
      lines.push(`${kid.full_name} (10 buổi gần nhất: ${presentCount} có mặt, ${lateCount} trễ, ${absentCount} vắng):`);
      for (const r of rows.rows) {
        const statusLabel = r.mark === 'present' ? 'Có mặt' : r.mark === 'late' ? 'Đi trễ' : 'Vắng mặt';
        lines.push(`  • Ngày ${r.session_date}: ${statusLabel}`);
      }
    }
  }
  return lines.join('\n');
}

// Lịch dạy hôm nay của giáo viên (P34.19)
async function todayScheduleText(accountId: number): Promise<string> {
  const [acc] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!acc || !acc.teacherId) return 'Tài khoản này chưa gắn với giáo viên nào.';
  const teacherId = acc.teacherId;
  const rows = await db.execute<{ class_name: string; starts_at: Date; room: string; role: string }>(sql`
    SELECT c.name AS class_name, cs.starts_at, cs.room,
      CASE
        WHEN c.teacher_id = ${teacherId} THEN 'GV chủ nhiệm'
        WHEN c.assistant_id = ${teacherId} THEN 'Trợ giảng'
        ELSE 'GV nước ngoài'
      END AS role
    FROM class_sessions cs
    JOIN classes c ON c.id = cs.class_id
    WHERE (c.teacher_id = ${teacherId} OR c.assistant_id = ${teacherId} OR c.foreign_teacher_id = ${teacherId})
      AND cs.status = 'planned'
      AND cs.starts_at >= CURRENT_DATE AND cs.starts_at < CURRENT_DATE + interval '1 day'
    ORDER BY cs.starts_at`);
  if (rows.rows.length === 0) return 'Hôm nay bạn không có ca dạy nào.';
  const lines = ['Lịch dạy hôm nay của bạn:'];
  for (const r of rows.rows) {
    lines.push(`  • Lớp ${r.class_name} (${r.role}) – ${vnDateTimeLabel(new Date(r.starts_at))}${r.room ? ` · phòng ${r.room}` : ''}`);
  }
  return lines.join('\n');
}

// Danh sách bài tập chờ chấm của giáo viên (P34.19)
async function pendingGradingText(accountId: number): Promise<string> {
  const [acc] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!acc || !acc.teacherId) return 'Tài khoản này chưa gắn với giáo viên nào.';
  const teacherId = acc.teacherId;
  const rows = await db.execute<{ class_name: string; title: string; pending_count: number }>(sql`
    SELECT c.name AS class_name, a.title, COUNT(sub.id)::int AS pending_count
    FROM assignments a
    JOIN classes c ON c.id = a.class_id
    JOIN assignment_submissions sub ON sub.assignment_id = a.id
    WHERE (c.teacher_id = ${teacherId} OR c.assistant_id = ${teacherId} OR c.foreign_teacher_id = ${teacherId})
      AND sub.status = 'submitted'
    GROUP BY c.name, a.title
    HAVING COUNT(sub.id) > 0
    ORDER BY c.name, a.title`);
  if (rows.rows.length === 0) return 'Hiện không có bài tập nào đang chờ bạn chấm.';
  const lines = ['Danh sách bài đang chờ bạn chấm:'];
  for (const r of rows.rows) {
    lines.push(`  • Lớp ${r.class_name} – Bài "${r.title}": ${r.pending_count} bài nộp`);
  }
  return lines.join('\n');
}

// Báo cáo nhanh trong ngày cho Quản trị viên (P34.20). Ngày tính theo giờ Việt Nam.
export async function dailyReportText(accountId: number, now: Date = new Date()): Promise<string> {
  const [acc] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!acc || acc.role !== 'admin') return 'Chỉ Quản trị viên (Admin) mới có quyền xem báo cáo nhanh.';
  const today = todayKeyVN(now);
  const { start, end } = vnDayBounds(today);
  const [sessions] = (await db.execute<{ total: number; done: number; cancelled: number }>(sql`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'done')::int AS done,
           COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
    FROM class_sessions
    WHERE starts_at >= ${start} AND starts_at < ${end}`)).rows;
  const [att] = (await db.execute<{ absent: number; late: number }>(sql`
    SELECT COUNT(*) FILTER (WHERE mark = 'absent')::int AS absent, COUNT(*) FILTER (WHERE mark = 'late')::int AS late
    FROM attendance
    WHERE session_date = ${today}::date`)).rows;
  const [subs] = (await db.execute<{ submitted: number; waiting: number }>(sql`
    SELECT COUNT(*) FILTER (WHERE submitted_at >= ${start} AND submitted_at < ${end})::int AS submitted,
           COUNT(*) FILTER (WHERE status = 'submitted')::int AS waiting
    FROM assignment_submissions`)).rows;
  const [leaves] = (await db.execute<{ pending: number }>(sql`
    SELECT COUNT(*)::int AS pending FROM leave_requests lr JOIN class_sessions cs ON cs.id = lr.session_id
    WHERE lr.status = 'pending' AND cs.starts_at > now()`)).rows;
  const [tuition] = (await db.execute<{ collected: number }>(sql`
    SELECT COALESCE(SUM(amount), 0)::int AS collected
    FROM tuition_payments
    WHERE paid_at >= ${start} AND paid_at < ${end}`)).rows;
  const [debt] = (await db.execute<{ count: number }>(sql`
    SELECT COUNT(DISTINCT s.id)::int AS count
    FROM students s
    JOIN classes c ON c.id = s.class_id
    WHERE s.status = 'active'
      AND (COALESCE(s.tuition_fee, c.fee) - COALESCE((SELECT SUM(amount) FROM tuition_payments WHERE student_id = s.id), 0)) > 0`)).rows;

  return [
    `📊 BÁO CÁO NGÀY ${dateKeyLabel(today)} (ESL Center)`,
    `• Buổi học: ${sessions?.done ?? 0}/${sessions?.total ?? 0} buổi đã điểm danh${sessions?.cancelled ? `, ${sessions.cancelled} buổi huỷ` : ''}`,
    `• Học sinh vắng: ${att?.absent ?? 0} lượt, đi trễ: ${att?.late ?? 0} lượt`,
    `• Bài nộp trong ngày: ${subs?.submitted ?? 0}, đang chờ chấm: ${subs?.waiting ?? 0}`,
    `• Đơn xin nghỉ chờ duyệt: ${leaves?.pending ?? 0}`,
    `• Học phí thu trong ngày: ${formatVND(tuition?.collected ?? 0)}`,
    `• Học sinh còn nợ học phí: ${debt?.count ?? 0}`,
    '',
    'Đăng nhập trang quản trị để xem chi tiết.',
  ].join('\n');
}

// ---------- Xử lý tin nhắn đến (webhook) ----------

export type IncomingMessage = {
  chatId: number;
  text: string;
  fromName: string;
  fromId?: number; // id tài khoản Telegram người gửi
  replyToText?: string;
  contact?: { phone: string; userId?: number }; // danh bạ gửi bằng nút Chia sẻ số điện thoại
};

// Xử lý một tin đến và trả lời ngay qua bot. Mọi tin đến của chat đã kết nối đều được lưu.
export async function handleIncoming(message: IncomingMessage): Promise<void> {
  const command = parseCommand(message.text);
  const chat = await chatOf(message.chatId);

  if (command.kind === 'start' && command.code) {
    await linkByCode(message, command.code);
    return;
  }

  if (message.contact) {
    await linkByContact(message);
    return;
  }

  // Người lạ (chưa kết nối): chỉ hướng dẫn kết nối, không bao giờ gửi thông tin học sinh. Gõ số tay không kết nối.
  if (!chat || !chat.active) {
    await sendMessage(message.chatId, CONNECT_HINT, SHARE_PHONE_KEYBOARD);
    return;
  }

  // Nếu là giáo viên / nhân viên bấm Reply tin nhắn trên Telegram để trả lời phụ huynh (P34.12)
  if (message.replyToText && chat.accountId !== null) {
    const matchParent = /\[Tin từ PH #(\d+)/.exec(message.replyToText);
    if (matchParent) {
      const targetParentId = parseInt(matchParent[1], 10);
      const [p] = await db.select().from(parents).where(eq(parents.id, targetParentId)).limit(1);
      if (p) {
        await replyToParent(targetParentId, message.text, chat.accountId);
        await sendMessage(message.chatId, `✓ Đã gửi câu trả lời tới phụ huynh ${p.fullName}.`);
        return;
      }
    }
  }

  await record({
    chatId: chat.chatId,
    parentId: chat.parentId,
    accountId: chat.accountId,
    direction: 'in',
    kind: command.kind === 'text' ? 'text' : 'command',
    text: message.text,
  });

  if (command.kind === 'stop') {
    await db.update(telegramChats).set({ active: false, updatedAt: new Date() }).where(eq(telegramChats.id, chat.id));
    await sendAndRecord(chat, 'Đã ngừng nhận tin từ trung tâm. Muốn nhận lại, hãy mở link kết nối mới do trung tâm gửi.', 'system', null);
    return;
  }

  // Lệnh trợ giúp & Menu
  if (command.kind === 'help' || command.kind === 'start') {
    const isParent = chat.parentId !== null;
    if (isParent) {
      await sendAndRecord(chat, HELP_TEXT, 'system', null, PARENT_INLINE_MENU);
      await sendMessage(
        chat.chatId,
        '💡 Bàn phím tra cứu nhanh đã hiển thị ở phía dưới màn hình. Bạn chỉ cần bấm vào các nút để xem ngay thông tin mà không cần gõ lệnh.',
        PARENT_KEYBOARD,
      );
    } else {
      await sendAndRecord(chat, STAFF_HELP_TEXT, 'system', null, STAFF_KEYBOARD);
    }
    return;
  }

  // Xử lý chat của nhân viên / giáo viên
  if (chat.parentId === null && chat.accountId !== null) {
    if (command.kind === 'today') return void (await sendAndRecord(chat, await todayScheduleText(chat.accountId), 'command', null));
    if (command.kind === 'pending_grading') return void (await sendAndRecord(chat, await pendingGradingText(chat.accountId), 'command', null));
    if (command.kind === 'report') return void (await sendAndRecord(chat, await dailyReportText(chat.accountId), 'command', null));
    if (command.kind === 'leave_list') return void (await listPendingLeaves(chat));
    if (command.kind !== 'text') {
      await sendAndRecord(chat, STAFF_HELP_TEXT, 'system', null, STAFF_KEYBOARD);
    }
    return;
  }

  // Xử lý lệnh của phụ huynh (kèm menu nút bấm inline để chuyển nhanh tính năng)
  if (chat.parentId !== null) {
    if (command.kind === 'schedule') return void (await sendAndRecord(chat, await scheduleText(chat.parentId), 'command', null, QUICK_MENU_INLINE));
    if (command.kind === 'tuition') return void (await sendAndRecord(chat, await tuitionText(chat.parentId), 'command', null, QUICK_MENU_INLINE));
    if (command.kind === 'homework') return void (await sendAndRecord(chat, await homeworkText(chat.parentId), 'command', null, QUICK_MENU_INLINE));
    if (command.kind === 'scores') return void (await sendAndRecord(chat, await scoresText(chat.parentId), 'command', null, QUICK_MENU_INLINE));
    if (command.kind === 'attendance') return void (await sendAndRecord(chat, await attendanceText(chat.parentId), 'command', null, QUICK_MENU_INLINE));
    if (command.kind === 'leave') return void (await startLeave(chat));
    if (command.kind === 'settings') return void (await showSettings(chat));

    // Phụ huynh vừa chọn buổi xin nghỉ và gõ lý do (kịch bản 1.4 bước 4)
    if (command.kind === 'text' && (await takeTypedReason(chat, message.text))) return;

    // Nếu phụ huynh gửi tin nhắn thường (không phải lệnh):
    // 1. Chuyển tiếp tới giáo viên dạy con của phụ huynh này (P34.12)
    const [p] = await db.select({ name: parents.fullName }).from(parents).where(eq(parents.id, chat.parentId)).limit(1);
    const parentName = p?.name ?? 'Phụ huynh';
    await forwardParentMessageToTeachers(chat.parentId, parentName, message.text);

    // 2. Gửi bản sao cho Super Admin (P34.13)
    const kids = await childrenOf(chat.parentId);
    const kidsStr = kids.map((k) => k.full_name).join(', ') || 'học sinh';
    await sendCopyToSuperAdmins(`[Bản sao] Phụ huynh #${chat.parentId} ${parentName} (con: ${kidsStr}) nhắn:\n"${message.text}"`);

    // 3. Tin nhắn tự động phản hồi cho phụ huynh (tối đa 1 lần mỗi 6 giờ)
    const [recentAck] = await db
      .select({ id: telegramMessages.id })
      .from(telegramMessages)
      .where(and(eq(telegramMessages.chatId, chat.chatId), eq(telegramMessages.kind, 'ack'), gt(telegramMessages.createdAt, new Date(Date.now() - 6 * 3_600_000))))
      .limit(1);
    if (!recentAck) {
      await sendAndRecord(
        chat,
        'Dạ Trung tâm đã nhận được tin nhắn và Thầy/Cô sẽ phản hồi sớm ạ.\n\n👉 Quý phụ huynh có thể bấm nhanh vào các nút bên dưới để tra cứu ngay thông tin:',
        'ack',
        null,
        QUICK_MENU_INLINE,
      );
    }
  }
}

async function linkByCode(message: IncomingMessage, code: string): Promise<void> {
  const [link] = await db
    .select()
    .from(telegramLinkCodes)
    .where(and(eq(telegramLinkCodes.code, code), isNull(telegramLinkCodes.usedAt), gt(telegramLinkCodes.expiresAt, new Date())))
    .limit(1);
  if (!link) {
    await sendMessage(message.chatId, 'Link kết nối không đúng hoặc đã hết hạn. Hãy xin trung tâm link mới.');
    return;
  }
  const name = await targetName(link.parentId, link.accountId);
  await db.transaction(async (tx) => {
    await tx.update(telegramLinkCodes).set({ usedAt: new Date() }).where(eq(telegramLinkCodes.id, link.id));
    // Một chat chỉ gắn với một người: kết nối mới thay kết nối cũ của chat này
    await tx
      .insert(telegramChats)
      .values({ chatId: message.chatId, parentId: link.parentId, accountId: link.accountId, displayName: message.fromName.slice(0, 160), active: true })
      .onConflictDoUpdate({
        target: telegramChats.chatId,
        set: { parentId: link.parentId, accountId: link.accountId, displayName: message.fromName.slice(0, 160), active: true, updatedAt: new Date() },
      });
  });
  const chat = await chatOf(message.chatId);
  if (chat) {
    const isParent = chat.parentId !== null;
    if (isParent) {
      await sendAndRecord(
        chat,
        `🎉 Chúc mừng Quý phụ huynh${name ? ` (${name})` : ''} đã kết nối thành công với ESL Center!\n\n${HELP_TEXT}`,
        'system',
        null,
        PARENT_INLINE_MENU,
      );
      await sendMessage(
        chat.chatId,
        '💡 Bàn phím tra cứu nhanh đã sẵn sàng ở phía dưới màn hình của bạn. Quý phụ huynh chỉ cần chạm nhẹ vào nút để xem thông tin ngay lập tức.',
        PARENT_KEYBOARD,
      );
    } else {
      await sendAndRecord(chat, `Đã kết nối với ESL Center cho cán bộ/giáo viên: ${name}.\n\n${STAFF_HELP_TEXT}`, 'system', null, STAFF_KEYBOARD);
    }
  }
}

// Kết nối bằng danh bạ của chính người gửi (kịch bản 1.2). Telegram gửi kèm user_id của chủ số; số do người khác
// chuyển tiếp hoặc gõ tay không được nhận, để người lạ không dò được thông tin của trẻ bằng số điện thoại của phụ huynh.
async function linkByContact(message: IncomingMessage): Promise<void> {
  const contact = message.contact;
  if (!contact) return;
  if (!message.fromId || contact.userId !== message.fromId) {
    await sendMessage(message.chatId, 'Bot chỉ nhận số điện thoại của chính tài khoản Telegram này. Quý phụ huynh bấm nút 📱 Chia sẻ số điện thoại ở phía dưới.', SHARE_PHONE_KEYBOARD);
    return;
  }
  const phone = normalizePhone(contact.phone);
  const found = await db.execute<{ id: number; full_name: string }>(sql`
    SELECT id, full_name FROM parents
    WHERE regexp_replace(phone, '[^0-9]', '', 'g') = ${phone.replace(/\D/g, '')}
    LIMIT 2`);
  if (found.rows.length !== 1) {
    await sendMessage(
      message.chatId,
      found.rows.length === 0
        ? `⚠️ Trung tâm chưa có hồ sơ phụ huynh nào dùng số ${phone}.\n\nQuý phụ huynh liên hệ văn phòng trung tâm để cập nhật số, hoặc xin link kết nối riêng.`
        : `Số ${phone} đang dùng cho nhiều hồ sơ phụ huynh nên bot chưa tự kết nối được. Quý phụ huynh xin trung tâm link kết nối riêng.`,
      { remove_keyboard: true },
    );
    return;
  }
  const p = found.rows[0];
  await db
    .insert(telegramChats)
    .values({ chatId: message.chatId, parentId: p.id, accountId: null, displayName: message.fromName.slice(0, 160), active: true })
    .onConflictDoUpdate({
      target: telegramChats.chatId,
      set: { parentId: p.id, accountId: null, displayName: message.fromName.slice(0, 160), active: true, updatedAt: new Date() },
    });
  const chat = await chatOf(message.chatId);
  if (chat) {
    await sendAndRecord(chat, `🎉 Chúc mừng Phụ huynh ${p.full_name} đã kết nối thành công với ESL Center!\n\n${HELP_TEXT}`, 'system', null, PARENT_INLINE_MENU);
    await sendMessage(chat.chatId, '💡 Bàn phím tra cứu nhanh đã sẵn sàng ở phía dưới màn hình. Quý phụ huynh chạm vào nút để xem thông tin ngay.', PARENT_KEYBOARD);
  }
}

export type IncomingCallback = {
  id: string;
  chatId: number;
  data: string;
  fromName: string;
  messageId?: number; // tin chứa nút vừa bấm, để vẽ lại tin đó
};

// ---------- Cài đặt nhận tin /caidat (kịch bản 1.6) ----------

async function showSettings(chat: Chat): Promise<void> {
  await sendAndRecord(chat, settingsText(chat.mutedKinds), 'command', null, settingsKeyboard(chat.mutedKinds));
}

// Bật/tắt một loại tin rồi vẽ lại tin cài đặt (nếu Telegram cho sửa), không thì gửi tin mới
async function togglePref(chat: Chat, kind: string, messageId?: number): Promise<string> {
  if (!isNotifyKind(kind)) return 'Loại tin không hợp lệ.';
  const next = toggleMuted(chat.mutedKinds, kind);
  await db.update(telegramChats).set({ mutedKinds: next, updatedAt: new Date() }).where(eq(telegramChats.id, chat.id));
  const redrawn = messageId ? await editMessageText(chat.chatId, messageId, settingsText(next), settingsKeyboard(next)) : false;
  if (!redrawn) await sendAndRecord({ ...chat, mutedKinds: next }, settingsText(next), 'command', null, settingsKeyboard(next));
  return next.includes(kind) ? `Đã tắt: ${NOTIFY_LABELS[kind]}` : `Đã bật: ${NOTIFY_LABELS[kind]}`;
}

export async function handleCallbackQuery(cb: IncomingCallback): Promise<void> {
  const chat = await chatOf(cb.chatId);
  if (!chat || !chat.active) {
    await answerCallbackQuery(cb.id, 'Tài khoản chưa kết nối với hệ thống.');
    return;
  }

  try {
    if (cb.data.startsWith('consent:')) {
      await answerCallbackQuery(cb.id, await handleConsentCallback(chat, cb.data));
      return;
    }

    // Đơn xin nghỉ (kịch bản 1.4, 1.5). Mọi mã trong nút được kiểm lại trong leave.ts.
    const [prefix, ...args] = cb.data.split(':');
    if (prefix === 'leave_kid' && chat.parentId) {
      const note = await promptSessions(chat, Number(args[0]));
      await answerCallbackQuery(cb.id, note);
      return;
    }
    if (prefix === 'leave_sess' && chat.parentId) {
      await answerCallbackQuery(cb.id, await chooseSession(chat, Number(args[0]), Number(args[1])));
      return;
    }
    if (prefix === 'lv_r' && chat.parentId) {
      await answerCallbackQuery(cb.id, await chooseReason(chat, Number(args[0]), args[1] ?? ''));
      return;
    }
    if (prefix === 'lv_x' && chat.parentId) {
      await answerCallbackQuery(cb.id, await cancelLeave(chat, Number(args[0])));
      return;
    }
    if (prefix === 'leave_appr' || prefix === 'leave_deny') {
      const requestId = await resolveLeaveRef(chat.accountId, args);
      await answerCallbackQuery(cb.id, await decideLeave(chat, requestId, prefix === 'leave_appr'));
      return;
    }
    if (prefix === 'pref' && chat.parentId) {
      await answerCallbackQuery(cb.id, await togglePref(chat, args[0] ?? '', cb.messageId));
      return;
    }
    if (cb.data === 'cmd:settings' && chat.parentId) {
      await showSettings(chat);
      await answerCallbackQuery(cb.id);
      return;
    }

    // Các nút tra cứu 1 chạm dành cho phụ huynh (Inline Keyboard)
    if (cb.data === 'cmd:schedule' && chat.parentId) {
      const text = await scheduleText(chat.parentId);
      await sendAndRecord(chat, text, 'command', null, QUICK_MENU_INLINE);
      await answerCallbackQuery(cb.id, '📅 Đã tải lịch học');
      return;
    }

    if (cb.data === 'cmd:scores' && chat.parentId) {
      const text = await scoresText(chat.parentId);
      await sendAndRecord(chat, text, 'command', null, QUICK_MENU_INLINE);
      await answerCallbackQuery(cb.id, '📊 Đã tải bảng điểm');
      return;
    }

    if (cb.data === 'cmd:attendance' && chat.parentId) {
      const text = await attendanceText(chat.parentId);
      await sendAndRecord(chat, text, 'command', null, QUICK_MENU_INLINE);
      await answerCallbackQuery(cb.id, '📝 Đã tải chuyên cần');
      return;
    }

    if (cb.data === 'cmd:tuition' && chat.parentId) {
      const text = await tuitionText(chat.parentId);
      await sendAndRecord(chat, text, 'command', null, QUICK_MENU_INLINE);
      await answerCallbackQuery(cb.id, '💳 Đã tải học phí');
      return;
    }

    if (cb.data === 'cmd:homework' && chat.parentId) {
      const text = await homeworkText(chat.parentId);
      await sendAndRecord(chat, text, 'command', null, QUICK_MENU_INLINE);
      await answerCallbackQuery(cb.id, '📚 Đã tải bài tập');
      return;
    }

    if (cb.data === 'cmd:leave' && chat.parentId) {
      await startLeave(chat);
      await answerCallbackQuery(cb.id);
      return;
    }

    if (cb.data === 'cmd:help') {
      if (chat.parentId) {
        await sendAndRecord(chat, HELP_TEXT, 'system', null, PARENT_INLINE_MENU);
      } else {
        await sendAndRecord(chat, STAFF_HELP_TEXT, 'system', null, STAFF_KEYBOARD);
      }
      await answerCallbackQuery(cb.id, '❓ Hướng dẫn sử dụng');
      return;
    }

    await answerCallbackQuery(cb.id);
  } catch (error) {
    console.error('Lỗi xử lý callback query:', error);
    await answerCallbackQuery(cb.id, 'Đã xảy ra lỗi khi xử lý.');
  }
}

// ---------- Thông báo chung (P34.18). Việc tự động theo giờ ở cron.ts ----------

export type BroadcastParams = {
  scope: 'all' | 'campus' | 'class';
  scopeId?: number;
  text: string;
  sentByAccountId: number;
};

export async function broadcastTelegramMessage(params: BroadcastParams): Promise<{ total: number; delivered: number }> {
  let targetChats: { chat_id: number; parent_id: number }[] = [];

  if (params.scope === 'class' && params.scopeId) {
    const rows = await db.execute<{ chat_id: number; parent_id: number }>(sql`
      SELECT DISTINCT tc.chat_id, tc.parent_id
      FROM telegram_chats tc
      JOIN student_parents sp ON sp.parent_id = tc.parent_id
      JOIN students s ON s.id = sp.student_id
      WHERE s.class_id = ${params.scopeId} AND tc.active = true`);
    targetChats = rows.rows;
  } else if (params.scope === 'campus' && params.scopeId) {
    const rows = await db.execute<{ chat_id: number; parent_id: number }>(sql`
      SELECT DISTINCT tc.chat_id, tc.parent_id
      FROM telegram_chats tc
      JOIN student_parents sp ON sp.parent_id = tc.parent_id
      JOIN students s ON s.id = sp.student_id
      JOIN classes c ON c.id = s.class_id
      WHERE c.campus_id = ${params.scopeId} AND tc.active = true`);
    targetChats = rows.rows;
  } else {
    // Toàn bộ phụ huynh đã kết nối
    const rows = await db.execute<{ chat_id: number; parent_id: number }>(sql`
      SELECT DISTINCT tc.chat_id, tc.parent_id
      FROM telegram_chats tc
      WHERE tc.parent_id IS NOT NULL AND tc.active = true`);
    targetChats = rows.rows;
  }

  const [sender] = await db.select({ name: accounts.fullName }).from(accounts).where(eq(accounts.id, params.sentByAccountId)).limit(1);
  const sig = `\n\n— ${sender?.name ?? 'Ban Quản trị'}, ESL Center`;
  const fullText = `${params.text}${sig}`;

  let deliveredCount = 0;
  for (const chat of targetChats) {
    const ok = await sendMessage(chat.chat_id, fullText);
    await record({
      chatId: chat.chat_id,
      parentId: chat.parent_id,
      accountId: null,
      direction: 'out',
      kind: 'broadcast',
      text: fullText,
      sentByAccountId: params.sentByAccountId,
      delivered: ok,
      read: true,
    });
    if (ok) deliveredCount++;
  }

  // Gửi bản sao tới Super Admin
  await sendCopyToSuperAdmins(
    `[Bản sao Thông báo chung - gửi ${deliveredCount}/${targetChats.length} PH]:\n"${params.text}"`,
    params.sentByAccountId,
  );

  return { total: targetChats.length, delivered: deliveredCount };
}

async function targetName(parentId: number | null, accountId: number | null): Promise<string> {
  if (parentId !== null) {
    const [p] = await db.select({ name: parents.fullName }).from(parents).where(eq(parents.id, parentId)).limit(1);
    return p?.name ?? '';
  }
  if (accountId !== null) {
    const [a] = await db.select({ name: accounts.fullName }).from(accounts).where(eq(accounts.id, accountId)).limit(1);
    return a?.name ?? '';
  }
  return '';
}

// ---------- Hộp tin cho màn Tin nhắn ----------

export type Conversation = { parentId: number; parentName: string; phone: string; lastText: string; lastAt: string; lastDirection: 'in' | 'out'; unread: number; linked: boolean };

export async function listConversations(visibleParentIds: Set<number> | null): Promise<Conversation[]> {
  const result = await db.execute<{ parent_id: number; full_name: string; phone: string; text: string; created_at: Date; direction: 'in' | 'out'; unread: number; linked: boolean }>(sql`
    SELECT DISTINCT ON (m.parent_id) m.parent_id, p.full_name, p.phone, m.text, m.created_at, m.direction,
      (SELECT COUNT(*)::int FROM telegram_messages u WHERE u.parent_id = m.parent_id AND u.direction = 'in' AND u.read_at IS NULL) AS unread,
      EXISTS (SELECT 1 FROM telegram_chats c WHERE c.parent_id = m.parent_id AND c.active) AS linked
    FROM telegram_messages m JOIN parents p ON p.id = m.parent_id
    WHERE m.parent_id IS NOT NULL
    ORDER BY m.parent_id, m.created_at DESC`);
  return result.rows
    .filter((r) => visibleParentIds === null || visibleParentIds.has(r.parent_id))
    .map((r) => ({
      parentId: r.parent_id,
      parentName: r.full_name,
      phone: r.phone,
      lastText: r.text,
      lastAt: new Date(r.created_at).toISOString(),
      lastDirection: r.direction,
      unread: r.unread,
      linked: r.linked,
    }))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export type ThreadMessage = { id: number; direction: 'in' | 'out'; text: string; createdAt: string; delivered: boolean; senderName: string | null };

export async function listThread(parentId: number, limit = 200): Promise<ThreadMessage[]> {
  const rows = await db
    .select({
      id: telegramMessages.id,
      direction: telegramMessages.direction,
      text: telegramMessages.text,
      createdAt: telegramMessages.createdAt,
      delivered: telegramMessages.delivered,
      senderName: accounts.fullName,
    })
    .from(telegramMessages)
    .leftJoin(accounts, eq(accounts.id, telegramMessages.sentByAccountId))
    .where(eq(telegramMessages.parentId, parentId))
    .orderBy(desc(telegramMessages.createdAt))
    .limit(limit);
  return rows.reverse().map((r) => ({ id: r.id, direction: r.direction, text: r.text, createdAt: r.createdAt.toISOString(), delivered: r.delivered, senderName: r.senderName }));
}

export async function markThreadRead(parentId: number): Promise<void> {
  await db
    .update(telegramMessages)
    .set({ readAt: new Date() })
    .where(and(eq(telegramMessages.parentId, parentId), eq(telegramMessages.direction, 'in'), isNull(telegramMessages.readAt)));
}

export async function countUnread(visibleParentIds: Set<number> | null): Promise<number> {
  const rows = await db
    .select({ parentId: telegramMessages.parentId })
    .from(telegramMessages)
    .where(and(eq(telegramMessages.direction, 'in'), isNull(telegramMessages.readAt)));
  return rows.filter((r) => r.parentId !== null && (visibleParentIds === null || visibleParentIds.has(r.parentId))).length;
}

// Báo cho giáo viên chủ nhiệm, trợ giảng, giáo viên nước ngoài của lớp (tài khoản đã kết nối Telegram).
// Lỗi gửi không làm hỏng việc chính (ví dụ học sinh nộp bài), nên nuốt lỗi và ghi log.
export async function notifyClassStaff(classId: number, text: string, kind: string): Promise<void> {
  try {
    const result = await db.execute<{ id: number }>(sql`
      SELECT a.id FROM accounts a JOIN classes c ON a.teacher_id IN (c.teacher_id, c.assistant_id, c.foreign_teacher_id)
      WHERE c.id = ${classId} AND a.status = 'active'`);
    await notifyAccounts(result.rows.map((r) => Number(r.id)), text, kind);
  } catch (error) {
    console.error('Lỗi gửi thông báo Telegram cho giáo viên:', error);
  }
}
