'use server';

import { and, eq, inArray, max, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import {
  assignmentItemCriteria,
  assignmentItemOptions,
  assignmentItems,
  assignmentSubmissions,
  assignments,
  students,
  submissionCriterionScores,
  submissionItemScores,
  submissionSecondMarks,
  uploadedFiles,
} from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { requireAssignmentAccess, requireStudentAccess } from '@/lib/campus-access';
import { markGap, storedScore, summarizeSubmission, type ScoringAnswer } from '@/lib/assignment-scoring';
import { getAssignmentBase } from '@/lib/queries/assignments';
import { listItemGradingRows, listItemsOfAssignment, toScoringItems, type AssignmentItem } from '@/lib/queries/assignment-items';
import { getCurrentAccount } from '@/lib/session';
import { saveUpload } from '@/lib/storage';
import { answersPayloadSchema, itemsPayloadSchema, secondMarkSchema } from '@/lib/validation/assignment';
import type { ActionResult } from '@/lib/validation/student';

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action câu hỏi bài tập:', error);
  return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
}

function revalidateItems(assignmentId: number) {
  revalidatePath('/bai-tap');
  revalidatePath(`/bai-tap/${assignmentId}`);
}

export type CriterionInput = { id: number | null; name: string; maxPoints: number };

export type ItemInput = {
  id: number | null;
  skill: string;
  itemType: string;
  prompt: string;
  passage: string;
  points: number;
  audioFileId: number | null;
  bankQuestionId: number | null;
  options: { id: number | null; label: string; isCorrect: boolean }[];
  criteria: CriterionInput[];
};

