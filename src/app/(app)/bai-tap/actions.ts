'use server';

import { and, eq, inArray, max, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { assignmentItems, assignmentSubmissions, assignments, classes, lessonCampuses, students } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { safely } from '@/lib/telegram/core';
import { notifyAssignmentCreated, notifyGraded } from '@/lib/telegram/notify';
import { requireAssignmentAccess, requireClassAccess } from '@/lib/campus-access';
import { getAssignmentBase } from '@/lib/queries/assignments';
import { assignmentFormSchema, gradingRowSchema, SUBMISSION_LABELS } from '@/lib/validation/assignment';
import { fieldErrorsFrom, type ActionResult } from '@/lib/validation/student';

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action bài tập:', error);
  return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
}

function revalidateAssignments(classId: number, assignmentId?: number) {
  revalidatePath('/bai-tap');
  revalidatePath(`/lop-hoc/${classId}`);
  revalidatePath('/tong-quan');
  revalidatePath('/lich-su-hoc-tap');
  if (assignmentId) revalidatePath(`/bai-tap/${assignmentId}`);
}

// Hạn nộp: ngày và giờ theo giờ Việt Nam
function dueAtFrom(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+07:00`);
}

export type AssignmentFormValues = {
  classId: string;
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  maxScore: number;
  lessonId: string; // '' là không gắn bài giảng
};

// Bài giảng gắn với bài tập phải dùng ở cơ sở của lớp. Trả về mã bài giảng hoặc null khi không gắn.
async function resolveLesson(raw: string, campusId: number): Promise<{ ok: true; lessonId: number | null } | { ok: false; message: string; field: string }> {
  if (raw === '') return { ok: true, lessonId: null };
  const lessonId = Number(raw);
  if (!Number.isInteger(lessonId) || lessonId <= 0) return { ok: false, message: 'Bài giảng không hợp lệ.', field: 'lessonId' };
  const [row] = await db
    .select({ lessonId: lessonCampuses.lessonId })
    .from(lessonCampuses)
    .where(and(eq(lessonCampuses.lessonId, lessonId), eq(lessonCampuses.campusId, campusId)))
    .limit(1);
  if (!row) return { ok: false, message: 'Bài giảng này không dùng ở cơ sở của lớp.', field: 'lessonId' };
  return { ok: true, lessonId };
}

export async function createAssignmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    const parsed = assignmentFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    await requireClassAccess(v.classId);
    const [cls] = await db.select({ id: classes.id, name: classes.name, campusId: classes.campusId }).from(classes).where(eq(classes.id, v.classId)).limit(1);
    if (!cls) return { ok: false, message: 'Lớp này không tồn tại.', fieldErrors: { classId: 'Lớp này không tồn tại' } };
    const lesson = await resolveLesson(v.lessonId, cls.campusId);
    if (!lesson.ok) return { ok: false, message: lesson.message, fieldErrors: { [lesson.field]: lesson.message } };

    const [created] = await db
      .insert(assignments)
      .values({ classId: v.classId, title: v.title, description: v.description, dueAt: dueAtFrom(v.dueDate, v.dueTime), maxScore: v.maxScore, lessonId: lesson.lessonId })
      .returning({ id: assignments.id });
    await writeAudit({ action: 'create', entity: 'assignment', entityId: created.id, summary: `Tạo bài tập ${v.title} cho lớp ${cls.name}` });
    revalidateAssignments(v.classId);
    await safely('bài tập mới', () => notifyAssignmentCreated(created.id));
    return { ok: true, message: `Đã tạo bài tập ${v.title}` };
  } catch (error) {
    return errorResult(error);
  }
}

// Sửa bài tập. Lớp không đổi. Không đặt điểm tối đa thấp hơn điểm đã chấm.
export async function updateAssignmentAction(id: number, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    await requireAssignmentAccess(id);
    const base = await getAssignmentBase(id);
    if (!base) return { ok: false, message: 'Không tìm thấy bài tập này. Có thể đã bị xoá.' };
    const parsed = assignmentFormSchema.safeParse({ ...Object.fromEntries(formData), classId: String(base.classId) });
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    const [top] = await db
      .select({ score: max(assignmentSubmissions.score) })
      .from(assignmentSubmissions)
      .where(eq(assignmentSubmissions.assignmentId, id));
    // Bài có câu hỏi: điểm tối đa phải bằng tổng điểm các câu
    const itemRows = await db.select({ points: assignmentItems.points }).from(assignmentItems).where(eq(assignmentItems.assignmentId, id));
    if (itemRows.length > 0) {
      const itemTotal = itemRows.reduce((sum, r) => sum + r.points, 0);
      if (v.maxScore !== itemTotal) {
        return { ok: false, message: `Bài có câu hỏi nên điểm tối đa là tổng điểm các câu (${itemTotal}).`, fieldErrors: { maxScore: `Phải bằng ${itemTotal}` } };
      }
    }
    const topScore = Number(top?.score ?? 0);
    if (v.maxScore < topScore) {
      return { ok: false, message: `Điểm tối đa không được thấp hơn điểm đã chấm (${topScore}).`, fieldErrors: { maxScore: `Tối thiểu ${topScore}` } };
    }
    const lesson = await resolveLesson(v.lessonId, base.campusId);
    if (!lesson.ok) return { ok: false, message: lesson.message, fieldErrors: { [lesson.field]: lesson.message } };

    await db
      .update(assignments)
      .set({ title: v.title, description: v.description, dueAt: dueAtFrom(v.dueDate, v.dueTime), maxScore: v.maxScore, lessonId: lesson.lessonId, updatedAt: new Date() })
      .where(eq(assignments.id, id));
    await writeAudit({ action: 'update', entity: 'assignment', entityId: id, summary: `Sửa bài tập ${v.title}` });
    revalidateAssignments(base.classId, id);
    return { ok: true, message: `Đã lưu bài tập ${v.title}` };
  } catch (error) {
    return errorResult(error);
  }
}

export async function loadAssignmentForm(id: number): Promise<{ ok: true; values: AssignmentFormValues } | { ok: false; message: string }> {
  try {
    await requirePermission('assignments.manage');
    await requireAssignmentAccess(id);
    const base = await getAssignmentBase(id);
    if (!base) return { ok: false, message: 'Không tìm thấy bài tập này. Có thể đã bị xoá.' };
    const due = new Date(base.dueAt.getTime() + 7 * 3_600_000).toISOString();
    return {
      ok: true,
      values: {
        classId: String(base.classId),
        title: base.title,
        description: base.description,
        dueDate: due.slice(0, 10),
        dueTime: due.slice(11, 16),
        maxScore: base.maxScore,
        lessonId: base.lessonId === null ? '' : String(base.lessonId),
      },
    };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi đọc bài tập để sửa:', error);
    return { ok: false, message: 'Không đọc được dữ liệu. Thử lại sau ít phút.' };
  }
}

// Xoá bài tập và toàn bộ bài nộp của bài đó
export async function deleteAssignmentAction(id: number): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    await requireAssignmentAccess(id);
    const base = await getAssignmentBase(id);
    if (!base) return { ok: false, message: 'Không tìm thấy bài tập này. Có thể đã bị xoá.' };
    await db.delete(assignments).where(eq(assignments.id, id));
    await writeAudit({ action: 'delete', entity: 'assignment', entityId: id, summary: `Xoá bài tập ${base.title} (lớp ${base.className})` });
    revalidateAssignments(base.classId);
    return { ok: true, message: `Đã xoá bài tập ${base.title}` };
  } catch (error) {
    return errorResult(error);
  }
}

const batchSchema = z.array(gradingRowSchema).min(1, 'Chưa có dòng nào để lưu').max(200, 'Lưu tối đa 200 dòng một lần');

// Lưu chấm điểm và trạng thái nộp. Chỉ ghi học sinh đang học của lớp.
export async function saveSubmissionsAction(
  assignmentId: number,
  rows: { studentId: number; status: 'not_submitted' | 'submitted' | 'graded'; score: number | null; feedback: string }[],
): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    await requireAssignmentAccess(assignmentId);
    const base = await getAssignmentBase(assignmentId);
    if (!base) return { ok: false, message: 'Không tìm thấy bài tập này. Có thể đã bị xoá.' };
    const withItems = await db.select({ id: assignmentItems.id }).from(assignmentItems).where(eq(assignmentItems.assignmentId, assignmentId)).limit(1);
    if (withItems.length > 0) return { ok: false, message: 'Bài này có câu hỏi, nên chấm từng câu trong bảng chi tiết.' };
    const parsed = batchSchema.safeParse(rows);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dữ liệu chấm điểm không hợp lệ' };

    const enrolled = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.classId, base.classId), inArray(students.status, ['active', 'trial'])));
    const enrolledIds = new Set(enrolled.map((s) => s.id));
    const outside = parsed.data.find((r) => !enrolledIds.has(r.studentId));
    if (outside) return { ok: false, message: 'Có học sinh không thuộc lớp này hoặc đã nghỉ học.' };
    const over = parsed.data.find((r) => r.score !== null && r.score > base.maxScore);
    if (over) return { ok: false, message: `Điểm không được quá ${base.maxScore}.` };

    const existing = await db
      .select({ studentId: assignmentSubmissions.studentId, submittedAt: assignmentSubmissions.submittedAt })
      .from(assignmentSubmissions)
      .where(eq(assignmentSubmissions.assignmentId, assignmentId));
    const submittedBefore = new Map(existing.map((e) => [e.studentId, e.submittedAt]));
    const now = new Date();

    const values = parsed.data.map((r) => ({
      assignmentId,
      studentId: r.studentId,
      status: r.status,
      score: r.status === 'graded' ? r.score : null,
      feedback: r.feedback,
      submittedAt: r.status === 'not_submitted' ? null : (submittedBefore.get(r.studentId) ?? now),
    }));
    await db
      .insert(assignmentSubmissions)
      .values(values)
      .onConflictDoUpdate({
        target: [assignmentSubmissions.assignmentId, assignmentSubmissions.studentId],
        set: {
          status: sql`excluded.status`,
          score: sql`excluded.score`,
          feedback: sql`excluded.feedback`,
          submittedAt: sql`excluded.submitted_at`,
          updatedAt: now,
        },
      });

    const count = (s: string) => parsed.data.filter((r) => r.status === s).length;
    await writeAudit({
      action: 'grade',
      entity: 'assignment',
      entityId: assignmentId,
      summary: `Chấm bài ${base.title}: ${count('graded')} ${SUBMISSION_LABELS.graded.toLowerCase()}, ${count('submitted')} ${SUBMISSION_LABELS.submitted.toLowerCase()}, ${count('not_submitted')} ${SUBMISSION_LABELS.not_submitted.toLowerCase()}`,
    });
    revalidateAssignments(base.classId, assignmentId);
    // Báo phụ huynh điểm và nhận xét mới; điểm và nhận xét không đổi thì không gửi lại (mã sự kiện gồm cả hai)
    for (const r of parsed.data) {
      if (r.status === 'graded' && r.score !== null) {
        const score = r.score;
        await safely('điểm mới', () => notifyGraded(assignmentId, r.studentId, { score, max: base.maxScore, feedback: r.feedback }));
      }
    }
    return { ok: true, message: `Đã lưu ${parsed.data.length} dòng chấm điểm` };
  } catch (error) {
    return errorResult(error);
  }
}
