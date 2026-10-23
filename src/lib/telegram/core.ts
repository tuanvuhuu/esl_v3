// Phần gửi tin cấp thấp của bot, dùng chung cho service, đơn nghỉ, thông báo sự kiện và cron. Chỉ chạy trên server.
import { AsyncLocalStorage } from 'node:async_hooks';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { accounts, studentParents, telegramChats, telegramMessages, telegramNotificationLog } from '@/db/schema';
import { sendMessage, sendMessageDetailed, sendPhotoDetailed, type SendOutcome } from './api';
import type { NotifyKind } from './prefs';

export type Chat = typeof telegramChats.$inferSelect;

export async function chatOf(chatId: number): Promise<Chat | null> {
  const [row] = await db.select().from(telegramChats).where(eq(telegramChats.chatId, chatId)).limit(1);
  return row ?? null;
}

export async function record(entry: {
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

// Gửi một tin tới một chat đã kết nối và lưu lại. Người dùng đã chặn bot thì ngừng chat đó (active = false).
async function deliver(chat: Chat, text: string, kind: string, sentByAccountId: number | null, replyMarkup?: Record<string, unknown>): Promise<SendOutcome> {
  const outcome = await sendMessageDetailed(chat.chatId, text, replyMarkup);
  const delivered = outcome.ok;
  if (outcome.blocked) await db.update(telegramChats).set({ active: false, updatedAt: new Date() }).where(eq(telegramChats.id, chat.id));
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
  return outcome;
}

// Gửi một tin tới một chat đã kết nối và lưu lại. Trả về true nếu Telegram nhận.
export async function sendAndRecord(
  chat: Chat,
  text: string,
  kind: string,
  sentByAccountId: number | null,
  replyMarkup?: Record<string, unknown>,
): Promise<boolean> {
  return (await deliver(chat, text, kind, sentByAccountId, replyMarkup)).ok;
}

// Gửi ảnh kèm chú thích (ví dụ mã QR học phí) và lưu chú thích vào lịch sử tin nhắn
async function deliverPhoto(chat: Chat, png: Uint8Array, caption: string, kind: string, sentByAccountId: number | null): Promise<SendOutcome> {
  const outcome = await sendPhotoDetailed(chat.chatId, png, caption);
  if (outcome.blocked) await db.update(telegramChats).set({ active: false, updatedAt: new Date() }).where(eq(telegramChats.id, chat.id));
  await record({ chatId: chat.chatId, parentId: chat.parentId, accountId: chat.accountId, direction: 'out', kind, text: `[Ảnh mã QR] ${caption}`, sentByAccountId, delivered: outcome.ok, read: true });
  return outcome;
}

export async function sendPhotoAndRecord(chat: Chat, png: Uint8Array, caption: string, kind: string, sentByAccountId: number | null): Promise<boolean> {
  return (await deliverPhoto(chat, png, caption, kind, sentByAccountId)).ok;
}

export type SendResult = 'sent' | 'failed' | 'skipped';

// Giới hạn tin tự động chỉ gửi cho một chat (cron ?chat=<id>): để chạy thử hay kiểm thử mà không gửi tới phụ huynh thật
const onlyChat = new AsyncLocalStorage<number>();

export function withOnlyChat<T>(chatId: number | null, task: () => Promise<T>): Promise<T> {
  return chatId === null ? task() : onlyChat.run(chatId, task);
}

// Chat này có được gửi trong lần chạy hiện tại không (khi đang giới hạn bằng withOnlyChat)
export function chatAllowed(chatId: number): boolean {
  const only = onlyChat.getStore();
  return only === undefined || only === chatId;
}

// Gửi tin tự động đúng một lần cho mỗi (chat, loại, mã sự kiện). Phụ huynh đã tắt loại tin (pref) thì bỏ qua.
// Ghi nhật ký trước rồi mới gửi, nên hai lần chạy song song cũng chỉ một lần gửi. Lỗi tạm thời (mạng, 429, 5xx) thì xoá
// dòng nhật ký để lần chạy sau thử lại; lỗi vĩnh viễn (chat không tồn tại, bị chặn, chưa cấu hình bot) thì giữ, không gửi lại.
export async function sendOnce(
  chat: Chat,
  opts: { kind: string; ref: string; text: string; pref?: NotifyKind; markup?: Record<string, unknown>; photo?: Uint8Array },
): Promise<SendResult> {
  if (!chat.active) return 'skipped';
  const only = onlyChat.getStore();
  if (only !== undefined && chat.chatId !== only) return 'skipped';
  if (opts.pref && chat.parentId !== null && chat.mutedKinds.includes(opts.pref)) return 'skipped';
  const refKey = opts.ref.slice(0, 160);
  const inserted = await db
    .insert(telegramNotificationLog)
    .values({ chatId: chat.chatId, kind: opts.kind, refKey })
    .onConflictDoNothing()
    .returning({ id: telegramNotificationLog.id });
  if (inserted.length === 0) return 'skipped';
  // Có ảnh (mã QR học phí) thì gửi ảnh, chữ làm chú thích
  const outcome = opts.photo ? await deliverPhoto(chat, opts.photo, opts.text, opts.kind, null) : await deliver(chat, opts.text, opts.kind, null, opts.markup);
  if (!outcome.ok && outcome.retryable) await db.delete(telegramNotificationLog).where(eq(telegramNotificationLog.id, inserted[0].id));
  return outcome.ok ? 'sent' : 'failed';
}

// Chat đang hoạt động của các phụ huynh của một học sinh
export async function parentChatsOfStudent(studentId: number): Promise<Chat[]> {
  const rows = await db
    .select()
    .from(telegramChats)
    .innerJoin(studentParents, eq(studentParents.parentId, telegramChats.parentId))
    .where(and(eq(studentParents.studentId, studentId), eq(telegramChats.active, true)));
  return rows.map((r) => r.telegram_chats);
}

// Chat đang hoạt động của giáo viên chủ nhiệm, trợ giảng, giáo viên nước ngoài của lớp. Thêm teacherIds để gồm giáo viên dạy buổi.
export async function staffChatsOfClass(classId: number, extraTeacherIds: number[] = []): Promise<Chat[]> {
  const ids = await db.execute<{ id: number }>(sql`
    SELECT DISTINCT tc.id
    FROM telegram_chats tc
    JOIN accounts a ON a.id = tc.account_id AND a.status = 'active'
    JOIN classes c ON c.id = ${classId}
    WHERE tc.active = true
      AND (a.teacher_id IN (c.teacher_id, c.assistant_id, c.foreign_teacher_id)
        OR a.teacher_id = ANY(${`{${extraTeacherIds.join(',')}}`}::int[]))`);
  if (ids.rows.length === 0) return [];
  return db.select().from(telegramChats).where(inArray(telegramChats.id, ids.rows.map((r) => Number(r.id))));
}

// Chat đang hoạt động của các tài khoản quản trị (super admin, P34.13)
export async function adminChats(): Promise<Chat[]> {
  const rows = await db
    .select()
    .from(telegramChats)
    .innerJoin(accounts, eq(accounts.id, telegramChats.accountId))
    .where(and(eq(accounts.role, 'admin'), eq(accounts.status, 'active'), eq(telegramChats.active, true)));
  return rows.map((r) => r.telegram_chats);
}

// Gửi bản sao tới các tài khoản quản trị đã kết nối Telegram (P34.13)
export async function sendCopyToSuperAdmins(text: string, excludeAccountId?: number | null): Promise<void> {
  for (const c of await adminChats()) {
    if (excludeAccountId && c.accountId === excludeAccountId) continue;
    await sendMessage(c.chatId, text);
  }
}

// Chạy một việc gửi tin sau khi việc chính đã xong: lỗi chỉ ghi log, không làm hỏng việc chính
export async function safely(label: string, task: () => Promise<unknown>): Promise<void> {
  try {
    await task();
  } catch (error) {
    console.error(`Lỗi gửi Telegram (${label}):`, error);
  }
}
