'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { assignmentSubmissions, speakingFeedback, submissionCriterionScores, submissionItemScores, uploadedFiles } from '@/db/schema';
import { writeAudit } from '@/lib/authz';
import { isAutoScoredItem, itemPoints, storedScore, summarizeSubmission, type ScoringAnswer } from '@/lib/assignment-scoring';
import { listItemsOfAssignment, toScoringItems } from '@/lib/queries/assignment-items';
import { getAssignmentBase } from '@/lib/queries/assignments';
import { criterionScoresOf, enrolledStudent, existingSubmissionScores } from '@/lib/queries/student-portal';
import { getCurrentAccount } from '@/lib/session';
import { completeDirectUpload, prepareDirectUpload, saveUpload, type PrepareDirectUploadResult } from '@/lib/storage';
import { recordChildAgreement, studentVoiceAccess } from '@/lib/queries/consents';
import { safely } from '@/lib/telegram/core';
import { notifyStudentSubmitted } from '@/lib/telegram/notify';
import { notifyClassStaff } from '@/lib/telegram/service';
import { sameClass, studentMayResubmit } from '@/lib/student-access';
import { studentAnswersSchema } from '@/lib/validation/student-portal';
import type { ActionResult } from '@/lib/validation/student';

export type StudentAnswerInput = { itemId: number; selectedOptionId: number | null; answerText: string; fileId: number | null };

// Điểm phần tự chấm sau khi nộp, để màn chúc mừng hiện sao theo điểm thật (P35.27).
// autoMax = 0 khi bài chỉ có câu nói, viết, nộp tệp; pendingReview khi còn câu chờ giáo viên chấm.
export type SubmitScore = { autoPoints: number; autoMax: number; pendingReview: boolean };
export type SubmitResult = ActionResult & { score?: SubmitScore };

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

// Tải thẳng tệp lên kho tệp (Supabase) bằng link có chữ ký, không qua server action giới hạn 1 MB (P35.6).
// mode "server" khi chưa cấu hình kho tệp: giao diện tải qua studentUploadAction như cũ.
export async function studentRequestUploadAction(fileInfo: { name: string; type: string; size: number }): Promise<PrepareDirectUploadResult> {
  try {
    const me = await currentStudent();
    if (!me) return { ok: false, message: 'Cần đăng nhập bằng tài khoản học sinh.' };
    return await prepareDirectUpload(fileInfo);
  } catch (error) {
    console.error('Lỗi học sinh xin link tải tệp:', error);
    return { ok: false, message: 'Không tải được tệp. Thử lại sau ít phút.' };
  }
}

// Xác nhận tệp đã tải xong; tệp gắn với tài khoản học sinh này
export async function studentConfirmUploadAction(params: { storageKey: string; fileName: string; mimeType: string; sizeBytes: number }): Promise<{ ok: true; fileId: number; name: string } | { ok: false; message: string }> {
  try {
    const me = await currentStudent();
    if (!me) return { ok: false, message: 'Cần đăng nhập bằng tài khoản học sinh.' };
    const saved = await completeDirectUpload({ ...params, accountId: me.accountId });
    if (!saved.ok) return saved;
    return { ok: true, fileId: saved.id, name: saved.name };
  } catch (error) {
    console.error('Lỗi học sinh xác nhận tải tệp:', error);
    return { ok: false, message: 'Không lưu được tệp. Thử lại sau ít phút.' };
  }
}

// Trẻ từ 7 tuổi tự đồng ý ghi âm sau khi phụ huynh đã đồng ý (P35.12)
export async function childAgreeVoiceAction(): Promise<{ ok: boolean; message: string }> {
  try {
    const me = await currentStudent();
    if (!me) return { ok: false, message: 'Cần đăng nhập bằng tài khoản học sinh.' };
    const done = await recordChildAgreement(me.studentId);
    if (!done) return { ok: false, message: 'Phụ huynh chưa đồng ý cho con ghi âm.' };
    await writeAudit({ action: 'consent', entity: 'student', entityId: me.studentId, summary: 'Học sinh tự đồng ý ghi âm' });
    revalidatePath('/cua-toi');
    return { ok: true, message: 'Cảm ơn con! Giờ con ghi âm được rồi.' };
  } catch (error) {
    console.error('Lỗi học sinh đồng ý ghi âm:', error);
    return { ok: false, message: 'Chưa lưu được. Thử lại nhé.' };
  }
}

