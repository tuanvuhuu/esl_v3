// Phiên đăng nhập và quyền của tài khoản hiện tại. Chỉ chạy trên server.
// Cookie httpOnly "esl_session" chứa token có chữ ký (xem lib/auth/token.ts). Mỗi lần đọc đều kiểm tra tài khoản còn hoạt động,
// nên khoá tài khoản có hiệu lực ngay (task 9.1).
import { and, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { cache } from 'react';
import { db } from '@/db/client';
import { accounts, rolePermissions } from '@/db/schema';
import { passwordFingerprint, readSession, sessionAccountId, signSession } from './auth/token';
import { ACCOUNT_ROLE_LABELS, PERMISSIONS, type AccountRole, type Permission } from './permissions';

export const SESSION_COOKIE = 'esl_session';
const SESSION_HOURS = 12;

export type CurrentAccount = {
  id: number;
  fullName: string;
  email: string;
  role: AccountRole;
  roleLabel: string;
  teacherId: number | null;
  studentId: number | null; // hồ sơ học sinh gắn với tài khoản học sinh (P28)
};

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('Thiếu SESSION_SECRET (ít nhất 32 ký tự) trong .env.local. Xem .env.example.');
  }
  return secret;
}

// Tài khoản đang đăng nhập, hoặc null. Cache theo từng yêu cầu nên gọi nhiều lần không tốn thêm truy vấn.
export const getCurrentAccount = cache(async (): Promise<CurrentAccount | null> => {
  // Hạn phiên tính theo giờ hiện tại, chỉ tính lúc có yêu cầu (docs: connection())
  await connection();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const accountId = sessionAccountId(token);
  if (!accountId) return null;

  const [row] = await db
    .select({
      id: accounts.id,
      fullName: accounts.fullName,
      email: accounts.email,
      role: accounts.role,
      status: accounts.status,
      teacherId: accounts.teacherId,
      studentId: accounts.studentId,
      passwordHash: accounts.passwordHash,
    })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);
  if (!row || row.status !== 'active') return null;
  // Chữ ký phải khớp với mật khẩu hiện tại: đổi mật khẩu thì phiên cũ bị từ chối (xem lib/auth/token.ts)
  if (readSession(token, sessionSecret(), Date.now(), passwordFingerprint(row.passwordHash)) !== row.id) return null;
  return { id: row.id, fullName: row.fullName, email: row.email, role: row.role, roleLabel: ACCOUNT_ROLE_LABELS[row.role], teacherId: row.teacherId, studentId: row.studentId };
});

// Quyền của tài khoản đang đăng nhập. Không đăng nhập thì không có quyền nào.
// Quản trị luôn có đủ quyền. Các vai trò khác lấy từ bảng role_permissions.
export const getCurrentPermissions = cache(async (): Promise<Permission[]> => {
  const account = await getCurrentAccount();
  if (!account) return [];
  const all = PERMISSIONS.map((p) => p.key);
  if (account.role === 'admin') return all;
  const rows = await db
    .select({ permission: rolePermissions.permission })
    .from(rolePermissions)
    .where(and(eq(rolePermissions.role, account.role), eq(rolePermissions.granted, true)));
  const known = new Set<string>(all);
  return rows.map((r) => r.permission).filter((p): p is Permission => known.has(p));
});

// Ghi cookie phiên sau khi đăng nhập đúng hoặc đổi mật khẩu. Dấu lấy từ mật khẩu đang lưu.
export async function startSession(accountId: number): Promise<void> {
  const [row] = await db.select({ passwordHash: accounts.passwordHash }).from(accounts).where(eq(accounts.id, accountId)).limit(1);
  const jar = await cookies();
  const expiresAt = Date.now() + SESSION_HOURS * 3_600_000;
  jar.set(SESSION_COOKIE, signSession(accountId, expiresAt, sessionSecret(), passwordFingerprint(row?.passwordHash ?? null)), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_HOURS * 3600,
  });
}

// Xoá cookie phiên khi đăng xuất
export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
