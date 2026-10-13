'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { teachers } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { TEACHER_STATUS_LABELS, teacherFormSchema } from '@/lib/validation/teacher';
import { fieldErrorsFrom, type ActionResult } from '@/lib/validation/student';
import { countClassesOfTeacher } from '@/lib/queries/teachers';

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action giáo viên:', error);
  return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
}

export type TeacherFormValues = {
  name: string;
  subject: string;
  phone: string;
  years: number;
  status: 'active' | 'leave';
};

export async function createTeacherAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('teachers.manage');
    const parsed = teacherFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    const [created] = await db
      .insert(teachers)
      .values({ name: v.name, subject: v.subject, phone: v.phone, years: v.years, status: v.status })
      .returning({ id: teachers.id });
    await writeAudit({ action: 'create', entity: 'teacher', entityId: created.id, summary: `Thêm giáo viên ${v.name}` });
    revalidatePath('/giao-vien');
    revalidatePath('/lop-hoc');
    return { ok: true, message: `Đã thêm ${v.name}` };
  } catch (error) {
    return errorResult(error);
  }
}

export async function updateTeacherAction(id: number, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('teachers.manage');
    const parsed = teacherFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    const [exists] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.id, id)).limit(1);
    if (!exists) return { ok: false, message: 'Không tìm thấy giáo viên này. Có thể đã bị xoá.' };
    await db
      .update(teachers)
      .set({ name: v.name, subject: v.subject, phone: v.phone, years: v.years, status: v.status, updatedAt: new Date() })
      .where(eq(teachers.id, id));
    await writeAudit({ action: 'update', entity: 'teacher', entityId: id, summary: `Sửa giáo viên ${v.name} (${TEACHER_STATUS_LABELS[v.status]})` });
    revalidatePath('/giao-vien');
    revalidatePath('/lop-hoc');
    revalidatePath('/tai-khoan');
    return { ok: true, message: `Đã lưu thay đổi cho ${v.name}` };
  } catch (error) {
    return errorResult(error);
  }
}

// Đọc dữ liệu để điền sẵn form sửa
export async function loadTeacherForm(id: number): Promise<{ ok: true; values: TeacherFormValues } | { ok: false; message: string }> {
  try {
    await requirePermission('teachers.manage');
    const [row] = await db
      .select({ name: teachers.name, subject: teachers.subject, phone: teachers.phone, years: teachers.years, status: teachers.status })
      .from(teachers)
      .where(eq(teachers.id, id))
      .limit(1);
    if (!row) return { ok: false, message: 'Không tìm thấy giáo viên này. Có thể đã bị xoá.' };
    return { ok: true, values: row };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi đọc giáo viên để sửa:', error);
    return { ok: false, message: 'Không đọc được dữ liệu. Thử lại sau ít phút.' };
  }
}

// Xoá giáo viên. Bị chặn khi còn lớp đang dạy: phải chuyển lớp sang giáo viên khác trước.
export async function deleteTeacherAction(id: number): Promise<ActionResult> {
  try {
    await requirePermission('teachers.manage');
    const [row] = await db.select({ name: teachers.name }).from(teachers).where(eq(teachers.id, id)).limit(1);
    if (!row) return { ok: false, message: 'Không tìm thấy giáo viên này. Có thể đã bị xoá.' };
    const n = await countClassesOfTeacher(id);
    if (n > 0) {
      return { ok: false, message: `Không xoá được: ${row.name} còn ${n} lớp. Chuyển các lớp sang giáo viên khác trước.` };
    }
    await db.delete(teachers).where(eq(teachers.id, id));
    await writeAudit({ action: 'delete', entity: 'teacher', entityId: id, summary: `Xoá giáo viên ${row.name}` });
    revalidatePath('/giao-vien');
    revalidatePath('/tai-khoan');
    return { ok: true, message: `Đã xoá ${row.name}` };
  } catch (error) {
    return errorResult(error);
  }
}