// Học sinh nộp bài. Trắc nghiệm được chấm ngay theo đáp án đúng ở máy chủ. Câu viết và nộp tệp chờ giáo viên.
// Nộp lại được cho đến khi bài đã chấm xong. Điểm và nhận xét giáo viên đã cho được giữ lại.
export async function submitMyAnswersAction(assignmentId: number, input: StudentAnswerInput[]): Promise<SubmitResult> {
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
    // Câu nói chỉ nhận bản ghi khi phụ huynh đã đồng ý ghi âm (P35.12), kể cả khi gọi thẳng action
    const voice = await studentVoiceAccess(me.studentId);
    const scoringAnswers: ScoringAnswer[] = items.map((item) => {
      const raw = parsed.data.find((r) => r.itemId === item.id);
      const row = raw && item.itemType.startsWith('speak_') && !voice.allowed ? { ...raw, fileId: null } : raw;
      const prior = kept.find((k) => k.itemId === item.id);
      return {
        itemId: item.id,
        selectedOptionId: row?.selectedOptionId ?? null,
        answerText: row?.answerText ?? '',
        fileId: row?.fileId ?? null,
        points: isAutoScoredItem(item.itemType) ? null : (prior?.points ?? null),
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

      // Giữ bản ghi cũ của câu đã nói lại (35.10) khi ghi lại các dòng
      const redo = await tx
        .select({ itemId: submissionItemScores.itemId, previousFileId: submissionItemScores.previousFileId, redoneAt: submissionItemScores.redoneAt })
        .from(submissionItemScores)
        .where(eq(submissionItemScores.submissionId, sub.id));
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
          previousFileId: redo.find((r) => r.itemId === a.itemId)?.previousFileId ?? null,
          redoneAt: redo.find((r) => r.itemId === a.itemId)?.redoneAt ?? null,
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
    // Báo phụ huynh con đã nộp bài (docs/KICH-BAN-TELEGRAM.md mục 1.7)
    await safely('học sinh nộp bài', () =>
      notifyStudentSubmitted(assignmentId, student.id, summary.status === 'graded' ? `Điểm tự chấm: ${summary.total}/${summary.maxTotal}.` : 'Có câu Thầy/Cô sẽ chấm sau, bot sẽ báo điểm khi chấm xong.'),
    );
    const autoItems = items.filter((i) => isAutoScoredItem(i.itemType));
    const progress: SubmitScore = {
      autoPoints: autoItems.reduce((sum, i) => sum + (summary.points[i.id] ?? 0), 0),
      autoMax: autoItems.reduce((sum, i) => sum + i.points, 0),
      pendingReview: summary.status !== 'graded',
    };
    if (summary.status === 'graded') return { ok: true, message: `Đã nộp bài: ${summary.total}/${summary.maxTotal} điểm`, score: progress };
    return { ok: true, message: 'Đã nộp bài. Giáo viên sẽ chấm câu viết, câu nói và tệp nộp.', score: progress };
  } catch (error) {
    console.error('Lỗi học sinh nộp bài:', error);
    return { ok: false, message: 'Không nộp được bài. Thử lại sau ít phút.' };
  }
}

// Nói lại câu bị giáo viên đánh dấu "nói lại" (35.10): bản cũ giữ ở previous_file_id để giáo viên nghe cạnh bản mới.
// Chỉ câu nói có ít nhất một lỗi đánh dấu nói lại; tệp phải do chính học sinh này vừa tải lên; phụ huynh đã đồng ý ghi âm.
export async function redoSpeakingAction(assignmentId: number, itemId: number, fileId: number): Promise<ActionResult> {
  try {
    const me = await currentStudent();
    if (!me) return { ok: false, message: 'Cần đăng nhập bằng tài khoản học sinh.' };
    const student = await enrolledStudent(me.studentId);
    const base = await getAssignmentBase(assignmentId);
    if (!student || !base || !sameClass(student.classId, base.classId)) return { ok: false, message: 'Bài này không thuộc lớp của bạn.' };
    if (!(await studentVoiceAccess(me.studentId)).allowed) return { ok: false, message: 'Phụ huynh chưa đồng ý cho con ghi âm.' };
    const [file] = await db.select({ id: uploadedFiles.id }).from(uploadedFiles).where(and(eq(uploadedFiles.id, fileId), eq(uploadedFiles.uploadedByAccountId, me.accountId))).limit(1);
    if (!file) return { ok: false, message: 'Không tìm thấy bản ghi vừa lưu. Thử ghi lại.' };
    const [row] = await db
      .select({ id: submissionItemScores.id, fileId: submissionItemScores.fileId, previousFileId: submissionItemScores.previousFileId })
      .from(submissionItemScores)
      .innerJoin(assignmentSubmissions, eq(assignmentSubmissions.id, submissionItemScores.submissionId))
      .where(and(eq(assignmentSubmissions.assignmentId, assignmentId), eq(assignmentSubmissions.studentId, me.studentId), eq(submissionItemScores.itemId, itemId)))
      .limit(1);
    if (!row) return { ok: false, message: 'Câu này chưa có bài nộp.' };
    const [redo] = await db
      .select({ id: speakingFeedback.id })
      .from(speakingFeedback)
      .innerJoin(submissionItemScores, eq(submissionItemScores.submissionId, speakingFeedback.submissionId))
      .where(and(eq(submissionItemScores.id, row.id), eq(speakingFeedback.itemId, itemId), eq(speakingFeedback.redo, true)))
      .limit(1);
    if (!redo) return { ok: false, message: 'Câu này không cần nói lại.' };
    // Nói lại nhiều lần: bản cũ vẫn là bản giáo viên đã chấm lần đầu
    await db
      .update(submissionItemScores)
      .set({ previousFileId: row.previousFileId ?? row.fileId, fileId, redoneAt: new Date(), updatedAt: new Date() })
      .where(eq(submissionItemScores.id, row.id));
    await writeAudit({ action: 'redo', entity: 'assignment', entityId: assignmentId, summary: `Học sinh nói lại câu ${itemId} bài ${base.title}` });
    await safely('nói lại', () => notifyClassStaff(base.classId, `🎤 Em ${student.fullName} đã nói lại câu được đánh dấu trong bài "${base.title}". Thầy/Cô mở màn chấm để nghe bản mới cạnh bản cũ.`, 'submission'));
    revalidatePath(`/cua-toi/${assignmentId}`);
    revalidatePath(`/bai-tap/${assignmentId}`);
    return { ok: true, message: 'Đã lưu bản nói lại. Thầy/Cô sẽ nghe và nhận xét.' };
  } catch (error) {
    console.error('Lỗi nói lại:', error);
    return { ok: false, message: 'Chưa lưu được. Thử lại sau ít phút.' };
  }
}

// Chế độ luyện tập (35.5): kiểm một câu tự chấm ngay khi con bấm Kiểm tra. Chỉ trả đúng hay sai, không gửi đáp án đúng
// (như E-089); chỉ dùng được với bài đặt chế độ luyện tập. Không lưu gì: bài làm vẫn nộp một lần ở cuối.
export async function checkPracticeAnswerAction(assignmentId: number, input: StudentAnswerInput): Promise<{ ok: true; correct: boolean } | { ok: false; message: string }> {
  try {
    const me = await currentStudent();
    if (!me) return { ok: false, message: 'Cần đăng nhập bằng tài khoản học sinh.' };
    const student = await enrolledStudent(me.studentId);
    const base = await getAssignmentBase(assignmentId);
    if (!student || !base || !sameClass(student.classId, base.classId)) return { ok: false, message: 'Bài này không thuộc lớp của bạn.' };
    if (base.mode !== 'practice') return { ok: false, message: 'Bài này không ở chế độ luyện tập.' };
    const items = await listItemsOfAssignment(assignmentId);
    const item = toScoringItems(items).find((i) => i.id === input.itemId);
    if (!item || !isAutoScoredItem(item.itemType)) return { ok: false, message: 'Câu này không tự kiểm được.' };
    const got = itemPoints(item, { itemId: item.id, selectedOptionId: input.selectedOptionId, answerText: input.answerText ?? '', fileId: null, points: null });
    return { ok: true, correct: (got ?? 0) >= item.points };
  } catch (error) {
    console.error('Lỗi kiểm câu luyện tập:', error);
    return { ok: false, message: 'Chưa kiểm được. Thử lại nhé.' };
  }
}
