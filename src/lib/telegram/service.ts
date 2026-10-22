// Nghiệp vụ của bot Telegram (P34): kết nối chat, lưu và gửi tin, trả lời lệnh của phụ huynh,
// trao đổi 2 chiều giữa giáo viên và phụ huynh, bản sao cho super admin. Chỉ chạy trên server.
import { and, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { accounts, parents, studentParents, students, teachers, telegramChats, telegramLinkCodes, telegramMessages } from '@/db/schema';
import { CONSENT_LABELS, CONSENT_TERMS, type ConsentPurpose } from '@/lib/consent';
import { isParentOf, recordConsent } from '@/lib/queries/consents';
import { vnDateTimeLabel } from '@/lib/datetime';
import { formatVND } from '@/lib/money';
import { answerCallbackQuery, sendMessage } from './api';
import {
  HELP_TEXT,
  LINK_CODE_DAYS,
  newLinkCode,
  PARENT_INLINE_MENU,
  PARENT_KEYBOARD,
  parseCommand,
  QUICK_MENU_INLINE,
  STAFF_HELP_TEXT,
  STAFF_KEYBOARD,
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

type Chat = typeof telegramChats.$inferSelect;

async function chatOf(chatId: number): Promise<Chat | null> {
  const [row] = await db.select().from(telegramChats).where(eq(telegramChats.chatId, chatId)).limit(1);
  return row ?? null;
}

async function record(entry: {
  chatId: number;
  parentId: number | null;
  accountId: number | null;
  direction: 'in' | 'out';
  kind: string;
  text: string;
  sentByAccountId?: number | null;
  delivered?: boolean;
  read?: boolean;
}) {
  await db.insert(telegramMessages).values({
    chatId: entry.chatId,
    parentId: entry.parentId,
    accountId: entry.accountId,
    direction: entry.direction,
    kind: entry.kind,
    text: entry.text.slice(0, 4000),
    sentByAccountId: entry.sentByAccountId ?? null,
    delivered: entry.delivered ?? true,
    readAt: entry.read ? new Date() : null,
  });
}

// Gửi một tin tới một chat đã kết nối và lưu lại. Trả về true nếu Telegram nhận.
async function sendAndRecord(
  chat: Chat,
  text: string,
  kind: string,
  sentByAccountId: number | null,
  replyMarkup?: Record<string, unknown>,
): Promise<boolean> {
  const delivered = await sendMessage(chat.chatId, text, replyMarkup);
  await record({
    chatId: chat.chatId,
    parentId: chat.parentId,
    accountId: chat.accountId,
    direction: 'out',
    kind,
    text,
    sentByAccountId,
    delivered,
    read: true,
  });
  return delivered;
}

export type SendSummary = { chats: number; delivered: number };

// Gửi bản sao tới các tài khoản Quản trị viên (Super Admin) đã kết nối Telegram (P34.13)
export async function sendCopyToSuperAdmins(text: string, excludeAccountId?: number | null): Promise<void> {
  const adminChats = await db
    .select({
      chatId: telegramChats.chatId,
      accountId: telegramChats.accountId,
    })
    .from(telegramChats)
    .innerJoin(accounts, eq(accounts.id, telegramChats.accountId))
    .where(and(eq(accounts.role, 'admin'), eq(telegramChats.active, true)));

  for (const c of adminChats) {
    if (excludeAccountId && c.accountId === excludeAccountId) continue;
    await sendMessage(c.chatId, text);
  }
}

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
    SELECT s.id, s.full_name, c.id AS class_id, c.name AS class_name, c.fee,
      COALESCE((SELECT SUM(p.amount) FROM tuition_payments p WHERE p.student_id = s.id), 0)::int AS paid
    FROM student_parents sp JOIN students s ON s.id = sp.student_id JOIN classes c ON c.id = s.class_id
    WHERE sp.parent_id = ${parentId} AND s.status IN ('active', 'trial', 'paused')
    ORDER BY s.full_name`);
  return result.rows;
}

async function scheduleText(parentId: number): Promise<string> {
  const kids = await childrenOf(parentId);
  if (kids.length === 0) return 'Chưa có học sinh nào gắn với phụ huynh này.';
  const lines: string[] = [];
  for (const kid of kids) {
    const sessions = await db.execute<{ starts_at: Date; room: string }>(sql`
      SELECT starts_at, room FROM class_sessions
      WHERE class_id = ${kid.class_id} AND status = 'planned' AND starts_at >= now() AND starts_at < now() + interval '7 days'
      ORDER BY starts_at LIMIT 7`);
    lines.push(`${kid.full_name} (lớp ${kid.class_name}):`);
    if (sessions.rows.length === 0) lines.push('  Không có buổi học trong 7 ngày tới.');
    for (const s of sessions.rows) lines.push(`  • ${vnDateTimeLabel(new Date(s.starts_at))}${s.room ? ` · phòng ${s.room}` : ''}`);
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

// Báo cáo nhanh trong ngày cho Quản trị viên (P34.20)
async function dailyReportText(accountId: number): Promise<string> {
  const [acc] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!acc || acc.role !== 'admin') return 'Chỉ Quản trị viên (Admin) mới có quyền xem báo cáo nhanh.';
  const [sessions] = (await db.execute<{ total: number; done: number }>(sql`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'done')::int AS done
    FROM class_sessions
    WHERE starts_at >= CURRENT_DATE AND starts_at < CURRENT_DATE + interval '1 day'`)).rows;
  const [att] = (await db.execute<{ absent: number }>(sql`
    SELECT COUNT(*) FILTER (WHERE mark = 'absent')::int AS absent
    FROM attendance
    WHERE session_date = CURRENT_DATE`)).rows;
  const [tuition] = (await db.execute<{ collected: number }>(sql`
    SELECT COALESCE(SUM(amount), 0)::int AS collected
    FROM tuition_payments
    WHERE paid_at >= CURRENT_DATE AND paid_at < CURRENT_DATE + interval '1 day'`)).rows;
  const [debt] = (await db.execute<{ count: number }>(sql`
    SELECT COUNT(DISTINCT s.id)::int AS count
    FROM students s
    JOIN classes c ON c.id = s.class_id
    WHERE s.status = 'active'
      AND (c.fee - COALESCE((SELECT SUM(amount) FROM tuition_payments WHERE student_id = s.id), 0)) > 0`)).rows;

  return [
    '📊 Báo cáo nhanh trong ngày (ESL Center):',
    `• Buổi học hôm nay: ${sessions?.done ?? 0}/${sessions?.total ?? 0} buổi đã hoàn thành`,
    `• Số lượt học sinh vắng hôm nay: ${att?.absent ?? 0} lượt`,
    `• Học phí thu trong ngày: ${formatVND(tuition?.collected ?? 0)}`,
    `• Số học sinh đang còn công nợ: ${debt?.count ?? 0} học sinh`,
    '',
    'Đăng nhập trang quản trị để xem chi tiết.',
  ].join('\n');
}

// ---------- Xử lý tin nhắn đến (webhook) ----------

export type IncomingMessage = {
  chatId: number;
  text: string;
  fromName: string;
  replyToText?: string;
};

// Xử lý một tin đến và trả lời ngay qua bot. Mọi tin đến của chat đã kết nối đều được lưu.
export async function handleIncoming(message: IncomingMessage): Promise<void> {
  const command = parseCommand(message.text);
  const chat = await chatOf(message.chatId);

  if (command.kind === 'start' && command.code) {
    await linkByCode(message, command.code);
    return;
  }

  if (!chat || !chat.active) {
    // Tự động kết nối nếu tin nhắn chứa số điện thoại (ví dụ: 0963882797 hoặc +84963882797)
    const rawNoSpace = message.text.replace(/[\s.-]/g, '');
    const phoneMatch = /(?:(?:\+84|0)(?:3|5|7|8|9)\d{8})/.exec(rawNoSpace);
    if (phoneMatch) {
      const rawPhone = phoneMatch[0];
      const normalizedPhone = rawPhone.startsWith('+84') ? '0' + rawPhone.slice(3) : rawPhone;
      const linked = await linkByPhone(message, normalizedPhone);
      if (linked) return;
    }

    await sendMessage(
      message.chatId,
      '👋 Xin chào Quý phụ huynh!\n\nĐể kết nối nhận thông báo từ trung tâm ESL Center:\n\n📱 Quý phụ huynh hãy gửi SỐ ĐIỆN THOẠI đã đăng ký với trung tâm (Ví dụ: 0963882797).\n\n🔗 Hoặc bấm vào đường link kết nối cá nhân do trung tâm gửi.',
    );
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
    if (command.kind === 'leave') return void (await handleLeaveCommand(chat));

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

async function linkByPhone(message: IncomingMessage, phone: string): Promise<boolean> {
  const parentsList = await db.execute<{ id: number; full_name: string }>(sql`
    SELECT id, full_name
    FROM parents
    WHERE replace(replace(phone, ' ', ''), '-', '') = ${phone}
    LIMIT 1`);

  if (parentsList.rows.length === 0) {
    await sendMessage(
      message.chatId,
      `⚠️ Trung tâm chưa tìm thấy hồ sơ phụ huynh nào có số điện thoại "${phone}".\n\nQuý phụ huynh vui lòng kiểm tra lại số điện thoại hoặc liên hệ văn phòng trung tâm để được hỗ trợ.`,
    );
    return false;
  }

  const p = parentsList.rows[0];
  await db.transaction(async (tx) => {
    await tx
      .insert(telegramChats)
      .values({
        chatId: message.chatId,
        parentId: p.id,
        accountId: null,
        displayName: message.fromName.slice(0, 160),
        active: true,
      })
      .onConflictDoUpdate({
        target: telegramChats.chatId,
        set: {
          parentId: p.id,
          accountId: null,
          displayName: message.fromName.slice(0, 160),
          active: true,
          updatedAt: new Date(),
        },
      });
  });

  const chat = await chatOf(message.chatId);
  if (chat) {
    await sendAndRecord(
      chat,
      `🎉 Chúc mừng Phụ huynh ${p.full_name} đã kết nối thành công với ESL Center qua SĐT ${phone}!\n\n${HELP_TEXT}`,
      'system',
      null,
      PARENT_INLINE_MENU,
    );
    await sendMessage(
      chat.chatId,
      '💡 Bàn phím tra cứu nhanh đã sẵn sàng ở phía dưới màn hình của bạn. Quý phụ huynh chỉ cần chạm nhẹ vào nút để xem thông tin ngay lập tức.',
      PARENT_KEYBOARD,
    );
  }
  return true;
}

// ---------- Đơn xin nghỉ học & Menu chọn con (P34.14, 34.16) ----------

async function handleLeaveCommand(chat: Chat): Promise<void> {
  if (!chat.parentId) return;
  const kids = await childrenOf(chat.parentId);
  if (kids.length === 0) {
    await sendAndRecord(chat, 'Chưa có học sinh nào gắn với tài khoản phụ huynh này.', 'command', null);
    return;
  }
  if (kids.length === 1) {
    await promptSelectSession(chat, kids[0].id, kids[0].full_name);
    return;
  }
  // Nếu có nhiều hơn 1 con: cho chọn con
  const inlineButtons = kids.map((k) => [
    { text: `Em ${k.full_name} (${k.class_name})`, callback_data: `leave_kid:${k.id}` },
  ]);
  await sendMessage(chat.chatId, 'Bạn muốn gửi đơn xin nghỉ học cho con nào?', {
    inline_keyboard: inlineButtons,
  });
}

async function promptSelectSession(chat: Chat, studentId: number, kidName?: string): Promise<void> {
  const [s] = await db.select({ name: students.fullName }).from(students).where(eq(students.id, studentId)).limit(1);
  const studentName = kidName || s?.name || 'con';

  const sessions = await db.execute<{ id: number; starts_at: Date; room: string; class_name: string }>(sql`
    SELECT cs.id, cs.starts_at, cs.room, c.name AS class_name
    FROM class_sessions cs
    JOIN classes c ON c.id = cs.class_id
    JOIN students s ON s.class_id = c.id
    WHERE s.id = ${studentId}
      AND cs.status = 'planned'
      AND cs.starts_at >= CURRENT_DATE
    ORDER BY cs.starts_at
    LIMIT 5`);

  if (sessions.rows.length === 0) {
    await sendMessage(chat.chatId, `Hiện không có buổi học nào sắp tới trong lịch của em ${studentName}.`);
    return;
  }

  const buttons = sessions.rows.map((row) => [
    {
      text: `${vnDateTimeLabel(new Date(row.starts_at))}${row.room ? ` · P.${row.room}` : ''}`,
      callback_data: `leave_sess:${studentId}:${row.id}`,
    },
  ]);

  await sendMessage(chat.chatId, `Chọn buổi học muốn xin phép nghỉ cho em ${studentName}:`, {
    inline_keyboard: buttons,
  });
}

async function submitLeaveRequest(chat: Chat, studentId: number, sessionId: number): Promise<void> {
  if (!chat.parentId) return;
  const [info] = (await db.execute<{
    starts_at: Date;
    room: string;
    class_id: number;
    class_name: string;
    student_name: string;
    parent_name: string;
  }>(sql`
    SELECT cs.starts_at, cs.room, c.id AS class_id, c.name AS class_name, s.full_name AS student_name, p.full_name AS parent_name
    FROM class_sessions cs
    JOIN classes c ON c.id = cs.class_id
    JOIN students s ON s.id = ${studentId}
    JOIN parents p ON p.id = ${chat.parentId}
    WHERE cs.id = ${sessionId}
    LIMIT 1`)).rows;

  if (!info) return;

  const sessionTime = vnDateTimeLabel(new Date(info.starts_at));
  await sendMessage(chat.chatId, `✓ Đã gửi đơn xin nghỉ buổi ${sessionTime} cho em ${info.student_name}. Giáo viên phụ trách lớp ${info.class_name} sẽ xem xét và phản hồi sớm.`);

  // Gửi thông báo cho các giáo viên phụ trách lớp
  const teacherRows = await db.execute<{ account_id: number; chat_id: number }>(sql`
    SELECT DISTINCT a.id AS account_id, tc.chat_id
    FROM accounts a
    JOIN classes c ON (a.teacher_id = c.teacher_id OR a.teacher_id = c.assistant_id OR a.teacher_id = c.foreign_teacher_id)
    JOIN telegram_chats tc ON tc.account_id = a.id
    WHERE c.id = ${info.class_id} AND tc.active = true`);

  const promptText = `📢 ĐƠN XIN NGHỈ HỌC:\nPhụ huynh ${info.parent_name} xin nghỉ cho em ${info.student_name} (lớp ${info.class_name}) vào buổi ${sessionTime}.\n\nThầy/Cô vui lòng duyệt đơn:`;
  const teacherKeyboard = {
    inline_keyboard: [
      [
        { text: '✓ Đồng ý duyệt', callback_data: `leave_appr:${studentId}:${sessionId}` },
        { text: '✕ Từ chối', callback_data: `leave_deny:${studentId}:${sessionId}` },
      ],
    ],
  };

  for (const t of teacherRows.rows) {
    await sendMessage(t.chat_id, promptText, teacherKeyboard);
  }

  // Gửi bản sao tới Super Admin
  await sendCopyToSuperAdmins(`[Bản sao] Phụ huynh ${info.parent_name} gửi đơn xin nghỉ cho em ${info.student_name} (lớp ${info.class_name}) buổi ${sessionTime}.`);
}

async function approveLeaveRequest(chat: Chat, studentId: number, sessionId: number): Promise<void> {
  if (!chat.accountId) return;
  const [row] = (await db.execute<{
    class_id: number;
    starts_at: Date;
    student_name: string;
    class_name: string;
    parent_id: number | null;
  }>(sql`
    SELECT cs.class_id, cs.starts_at, s.full_name AS student_name, c.name AS class_name, sp.parent_id
    FROM class_sessions cs
    JOIN classes c ON c.id = cs.class_id
    JOIN students s ON s.id = ${studentId}
    LEFT JOIN student_parents sp ON sp.student_id = s.id
    WHERE cs.id = ${sessionId}
    LIMIT 1`)).rows;

  if (!row) return;

  const sessionDateStr = new Date(row.starts_at).toISOString().slice(0, 10);
  const timeLabel = vnDateTimeLabel(new Date(row.starts_at));

  // Ghi nhận vắng có phép vào bảng attendance
  await db.execute(sql`
    INSERT INTO attendance (student_id, class_id, session_date, mark, created_at, updated_at)
    VALUES (${studentId}, ${row.class_id}, ${sessionDateStr}::date, 'absent', NOW(), NOW())
    ON CONFLICT (student_id, session_date) DO UPDATE
    SET mark = 'absent', updated_at = NOW()`);

  // Báo giáo viên đã duyệt
  await sendMessage(chat.chatId, `✓ Đã phê duyệt đơn xin nghỉ buổi ${timeLabel} cho em ${row.student_name}. Đã đánh dấu vắng trong sổ điểm danh.`);

  // Báo phụ huynh
  if (row.parent_id) {
    const parentChats = await db.select().from(telegramChats).where(and(eq(telegramChats.parentId, row.parent_id), eq(telegramChats.active, true)));
    const sig = await getStaffSignature(chat.accountId, row.parent_id);
    for (const pc of parentChats) {
      await sendAndRecord(pc, `✓ Đơn xin nghỉ buổi ${timeLabel} cho em ${row.student_name} đã được giáo viên phê duyệt.${sig}`, 'system', chat.accountId);
    }
  }

  // Báo Super Admin
  const [t] = await db.select({ name: accounts.fullName }).from(accounts).where(eq(accounts.id, chat.accountId)).limit(1);
  await sendCopyToSuperAdmins(`[Bản sao] Thầy/Cô ${t?.name ?? 'Giáo viên'} đã DUYỆT đơn xin nghỉ buổi ${timeLabel} cho em ${row.student_name}.`);
}

async function denyLeaveRequest(chat: Chat, studentId: number, sessionId: number): Promise<void> {
  if (!chat.accountId) return;
  const [row] = (await db.execute<{
    starts_at: Date;
    student_name: string;
    parent_id: number | null;
  }>(sql`
    SELECT cs.starts_at, s.full_name AS student_name, sp.parent_id
    FROM class_sessions cs
    JOIN students s ON s.id = ${studentId}
    LEFT JOIN student_parents sp ON sp.student_id = s.id
    WHERE cs.id = ${sessionId}
    LIMIT 1`)).rows;

  if (!row) return;
  const timeLabel = vnDateTimeLabel(new Date(row.starts_at));
  await sendMessage(chat.chatId, `Đã từ chối đơn xin nghỉ buổi ${timeLabel} của em ${row.student_name}.`);

  if (row.parent_id) {
    const parentChats = await db.select().from(telegramChats).where(and(eq(telegramChats.parentId, row.parent_id), eq(telegramChats.active, true)));
    const sig = await getStaffSignature(chat.accountId, row.parent_id);
    for (const pc of parentChats) {
      await sendAndRecord(pc, `Thông báo: Đơn xin nghỉ buổi ${timeLabel} cho em ${row.student_name} chưa được phê duyệt. Thầy/Cô sẽ liên hệ trực tiếp với phụ huynh.${sig}`, 'system', chat.accountId);
    }
  }

  const [t] = await db.select({ name: accounts.fullName }).from(accounts).where(eq(accounts.id, chat.accountId)).limit(1);
  await sendCopyToSuperAdmins(`[Bản sao] Thầy/Cô ${t?.name ?? 'Giáo viên'} đã TỪ CHỐI đơn xin nghỉ buổi ${timeLabel} của em ${row.student_name}.`);
}

export type IncomingCallback = {
  id: string;
  chatId: number;
  data: string;
  fromName: string;
};

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

    if (cb.data.startsWith('leave_kid:')) {
      const studentId = parseInt(cb.data.replace('leave_kid:', ''), 10);
      await promptSelectSession(chat, studentId);
      await answerCallbackQuery(cb.id);
      return;
    }

    if (cb.data.startsWith('leave_sess:')) {
      const parts = cb.data.split(':');
      const studentId = parseInt(parts[1], 10);
      const sessionId = parseInt(parts[2], 10);
      await submitLeaveRequest(chat, studentId, sessionId);
      await answerCallbackQuery(cb.id, 'Đã gửi đơn xin nghỉ');
      return;
    }

    if (cb.data.startsWith('leave_appr:')) {
      const parts = cb.data.split(':');
      const studentId = parseInt(parts[1], 10);
      const sessionId = parseInt(parts[2], 10);
      await approveLeaveRequest(chat, studentId, sessionId);
      await answerCallbackQuery(cb.id, 'Đã phê duyệt đơn');
      return;
    }

    if (cb.data.startsWith('leave_deny:')) {
      const parts = cb.data.split(':');
      const studentId = parseInt(parts[1], 10);
      const sessionId = parseInt(parts[2], 10);
      await denyLeaveRequest(chat, studentId, sessionId);
      await answerCallbackQuery(cb.id, 'Đã từ chối đơn');
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
      await handleLeaveCommand(chat);
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

// ---------- Tự động chạy định kỳ Cron & Thông báo chung (P34.17, 34.18, 34.21) ----------

export type CronTaskResult = {
  scheduleReminders: number;
  homeworkReminders: number;
  reportSent: boolean;
};

export async function runTelegramCronTasks(options?: { sendDailyReport?: boolean }): Promise<CronTaskResult> {
  let scheduleReminders = 0;
  let homeworkReminders = 0;
  let reportSent = false;

  try {
    // 1. Nhắc lịch học hôm nay (P34.17)
    const todaySessions = await db.execute<{
      session_id: number;
      starts_at: Date;
      room: string;
      class_name: string;
      student_name: string;
      chat_id: number;
      parent_id: number;
    }>(sql`
      SELECT cs.id AS session_id, cs.starts_at, cs.room, c.name AS class_name,
             s.full_name AS student_name, tc.chat_id, tc.parent_id
      FROM class_sessions cs
      JOIN classes c ON c.id = cs.class_id
      JOIN students s ON s.class_id = c.id
      JOIN student_parents sp ON sp.student_id = s.id
      JOIN telegram_chats tc ON tc.parent_id = sp.parent_id
      WHERE cs.starts_at >= CURRENT_DATE AND cs.starts_at < CURRENT_DATE + interval '1 day'
        AND cs.status = 'planned'
        AND tc.active = true
        AND s.status IN ('active', 'trial')`);

    for (const row of todaySessions.rows) {
      const sessionTag = `[Lịch #${row.session_id}]`;
      const [alreadySent] = await db
        .select({ id: telegramMessages.id })
        .from(telegramMessages)
        .where(
          and(
            eq(telegramMessages.chatId, row.chat_id),
            eq(telegramMessages.kind, 'remind_schedule'),
            gt(telegramMessages.createdAt, new Date(Date.now() - 20 * 3600 * 1000)),
          ),
        )
        .limit(1);

      if (!alreadySent) {
        const timeStr = vnDateTimeLabel(new Date(row.starts_at));
        const roomStr = row.room ? ` · Phòng ${row.room}` : '';
        const msg = `⏰ Nhắc lịch học hôm nay:\nEm ${row.student_name} có buổi học lớp ${row.class_name} lúc ${timeStr}${roomStr}.\nChúc em có buổi học thật tốt! ${sessionTag}`;
        const delivered = await sendMessage(row.chat_id, msg);
        await record({
          chatId: row.chat_id,
          parentId: row.parent_id,
          accountId: null,
          direction: 'out',
          kind: 'remind_schedule',
          text: msg,
          delivered,
          read: true,
        });
        if (delivered) scheduleReminders++;
      }
    }

    // 2. Nhắc nộp bài tập sắp đến hạn trong vòng 24 giờ tới (P34.17)
    const pendingHomework = await db.execute<{
      assignment_id: number;
      title: string;
      due_at: Date;
      class_name: string;
      student_name: string;
      chat_id: number;
      parent_id: number;
    }>(sql`
      SELECT a.id AS assignment_id, a.title, a.due_at, c.name AS class_name,
             s.full_name AS student_name, tc.chat_id, tc.parent_id
      FROM assignments a
      JOIN classes c ON c.id = a.class_id
      JOIN students s ON s.class_id = c.id
      JOIN student_parents sp ON sp.student_id = s.id
      JOIN telegram_chats tc ON tc.parent_id = sp.parent_id
      LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = s.id
      WHERE a.due_at >= NOW() AND a.due_at < NOW() + interval '24 hours'
        AND COALESCE(sub.status, 'not_submitted') = 'not_submitted'
        AND tc.active = true
        AND s.status IN ('active', 'trial')`);

    for (const row of pendingHomework.rows) {
      const hwTag = `[BT #${row.assignment_id}]`;
      const [alreadySent] = await db
        .select({ id: telegramMessages.id })
        .from(telegramMessages)
        .where(
          and(
            eq(telegramMessages.chatId, row.chat_id),
            eq(telegramMessages.kind, 'remind_homework'),
            gt(telegramMessages.createdAt, new Date(Date.now() - 20 * 3600 * 1000)),
          ),
        )
        .limit(1);

      if (!alreadySent) {
        const dueStr = vnDateTimeLabel(new Date(row.due_at));
        const msg = `📝 Nhắc nộp bài tập:\nEm ${row.student_name} (lớp ${row.class_name}) có bài tập "${row.title}" hạn nộp: ${dueStr}.\nPhụ huynh hãy nhắc con hoàn thành nhé! ${hwTag}`;
        const delivered = await sendMessage(row.chat_id, msg);
        await record({
          chatId: row.chat_id,
          parentId: row.parent_id,
          accountId: null,
          direction: 'out',
          kind: 'remind_homework',
          text: msg,
          delivered,
          read: true,
        });
        if (delivered) homeworkReminders++;
      }
    }

    // 3. Gửi báo cáo ngày cho Super Admin nếu có yêu cầu
    if (options?.sendDailyReport) {
      const [firstAdmin] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.role, 'admin')).limit(1);
      if (firstAdmin) {
        const report = await dailyReportText(firstAdmin.id);
        await sendCopyToSuperAdmins(report);
        reportSent = true;
      }
    }
  } catch (error) {
    console.error('Lỗi khi chạy Telegram cron tasks:', error);
  }

  return { scheduleReminders, homeworkReminders, reportSent };
}

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
