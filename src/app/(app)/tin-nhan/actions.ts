'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { requireCampusAccess, requireClassAccess, requireParentAccess, requireUnrestricted } from '@/lib/campus-access';
import { hasPermission } from '@/lib/permissions';
import { teacherVisibleParentIds } from '@/lib/queries/parents';
import { getCurrentAccount, getCurrentPermissions } from '@/lib/session';
import { botToken, botUsername, setMyCommands, setWebhook, webhookSecret } from '@/lib/telegram/api';
import { DEFAULT_BOT_COMMANDS, deepLink } from '@/lib/telegram/commands';
import { broadcastTelegramMessage, createLinkCode, replyToParent } from '@/lib/telegram/service';
import type { ActionResult } from '@/lib/validation/student';

export type LinkResult = { ok: true; code: string; link: string | null; message: string } | { ok: false; message: string };

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ForbiddenError) return error.message;
  console.error('Lỗi Telegram:', error);
  return fallback;
}

function linkFor(code: string): { link: string | null; note: string } {
  const username = botUsername();
  if (!username) return { link: null, note: 'Chưa cấu hình TELEGRAM_BOT_USERNAME nên chưa tạo được link. Mã kết nối vẫn dùng được: gửi /start kèm mã cho bot.' };
  return { link: deepLink(username, code), note: 'Link dùng một lần, hết hạn sau 7 ngày.' };
}

// Tạo link kết nối Telegram cho một phụ huynh (gửi cho phụ huynh qua Zalo, SMS...)
export async function createParentLinkAction(parentId: number): Promise<LinkResult> {
  try {
    await requirePermission('parents.manage');
    await requireParentAccess(parentId);
    const account = await getCurrentAccount();
    const code = await createLinkCode({ parentId }, account?.id ?? null);
    const { link, note } = linkFor(code);
    await writeAudit({ action: 'create', entity: 'telegram_link', entityId: parentId, summary: 'Tạo link kết nối Telegram cho phụ huynh' });
    return { ok: true, code, link, message: note };
  } catch (error) {
    return { ok: false, message: errorMessage(error, 'Không tạo được link. Thử lại sau ít phút.') };
  }
}

// Nhân viên tự kết nối Telegram của mình để nhận thông báo (bài nộp mới...)
export async function createMyLinkAction(): Promise<LinkResult> {
  try {
    const account = await getCurrentAccount();
    if (!account || account.role === 'student') return { ok: false, message: 'Chỉ tài khoản nhân viên mới kết nối được.' };
    const code = await createLinkCode({ accountId: account.id }, account.id);
    const { link, note } = linkFor(code);
    return { ok: true, code, link, message: note };
  } catch (error) {
    return { ok: false, message: errorMessage(error, 'Không tạo được link. Thử lại sau ít phút.') };
  }
}

const replySchema = z.string().trim().min(1, 'Nhập nội dung trả lời').max(2000, 'Tối đa 2000 ký tự');

export async function replyToParentAction(parentId: number, text: string): Promise<ActionResult> {
  try {
    const account = await getCurrentAccount();
    if (!account) return { ok: false, message: 'Cần đăng nhập để trả lời.' };
    const permissions = new Set(await getCurrentPermissions());
    const canManage = hasPermission(permissions, 'parents.manage');

    if (canManage) {
      await requireParentAccess(parentId);
    } else if (account.teacherId) {
      const allowedParents = await teacherVisibleParentIds(account.teacherId);
      if (!allowedParents.has(parentId)) {
        return { ok: false, message: 'Phụ huynh này không có con học các lớp bạn dạy.' };
      }
    } else {
      return { ok: false, message: 'Bạn không có quyền gửi tin nhắn cho phụ huynh.' };
    }

    const parsed = replySchema.safeParse(text);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Nội dung không hợp lệ', fieldErrors: { text: parsed.error.issues[0]?.message ?? '' } };
    const sent = await replyToParent(parentId, parsed.data, account.id);
    revalidatePath('/tin-nhan');
    if (sent.chats === 0) return { ok: false, message: 'Phụ huynh chưa kết nối Telegram hoặc đã ngừng nhận tin.' };
    if (sent.delivered === 0) return { ok: true, message: 'Đã lưu tin nhưng chưa gửi được qua Telegram (chưa cấu hình bot hoặc lỗi mạng).' };
    return { ok: true, message: 'Đã gửi qua Telegram' };
  } catch (error) {
    return { ok: false, message: errorMessage(error, 'Không gửi được. Thử lại sau ít phút.') };
  }
}

