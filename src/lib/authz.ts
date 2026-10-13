// Kiểm tra quyền và ghi nhật ký cho server action. Chỉ chạy trên server.
import { db } from '@/db/client';
import { auditLogs } from '@/db/schema';
import type { Permission } from './permissions';
import { getCurrentAccount, getCurrentPermissions } from './session';

export class ForbiddenError extends Error {
  constructor(message = 'Bạn không có quyền thực hiện thao tác này.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

// Trả về tập quyền hiện tại, hoặc ném ForbiddenError nếu thiếu quyền yêu cầu
export async function requirePermission(permission: Permission): Promise<ReadonlySet<Permission>> {
  const granted = new Set(await getCurrentPermissions());
  if (!granted.has(permission)) throw new ForbiddenError();
  return granted;
}

// Chỉ quản trị mới được làm (ví dụ đổi ma trận quyền). Ném ForbiddenError nếu không phải quản trị.
export async function requireAdmin(): Promise<void> {
  const account = await getCurrentAccount();
  if (!account || account.role !== 'admin') throw new ForbiddenError('Chỉ quản trị mới được thay đổi phân quyền.');
}

// Ghi một dòng nhật ký hoạt động, kèm tài khoản đang thao tác (nếu có)
export async function writeAudit(entry: { action: string; entity: string; entityId: string | number; summary: string }) {
  const account = await getCurrentAccount();
  await db.insert(auditLogs).values({
    accountId: account?.id ?? null,
    action: entry.action,
    entity: entry.entity,
    entityId: String(entry.entityId),
    summary: entry.summary,
  });
}
