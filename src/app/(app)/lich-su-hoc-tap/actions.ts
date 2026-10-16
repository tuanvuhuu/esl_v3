'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { learningEvents, students } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { requireStudentAccess } from '@/lib/campus-access';
import { LEARNING_EVENT_LABELS, learningEventSchema } from '@/lib/validation/learning';
import { fieldErrorsFrom, type ActionResult } from '@/lib/validation/student';

// Thêm ghi chú, thăng cấp, kiểm tra, đổi trạng thái cho một học sinh. Ngày ghi là 12:00 theo giờ Việt Nam.
export async function addLearningEventAction(studentId: number, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('learning.manage');
    await requireStudentAccess(studentId);
    const parsed = learningEventSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    const [student] = await db.select({ id: students.id, fullName: students.fullName }).from(students).where(eq(students.id, studentId)).limit(1);
    if (!student) return { ok: false, message: 'Không tìm thấy học sinh này. Có thể đã bị xoá.' };

    await db.insert(learningEvents).values({
      studentId,
      eventType: v.eventType,
      title: v.title,
      detail: v.detail,
      occurredAt: new Date(`${v.occurredDate}T12:00:00+07:00`),
    });
    await writeAudit({ action: 'create', entity: 'learning', entityId: studentId, summary: `${LEARNING_EVENT_LABELS[v.eventType]} cho ${student.fullName}: ${v.title}` });
    revalidatePath(`/hoc-sinh/${studentId}`);
    revalidatePath('/lich-su-hoc-tap');
    return { ok: true, message: `Đã ghi "${v.title}" vào lịch sử học tập` };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi server action lịch sử học tập:', error);
    return { ok: false, message: 'Không ghi được. Thử lại sau ít phút.' };
  }
}
