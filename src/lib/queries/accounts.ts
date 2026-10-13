// Truy vấn tài khoản, ma trận quyền và nhật ký hoạt động. Chỉ chạy trên server.
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { accounts, auditLogs, rolePermissions, teachers } from '@/db/schema';
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
    .orderBy(asc(accounts.id));

  return rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    role: r.role,
    roleLabel: ROLE_LABELS[r.role],
    status: r.status,
    teacherId: r.teacherId,
    teacherName: r.teacherName,
    lastLoginAt: r.lastLoginAt ? r.lastLoginAt.toISOString() : null,
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
    if (row.permission in matrix[row.role]) matrix[row.role][row.permission as Permission] = row.granted;
  }
  return matrix;
}

export type AuditRow = { id: number; action: string; entity: string; summary: string; createdAt: string; accountName: string | null };

export async function listAuditLogs(limit = 100): Promise<AuditRow[]> {
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entity: auditLogs.entity,
      summary: auditLogs.summary,
      createdAt: auditLogs.createdAt,
      accountName: accounts.fullName,
    })
    .from(auditLogs)
    .leftJoin(accounts, eq(accounts.id, auditLogs.accountId))
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    entity: r.entity,
    summary: r.summary,
    createdAt: r.createdAt.toISOString(),
    accountName: r.accountName,
  }));
}
