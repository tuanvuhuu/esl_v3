'use server';

import { and, count, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { accountCampuses, accounts, rolePermissions, teachers } from '@/db/schema';
import { ForbiddenError, requireAdmin, requirePermission, writeAudit } from '@/lib/authz';
import { DEFAULT_PASSWORD, hashPassword } from '@/lib/auth/password';
import { CAMPUS_FORBIDDEN, campusIdsOfAccounts, getAllowedCampusIds, requireCampusesSubset } from '@/lib/campus-access';
import { LOCKED_ADMIN_PERMISSIONS, PERMISSIONS, ROLE_CODES, ROLE_LABELS, type Permission, type Role } from '@/lib/permissions';
import { accountFormSchema } from '@/lib/validation/account';
import { fieldErrorsFrom, type ActionResult } from '@/lib/validation/student';

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action tài khoản:', error);
  return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
}

// Số tài khoản quản trị đang hoạt động, trừ một tài khoản nếu có
async function activeAdminsExcluding(excludeId: number | null): Promise<number> {
  const where = excludeId
    ? and(eq(accounts.role, 'admin'), eq(accounts.status, 'active'), ne(accounts.id, excludeId))
    : and(eq(accounts.role, 'admin'), eq(accounts.status, 'active'));
  const [row] = await db.select({ n: count() }).from(accounts).where(where);
  return Number(row?.n ?? 0);
}

// Giáo viên đã gắn với tài khoản khác thì không gắn thêm
async function teacherTakenBy(teacherId: number, exceptAccountId: number | null): Promise<boolean> {
  const where = exceptAccountId
    ? and(eq(accounts.teacherId, teacherId), ne(accounts.id, exceptAccountId))
    : eq(accounts.teacherId, teacherId);
  const [row] = await db.select({ id: accounts.id }).from(accounts).where(where).limit(1);
  return !!row;
}

export type AccountFormValues = {
  fullName: string;
  email: string;
  role: Role;
  status: 'active' | 'locked';
  teacherId: string;
  campusIds: string[];
};

// Tài khoản bị giới hạn theo cơ sở chỉ quản lý tài khoản (không phải quản trị) có chung cơ sở với mình (P32)
async function requireAccountAccess(id: number): Promise<void> {
  const allowed = await getAllowedCampusIds();
  if (allowed === null) return;
  const [row] = await db.select({ role: accounts.role }).from(accounts).where(eq(accounts.id, id)).limit(1);
  if (!row) return;
  const ids = (await campusIdsOfAccounts([id])).get(id) ?? [];
  if (row.role === 'admin' || !ids.some((c) => allowed.includes(c))) throw new ForbiddenError(CAMPUS_FORBIDDEN);
}

// Ghi cơ sở của tài khoản. Quản trị không có dòng nào. Người sửa bị giới hạn: cơ sở ngoài phạm vi của họ giữ nguyên.
async function saveAccountCampuses(accountId: number, role: Role, campusIds: number[]): Promise<void> {
  const allowed = await getAllowedCampusIds();
  const existing = (await campusIdsOfAccounts([accountId])).get(accountId) ?? [];
  const keep = allowed === null ? [] : existing.filter((c) => !allowed.includes(c));
  const next = role === 'admin' ? [] : [...new Set([...campusIds, ...keep])];
  await db.transaction(async (tx) => {
    await tx.delete(accountCampuses).where(eq(accountCampuses.accountId, accountId));
    if (next.length > 0) await tx.insert(accountCampuses).values(next.map((campusId) => ({ accountId, campusId })));
  });
}

export async function loadAccountForm(id: number): Promise<{ ok: true; values: AccountFormValues } | { ok: false; message: string }> {
  try {
    await requirePermission('accounts.manage');
    await requireAccountAccess(id);
    const [row] = await db
      .select({ fullName: accounts.fullName, email: accounts.email, role: accounts.role, status: accounts.status, teacherId: accounts.teacherId })
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1);
    if (!row) return { ok: false, message: 'Không tìm thấy tài khoản này.' };
    return {
      ok: true,
      values: {
        fullName: row.fullName,
        email: row.email,
        role: row.role as Role,
        status: row.status,
        teacherId: row.teacherId ? String(row.teacherId) : '',
        campusIds: ((await campusIdsOfAccounts([id])).get(id) ?? []).map(String),
      },
    };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi đọc tài khoản để sửa:', error);
    return { ok: false, message: 'Không đọc được dữ liệu. Thử lại sau ít phút.' };
  }
}

