'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { courseLevels, learningEvents, students } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { requireStudentAccess } from '@/lib/campus-access';
import { getCurrentAccount } from '@/lib/session';
import type { ActionResult } from '@/lib/validation/student';

// Đổi trình độ của học sinh. Gợi ý lên (source "suggestion") chỉ nhận trình độ kế tiếp.
// Mỗi lần đổi ghi một sự kiện vào lịch sử học tập. Giáo viên xác nhận là bước ghi.
export async function setStudentLevelAction(studentId: number, levelId: number | null, source: 'suggestion' | 'manual'): Promise<ActionResult> {
  try {
    await requirePermission('learning.manage');
    await requireStudentAccess(studentId);
    const account = await getCurrentAccount();
    const [student] = await db
      .select({ id: students.id, fullName: students.fullName, levelId: students.levelId })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);
    if (!student) return { ok: false, message: 'Học sinh này không còn tồn tại.' };

    const levels = await db.select({ id: courseLevels.id, code: courseLevels.code, sort: courseLevels.sort }).from(courseLevels);
    const current = levels.find((l) => l.id === student.levelId) ?? null;
    const target = levelId === null ? null : (levels.find((l) => l.id === levelId) ?? null);
    if (levelId !== null && !target) return { ok: false, message: 'Trình độ này không còn trong danh sách.' };
    if (target && target.id === student.levelId) return { ok: true, message: `${student.fullName} đã ở trình độ ${target.code}` };
    if (source === 'suggestion' && (!current || !target || target.sort !== current.sort + 1)) {
      return { ok: false, message: 'Chỉ lên được trình độ kế tiếp theo gợi ý.' };
    }

    let eventType: 'level_up' | 'note';
    let title: string;
    let detail = '';
    if (!target) {
      eventType = 'note';
      title = 'Bỏ xếp trình độ';
      detail = current ? `Từ ${current.code}` : '';
    } else if (source === 'suggestion' && current) {
      eventType = 'level_up';
      title = `Lên trình độ ${target.code}`;
      detail = `Từ ${current.code}. Ba bài gần nhất đạt ngưỡng ở cả bốn kỹ năng.`;
    } else if (!current) {
      eventType = 'note';
      title = `Xếp trình độ ${target.code}`;
    } else if (target.sort > current.sort) {
      eventType = 'level_up';
      title = `Lên trình độ ${target.code}`;
      detail = `Từ ${current.code}`;
    } else {
      eventType = 'note';
      title = `Đổi trình độ từ ${current.code} sang ${target.code}`;
    }

    await db.transaction(async (tx) => {
      await tx.update(students).set({ levelId: target?.id ?? null, updatedAt: new Date() }).where(eq(students.id, studentId));
      await tx.insert(learningEvents).values({ studentId, eventType, title, detail, createdByAccountId: account?.id ?? null });
    });
    await writeAudit({ action: 'update', entity: 'student', entityId: studentId, summary: `${title} cho ${student.fullName}` });
    revalidatePath('/hoc-sinh');
    revalidatePath(`/hoc-sinh/${studentId}`);
    revalidatePath('/lich-su-hoc-tap');
    return { ok: true, message: `${title} · ${student.fullName}` };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi đổi trình độ học sinh:', error);
    return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
  }
}
