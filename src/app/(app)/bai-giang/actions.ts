'use server';

import { and, eq, inArray, max } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { assignments, classes, lessonCampuses, lessonMaterials, lessons, uploadedFiles } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { CAMPUS_FORBIDDEN, getAllowedCampusIds, requireLessonAccess } from '@/lib/campus-access';
import { campusesExist } from '@/lib/queries/campuses';
import { countAssignmentsOfLesson } from '@/lib/queries/lessons';
import { getCurrentAccount } from '@/lib/session';
import { lessonFormSchema, materialFormSchema } from '@/lib/validation/lesson';
import type { ActionResult } from '@/lib/validation/student';

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action bài giảng:', error);
  return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
}

function revalidateLessons() {
  revalidatePath('/bai-giang');
  revalidatePath('/bai-tap');
}

export type LessonInput = { title: string; objectives: string; content: string; campusIds: number[] };
export type MaterialInput = { kind: string; title: string; url: string; fileId: number | null };

// Tạo hoặc sửa bài giảng. Bỏ một cơ sở khi có lớp của cơ sở đó đang dùng bài giảng này thì bị chặn.
export async function saveLessonAction(id: number | null, input: LessonInput): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    if (id !== null) await requireLessonAccess(id);
    const parsed = lessonFormSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Bài giảng không hợp lệ' };
    const v = parsed.data;
    const campusIds = [...new Set(v.campusIds)];
    // Tài khoản bị giới hạn chỉ đổi các cơ sở trong phạm vi; cơ sở ngoài phạm vi giữ nguyên như cũ
    const allowedCampuses = await getAllowedCampusIds();
    if (allowedCampuses !== null) {
      const existing = id === null ? [] : (await db.select({ campusId: lessonCampuses.campusId }).from(lessonCampuses).where(eq(lessonCampuses.lessonId, id))).map((r) => r.campusId);
      if (campusIds.some((c) => !allowedCampuses.includes(c) && !existing.includes(c))) throw new ForbiddenError(CAMPUS_FORBIDDEN);
      for (const c of existing) if (!allowedCampuses.includes(c) && !campusIds.includes(c)) campusIds.push(c);
    }
    if (!(await campusesExist(campusIds))) return { ok: false, message: 'Có cơ sở không còn tồn tại. Tải lại trang rồi thử lại.' };

    if (id !== null) {
      const [found] = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.id, id)).limit(1);
      if (!found) return { ok: false, message: 'Bài giảng này không còn tồn tại.' };

      const current = await db.select({ campusId: lessonCampuses.campusId }).from(lessonCampuses).where(eq(lessonCampuses.lessonId, id));
      const removed = current.map((c) => c.campusId).filter((c) => !campusIds.includes(c));
      if (removed.length > 0) {
        const [linked] = await db
          .select({ className: classes.name })
          .from(assignments)
          .innerJoin(classes, eq(classes.id, assignments.classId))
          .where(and(eq(assignments.lessonId, id), inArray(classes.campusId, removed)))
          .limit(1);
        if (linked) return { ok: false, message: `Lớp ${linked.className} đang dùng bài giảng này ở cơ sở đó nên không bỏ được cơ sở.` };
      }

      await db.transaction(async (tx) => {
        await tx.update(lessons).set({ title: v.title, objectives: v.objectives, content: v.content, updatedAt: new Date() }).where(eq(lessons.id, id));
        await tx.delete(lessonCampuses).where(eq(lessonCampuses.lessonId, id));
        await tx.insert(lessonCampuses).values(campusIds.map((campusId) => ({ lessonId: id, campusId })));
      });
      await writeAudit({ action: 'update', entity: 'lesson', entityId: id, summary: `Sửa bài giảng ${v.title}` });
      revalidateLessons();
      return { ok: true, message: `Đã lưu bài giảng ${v.title}` };
    }

    const account = await getCurrentAccount();
    const createdId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(lessons)
        .values({ title: v.title, objectives: v.objectives, content: v.content, createdByAccountId: account?.id ?? null })
        .returning({ id: lessons.id });
      await tx.insert(lessonCampuses).values(campusIds.map((campusId) => ({ lessonId: row.id, campusId })));
      return row.id;
    });
    await writeAudit({ action: 'create', entity: 'lesson', entityId: createdId, summary: `Tạo bài giảng ${v.title}` });
    revalidateLessons();
    return { ok: true, message: `Đã tạo bài giảng ${v.title}` };
  } catch (error) {
    return errorResult(error);
  }
}

