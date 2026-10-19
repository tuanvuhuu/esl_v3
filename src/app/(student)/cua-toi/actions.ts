'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { assignmentSubmissions, submissionCriterionScores, submissionItemScores, uploadedFiles } from '@/db/schema';
import { writeAudit } from '@/lib/authz';
import { storedScore, summarizeSubmission, type ScoringAnswer } from '@/lib/assignment-scoring';
import { listItemsOfAssignment, toScoringItems } from '@/lib/queries/assignment-items';
import { getAssignmentBase } from '@/lib/queries/assignments';
import { criterionScoresOf, enrolledStudent, existingSubmissionScores } from '@/lib/queries/student-portal';
import { getCurrentAccount } from '@/lib/session';
import { saveUpload } from '@/lib/storage';
import { notifyClassStaff } from '@/lib/telegram/service';
import { sameClass, studentMayResubmit } from '@/lib/student-access';
import { studentAnswersSchema } from '@/lib/validation/student-portal';
import type { ActionResult } from '@/lib/validation/student';

export type StudentAnswerInput = { itemId: number; selectedOptionId: number | null; answerText: string; fileId: number | null };

// Chỉ tài khoản học sinh mới dùng được các hàm dưới đây. Học sinh không có quyền quản lý.
async function currentStudent() {
  const account = await getCurrentAccount();
  if (!account || account.role !== 'student' || account.studentId === null) return null;
  return { accountId: account.id, studentId: account.studentId };
}

// Học sinh tải tệp bài nộp lên. Tệp gắn với tài khoản này, nên chỉ chính họ nộp được tệp đó.
export async function studentUploadAction(formData: FormData): Promise<{ ok: true; fileId: number; name: string } | { ok: false; message: string }> {
  try {
    const me = await currentStudent();
    if (!me) return { ok: false, message: 'Cần đăng nhập bằng tài khoản học sinh.' };
    const file = formData.get('file');
    if (!(file instanceof File)) return { ok: false, message: 'Chưa chọn tệp.' };
    const saved = await saveUpload(file, me.accountId);
    if (!saved.ok) return saved;
    return { ok: true, fileId: saved.id, name: saved.name };
  } catch (error) {
    console.error('Lỗi học sinh tải tệp:', error);
    return { ok: false, message: 'Không tải được tệp. Thử lại sau ít phút.' };
  }
}