// Đăng ký webhook với Telegram, trỏ về địa chỉ đang mở app. Chỉ quản trị làm việc ở mọi cơ sở.
export async function setupWebhookAction(): Promise<ActionResult> {
  try {
    await requirePermission('settings.manage');
    await requireUnrestricted();
    const secret = webhookSecret();
    if (!botToken() || !secret) return { ok: false, message: 'Cần đặt TELEGRAM_BOT_TOKEN và TELEGRAM_WEBHOOK_SECRET (ít nhất 16 ký tự) trong biến môi trường.' };
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const proto = h.get('x-forwarded-proto') ?? 'https';
    if (!host || host.startsWith('localhost') || host.startsWith('127.')) {
      return { ok: false, message: 'Telegram chỉ gọi được địa chỉ công khai có HTTPS. Bấm nút này trên bản đã deploy (Vercel).' };
    }
    const url = `${proto}://${host}/api/telegram/webhook`;
    const result = await setWebhook(url, secret);
    if (!result.ok) return { ok: false, message: `Telegram từ chối: ${result.description}` };
    await setMyCommands(DEFAULT_BOT_COMMANDS);
    await writeAudit({ action: 'update', entity: 'telegram', entityId: '', summary: `Cài webhook Telegram: ${url}` });
    return { ok: true, message: `Đã cài webhook và thiết lập nút Menu tra cứu cho bot: ${url}` };
  } catch (error) {
    return { ok: false, message: errorMessage(error, 'Không cài được webhook. Thử lại sau ít phút.') };
  }
}

const broadcastSchema = z.object({
  scope: z.enum(['all', 'campus', 'class']),
  scopeId: z.coerce.number().optional(),
  text: z.string().trim().min(1, 'Nội dung thông báo không được để trống').max(3000, 'Tối đa 3000 ký tự'),
});

// Gửi thông báo chung qua Telegram (P34.18)
export async function broadcastTelegramAction(params: {
  scope: 'all' | 'campus' | 'class';
  scopeId?: number;
  text: string;
}): Promise<ActionResult> {
  try {
    await requirePermission('parents.manage');
    const account = await getCurrentAccount();
    if (!account) return { ok: false, message: 'Cần đăng nhập để gửi thông báo.' };

    const parsed = broadcastSchema.safeParse(params);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    }

    if (parsed.data.scope === 'all') {
      await requireUnrestricted('Chỉ quản trị làm việc ở mọi cơ sở mới được gửi thông báo toàn trung tâm.');
    } else if (parsed.data.scope === 'campus') {
      if (!parsed.data.scopeId) return { ok: false, message: 'Chưa chọn cơ sở.' };
      await requireCampusAccess(parsed.data.scopeId);
    } else if (parsed.data.scope === 'class') {
      if (!parsed.data.scopeId) return { ok: false, message: 'Chưa chọn lớp học.' };
      await requireClassAccess(parsed.data.scopeId);
    }

    const result = await broadcastTelegramMessage({
      scope: parsed.data.scope,
      scopeId: parsed.data.scopeId,
      text: parsed.data.text,
      sentByAccountId: account.id,
    });

    revalidatePath('/tin-nhan');
    await writeAudit({
      action: 'create',
      entity: 'telegram_broadcast',
      entityId: String(parsed.data.scopeId ?? 'all'),
      summary: `Gửi thông báo Telegram (${parsed.data.scope}): ${result.delivered}/${result.total} phụ huynh nhận được`,
    });

    return {
      ok: true,
      message: `Đã gửi thông báo tới ${result.delivered}/${result.total} phụ huynh đã kết nối Telegram.`,
    };
  } catch (error) {
    return { ok: false, message: errorMessage(error, 'Không gửi được thông báo. Thử lại sau ít phút.') };
  }
}