// Xoá bài giảng. Đang có bài tập gắn thì chặn và nêu số bài.
export async function deleteLessonAction(id: number): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    await requireLessonAccess(id);
    const [found] = await db.select({ id: lessons.id, title: lessons.title }).from(lessons).where(eq(lessons.id, id)).limit(1);
    if (!found) return { ok: false, message: 'Bài giảng này không còn tồn tại.' };
    const linked = await countAssignmentsOfLesson(id);
    if (linked > 0) {
      return { ok: false, message: `Bài giảng này đang có ${linked} bài tập gắn nên chưa xoá được. Gỡ bài giảng khỏi các bài tập đó trước.` };
    }
    await db.delete(lessons).where(eq(lessons.id, id));
    await writeAudit({ action: 'delete', entity: 'lesson', entityId: id, summary: `Xoá bài giảng ${found.title}` });
    revalidateLessons();
    return { ok: true, message: `Đã xoá bài giảng ${found.title}` };
  } catch (error) {
    return errorResult(error);
  }
}

// Thêm một tài liệu (liên kết hoặc tệp đã tải lên) vào cuối danh sách của bài giảng
export async function saveMaterialAction(lessonId: number, input: MaterialInput): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    await requireLessonAccess(lessonId);
    const parsed = materialFormSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Tài liệu không hợp lệ' };
    const v = parsed.data;

    const [lesson] = await db.select({ id: lessons.id, title: lessons.title }).from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    if (!lesson) return { ok: false, message: 'Bài giảng này không còn tồn tại.' };
    if (v.kind === 'file' && v.fileId !== null) {
      const [file] = await db.select({ id: uploadedFiles.id }).from(uploadedFiles).where(eq(uploadedFiles.id, v.fileId)).limit(1);
      if (!file) return { ok: false, message: 'Tệp này không còn trên máy chủ. Tải lại tệp rồi thêm.' };
    }

    const [last] = await db.select({ position: max(lessonMaterials.position) }).from(lessonMaterials).where(eq(lessonMaterials.lessonId, lessonId));
    await db.insert(lessonMaterials).values({
      lessonId,
      position: Number(last?.position ?? 0) + 1,
      kind: v.kind,
      title: v.title,
      url: v.kind === 'link' ? v.url : '',
      fileId: v.kind === 'file' ? v.fileId : null,
    });
    await writeAudit({ action: 'create', entity: 'lesson_material', entityId: lessonId, summary: `Thêm tài liệu ${v.title} cho bài giảng ${lesson.title}` });
    revalidateLessons();
    return { ok: true, message: `Đã thêm tài liệu ${v.title}` };
  } catch (error) {
    return errorResult(error);
  }
}

export async function deleteMaterialAction(id: number): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    const [owner] = await db.select({ lessonId: lessonMaterials.lessonId }).from(lessonMaterials).where(eq(lessonMaterials.id, id)).limit(1);
    if (owner) await requireLessonAccess(owner.lessonId);
    const [found] = await db.select({ id: lessonMaterials.id, title: lessonMaterials.title }).from(lessonMaterials).where(eq(lessonMaterials.id, id)).limit(1);
    if (!found) return { ok: false, message: 'Tài liệu này đã bị xoá.' };
    await db.delete(lessonMaterials).where(eq(lessonMaterials.id, id));
    await writeAudit({ action: 'delete', entity: 'lesson_material', entityId: id, summary: `Xoá tài liệu ${found.title}` });
    revalidateLessons();
    return { ok: true, message: `Đã xoá tài liệu ${found.title}` };
  } catch (error) {
    return errorResult(error);
  }
}