// Học sinh nộp bài. Trắc nghiệm được chấm ngay theo đáp án đúng ở máy chủ. Câu viết và nộp tệp chờ giáo viên.
// Nộp lại được cho đến khi bài đã chấm xong. Điểm và nhận xét giáo viên đã cho được giữ lại.
export async function submitMyAnswersAction(assignmentId: number, input: StudentAnswerInput[]): Promise<ActionResult> {
  try {
    const me = await currentStudent();
    if (!me) return { ok: false, message: 'Cần đăng nhập bằng tài khoản học sinh.' };
    const student = await enrolledStudent(me.studentId);
    if (!student) return { ok: false, message: 'Bạn không còn đang học nên không nộp được bài.' };
    const base = await getAssignmentBase(assignmentId);
    if (!base || !sameClass(student.classId, base.classId)) return { ok: false, message: 'Bài này không thuộc lớp của bạn.' };

    const parsed = studentAnswersSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Bài làm không hợp lệ' };
    const items = await listItemsOfAssignment(assignmentId);
    const byId = new Map(items.map((i) => [i.id, i]));
    for (const row of parsed.data) {
      const item = byId.get(row.itemId);
      if (!item) return { ok: false, message: 'Có câu không thuộc bài này.' };
      if (row.selectedOptionId !== null && !item.options.some((o) => o.id === row.selectedOptionId)) {
        return { ok: false, message: `Đáp án đã chọn không thuộc câu số ${item.position}.` };
      }
    }
    // Tệp phải là tệp do chính học sinh này tải lên
    const fileIds = [...new Set(parsed.data.map((r) => r.fileId).filter((x): x is number => x !== null))];
    for (const fileId of fileIds) {
      const [mine] = await db
        .select({ id: uploadedFiles.id })
        .from(uploadedFiles)
        .where(and(eq(uploadedFiles.id, fileId), eq(uploadedFiles.uploadedByAccountId, me.accountId)))
        .limit(1);
      if (!mine) return { ok: false, message: 'Có tệp không còn trên máy chủ. Tải lại tệp rồi nộp.' };
    }

    const [existing] = await db
      .select({ id: assignmentSubmissions.id, status: assignmentSubmissions.status })
      .from(assignmentSubmissions)
      .where(and(eq(assignmentSubmissions.assignmentId, assignmentId), eq(assignmentSubmissions.studentId, me.studentId)))
      .limit(1);
    if (existing && !studentMayResubmit(existing.status)) return { ok: false, message: 'Bài đã được chấm nên không nộp lại được.' };

    const kept = existing ? await existingSubmissionScores(existing.id) : [];
    const keptCriteria = existing ? await criterionScoresOf(existing.id) : [];
    const scoringAnswers: ScoringAnswer[] = items.map((item) => {
      const row = parsed.data.find((r) => r.itemId === item.id);
      const prior = kept.find((k) => k.itemId === item.id);
      return {
        itemId: item.id,
        selectedOptionId: row?.selectedOptionId ?? null,
        answerText: row?.answerText ?? '',
        fileId: row?.fileId ?? null,
        points: item.itemType === 'choice' ? null : (prior?.points ?? null),
        criterionPoints: Object.fromEntries(item.criteria.map((c) => [c.id, keptCriteria.find((k) => k.criterionId === c.id)?.points ?? null])),
      };
    });
    const summary = summarizeSubmission(toScoringItems(items), scoringAnswers);
    if (summary.status === 'not_submitted') return { ok: false, message: 'Bạn chưa làm câu nào. Làm ít nhất một câu rồi nộp.' };
    const score = storedScore(summary);
    const now = new Date();

    await db.transaction(async (tx) => {
      const [sub] = await tx
        .insert(assignmentSubmissions)
        .values({ assignmentId, studentId: me.studentId, status: summary.status, score, feedback: '', submittedAt: now })
        .onConflictDoUpdate({
          target: [assignmentSubmissions.assignmentId, assignmentSubmissions.studentId],
          set: { status: summary.status, score, submittedAt: now, updatedAt: now },
        })
        .returning({ id: assignmentSubmissions.id });

      await tx.delete(submissionItemScores).where(eq(submissionItemScores.submissionId, sub.id));
      await tx.delete(submissionCriterionScores).where(eq(submissionCriterionScores.submissionId, sub.id));
      const itemRows = scoringAnswers
        .filter((a) => a.selectedOptionId !== null || a.answerText !== '' || a.fileId !== null || a.points !== null)
        .map((a) => ({
          submissionId: sub.id,
          itemId: a.itemId,
          selectedOptionId: a.selectedOptionId,
          answerText: a.answerText,
          fileId: a.fileId,
          points: a.points,
          comment: kept.find((k) => k.itemId === a.itemId)?.comment ?? '',
          updatedAt: now,
        }));
      if (itemRows.length > 0) await tx.insert(submissionItemScores).values(itemRows);
      const criterionRows = keptCriteria
        .filter((c) => c.points !== null)
        .map((c) => ({ submissionId: sub.id, criterionId: c.criterionId, points: c.points, updatedAt: now }));
      if (criterionRows.length > 0) await tx.insert(submissionCriterionScores).values(criterionRows);
    });

    await writeAudit({ action: 'submit', entity: 'assignment', entityId: assignmentId, summary: `${student.fullName} nộp bài ${base.title}` });
    revalidatePath('/cua-toi');
    revalidatePath(`/cua-toi/${assignmentId}`);
    revalidatePath(`/bai-tap/${assignmentId}`);
    // Báo giáo viên của lớp qua Telegram (nếu đã kết nối). Không chờ được thì vẫn trả kết quả nộp bài.
    await notifyClassStaff(base.classId, `${student.fullName} (lớp ${base.className}) vừa nộp bài "${base.title}".${summary.status === 'graded' ? ` Điểm tự chấm: ${summary.total}/${summary.maxTotal}.` : ' Có câu cần giáo viên chấm.'}`, 'submission');
    if (summary.status === 'graded') return { ok: true, message: `Đã nộp bài: ${summary.total}/${summary.maxTotal} điểm` };
    return { ok: true, message: 'Đã nộp bài. Giáo viên sẽ chấm câu viết và nộp tệp.' };
  } catch (error) {
    console.error('Lỗi học sinh nộp bài:', error);
    return { ok: false, message: 'Không nộp được bài. Thử lại sau ít phút.' };
  }
}