// Lưu toàn bộ câu hỏi của một bài trong một lần: câu cũ giữ id, câu mới thêm, câu bỏ đi xoá (nếu chưa có bài làm).
// Tổng điểm các câu thành điểm tối đa của bài. Câu có tiêu chí: điểm câu bằng tổng điểm tiêu chí.
export async function saveAssignmentItemsAction(assignmentId: number, input: ItemInput[]): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    await requireAssignmentAccess(assignmentId);
    const base = await getAssignmentBase(assignmentId);
    if (!base) return { ok: false, message: 'Không tìm thấy bài tập này. Có thể đã bị xoá.' };
    const parsed = itemsPayloadSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Câu hỏi không hợp lệ' };
    const items = parsed.data;

    // Tệp âm thanh phải còn trên máy chủ
    const audioIds = [...new Set(items.map((i) => i.audioFileId).filter((x): x is number => x !== null))];
    if (audioIds.length > 0) {
      const found = await db.select({ id: uploadedFiles.id }).from(uploadedFiles).where(inArray(uploadedFiles.id, audioIds));
      if (found.length !== audioIds.length) return { ok: false, message: 'Có tệp âm thanh không còn trên máy chủ. Tải lại tệp rồi lưu.' };
    }

    const existing = await listItemsOfAssignment(assignmentId);
    const existingById = new Map(existing.map((i) => [i.id, i]));
    if (items.some((i) => i.id !== null && !existingById.has(i.id))) return { ok: false, message: 'Có câu hỏi không thuộc bài tập này.' };

    // Tiêu chí: id phải thuộc đúng câu đó, câu mới không có tiêu chí cũ
    for (const item of items) {
      const own = new Set((item.id !== null ? existingById.get(item.id)?.criteria : undefined)?.map((c) => c.id) ?? []);
      if (item.criteria.some((c) => c.id !== null && !own.has(c.id))) return { ok: false, message: 'Có tiêu chí không thuộc câu này.' };
    }

    // Đã có bài làm thì không xoá được câu, không bỏ được đáp án đang được chọn
    const existingIds = [...existingById.keys()];
    const usedRows = existingIds.length
      ? await db.select({ itemId: submissionItemScores.itemId, optionId: submissionItemScores.selectedOptionId }).from(submissionItemScores).where(inArray(submissionItemScores.itemId, existingIds))
      : [];
    const usedItemIds = new Set(usedRows.map((r) => r.itemId));
    const usedOptionIds = new Set(usedRows.map((r) => r.optionId).filter((x): x is number => x !== null));

    const keptIds = new Set(items.map((i) => i.id).filter((x): x is number => x !== null));
    const removed = existing.filter((i) => !keptIds.has(i.id));
    const blockedRemoval = removed.find((i) => usedItemIds.has(i.id));
    if (blockedRemoval) return { ok: false, message: `Câu số ${blockedRemoval.position} đã có bài làm nên không xoá được.` };

    // Tiêu chí đã có điểm thì không xoá, và điểm tối đa không hạ xuống dưới điểm đã chấm
    const criterionIds = existing.flatMap((i) => i.criteria.map((c) => c.id));
    const topByCriterion = new Map<number, number>();
    if (criterionIds.length > 0) {
      const scored = await db
        .select({ criterionId: submissionCriterionScores.criterionId, points: submissionCriterionScores.points })
        .from(submissionCriterionScores)
        .where(inArray(submissionCriterionScores.criterionId, criterionIds));
      for (const row of scored) {
        if (row.points === null) continue;
        topByCriterion.set(row.criterionId, Math.max(topByCriterion.get(row.criterionId) ?? 0, row.points));
      }
    }

    for (const item of items) {
      if (item.id === null) continue;
      const before = existingById.get(item.id);
      if (!before) continue;
      const keptOptionIds = new Set(item.itemType === 'choice' ? item.options.map((o) => o.id).filter((x): x is number => x !== null) : []);
      const dropped = before.options.find((o) => !keptOptionIds.has(o.id) && usedOptionIds.has(o.id));
      if (dropped) return { ok: false, message: `Đáp án "${dropped.label}" đã được chọn trong bài làm nên không bỏ được.` };

      for (const c of before.criteria) {
        const top = topByCriterion.get(c.id);
        if (top === undefined) continue;
        const next = item.criteria.find((x) => x.id === c.id);
        if (!next) return { ok: false, message: `Tiêu chí "${c.name}" của câu số ${before.position} đã có điểm nên không xoá được.` };
        if (next.maxPoints < top) return { ok: false, message: `Tiêu chí "${c.name}" đã chấm tới ${top} điểm nên điểm tối đa không được thấp hơn.` };
      }
    }

    const total = items.reduce((sum, i) => sum + i.points, 0);
    const [top] = await db.select({ score: max(assignmentSubmissions.score) }).from(assignmentSubmissions).where(eq(assignmentSubmissions.assignmentId, assignmentId));
    const topScore = Number(top?.score ?? 0);
    if (total < topScore) return { ok: false, message: `Tổng điểm các câu không được thấp hơn điểm đã chấm (${topScore}).` };

    await db.transaction(async (tx) => {
      if (removed.length > 0) await tx.delete(assignmentItems).where(inArray(assignmentItems.id, removed.map((i) => i.id)));

      for (const [index, item] of items.entries()) {
        const values = {
          assignmentId,
          position: index + 1,
          skill: item.skill,
          itemType: item.itemType,
          prompt: item.prompt,
          passage: item.passage,
          points: item.points,
          audioFileId: item.audioFileId,
          bankQuestionId: item.bankQuestionId,
          updatedAt: new Date(),
        };
        let itemId: number;
        if (item.id !== null) {
          await tx.update(assignmentItems).set(values).where(eq(assignmentItems.id, item.id));
          itemId = item.id;
        } else {
          const [created] = await tx.insert(assignmentItems).values(values).returning({ id: assignmentItems.id });
          itemId = created.id;
        }

        // Đáp án: câu không phải trắc nghiệm không có đáp án. Đáp án cũ giữ id, bỏ đáp án không còn.
        const wanted = item.itemType === 'choice' ? item.options : [];
        const keep = new Set(wanted.map((o) => o.id).filter((x): x is number => x !== null));
        const current = existingById.get(itemId)?.options ?? [];
        const drop = current.map((o) => o.id).filter((id) => !keep.has(id));
        if (drop.length > 0) await tx.delete(assignmentItemOptions).where(inArray(assignmentItemOptions.id, drop));
        for (const [oi, opt] of wanted.entries()) {
          const optionValues = { itemId, position: oi + 1, label: opt.label, isCorrect: opt.isCorrect };
          if (opt.id !== null && keep.has(opt.id)) await tx.update(assignmentItemOptions).set(optionValues).where(eq(assignmentItemOptions.id, opt.id));
          else await tx.insert(assignmentItemOptions).values(optionValues);
        }

        // Tiêu chí: câu viết và nộp tệp có thể có; bỏ tiêu chí không còn, giữ id tiêu chí cũ
        const keepCriteria = new Set(item.criteria.map((c) => c.id).filter((x): x is number => x !== null));
        const currentCriteria = existingById.get(itemId)?.criteria ?? [];
        const dropCriteria = currentCriteria.map((c) => c.id).filter((id) => !keepCriteria.has(id));
        if (dropCriteria.length > 0) await tx.delete(assignmentItemCriteria).where(inArray(assignmentItemCriteria.id, dropCriteria));
        for (const [ci, c] of item.criteria.entries()) {
          const criterionValues = { itemId, position: ci + 1, name: c.name, maxPoints: c.maxPoints, updatedAt: new Date() };
          if (c.id !== null && keepCriteria.has(c.id)) await tx.update(assignmentItemCriteria).set(criterionValues).where(eq(assignmentItemCriteria.id, c.id));
          else await tx.insert(assignmentItemCriteria).values(criterionValues);
        }
      }

      await tx.update(assignments).set({ maxScore: total, updatedAt: new Date() }).where(eq(assignments.id, assignmentId));
    });

    await writeAudit({ action: 'update', entity: 'assignment', entityId: assignmentId, summary: `Soạn ${items.length} câu hỏi cho bài ${base.title} (${total} điểm)` });
    revalidateItems(assignmentId);
    return { ok: true, message: `Đã lưu ${items.length} câu hỏi, tổng ${total} điểm` };
  } catch (error) {
    return errorResult(error);
  }
}

