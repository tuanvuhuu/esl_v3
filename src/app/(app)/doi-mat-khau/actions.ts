'use server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { accounts, auditLogs } from '@/db/schema';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { getCurrentAccount, startSession } from '@/lib/session';
import { fieldErrorsFrom, type ActionResult } from '@/lib/validation/student';

// Cùng quy định với `npm run db:set-password`: mật khẩu mới ít nhất 10 ký tự
const MIN_LENGTH = 10;

const changePasswordSchema = z
  .object({
    currentPassword: z.string({ error: 'Nhập mật khẩu hiện tại' }).min(1, 'Nhập mật khẩu hiện tại').max(200, 'Mật khẩu quá dài'),
    newPassword: z
      .string({ error: 'Nhập mật khẩu mới' })
      .min(MIN_LENGTH, `Mật khẩu mới cần ít nhất ${MIN_LENGTH} ký tự`)
      .max(200, 'Mật khẩu quá dài'),
    confirmPassword: z.string({ error: 'Nhập lại mật khẩu mới' }),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: 'Mật khẩu nhập lại không khớp', path: ['confirmPassword'] })
  .refine((v) => v.newPassword !== v.currentPassword, { message: 'Mật khẩu mới phải khác mật khẩu hiện tại', path: ['newPassword'] });

// Đổi mật khẩu của chính tài khoản đang đăng nhập (mọi vai trò, không cần quyền riêng).
// Sau khi đổi, phiên ở thiết bị này được cấp lại; phiên ở thiết bị khác mất hiệu lực (xem lib/auth/token.ts).
export async function changePasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const account = await getCurrentAccount();
  if (!account) return { ok: false, message: 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để đổi mật khẩu.' };

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: 'Chưa đổi được mật khẩu. Kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  try {
    const [row] = await db.select({ passwordHash: accounts.passwordHash }).from(accounts).where(eq(accounts.id, account.id)).limit(1);
    if (!(await verifyPassword(parsed.data.currentPassword, row?.passwordHash))) {
      return {
        ok: false,
        message: 'Chưa đổi được mật khẩu. Kiểm tra lại các ô được đánh dấu.',
        fieldErrors: { currentPassword: 'Mật khẩu hiện tại không đúng' },
      };
    }

    const hash = await hashPassword(parsed.data.newPassword);
    await db.update(accounts).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(accounts.id, account.id));
    await db.insert(auditLogs).values({
      accountId: account.id,
      action: 'change_password',
      entity: 'account',
      entityId: String(account.id),
      summary: `Đổi mật khẩu: ${account.email}`,
    });
    await startSession(account.id);
    return { ok: true, message: 'Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.' };
  } catch (error) {
    console.error('Lỗi đổi mật khẩu:', error);
    return { ok: false, message: 'Không đổi được mật khẩu. Thử lại sau ít phút.' };
  }
}
