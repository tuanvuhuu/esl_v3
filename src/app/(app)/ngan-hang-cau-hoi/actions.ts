'use server';

import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { questionCriteria, questionOptions, questionPairs, questions, uploadedFiles } from '@/db/schema';
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

type ParsedItem = z.infer<typeof itemFormSchema>;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Trình độ (mã: Pre-A1, A1...) và chủ đề của câu trong ngân hàng (P36.6). Rỗng là chưa xếp.
const metaSchema = z.object({
  level: z.string().trim().max(10, 'Mã trình độ quá dài').default(''),
  topic: z.string().trim().max(60, 'Chủ đề tối đa 60 ký tự').default(''),
});
export type BankMeta = z.input<typeof metaSchema>;

// Mọi tệp mà câu trỏ tới (âm thanh, tranh, giọng mẫu, tranh đáp án, tranh cặp ghép) phải còn trên máy chủ
async function missingFile(items: ParsedItem[]): Promise<boolean> {
  const ids = [
    ...new Set(
      items.flatMap((q) => [
        q.audioFileId,
        q.imageFileId,
        q.modelAudioFileId,
        ...q.options.flatMap((o) => [o.imageFileId, o.audioFileId]),
        ...q.pairs.flatMap((p) => [p.leftImageFileId, p.rightImageFileId]),
      ]),
    ),
  ].filter((x): x is number => typeof x === 'number');
  if (ids.length === 0) return false;
  const found = await db.select({ id: uploadedFiles.id }).from(uploadedFiles).where(inArray(uploadedFiles.id, ids));
  return found.length !== ids.length;
}

// Ghi một câu (tạo mới khi id null). Đáp án, cặp ghép và tiêu chí được thay toàn bộ vì không có bài làm nào trỏ vào chúng.
// Lưu đủ các trường của dạng câu P35 để chép sang bài không mất nội dung.
async function writeQuestion(tx: Tx, q: ParsedItem, id: number | null, meta: z.output<typeof metaSchema>, accountId: number | null): Promise<number> {
  const values = {
    skill: q.skill,
    itemType: q.itemType,
    prompt: q.prompt,
    promptVi: q.promptVi,
    passage: q.passage,
    points: q.points,
    audioFileId: q.audioFileId,
    imageFileId: q.imageFileId,
    modelAudioFileId: q.modelAudioFileId,
    referenceText: q.referenceText,
    maxSeconds: q.maxSeconds,
    sourceLicense: q.sourceLicense,
    level: meta.level,
    topic: meta.topic,
    updatedAt: new Date(),
  };
  let savedId: number;
  if (id !== null) {
    const [found] = await tx.select({ id: questions.id }).from(questions).where(eq(questions.id, id)).limit(1);
    if (!found) throw new Error('question-not-found');
    await tx.update(questions).set(values).where(eq(questions.id, id));
    savedId = id;
  } else {
    const [created] = await tx.insert(questions).values({ ...values, createdByAccountId: accountId }).returning({ id: questions.id });
    savedId = created.id;
  }

  await tx.delete(questionOptions).where(eq(questionOptions.questionId, savedId));
  await tx.delete(questionPairs).where(eq(questionPairs.questionId, savedId));
  await tx.delete(questionCriteria).where(eq(questionCriteria.questionId, savedId));
  if (['choice', 'picture_choice', 'gap_fill'].includes(q.itemType) && q.options.length > 0) {
    await tx.insert(questionOptions).values(
      q.options.map((o, i) => ({ questionId: savedId, position: i + 1, label: o.label, isCorrect: o.isCorrect, imageFileId: o.imageFileId ?? null, audioFileId: o.audioFileId ?? null })),
    );
  }
  if (q.itemType === 'match' && q.pairs.length > 0) {
    await tx.insert(questionPairs).values(
      q.pairs.map((p, i) => ({ questionId: savedId, position: i + 1, leftLabel: p.leftLabel, leftImageFileId: p.leftImageFileId ?? null, rightLabel: p.rightLabel, rightImageFileId: p.rightImageFileId ?? null })),
    );
  }
  if (q.criteria.length > 0) {
    await tx.insert(questionCriteria).values(q.criteria.map((c, i) => ({ questionId: savedId, position: i + 1, name: c.name, maxPoints: c.maxPoints })));
  }
  return savedId;
}

// Tạo hoặc sửa một câu trong ngân hàng. Bài đã chép câu này không đổi.
export async function saveQuestionAction(input: ItemInput, meta: BankMeta = {}): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    const parsed = itemFormSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Câu hỏi không hợp lệ' };
    const m = metaSchema.safeParse(meta);
    if (!m.success) return { ok: false, message: m.error.issues[0]?.message ?? 'Trình độ hoặc chủ đề không hợp lệ' };
    const q = parsed.data;
    if (await missingFile([q])) return { ok: false, message: 'Có tệp âm thanh hoặc hình ảnh không còn trên máy chủ. Tải lại tệp rồi lưu.' };

    const account = await getCurrentAccount();
    const savedId = await db.transaction((tx) => writeQuestion(tx, q, input.id, m.data, account?.id ?? null));

    await writeAudit({ action: input.id === null ? 'create' : 'update', entity: 'question', entityId: savedId, summary: `Ngân hàng: ${q.skill} · ${q.itemType} · ${q.points} điểm` });
    revalidateBank();
    return { ok: true, message: input.id === null ? 'Đã thêm câu hỏi vào ngân hàng' : 'Đã lưu câu hỏi trong ngân hàng' };
  } catch (error) {
    if (error instanceof Error && error.message === 'question-not-found') return { ok: false, message: 'Câu hỏi này không còn trong ngân hàng.' };
    return errorResult(error);
  }
}

// Lưu nhiều câu mới vào ngân hàng một lần (Soạn nhanh, P36.6), cùng trình độ và chủ đề
export async function saveQuestionsAction(inputs: ItemInput[], meta: BankMeta): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    const parsed = z.array(itemFormSchema).min(1, 'Chưa có câu nào để lưu').max(60, 'Tối đa 60 câu một lần').safeParse(inputs);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Câu hỏi không hợp lệ' };
    const m = metaSchema.safeParse(meta);
    if (!m.success) return { ok: false, message: m.error.issues[0]?.message ?? 'Trình độ hoặc chủ đề không hợp lệ' };
    if (await missingFile(parsed.data)) return { ok: false, message: 'Có tệp âm thanh hoặc hình ảnh không còn trên máy chủ.' };

    const account = await getCurrentAccount();
    await db.transaction(async (tx) => {
      for (const q of parsed.data) await writeQuestion(tx, q, null, m.data, account?.id ?? null);
    });
    await writeAudit({ action: 'create', entity: 'question', entityId: account?.id ?? 0, summary: `Ngân hàng: thêm ${parsed.data.length} câu từ Soạn nhanh (${m.data.level || 'chưa xếp trình độ'}${m.data.topic ? ` · ${m.data.topic}` : ''})` });
    revalidateBank();
    return { ok: true, message: `Đã lưu ${parsed.data.length} câu vào ngân hàng` };
  } catch (error) {
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
