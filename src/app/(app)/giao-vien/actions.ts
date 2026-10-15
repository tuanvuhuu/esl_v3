'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { teacherCampuses, teachers } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { campusesExist } from '@/lib/queries/campuses';
import { campusIdsOfTeacher, classSlotsOfTeacher, countClassesOfTeacher } from '@/lib/queries/teachers';
import { STAFF_ROLE_LABELS, TEACHER_STATUS_LABELS, teacherFormSchema, type StaffRole } from '@/lib/validation/teacher';
import { fieldErrorsFrom, type ActionResult } from '@/lib/validation/student';

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action giáo viên:', error);
  return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
}

// Ô nhiều lựa chọn (cơ sở dạy) không đi qua Object.fromEntries được, nên lấy riêng
function readForm(formData: FormData) {
  return { ...Object.fromEntries(formData), campusIds: formData.getAll('campusIds') };
}

export type TeacherFormValues = {
  name: string;
  subject: string;
  phone: string;
  years: number;
  status: 'active' | 'leave';
  staffRole: StaffRole;
  campusIds: string[];
};

export async function createTeacherAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('teachers.manage');
    const parsed = teacherFormSchema.safeParse(readForm(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    const campusIds = [...new Set(v.campusIds)];
    if (!(await campusesExist(campusIds))) return { ok: false, message: 'Cơ sở không tồn tại.', fieldErrors: { campusIds: 'Cơ sở không tồn tại' } };

    const teacherId = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(teachers)
        .values({ name: v.name, subject: v.subject, phone: v.phone, years: v.years, status: v.status, staffRole: v.staffRole })
        .returning({ id: teachers.id });
      await tx.insert(teacherCampuses).values(campusIds.map((campusId) => ({ teacherId: created.id, campusId })));
      return created.id;
    });
    await writeAudit({ action: 'create', entity: 'teacher', entityId: teacherId, summary: `Thêm giáo viên ${v.name}` });
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
    const parsed = teacherFormSchema.safeParse(readForm(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    const campusIds = [...new Set(v.campusIds)];
    const [exists] = await db.select({ id: teachers.id, staffRole: teachers.staffRole }).from(teachers).where(eq(teachers.id, id)).limit(1);
    if (!exists) return { ok: false, message: 'Không tìm thấy giáo viên này. Có thể đã bị xoá.' };
    if (v.staffRole !== exists.staffRole) {
      // Đổi vai trò chỉ được khi không còn lớp nào giữ vị trí của vai trò cũ
      const blocking = (await classSlotsOfTeacher(id)).filter((s) => s.slot !== v.staffRole);
      if (blocking.length > 0) {
        const names = [...new Set(blocking.map((s) => s.className))].join(', ');
        return {
          ok: false,
          message: `Chưa đổi được vai trò: ${v.name} còn giữ vị trí ở lớp ${names}. Chuyển các lớp đó sang người khác trước.`,
          fieldErrors: { staffRole: 'Còn lớp giữ vai trò cũ' },
        };
      }
    }
    if (!(await campusesExist(campusIds))) return { ok: false, message: 'Cơ sở không tồn tại.', fieldErrors: { campusIds: 'Cơ sở không tồn tại' } };

    await db.transaction(async (tx) => {
      await tx
        .update(teachers)
        .set({ name: v.name, subject: v.subject, phone: v.phone, years: v.years, status: v.status, staffRole: v.staffRole, updatedAt: new Date() })
        .where(eq(teachers.id, id));
      // Đặt lại danh sách cơ sở dạy: xoá các liên kết cũ rồi thêm theo form
      await tx.delete(teacherCampuses).where(eq(teacherCampuses.teacherId, id));
      await tx.insert(teacherCampuses).values(campusIds.map((campusId) => ({ teacherId: id, campusId })));
    });
    await writeAudit({ action: 'update', entity: 'teacher', entityId: id, summary: `Sửa ${v.name} (${STAFF_ROLE_LABELS[v.staffRole]}, ${TEACHER_STATUS_LABELS[v.status]})` });
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
      .select({ name: teachers.name, subject: teachers.subject, phone: teachers.phone, years: teachers.years, status: teachers.status, staffRole: teachers.staffRole })
      .from(teachers)
      .where(eq(teachers.id, id))
      .limit(1);
    if (!row) return { ok: false, message: 'Không tìm thấy giáo viên này. Có thể đã bị xoá.' };
    const campusIds = (await campusIdsOfTeacher(id)).map(String);
    return { ok: true, values: { ...row, campusIds } };
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