// Tải một tệp lên (âm thanh của đề hoặc tệp bài nộp). Trả về id để gắn vào câu hỏi hoặc bài làm.
export async function uploadFileAction(formData: FormData): Promise<{ ok: true; fileId: number; name: string } | { ok: false; message: string }> {
  try {
    await requirePermission('assignments.manage');
    const file = formData.get('file');
    if (!(file instanceof File)) return { ok: false, message: 'Chưa chọn tệp.' };
    const account = await getCurrentAccount();
    const saved = await saveUpload(file, account?.id ?? null);
    if (!saved.ok) return saved;
    await writeAudit({ action: 'upload', entity: 'file', entityId: saved.id, summary: `Tải lên tệp ${saved.name}` });
    return { ok: true, fileId: saved.id, name: saved.name };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi tải tệp bài tập:', error);
    return { ok: false, message: 'Không tải được tệp. Thử lại sau ít phút.' };
  }
}

export type AnswerInput = {
  itemId: number;
  selectedOptionId: number | null;
  answerText: string;
  fileId: number | null;
  points: number | null;
  comment: string;
  criterionPoints: { criterionId: number; points: number | null }[];
};

// Lưu bài làm của một học sinh cho cả bài: đáp án trắc nghiệm, chữ, tệp, điểm, điểm tiêu chí và nhận xét từng câu.
// Trạng thái và tổng điểm tính lại từ các câu. Người lưu được ghi là người chấm lần đầu.
export async function saveStudentAnswersAction(assignmentId: number, studentId: number, input: AnswerInput[]): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    await requireAssignmentAccess(assignmentId);
    await requireStudentAccess(studentId);
    const account = await getCurrentAccount();
    const base = await getAssignmentBase(assignmentId);
    if (!base) return { ok: false, message: 'Không tìm thấy bài tập này. Có thể đã bị xoá.' };
    const parsed = answersPayloadSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Bài làm không hợp lệ' };
    const answers = parsed.data;

    const [student] = await db
      .select({ id: students.id, fullName: students.fullName })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.classId, base.classId), inArray(students.status, ['active', 'trial'])))
      .limit(1);
    if (!student) return { ok: false, message: 'Học sinh này không thuộc lớp hoặc đã nghỉ học.' };

    const items = await listItemsOfAssignment(assignmentId);
    if (items.length === 0) return { ok: false, message: 'Bài này chưa có câu hỏi. Thêm câu hỏi trước khi chấm từng câu.' };
    const byId = new Map(items.map((i) => [i.id, i]));

    const checked: { row: (typeof answers)[number]; item: AssignmentItem }[] = [];
    for (const row of answers) {
      const item = byId.get(row.itemId);
      if (!item) return { ok: false, message: 'Có câu hỏi không thuộc bài này.' };
      if (row.selectedOptionId !== null && !item.options.some((o) => o.id === row.selectedOptionId)) {
        return { ok: false, message: `Đáp án đã chọn không thuộc câu số ${item.position}.` };
      }
      for (const cp of row.criterionPoints) {
        const criterion = item.criteria.find((c) => c.id === cp.criterionId);
        if (!criterion) return { ok: false, message: `Tiêu chí chấm không thuộc câu số ${item.position}.` };
        if (cp.points !== null && cp.points > criterion.maxPoints) {
          return { ok: false, message: `Điểm tiêu chí "${criterion.name}" của câu số ${item.position} không được quá ${criterion.maxPoints}.` };
        }
      }
      // Câu có tiêu chí lấy điểm từ tiêu chí, nên ô điểm chung không dùng
      if (item.criteria.length === 0 && row.points !== null && row.points > item.points) {
        return { ok: false, message: `Điểm câu số ${item.position} không được quá ${item.points}.` };
      }
      checked.push({ row, item });
    }
    const fileIds = [...new Set(answers.map((r) => r.fileId).filter((x): x is number => x !== null))];
    if (fileIds.length > 0) {
      const found = await db.select({ id: uploadedFiles.id }).from(uploadedFiles).where(inArray(uploadedFiles.id, fileIds));
      if (found.length !== fileIds.length) return { ok: false, message: 'Có tệp không còn trên máy chủ. Tải lại tệp rồi lưu.' };
    }

    // Điểm dùng để tính: trắc nghiệm và câu có tiêu chí không dùng ô điểm chung
    const effectivePoints = (item: AssignmentItem, points: number | null) => (item.itemType === 'choice' || item.criteria.length > 0 ? null : points);
    const scoringAnswers: ScoringAnswer[] = checked.map(({ row, item }) => ({
      itemId: row.itemId,
      selectedOptionId: row.selectedOptionId,
      answerText: row.answerText,
      fileId: row.fileId,
      points: effectivePoints(item, row.points),
      criterionPoints: Object.fromEntries(row.criterionPoints.map((c) => [c.criterionId, c.points])),
    }));
    const summary = summarizeSubmission(toScoringItems(items), scoringAnswers);
    const status = summary.status;
    const score = storedScore(summary);
    const now = new Date();

    await db.transaction(async (tx) => {
      const [sub] = await tx
        .insert(assignmentSubmissions)
        .values({ assignmentId, studentId, status, score, feedback: '', submittedAt: status === 'not_submitted' ? null : now, gradedByAccountId: account?.id ?? null })
        .onConflictDoUpdate({
          target: [assignmentSubmissions.assignmentId, assignmentSubmissions.studentId],
          set: {
            status,
            score,
            gradedByAccountId: account?.id ?? null,
            submittedAt: status === 'not_submitted' ? null : sql`COALESCE(${assignmentSubmissions.submittedAt}, ${now})`,
            updatedAt: now,
          },
        })
        .returning({ id: assignmentSubmissions.id });

      // Thay toàn bộ điểm từng câu và điểm tiêu chí của bài làm này
      await tx.delete(submissionItemScores).where(eq(submissionItemScores.submissionId, sub.id));
      await tx.delete(submissionCriterionScores).where(eq(submissionCriterionScores.submissionId, sub.id));

      const itemRows = checked
        .map(({ row, item }) => ({ row, item, points: effectivePoints(item, row.points) }))
        .filter(({ row, points }) => row.selectedOptionId !== null || row.answerText !== '' || row.fileId !== null || points !== null || row.comment !== '' || row.criterionPoints.some((c) => c.points !== null))
        .map(({ row, points }) => ({
          submissionId: sub.id,
          itemId: row.itemId,
          selectedOptionId: row.selectedOptionId,
          answerText: row.answerText,
          fileId: row.fileId,
          points,
          comment: row.comment,
          updatedAt: now,
        }));
      if (itemRows.length > 0) await tx.insert(submissionItemScores).values(itemRows);

      const criterionRows = checked.flatMap(({ row }) =>
        row.criterionPoints
          .filter((c) => c.points !== null)
          .map((c) => ({ submissionId: sub.id, criterionId: c.criterionId, points: c.points, updatedAt: now })),
      );
      if (criterionRows.length > 0) await tx.insert(submissionCriterionScores).values(criterionRows);
    });

    await writeAudit({
      action: 'grade',
      entity: 'assignment',
      entityId: assignmentId,
      summary: `Chấm bài ${base.title} cho ${student.fullName}: ${summary.total}/${summary.maxTotal} điểm`,
    });
    revalidateItems(assignmentId);
    const pending = summary.complete ? '' : ' (còn câu chưa chấm)';
    return { ok: true, message: `Đã lưu bài làm của ${student.fullName}: ${summary.total}/${summary.maxTotal} điểm${pending}` };
  } catch (error) {
    return errorResult(error);
  }
}

