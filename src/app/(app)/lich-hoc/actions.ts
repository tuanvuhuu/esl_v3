'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { classes, classSessions, teachers } from '@/db/schema';
import { teacherTeachesCampus } from '@/lib/queries/teachers';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { requireSessionAccess } from '@/lib/campus-access';
import { safely } from '@/lib/telegram/core';
import { notifySessionCancelled, notifySessionChanged, notifySessionRestored } from '@/lib/telegram/notify';
import { cancelReasonSchema, sessionFormSchema } from '@/lib/validation/class';
import { fieldErrorsFrom, type ActionResult } from '@/lib/validation/student';

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action buổi học:', error);
  return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
}

async function loadSession(id: number) {
  const [row] = await db
    .select({
      id: classSessions.id,
      classId: classSessions.classId,
      status: classSessions.status,
      sessionNo: classSessions.sessionNo,
      startsAt: classSessions.startsAt,
      room: classSessions.room,
      teacherId: classSessions.teacherId,
    })
    .from(classSessions)
    .where(eq(classSessions.id, id))
    .limit(1);
  return row ?? null;
}

// Sửa buổi chưa học: ngày, giờ, giáo viên, phòng, chủ đề. Buổi đã học xong không sửa được.
export async function updateSessionAction(id: number, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('classes.manage');
    await requireSessionAccess(id);
    const parsed = sessionFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const session = await loadSession(id);
    if (!session) return { ok: false, message: 'Không tìm thấy buổi học này.' };
    if (session.status === 'done') return { ok: false, message: 'Buổi này đã học xong nên không sửa được.' };
    if (session.status === 'cancelled') return { ok: false, message: 'Buổi này đã huỷ. Khôi phục trước khi sửa.' };

    const v = parsed.data;
    const [teacher] = await db.select({ id: teachers.id, staffRole: teachers.staffRole }).from(teachers).where(eq(teachers.id, v.teacherId)).limit(1);
    if (!teacher) return { ok: false, message: 'Giáo viên không tồn tại.', fieldErrors: { teacherId: 'Giáo viên không tồn tại' } };
    // Trợ giảng không dạy buổi học: buổi chỉ do giáo viên chủ nhiệm hoặc giáo viên nước ngoài dạy
    if (teacher.staffRole === 'assistant') {
      return { ok: false, message: 'Trợ giảng không dạy buổi học. Chọn giáo viên.', fieldErrors: { teacherId: 'Chọn giáo viên, không chọn trợ giảng' } };
    }
    // Giáo viên của buổi học phải dạy ở cơ sở của lớp
    const [cls] = await db.select({ campusId: classes.campusId }).from(classes).where(eq(classes.id, session.classId)).limit(1);
    if (cls && !(await teacherTeachesCampus(v.teacherId, cls.campusId))) {
      return { ok: false, message: 'Giáo viên này chưa dạy ở cơ sở của lớp.', fieldErrors: { teacherId: 'Giáo viên chưa dạy ở cơ sở này' } };
    }

    const startsAt = new Date(`${v.date}T${v.startTime}:00+07:00`);
    const endsAt = new Date(`${v.date}T${v.endTime}:00+07:00`);
    const [clash] = await db
      .select({ id: classSessions.id })
      .from(classSessions)
      .where(and(eq(classSessions.classId, session.classId), eq(classSessions.startsAt, startsAt), ne(classSessions.id, id)))
      .limit(1);
    if (clash) return { ok: false, message: 'Lớp đã có buổi học vào thời điểm này.', fieldErrors: { startTime: 'Lớp đã có buổi học lúc này' } };

    await db
      .update(classSessions)
      .set({ startsAt, endsAt, teacherId: v.teacherId, room: v.room, topic: v.topic, updatedAt: new Date() })
      .where(eq(classSessions.id, id));

    await writeAudit({ action: 'update', entity: 'session', entityId: id, summary: `Sửa buổi ${session.sessionNo} lúc ${v.date} ${v.startTime}` });
    revalidatePath('/lich-hoc');
    revalidatePath(`/lop-hoc/${session.classId}`);
    await safely('đổi lịch buổi', () => notifySessionChanged(id, { startsAt: session.startsAt, room: session.room, teacherId: session.teacherId }));
    return { ok: true, message: `Đã lưu buổi ${session.sessionNo}` };
  } catch (error) {
    return errorResult(error);
  }
}

// Huỷ buổi chưa học, bắt buộc có lý do. Buổi bị huỷ hiện gạch ngang trên lịch.
export async function cancelSessionAction(id: number, reason: string): Promise<ActionResult> {
  try {
    await requirePermission('classes.manage');
    await requireSessionAccess(id);
    const parsed = cancelReasonSchema.safeParse(reason);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Lý do không hợp lệ.', fieldErrors: { cancelReason: parsed.error.issues[0]?.message ?? 'Lý do không hợp lệ' } };
    const session = await loadSession(id);
    if (!session) return { ok: false, message: 'Không tìm thấy buổi học này.' };
    if (session.status !== 'planned') return { ok: false, message: 'Chỉ huỷ được buổi chưa học.' };

    await db
      .update(classSessions)
      .set({ status: 'cancelled', cancelReason: parsed.data, updatedAt: new Date() })
      .where(eq(classSessions.id, id));
    await writeAudit({ action: 'cancel', entity: 'session', entityId: id, summary: `Huỷ buổi ${session.sessionNo}: ${parsed.data}` });
    revalidatePath('/lich-hoc');
    revalidatePath(`/lop-hoc/${session.classId}`);
    await safely('huỷ buổi', () => notifySessionCancelled(id));
    return { ok: true, message: `Đã huỷ buổi ${session.sessionNo}` };
  } catch (error) {
    return errorResult(error);
  }
}

// Khôi phục buổi đã huỷ về trạng thái chưa học
export async function restoreSessionAction(id: number): Promise<ActionResult> {
  try {
    await requirePermission('classes.manage');
    await requireSessionAccess(id);
    const session = await loadSession(id);
    if (!session) return { ok: false, message: 'Không tìm thấy buổi học này.' };
    if (session.status !== 'cancelled') return { ok: false, message: 'Buổi này không ở trạng thái đã huỷ.' };

    await db
      .update(classSessions)
      .set({ status: 'planned', cancelReason: '', updatedAt: new Date() })
      .where(eq(classSessions.id, id));
    await writeAudit({ action: 'restore', entity: 'session', entityId: id, summary: `Khôi phục buổi ${session.sessionNo}` });
    revalidatePath('/lich-hoc');
    revalidatePath(`/lop-hoc/${session.classId}`);
    await safely('khôi phục buổi', () => notifySessionRestored(id));
    return { ok: true, message: `Đã khôi phục buổi ${session.sessionNo}` };
  } catch (error) {
    return errorResult(error);
  }
}
