// Nghiệp vụ của bot Telegram (P34): kết nối chat, lưu và gửi tin, trả lời lệnh của phụ huynh. Chỉ chạy trên server.
import { and, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { accounts, parents, studentParents, telegramChats, telegramLinkCodes, telegramMessages } from '@/db/schema';
import { vnDateTimeLabel } from '@/lib/datetime';
import { formatVND } from '@/lib/money';
import { sendMessage } from './api';
import { HELP_TEXT, LINK_CODE_DAYS, newLinkCode, parseCommand } from './commands';

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
async function sendAndRecord(chat: Chat, text: string, kind: string, sentByAccountId: number | null): Promise<boolean> {
  const delivered = await sendMessage(chat.chatId, text);
  await record({ chatId: chat.chatId, parentId: chat.parentId, accountId: chat.accountId, direction: 'out', kind, text, sentByAccountId, delivered, read: true });
  return delivered;
}

export type SendSummary = { chats: number; delivered: number };

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

// Trả lời phụ huynh từ màn Tin nhắn
export async function replyToParent(parentId: number, text: string, sentByAccountId: number): Promise<SendSummary> {
  const chats = await db.select().from(telegramChats).where(and(eq(telegramChats.parentId, parentId), eq(telegramChats.active, true)));
  let delivered = 0;
  for (const chat of chats) if (await sendAndRecord(chat, text, 'reply', sentByAccountId)) delivered++;
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

// ---------- Xử lý tin nhắn đến (webhook) ----------

export type IncomingMessage = { chatId: number; text: string; fromName: string };

// Xử lý một tin đến và trả lời ngay qua bot. Mọi tin đến của chat đã kết nối đều được lưu.
export async function handleIncoming(message: IncomingMessage): Promise<void> {
  const command = parseCommand(message.text);
  const chat = await chatOf(message.chatId);

  if (command.kind === 'start' && command.code) {
    await linkByCode(message, command.code);
    return;
  }

  if (!chat || !chat.active) {
    await sendMessage(message.chatId, 'Xin chào! Để nhận tin từ trung tâm, hãy mở link kết nối mà trung tâm gửi cho bạn (bắt đầu bằng t.me/...).');
    return;
  }

  await record({ chatId: chat.chatId, parentId: chat.parentId, accountId: chat.accountId, direction: 'in', kind: command.kind === 'text' ? 'text' : 'command', text: message.text });

  if (command.kind === 'stop') {
    await db.update(telegramChats).set({ active: false, updatedAt: new Date() }).where(eq(telegramChats.id, chat.id));
    await sendAndRecord(chat, 'Đã ngừng nhận tin từ trung tâm. Muốn nhận lại, hãy mở link kết nối mới do trung tâm gửi.', 'system', null);
    return;
  }
  if (command.kind === 'help' || command.kind === 'start') {
    await sendAndRecord(chat, HELP_TEXT, 'system', null);
    return;
  }
  if (chat.parentId === null) {
    // Tài khoản nhân viên chỉ nhận thông báo, không có lệnh tra cứu
    if (command.kind !== 'text') await sendAndRecord(chat, 'Các lệnh tra cứu dành cho phụ huynh. Tài khoản nhân viên nhận thông báo từ hệ thống.', 'system', null);
    return;
  }
  if (command.kind === 'schedule') return void (await sendAndRecord(chat, await scheduleText(chat.parentId), 'command', null));
  if (command.kind === 'tuition') return void (await sendAndRecord(chat, await tuitionText(chat.parentId), 'command', null));
  if (command.kind === 'homework') return void (await sendAndRecord(chat, await homeworkText(chat.parentId), 'command', null));

  // Tin thường: chỉ báo nhận một lần mỗi 6 giờ, để không trả lời tự động mọi tin
  const [recentAck] = await db
    .select({ id: telegramMessages.id })
    .from(telegramMessages)
    .where(and(eq(telegramMessages.chatId, chat.chatId), eq(telegramMessages.kind, 'ack'), gt(telegramMessages.createdAt, new Date(Date.now() - 6 * 3_600_000))))
    .limit(1);
  if (!recentAck) await sendAndRecord(chat, 'Trung tâm đã nhận tin nhắn và sẽ trả lời sớm. Gõ /help để xem các lệnh tra cứu.', 'ack', null);
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
  if (chat) await sendAndRecord(chat, `Đã kết nối với ESL Center${name ? ` cho ${name}` : ''}.\n\n${HELP_TEXT}`, 'system', null);
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