// Chấm chéo (P23): giáo viên khác chấm lại một câu viết hoặc nộp tệp. Không đổi điểm chính thức, chỉ hiện độ lệch.
export async function saveSecondMarkAction(assignmentId: number, studentId: number, itemId: number, input: { points: number; comment: string }): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    await requireAssignmentAccess(assignmentId);
    await requireStudentAccess(studentId);
    const account = await getCurrentAccount();
    if (!account) return { ok: false, message: 'Cần đăng nhập để chấm lại.' };
    const base = await getAssignmentBase(assignmentId);
    if (!base) return { ok: false, message: 'Không tìm thấy bài tập này. Có thể đã bị xoá.' };
    const parsed = secondMarkSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Điểm chấm lại không hợp lệ' };

    const [sub] = await db
      .select({ id: assignmentSubmissions.id, gradedByAccountId: assignmentSubmissions.gradedByAccountId })
      .from(assignmentSubmissions)
      .where(and(eq(assignmentSubmissions.assignmentId, assignmentId), eq(assignmentSubmissions.studentId, studentId)))
      .limit(1);
    if (!sub) return { ok: false, message: 'Học sinh này chưa có bài làm được chấm lần đầu.' };
    if (sub.gradedByAccountId === account.id) return { ok: false, message: 'Bạn là người chấm lần đầu bài này. Cần giáo viên khác chấm lại.' };

    const items = await listItemsOfAssignment(assignmentId);
    const item = items.find((i) => i.id === itemId);
    if (!item) return { ok: false, message: 'Câu hỏi không thuộc bài này.' };
    if (item.itemType === 'choice') return { ok: false, message: 'Câu trắc nghiệm tự chấm nên không cần chấm lại.' };
    if (parsed.data.points > item.points) return { ok: false, message: `Điểm chấm lại không được quá ${item.points}.` };

    const rows = await listItemGradingRows(assignmentId, base.classId, items);
    const row = rows.find((r) => r.studentId === studentId);
    const official = row?.summary.points[itemId] ?? null;
    if (official === null) return { ok: false, message: `Câu số ${item.position} chưa có điểm lần đầu. Chấm xong câu này rồi mới chấm lại.` };

    const now = new Date();
    await db
      .insert(submissionSecondMarks)
      .values({ submissionId: sub.id, itemId, graderAccountId: account.id, points: parsed.data.points, comment: parsed.data.comment, updatedAt: now })
      .onConflictDoUpdate({
        target: [submissionSecondMarks.submissionId, submissionSecondMarks.itemId],
        set: { graderAccountId: account.id, points: parsed.data.points, comment: parsed.data.comment, updatedAt: now },
      });

    const gap = markGap(official, parsed.data.points);
    await writeAudit({
      action: 'grade',
      entity: 'assignment',
      entityId: assignmentId,
      summary: `Chấm lại câu ${item.position} cho ${row?.fullName ?? 'học sinh'}: ${parsed.data.points}/${item.points} (lần đầu ${official}, lệch ${gap?.gap ?? 0})`,
    });
    revalidateItems(assignmentId);
    if (gap?.flagged) return { ok: true, message: `Đã lưu chấm lại câu ${item.position}. Lệch ${gap.gap} điểm, cần xem lại.` };
    return { ok: true, message: `Đã lưu chấm lại câu ${item.position}` };
  } catch (error) {
    return errorResult(error);
  }
}