type ValidAccount = Omit<ReturnType<typeof accountFormSchema.parse>, 'teacherId'> & { teacherId: number | null };
type Checked = { ok: true; value: ValidAccount } | { ok: false; result: ActionResult };

async function validateAccountInput(formData: FormData, accountId: number | null): Promise<Checked> {
  const parsed = accountFormSchema.safeParse({ ...Object.fromEntries(formData), campusIds: formData.getAll('campusIds') });
  if (!parsed.success) {
    return { ok: false, result: { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) } };
  }

  const v = parsed.data;
  // Người sửa bị giới hạn theo cơ sở: không tạo quản trị, không gán cơ sở ngoài phạm vi của mình
  const allowed = await getAllowedCampusIds();
  if (allowed !== null && v.role === 'admin') throw new ForbiddenError('Chỉ quản trị làm việc ở mọi cơ sở mới tạo hoặc gán vai trò Quản trị.');
  await requireCampusesSubset(v.campusIds);
  const [dup] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(accountId ? and(eq(accounts.email, v.email), ne(accounts.id, accountId)) : eq(accounts.email, v.email))
    .limit(1);
  if (dup) return { ok: false, result: { ok: false, message: 'Email này đã có tài khoản.', fieldErrors: { email: 'Email này đã có tài khoản' } } };

  const teacherId = v.role === 'teacher' ? Number(v.teacherId) : null;
  if (teacherId !== null) {
    const [teacher] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.id, teacherId)).limit(1);
    if (!teacher) return { ok: false, result: { ok: false, message: 'Giáo viên không tồn tại.', fieldErrors: { teacherId: 'Giáo viên không tồn tại' } } };
    if (await teacherTakenBy(teacherId, accountId)) {
      return { ok: false, result: { ok: false, message: 'Giáo viên này đã có tài khoản khác.', fieldErrors: { teacherId: 'Giáo viên này đã có tài khoản khác' } } };
    }
  }
  return { ok: true, value: { ...v, teacherId } };
}

export async function createAccountAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('accounts.manage');
    const checked = await validateAccountInput(formData, null);
    if (!checked.ok) return checked.result;
    const v = checked.value;
    const [created] = await db
      .insert(accounts)
      .values({
        fullName: v.fullName,
        email: v.email,
        role: v.role,
        status: v.status,
        teacherId: v.teacherId,
        passwordHash: await hashPassword(DEFAULT_PASSWORD),
      })
      .returning({ id: accounts.id });
    await saveAccountCampuses(created.id, v.role, v.campusIds);
    await writeAudit({ action: 'create', entity: 'account', entityId: created.id, summary: `Thêm tài khoản ${v.email} (${ROLE_LABELS[v.role]})` });
    revalidatePath('/tai-khoan');
    return { ok: true, message: `Đã thêm ${v.email}. Mật khẩu ban đầu là ${DEFAULT_PASSWORD}.` };
  } catch (error) {
    return errorResult(error);
  }
}

export async function updateAccountAction(id: number, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('accounts.manage');
    await requireAccountAccess(id);
    const [current] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    if (!current) return { ok: false, message: 'Không tìm thấy tài khoản này.' };

    const checked = await validateAccountInput(formData, id);
    if (!checked.ok) return checked.result;
    const v = checked.value;

    // Không để mất hết quản trị đang hoạt động
    const losesAdmin = current.role === 'admin' && current.status === 'active' && (v.role !== 'admin' || v.status === 'locked');
    if (losesAdmin && (await activeAdminsExcluding(id)) === 0) {
      return { ok: false, message: 'Phải còn ít nhất một quản trị đang hoạt động.' };
    }

    await db
      .update(accounts)
      .set({ fullName: v.fullName, email: v.email, role: v.role, status: v.status, teacherId: v.teacherId, updatedAt: new Date() })
      .where(eq(accounts.id, id));
    await saveAccountCampuses(id, v.role, v.campusIds);
    await writeAudit({ action: 'update', entity: 'account', entityId: id, summary: `Sửa tài khoản ${v.email} (${ROLE_LABELS[v.role]}, ${v.status === 'active' ? 'hoạt động' : 'tạm khoá'})` });
    revalidatePath('/tai-khoan');
    return { ok: true, message: `Đã lưu tài khoản ${v.email}` };
  } catch (error) {
    return errorResult(error);
  }
}

