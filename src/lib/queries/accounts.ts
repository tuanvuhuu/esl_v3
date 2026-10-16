// Truy vấn tài khoản, ma trận quyền và nhật ký hoạt động. Chỉ chạy trên server.
import { asc, desc, eq, ne } from 'drizzle-orm';
import { db } from '@/db/client';
import { accounts, auditLogs, rolePermissions, teachers } from '@/db/schema';
import { campusIdsOfAccounts, getAllowedCampusIds } from '@/lib/campus-access';
import { getCurrentAccount } from '@/lib/session';
import { PERMISSIONS, ROLE_CODES, ROLE_LABELS, type Permission, type Role } from '@/lib/permissions';

export type AccountRow = {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  roleLabel: string;
  status: 'active' | 'locked';
  teacherId: number | null;
  teacherName: string | null;
  lastLoginAt: string | null;
  campusIds: number[]; // cơ sở được làm việc (P32). Quản trị: rỗng, nghĩa là mọi cơ sở
};

export async function listAccounts(): Promise<AccountRow[]> {
  const rows = await db
    .select({
      id: accounts.id,
      fullName: accounts.fullName,
      email: accounts.email,
      role: accounts.role,
      status: accounts.status,
      teacherId: accounts.teacherId,
      teacherName: teachers.name,
      lastLoginAt: accounts.lastLoginAt,
    })
    .from(accounts)
    .leftJoin(teachers, eq(teachers.id, accounts.teacherId))
    .where(ne(accounts.role, 'student'))
    .orderBy(asc(accounts.id));

  const campusMap = await campusIdsOfAccounts(rows.map((r) => r.id));
  const allowed = await getAllowedCampusIds();
  // Tài khoản bị giới hạn chỉ thấy tài khoản có chung cơ sở với mình
  const visible = rows.filter((r) => allowed === null || (r.role !== 'admin' && (campusMap.get(r.id) ?? []).some((c) => allowed.includes(c))));
  return visible.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    role: r.role as Role,
    roleLabel: ROLE_LABELS[r.role as Role],
    status: r.status,
    teacherId: r.teacherId,
    teacherName: r.teacherName,
    lastLoginAt: r.lastLoginAt ? r.lastLoginAt.toISOString() : null,
    campusIds: r.role === 'admin' ? [] : (campusMap.get(r.id) ?? []).sort((a, b) => a - b),
  }));
}

export async function listTeacherOptions(): Promise<{ id: number; name: string; linkedAccountId: number | null }[]> {
  const rows = await db
    .select({ id: teachers.id, name: teachers.name, linkedAccountId: accounts.id })
    .from(teachers)
    .leftJoin(accounts, eq(accounts.teacherId, teachers.id))
    .orderBy(asc(teachers.name));
  return rows.map((r) => ({ id: r.id, name: r.name, linkedAccountId: r.linkedAccountId }));
}

// Ma trận quyền: vai trò × quyền
export type RoleMatrix = Record<Role, Record<Permission, boolean>>;

export async function getRoleMatrix(): Promise<RoleMatrix> {
  const rows = await db.select().from(rolePermissions);
  const matrix = Object.fromEntries(
    ROLE_CODES.map((role) => [role, Object.fromEntries(PERMISSIONS.map((p) => [p.key, false])) as Record<Permission, boolean>]),
  ) as RoleMatrix;
  for (const row of rows) {
    // Vai trò học sinh không có ma trận quyền; dòng của vai trò đó (nếu có) bị bỏ qua
    if (row.role === 'student') continue;
    if (row.permission in matrix[row.role]) matrix[row.role][row.permission as Permission] = row.granted;
  }
  return matrix;
}

export type AuditRow = { id: number; action: string; entity: string; summary: string; createdAt: string; accountName: string | null };

// Tài khoản bị giới hạn theo cơ sở chỉ thấy việc do mình hoặc tài khoản cùng cơ sở làm (P32)
export async function listAuditLogs(limit = 100): Promise<AuditRow[]> {
  const allowed = await getAllowedCampusIds();
  const visibleIds = allowed === null ? null : new Set((await listAccounts()).map((a) => a.id));
  const me = await getCurrentAccount();
  if (visibleIds && me) visibleIds.add(me.id);
  const rows = await db
    .select({
      id: auditLogs.id,
      accountId: auditLogs.accountId,
      action: auditLogs.action,
      entity: auditLogs.entity,
      summary: auditLogs.summary,
      createdAt: auditLogs.createdAt,
      accountName: accounts.fullName,
    })
    .from(auditLogs)
    .leftJoin(accounts, eq(accounts.id, auditLogs.accountId))
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(visibleIds ? limit * 5 : limit);
  return rows
    .filter((r) => visibleIds === null || (r.accountId !== null && visibleIds.has(r.accountId)))
    .slice(0, limit)
    .map((r) => ({
    id: r.id,
    action: r.action,
    entity: r.entity,
    summary: r.summary,
    createdAt: r.createdAt.toISOString(),
    accountName: r.accountName,
  }));
}
