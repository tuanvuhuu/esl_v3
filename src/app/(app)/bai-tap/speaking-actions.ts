'use server';

// Chấm bài nói theo mốc thời gian (35.8): xem, thêm, sửa, xoá lỗi giáo viên đánh dấu trong bản ghi âm của học sinh.
import { and, asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { assignmentItems, assignmentSubmissions, speakingAssessments, speakingFeedback, students, uploadedFiles } from '@/db/schema';
import { ForbiddenError, requirePermission } from '@/lib/authz';
import { requireAssignmentAccess, requireStudentAccess } from '@/lib/campus-access';
import { getCurrentAccount } from '@/lib/session';
import { sendSpeakingFeedback } from '@/lib/telegram/speaking';
import { todayKeyVN } from '@/lib/datetime';
import {
  isSpeakingError,
  rubricToPoints,
  SCALE_CRITERIA,
  SPEAKING_ERRORS,
  speakingScale,
  type SpeakingCriterion,
  type SpeakingErrorType,
  type SpeakingMark,
  type SpeakingScale,
} from '@/lib/speaking';
import type { ActionResult } from '@/lib/validation/student';

const markSchema = z.object({
  atMs: z.number().int().min(0, 'Mốc thời gian không hợp lệ').max(10 * 60 * 1000, 'Mốc thời gian không hợp lệ'),
  errorType: z.string().refine(isSpeakingError, 'Chọn loại lỗi'),
  correctText: z.string().trim().max(200, 'Chữ đúng tối đa 200 ký tự'),
  note: z.string().trim().max(300, 'Ghi chú tối đa 300 ký tự'),
  redo: z.boolean(),
  modelFileId: z.number().int().positive().nullable().default(null),
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
  modelFileId: r.modelFileId,
});

export type SpeakingRubric = { scores: Partial<Record<SpeakingCriterion, number>>; praise: string };

// Thang chấm theo tuổi học sinh (35.9), lỗi đã đánh dấu và kết quả chấm theo tiêu chí của từng câu nói
export async function listSpeakingMarksAction(
  assignmentId: number,
  studentId: number,
): Promise<{ ok: true; marks: SpeakingMark[]; scale: SpeakingScale; rubrics: Record<number, SpeakingRubric> } | { ok: false; message: string }> {
  try {
    const subId = await submissionFor(assignmentId, studentId);
    const [kid] = await db.select({ dob: students.dob }).from(students).where(eq(students.id, studentId)).limit(1);
    const scale = speakingScale(kid?.dob ?? null, todayKeyVN());
    if (!subId) return { ok: true, marks: [], scale, rubrics: {} };
    const [rows, assessed] = await Promise.all([
      db.select().from(speakingFeedback).where(eq(speakingFeedback.submissionId, subId)).orderBy(asc(speakingFeedback.itemId), asc(speakingFeedback.atMs)),
      db.select().from(speakingAssessments).where(eq(speakingAssessments.submissionId, subId)),
    ]);
    const rubrics = Object.fromEntries(
      assessed.map((a) => [
        a.itemId,
        {
          scores: Object.fromEntries(SCALE_CRITERIA[a.scale as SpeakingScale].map((k) => [k, a[k]]).filter(([, v]) => v !== null)),
          praise: a.praise,
        },
      ]),
    );
    return { ok: true, marks: rows.map(toMark), scale, rubrics };
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
    if (v.modelFileId !== null) {
      const [f] = await db.select({ id: uploadedFiles.id }).from(uploadedFiles).where(eq(uploadedFiles.id, v.modelFileId)).limit(1);
      if (!f) return { ok: false, message: 'Không tìm thấy giọng mẫu vừa ghi. Ghi lại.' };
    }
    const values = { atMs: v.atMs, errorType: v.errorType, correctText: v.correctText, note: v.note, redo: v.redo, modelFileId: v.modelFileId, updatedAt: new Date() };
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

// Lưu kết quả chấm theo tiêu chí của một câu nói (35.9). "Điều con làm tốt" bắt buộc. Trả về điểm câu đã quy đổi
// để hộp chấm điền vào ô điểm rồi lưu bài làm như thường.
export async function saveSpeakingRubricAction(assignmentId: number, studentId: number, itemId: number, rubric: SpeakingRubric): Promise<ActionResult & { points?: number }> {
  try {
    const subId = await submissionFor(assignmentId, studentId, itemId);
    if (!subId) return { ok: false, message: 'Học sinh chưa nộp bài nói này.' };
    const [kid] = await db.select({ dob: students.dob }).from(students).where(eq(students.id, studentId)).limit(1);
    const scale = speakingScale(kid?.dob ?? null, todayKeyVN());
    const [item] = await db.select({ points: assignmentItems.points, position: assignmentItems.position }).from(assignmentItems).where(eq(assignmentItems.id, itemId)).limit(1);
    const praise = rubric.praise.trim();
    if (praise.length < 2) return { ok: false, message: `Câu ${item?.position ?? ''}: ghi "Điều con làm tốt" trước khi chấm.`, fieldErrors: { praise: 'Ghi điều con làm tốt' } };
    if (praise.length > 300) return { ok: false, message: '"Điều con làm tốt" tối đa 300 ký tự.' };
    const points = rubricToPoints(scale, rubric.scores, item?.points ?? 0);
    if (points === null) return { ok: false, message: `Câu ${item?.position ?? ''}: chấm đủ các tiêu chí ${scale === 'stars' ? '(1–3 sao)' : '(0–5 điểm)'}.` };
    const account = await getCurrentAccount();
    const cols = Object.fromEntries((['pronunciation', 'fluency', 'task', 'vocabulary', 'grammar'] as SpeakingCriterion[]).map((k) => [k, SCALE_CRITERIA[scale].includes(k) ? rubric.scores[k]! : null]));
    const values = { scale, ...cols, praise, gradedByAccountId: account?.id ?? null, updatedAt: new Date() };
    await db
      .insert(speakingAssessments)
      .values({ submissionId: subId, itemId, ...values })
      .onConflictDoUpdate({ target: [speakingAssessments.submissionId, speakingAssessments.itemId], set: values });
    return { ok: true, message: 'Đã lưu tiêu chí', points };
  } catch (error) {
    return errorResult(error);
  }
}

// Gửi nhận xét bài nói của một học sinh cho phụ huynh qua Telegram (35.11): lời khen, tiêu chí, lỗi cần luyện, giọng mẫu,
// chữ ký giáo viên, bản sao cho super admin. Lấy từ dữ liệu đã lưu, nên hộp chấm lưu trước rồi mới gọi.
export async function sendSpeakingFeedbackAction(assignmentId: number, studentId: number): Promise<ActionResult> {
  try {
    const submissionId = await submissionFor(assignmentId, studentId);
    if (!submissionId) return { ok: false, message: 'Học sinh chưa nộp bài này.' };
    const account = await getCurrentAccount();
    if (!account) return { ok: false, message: 'Cần đăng nhập.' };
    const r = await sendSpeakingFeedback(submissionId, account.id);
    if (r.status === 'sent') return { ok: true, message: `Đã gửi nhận xét bài nói cho ${r.chats} phụ huynh qua Telegram` };
    if (r.status === 'no_parent') return { ok: false, message: 'Phụ huynh của em này chưa kết nối Telegram nên chưa gửi được nhận xét.' };
    if (r.status === 'unchanged') return { ok: true, message: 'Nhận xét này đã gửi phụ huynh rồi. Sửa nhận xét thì gửi được bản mới.' };
    return { ok: false, message: 'Chưa có nhận xét bài nói để gửi: chấm tiêu chí, ghi điều con làm tốt hoặc đánh dấu lỗi trước.' };
  } catch (error) {
    return errorResult(error);
  }
}
