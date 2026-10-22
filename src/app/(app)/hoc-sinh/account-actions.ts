'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { accounts, students } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { requireStudentAccess } from '@/lib/campus-access';
import { DEFAULT_PASSWORD, hashPassword } from '@/lib/auth/password';
import { studentLoginEmail } from '@/lib/student-account';
import { studentCode } from '@/lib/student-code';

// Kết quả có mật khẩu tạm. Mật khẩu chỉ trả về một lần cho người đang thao tác, không ghi vào nhật ký hay cơ sở dữ liệu dạng rõ.
export type IssuedPassword = { ok: true; message: string; code: string; password: string } | { ok: false; message: string };

function errorResult(error: unknown): IssuedPassword {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi tài khoản học sinh:', error);
  return { ok: false, message: 'Không tạo được tài khoản. Thử lại sau ít phút.' };
}

// Tạo tài khoản đăng nhập cho học sinh. Học sinh dùng mã HS-00001 và mật khẩu tạm để vào khu học sinh.
export async function createStudentAccountAction(studentId: number): Promise<IssuedPassword> {
  try {
    await requirePermission('assignments.manage');
    await requireStudentAccess(studentId);
    const [student] = await db.select({ id: students.id, fullName: students.fullName }).from(students).where(eq(students.id, studentId)).limit(1);
    if (!student) return { ok: false, message: 'Học sinh này không còn tồn tại.' };
    const [existing] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.studentId, studentId)).limit(1);
    if (existing) return { ok: false, message: 'Học sinh này đã có tài khoản. Dùng Đặt lại mật khẩu.' };

    await db.insert(accounts).values({
      fullName: student.fullName,
      email: studentLoginEmail(studentId),
      role: 'student',
      status: 'active',
      studentId,
      passwordHash: await hashPassword(DEFAULT_PASSWORD),
    });
    const code = studentCode(studentId);
    await writeAudit({ action: 'create', entity: 'student_account', entityId: studentId, summary: `Tạo tài khoản học sinh ${code}` });
    return { ok: true, message: `Đã tạo tài khoản ${code}`, code, password: DEFAULT_PASSWORD };
  } catch (error) {
    return errorResult(error);
  }
}

// Đặt lại mật khẩu của tài khoản học sinh về mật khẩu ban đầu. Mật khẩu đã đổi trước đó không dùng được nữa.
export async function resetStudentPasswordAction(studentId: number): Promise<IssuedPassword> {
  try {
    await requirePermission('assignments.manage');
    await requireStudentAccess(studentId);
    const [account] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.studentId, studentId)).limit(1);
    if (!account) return { ok: false, message: 'Học sinh này chưa có tài khoản. Tạo tài khoản trước.' };

    await db.update(accounts).set({ passwordHash: await hashPassword(DEFAULT_PASSWORD), updatedAt: new Date() }).where(eq(accounts.id, account.id));
    const code = studentCode(studentId);
    await writeAudit({ action: 'update', entity: 'student_account', entityId: studentId, summary: `Đặt lại mật khẩu tài khoản ${code}` });
    return { ok: true, message: `Đã đặt lại mật khẩu cho ${code}`, code, password: DEFAULT_PASSWORD };
  } catch (error) {
    return errorResult(error);
  }
}
