'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { db } from '@/db/client';
import { campuses } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { CAMPUS_ALL, CAMPUS_COOKIE } from '@/lib/campus';
import { countClassesOfCampus, countTeachersOfCampus, listCampuses } from '@/lib/queries/campuses';
import { getCurrentAccount } from '@/lib/session';
import { campusFormSchema } from '@/lib/validation/campus';
import { fieldErrorsFrom, type ActionResult } from '@/lib/validation/student';

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action cơ sở:', error);
  return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
}

async function nameTaken(name: string, exceptId: number | null): Promise<boolean> {
  const where = exceptId ? and(eq(campuses.name, name), ne(campuses.id, exceptId)) : eq(campuses.name, name);
  const [row] = await db.select({ id: campuses.id }).from(campuses).where(where).limit(1);
  return !!row;
}

// Đổi cơ sở đang xem, lưu trong cookie. Ai đăng nhập cũng đổi được vì đây chỉ là cách xem dữ liệu.
export async function setCampusAction(value: string): Promise<ActionResult> {
  const account = await getCurrentAccount();
  if (!account) return { ok: false, message: 'Phiên đăng nhập đã hết. Đăng nhập lại.' };
  const ids = (await listCampuses()).map((c) => c.id);
  if (value !== CAMPUS_ALL && !ids.includes(Number(value))) return { ok: false, message: 'Không tìm thấy cơ sở này.' };

  const jar = await cookies();
  jar.set(CAMPUS_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 365 * 24 * 3600,
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function createCampusAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('settings.manage');
    const parsed = campusFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    if (await nameTaken(v.name, null)) return { ok: false, message: 'Tên cơ sở này đã có.', fieldErrors: { name: 'Tên cơ sở này đã có' } };
    const [created] = await db.insert(campuses).values({ name: v.name, address: v.address }).returning({ id: campuses.id });
    await writeAudit({ action: 'create', entity: 'campus', entityId: created.id, summary: `Thêm cơ sở ${v.name}` });
    revalidatePath('/co-so');
    revalidatePath('/', 'layout');
    return { ok: true, message: `Đã thêm cơ sở ${v.name}` };
  } catch (error) {
    return errorResult(error);
  }
}

export async function updateCampusAction(id: number, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('settings.manage');
    const parsed = campusFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    const [exists] = await db.select({ id: campuses.id }).from(campuses).where(eq(campuses.id, id)).limit(1);
    if (!exists) return { ok: false, message: 'Không tìm thấy cơ sở này. Có thể đã bị xoá.' };
    if (await nameTaken(v.name, id)) return { ok: false, message: 'Tên cơ sở này đã có.', fieldErrors: { name: 'Tên cơ sở này đã có' } };
    await db.update(campuses).set({ name: v.name, address: v.address, updatedAt: new Date() }).where(eq(campuses.id, id));
    await writeAudit({ action: 'update', entity: 'campus', entityId: id, summary: `Sửa cơ sở ${v.name}` });
    revalidatePath('/co-so');
    revalidatePath('/', 'layout');
    return { ok: true, message: `Đã lưu cơ sở ${v.name}` };
  } catch (error) {
    return errorResult(error);
  }
}

// Xoá cơ sở. Bị chặn khi còn lớp, và khi đây là cơ sở cuối cùng.
export async function deleteCampusAction(id: number): Promise<ActionResult> {
  try {
    await requirePermission('settings.manage');
    const all = await listCampuses();
    const current = all.find((c) => c.id === id);
    if (!current) return { ok: false, message: 'Không tìm thấy cơ sở này. Có thể đã bị xoá.' };
    if (all.length <= 1) return { ok: false, message: 'Không xoá được: cần giữ ít nhất một cơ sở.' };
    const n = await countClassesOfCampus(id);
    if (n > 0) {
      return { ok: false, message: `Không xoá được: ${current.name} còn ${n} lớp. Chuyển các lớp sang cơ sở khác trước.` };
    }
    const t = await countTeachersOfCampus(id);
    if (t > 0) {
      return { ok: false, message: `Không xoá được: ${current.name} còn ${t} giáo viên dạy. Bỏ cơ sở này khỏi giáo viên trước.` };
    }
    await db.delete(campuses).where(eq(campuses.id, id));
    await writeAudit({ action: 'delete', entity: 'campus', entityId: id, summary: `Xoá cơ sở ${current.name}` });
    revalidatePath('/co-so');
    revalidatePath('/', 'layout');
    return { ok: true, message: `Đã xoá ${current.name}` };
  } catch (error) {
    return errorResult(error);
  }
}