// Khoá hoặc mở tài khoản. Tài khoản bị khoá không đăng nhập được (task 9.1).
export async function setAccountLockedAction(id: number, locked: boolean): Promise<ActionResult> {
  try {
    await requirePermission('accounts.manage');
    await requireAccountAccess(id);
    const [current] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    if (!current) return { ok: false, message: 'Không tìm thấy tài khoản này.' };
    if (locked && current.role === 'admin' && current.status === 'active' && (await activeAdminsExcluding(id)) === 0) {
      return { ok: false, message: 'Không thể khoá quản trị cuối cùng đang hoạt động.' };
    }
    await db.update(accounts).set({ status: locked ? 'locked' : 'active', updatedAt: new Date() }).where(eq(accounts.id, id));
    await writeAudit({ action: locked ? 'lock' : 'unlock', entity: 'account', entityId: id, summary: `${locked ? 'Khoá' : 'Mở khoá'} tài khoản ${current.email}` });
    revalidatePath('/tai-khoan');
    return { ok: true, message: locked ? `Đã khoá ${current.email}` : `Đã mở khoá ${current.email}` };
  } catch (error) {
    return errorResult(error);
  }
}

export async function deleteAccountAction(id: number): Promise<ActionResult> {
  try {
    await requirePermission('accounts.manage');
    await requireAccountAccess(id);
    const [current] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    if (!current) return { ok: false, message: 'Không tìm thấy tài khoản này.' };
    if (current.role === 'admin' && current.status === 'active' && (await activeAdminsExcluding(id)) === 0) {
      return { ok: false, message: 'Không thể xoá quản trị cuối cùng đang hoạt động.' };
    }
    await db.delete(accounts).where(eq(accounts.id, id));
    await writeAudit({ action: 'delete', entity: 'account', entityId: id, summary: `Xoá tài khoản ${current.email}` });
    revalidatePath('/tai-khoan');
    return { ok: true, message: `Đã xoá ${current.email}` };
  } catch (error) {
    return errorResult(error);
  }
}

// Đổi một ô trong ma trận quyền. Quyền cốt lõi của quản trị không gỡ được.
export async function setRolePermissionAction(role: Role, permission: Permission, granted: boolean): Promise<ActionResult> {
  try {
    await requirePermission('accounts.manage');
    await requireAdmin();
    if (!ROLE_CODES.includes(role) || !PERMISSIONS.some((p) => p.key === permission)) {
      return { ok: false, message: 'Quyền hoặc vai trò không hợp lệ.' };
    }
    if (role === 'admin' && !granted && (LOCKED_ADMIN_PERMISSIONS as string[]).includes(permission)) {
      return { ok: false, message: 'Quản trị luôn giữ quyền này.' };
    }
    const [existing] = await db
      .select({ id: rolePermissions.id })
      .from(rolePermissions)
      .where(and(eq(rolePermissions.role, role), eq(rolePermissions.permission, permission)))
      .limit(1);
    if (existing) {
      await db.update(rolePermissions).set({ granted, updatedAt: new Date() }).where(eq(rolePermissions.id, existing.id));
    } else {
      await db.insert(rolePermissions).values({ role, permission, granted });
    }
    const label = PERMISSIONS.find((p) => p.key === permission)?.label ?? permission;
    await writeAudit({ action: granted ? 'grant' : 'revoke', entity: 'permission', entityId: `${role}:${permission}`, summary: `${granted ? 'Cấp' : 'Gỡ'} "${label}" cho ${ROLE_LABELS[role]}` });
    revalidatePath('/tai-khoan');
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
}
