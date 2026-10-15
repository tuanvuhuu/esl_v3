'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { questionCriteria, questionOptions, questions, uploadedFiles } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { countBankUsage } from '@/lib/queries/question-bank';
import { getCurrentAccount } from '@/lib/session';
import { itemFormSchema } from '@/lib/validation/assignment';
import type { ActionResult } from '@/lib/validation/student';
import type { ItemInput } from '@/app/(app)/bai-tap/question-actions';

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action ngân hàng câu hỏi:', error);
  return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
}

function revalidateBank() {
  revalidatePath('/ngan-hang-cau-hoi');
  revalidatePath('/bai-tap');
}

// Tạo hoặc sửa một câu trong ngân hàng. Đáp án và tiêu chí được thay toàn bộ vì không có bài làm nào trỏ vào chúng.
// Bài đã chép câu này không đổi.
export async function saveQuestionAction(input: ItemInput): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    const parsed = itemFormSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Câu hỏi không hợp lệ' };
    const q = parsed.data;

    if (q.audioFileId !== null) {
      const [found] = await db.select({ id: uploadedFiles.id }).from(uploadedFiles).where(eq(uploadedFiles.id, q.audioFileId)).limit(1);
      if (!found) return { ok: false, message: 'Tệp âm thanh không còn trên máy chủ. Tải lại tệp rồi lưu.' };
    }

    const account = await getCurrentAccount();
    const values = {
      skill: q.skill,
      itemType: q.itemType,
      prompt: q.prompt,
      passage: q.passage,
      points: q.points,
      audioFileId: q.audioFileId,
      updatedAt: new Date(),
    };

    const savedId = await db.transaction(async (tx) => {
      let id: number;
      if (input.id !== null) {
        const [found] = await tx.select({ id: questions.id }).from(questions).where(eq(questions.id, input.id)).limit(1);
        if (!found) throw new Error('question-not-found');
        await tx.update(questions).set(values).where(eq(questions.id, input.id));
        id = input.id;
      } else {
        const [created] = await tx
          .insert(questions)
          .values({ ...values, createdByAccountId: account?.id ?? null })
          .returning({ id: questions.id });
        id = created.id;
      }

      await tx.delete(questionOptions).where(eq(questionOptions.questionId, id));
      await tx.delete(questionCriteria).where(eq(questionCriteria.questionId, id));
      if (q.itemType === 'choice' && q.options.length > 0) {
        await tx.insert(questionOptions).values(q.options.map((o, i) => ({ questionId: id, position: i + 1, label: o.label, isCorrect: o.isCorrect })));
      }
      if (q.criteria.length > 0) {
        await tx.insert(questionCriteria).values(q.criteria.map((c, i) => ({ questionId: id, position: i + 1, name: c.name, maxPoints: c.maxPoints })));
      }
      return id;
    });

    await writeAudit({ action: input.id === null ? 'create' : 'update', entity: 'question', entityId: savedId, summary: `Ngân hàng: ${q.skill} · ${q.itemType} · ${q.points} điểm` });
    revalidateBank();
    return { ok: true, message: input.id === null ? 'Đã thêm câu hỏi vào ngân hàng' : 'Đã lưu câu hỏi trong ngân hàng' };
  } catch (error) {
    if (error instanceof Error && error.message === 'question-not-found') return { ok: false, message: 'Câu hỏi này không còn trong ngân hàng.' };
    return errorResult(error);
  }
}

// Xoá một câu khỏi ngân hàng. Bài đã chép câu này giữ nội dung của mình.
export async function deleteQuestionAction(id: number): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    const [found] = await db.select({ id: questions.id, skill: questions.skill }).from(questions).where(eq(questions.id, id)).limit(1);
    if (!found) return { ok: false, message: 'Câu hỏi này không còn trong ngân hàng.' };
    const used = await countBankUsage(id);
    await db.delete(questions).where(eq(questions.id, id));
    await writeAudit({ action: 'delete', entity: 'question', entityId: id, summary: `Xoá câu khỏi ngân hàng (đang dùng ở ${used} bài)` });
    revalidateBank();
    return { ok: true, message: 'Đã xoá câu hỏi khỏi ngân hàng' };
  } catch (error) {
    return errorResult(error);
  }
}
