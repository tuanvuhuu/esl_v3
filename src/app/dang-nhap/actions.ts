'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/db/client';
import { accounts, auditLogs } from '@/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import { parseStudentCode } from '@/lib/student-code';
import { ROLE_CODES, type Role } from '@/lib/permissions';
import { startSession } from '@/lib/session';
import { fieldErrorsFrom, type ActionResult } from '@/lib/validation/student';

const loginSchema = z.object({
  email: z.string({ error: 'Nhập email' }).trim().min(1, 'Nhập email').max(160, 'Email quá dài'),
  password: z.string({ error: 'Nhập mật khẩu' }).min(1, 'Nhập mật khẩu').max(200, 'Mật khẩu quá dài'),
});

// Kiểm tra email và mật khẩu. Trả về id tài khoản nếu đúng và đang hoạt động.
// Thông báo lỗi không cho biết email có tồn tại hay không.
async function authenticate(email: string, password: string): Promise<{ ok: true; accountId: number } | { ok: false; message: string }> {
  try {
    // Học sinh đăng nhập bằng mã học sinh (HS-0001), giáo viên và nhân viên bằng email
    const studentId = parseStudentCode(email);
    const [row] = await db
      .select()
      .from(accounts)
      .where(studentId !== null ? eq(accounts.studentId, studentId) : eq(accounts.email, email.toLowerCase()))
      .limit(1);
    const passwordOk = await verifyPassword(password, row?.passwordHash);
    if (!row || !passwordOk) return { ok: false, message: 'Email hoặc mật khẩu không đúng.' };
    if (row.status !== 'active') return { ok: false, message: 'Tài khoản đang bị khoá. Liên hệ quản trị để mở lại.' };

    await db.update(accounts).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(accounts.id, row.id));
    await db.insert(auditLogs).values({ accountId: row.id, action: 'login', entity: 'account', entityId: String(row.id), summary: `Đăng nhập: ${row.email}` });
    return { ok: true, accountId: row.id };
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    return { ok: false, message: 'Không đăng nhập được. Thử lại sau ít phút.' };
  }
}

// Đăng nhập bằng email và mật khẩu từ form
export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: 'Vui lòng nhập email và mật khẩu.', fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const result = await authenticate(parsed.data.email, parsed.data.password);
  if (!result.ok) return { ok: false, message: result.message };
  await startSession(result.accountId);
  redirect('/tong-quan');
}

// TẠM THỜI (chỉ phát triển): đăng nhập nhanh theo vai trò bằng tài khoản mẫu.
// Mật khẩu đọc ở server từ DEV_PASSWORD, không gửi xuống trình duyệt. Tự tắt khi NODE_ENV là production.
// Xoá hàm này và phần LoginForm tương ứng trước khi đưa lên máy chủ thật.
const DEV_ACCOUNT_EMAIL: Record<Role, string> = {
  admin: 'admin@esl-center.vn',
  academic: 'trang.giaovu@esl-center.vn',
  teacher: 'thu.ha@esl-center.vn',
  accountant: 'ngoc.ketoan@esl-center.vn',
};

export async function devQuickLoginAction(role: Role): Promise<ActionResult> {
  if (process.env.NODE_ENV === 'production') return { ok: false, message: 'Đăng nhập nhanh chỉ dùng khi phát triển.' };
  if (!(ROLE_CODES as readonly string[]).includes(role)) return { ok: false, message: 'Vai trò không hợp lệ.' };
  const password = process.env.DEV_PASSWORD;
  if (!password) return { ok: false, message: 'Thiếu DEV_PASSWORD trong .env.local.' };

  const result = await authenticate(DEV_ACCOUNT_EMAIL[role], password);
  if (!result.ok) return { ok: false, message: result.message };
  await startSession(result.accountId);
  redirect('/tong-quan');
}
