'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { courseLevels, levelThresholds } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { SKILLS, type Skill } from '@/lib/assignment-scoring';
import { levelSettingSchema } from '@/lib/validation/level';
import type { ActionResult } from '@/lib/validation/student';

// Sửa tên trình độ và ngưỡng từng kỹ năng. Ngưỡng để trống thì không có ngưỡng lên.
export async function saveLevelAction(levelId: number, input: { name: string; thresholds: Record<Skill, number | null> }): Promise<ActionResult> {
  try {
    await requirePermission('settings.manage');
    const parsed = levelSettingSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Trình độ không hợp lệ' };
    const [level] = await db.select({ id: courseLevels.id, code: courseLevels.code }).from(courseLevels).where(eq(courseLevels.id, levelId)).limit(1);
    if (!level) return { ok: false, message: 'Trình độ này không còn trong danh sách.' };

    const { name, thresholds } = parsed.data;
    await db.transaction(async (tx) => {
      await tx.update(courseLevels).set({ name, updatedAt: new Date() }).where(eq(courseLevels.id, levelId));
      await tx.delete(levelThresholds).where(eq(levelThresholds.levelId, levelId));
      const rows = SKILLS.filter((s) => thresholds[s] !== null).map((s) => ({ levelId, skill: s, minPercent: thresholds[s] as number }));
      if (rows.length > 0) await tx.insert(levelThresholds).values(rows);
    });
    await writeAudit({ action: 'update', entity: 'course_level', entityId: levelId, summary: `Sửa trình độ ${level.code}: ${name}` });
    revalidatePath('/cai-dat');
    revalidatePath('/hoc-sinh');
    return { ok: true, message: `Đã lưu trình độ ${level.code}` };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi lưu trình độ:', error);
    return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
  }
}
