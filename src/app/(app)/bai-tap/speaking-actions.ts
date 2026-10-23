'use server';

// Chấm bài nói theo mốc thời gian (35.8): xem, thêm, sửa, xoá lỗi giáo viên đánh dấu trong bản ghi âm của học sinh.
import { and, asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { assignmentItems, assignmentSubmissions, speakingFeedback } from '@/db/schema';
import { ForbiddenError, requirePermission } from '@/lib/authz';
import { requireAssignmentAccess, requireStudentAccess } from '@/lib/campus-access';
import { getCurrentAccount } from '@/lib/session';
import { isSpeakingError, SPEAKING_ERRORS, type SpeakingErrorType, type SpeakingMark } from '@/lib/speaking';
import type { ActionResult } from '@/lib/validation/student';

const markSchema = z.object({
  atMs: z.number().int().min(0, 'Mốc thời gian không hợp lệ').max(10 * 60 * 1000, 'Mốc thời gian không hợp lệ'),
  errorType: z.string().refine(isSpeakingError, 'Chọn loại lỗi'),
  correctText: z.string().trim().max(200, 'Chữ đúng tối đa 200 ký tự'),
  note: z.string().trim().max(300, 'Ghi chú tối đa 300 ký tự'),
  redo: z.boolean(),
});
export type MarkInput = z.input<typeof markSchema>;

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi chấm bài nói:', error);
  return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
}

// Bài làm của học sinh trong bài tập này; câu phải là câu nói của bài
async function submissionFor(assignmentId: number, studentId: number, itemId?: number): Promise<number | null> {
  await requirePermission('assignments.manage');
  await requireAssignmentAccess(assignmentId);
  await requireStudentAccess(studentId);
  if (itemId !== undefined) {
    const [item] = await db.select({ type: assignmentItems.itemType }).from(assignmentItems).where(and(eq(assignmentItems.id, itemId), eq(assignmentItems.assignmentId, assignmentId))).limit(1);
    if (!item || !item.type.startsWith('speak_')) throw new ForbiddenError('Câu này không phải câu nói của bài.');
  }
  const [sub] = await db
    .select({ id: assignmentSubmissions.id })
    .from(assignmentSubmissions)
    .where(and(eq(assignmentSubmissions.assignmentId, assignmentId), eq(assignmentSubmissions.studentId, studentId)))
    .limit(1);
  return sub?.id ?? null;
}

const toMark = (r: typeof speakingFeedback.$inferSelect): SpeakingMark => ({
  id: r.id,
  itemId: r.itemId,
  atMs: r.atMs,
  errorType: r.errorType as SpeakingErrorType,
  correctText: r.correctText,
  note: r.note,
  redo: r.redo,
});

export async function listSpeakingMarksAction(assignmentId: number, studentId: number): Promise<{ ok: true; marks: SpeakingMark[] } | { ok: false; message: string }> {
  try {
    const subId = await submissionFor(assignmentId, studentId);
    if (!subId) return { ok: true, marks: [] };
    const rows = await db.select().from(speakingFeedback).where(eq(speakingFeedback.submissionId, subId)).orderBy(asc(speakingFeedback.itemId), asc(speakingFeedback.atMs));
    return { ok: true, marks: rows.map(toMark) };
  } catch (error) {
    const r = errorResult(error);
    return { ok: false, message: r.message ?? 'Không đọc được' };
  }
}

export async function saveSpeakingMarkAction(
  assignmentId: number,
  studentId: number,
  itemId: number,
  input: MarkInput,
  markId: number | null,
): Promise<ActionResult & { mark?: SpeakingMark }> {
  try {
    const subId = await submissionFor(assignmentId, studentId, itemId);
    if (!subId) return { ok: false, message: 'Học sinh chưa nộp bài nói này.' };
    const parsed = markSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ' };
    const v = parsed.data;
    const account = await getCurrentAccount();
    const values = { atMs: v.atMs, errorType: v.errorType, correctText: v.correctText, note: v.note, redo: v.redo, updatedAt: new Date() };
    const [row] = markId
      ? await db
          .update(speakingFeedback)
          .set(values)
          .where(and(eq(speakingFeedback.id, markId), eq(speakingFeedback.submissionId, subId), eq(speakingFeedback.itemId, itemId)))
          .returning()
      : await db.insert(speakingFeedback).values({ ...values, submissionId: subId, itemId, createdByAccountId: account?.id ?? null }).returning();
    if (!row) return { ok: false, message: 'Không tìm thấy lỗi đã đánh dấu. Có thể đã bị xoá.' };
    revalidatePath(`/bai-tap/${assignmentId}`);
    return { ok: true, message: markId ? 'Đã sửa lỗi đã đánh dấu' : `Đã đánh dấu lỗi: ${SPEAKING_ERRORS[v.errorType as SpeakingErrorType]}`, mark: toMark(row) };
  } catch (error) {
    return errorResult(error);
  }
}

export async function deleteSpeakingMarkAction(assignmentId: number, studentId: number, markId: number): Promise<ActionResult> {
  try {
    const subId = await submissionFor(assignmentId, studentId);
    if (!subId) return { ok: false, message: 'Không tìm thấy bài làm.' };
    const removed = await db.delete(speakingFeedback).where(and(eq(speakingFeedback.id, markId), eq(speakingFeedback.submissionId, subId))).returning({ id: speakingFeedback.id });
    if (removed.length === 0) return { ok: false, message: 'Lỗi này đã được xoá.' };
    revalidatePath(`/bai-tap/${assignmentId}`);
    return { ok: true, message: 'Đã xoá lỗi đã đánh dấu' };
  } catch (error) {
    return errorResult(error);
  }
}
