// Ngân hàng câu hỏi dùng chung (P24). Chỉ chạy trên server.
import { asc, countDistinct, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { assignmentItems, questionCriteria, questionOptions, questionPairs, questions, uploadedFiles } from '@/db/schema';
import type { ItemType, Skill } from '@/lib/assignment-scoring';

export type BankOption = { id: number; position: number; label: string; isCorrect: boolean; imageFileId: number | null; audioFileId: number | null };
export type BankPair = { id: number; position: number; leftLabel: string; leftImageFileId: number | null; rightLabel: string; rightImageFileId: number | null };
export type BankCriterion = { id: number; position: number; name: string; maxPoints: number };

export type BankQuestion = {
  id: number;
  skill: Skill;
  itemType: ItemType;
  prompt: string;
  passage: string;
  points: number;
  audioFileId: number | null;
  audioName: string | null;
  // Trường của các dạng câu P35: đủ để chép sang bài không mất nội dung
  promptVi: string;
  referenceText: string;
  maxSeconds: number;
  sourceLicense: string;
  imageFileId: number | null;
  modelAudioFileId: number | null;
  level: string; // mã trình độ, rỗng là chưa xếp (P36.6)
  topic: string;
  options: BankOption[];
  pairs: BankPair[];
  criteria: BankCriterion[];
  usageCount: number; // số bài đang dùng câu này (bài đã chép nên không đổi khi sửa ngân hàng)
};

// Mọi câu trong ngân hàng, theo thứ tự tạo, kèm đáp án, tiêu chí và số bài đang dùng
export async function listQuestionBank(): Promise<BankQuestion[]> {
  const rows = await db
    .select({
      id: questions.id,
      skill: questions.skill,
      itemType: questions.itemType,
      prompt: questions.prompt,
      passage: questions.passage,
      points: questions.points,
      audioFileId: questions.audioFileId,
      audioName: uploadedFiles.originalName,
      promptVi: questions.promptVi,
      referenceText: questions.referenceText,
      maxSeconds: questions.maxSeconds,
      sourceLicense: questions.sourceLicense,
      imageFileId: questions.imageFileId,
      modelAudioFileId: questions.modelAudioFileId,
      level: questions.level,
      topic: questions.topic,
    })
    .from(questions)
    .leftJoin(uploadedFiles, eq(uploadedFiles.id, questions.audioFileId))
    .orderBy(asc(questions.id));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const options = await db
    .select({
      id: questionOptions.id,
      questionId: questionOptions.questionId,
      position: questionOptions.position,
      label: questionOptions.label,
      isCorrect: questionOptions.isCorrect,
      imageFileId: questionOptions.imageFileId,
      audioFileId: questionOptions.audioFileId,
    })
    .from(questionOptions)
    .where(inArray(questionOptions.questionId, ids))
    .orderBy(asc(questionOptions.position), asc(questionOptions.id));

  const pairs = await db
    .select({
      id: questionPairs.id,
      questionId: questionPairs.questionId,
      position: questionPairs.position,
      leftLabel: questionPairs.leftLabel,
      leftImageFileId: questionPairs.leftImageFileId,
      rightLabel: questionPairs.rightLabel,
      rightImageFileId: questionPairs.rightImageFileId,
    })
    .from(questionPairs)
    .where(inArray(questionPairs.questionId, ids))
    .orderBy(asc(questionPairs.position), asc(questionPairs.id));

  const criteria = await db
    .select({
      id: questionCriteria.id,
      questionId: questionCriteria.questionId,
      position: questionCriteria.position,
      name: questionCriteria.name,
      maxPoints: questionCriteria.maxPoints,
    })
    .from(questionCriteria)
    .where(inArray(questionCriteria.questionId, ids))
    .orderBy(asc(questionCriteria.position), asc(questionCriteria.id));

  const usage = await db
    .select({ questionId: assignmentItems.bankQuestionId, assignmentCount: countDistinct(assignmentItems.assignmentId) })
    .from(assignmentItems)
    .where(inArray(assignmentItems.bankQuestionId, ids))
    .groupBy(assignmentItems.bankQuestionId);
  const usageBy = new Map(usage.map((u) => [u.questionId, Number(u.assignmentCount)]));

  return rows.map((r) => ({
    id: r.id,
    skill: r.skill,
    itemType: r.itemType,
    prompt: r.prompt,
    passage: r.passage,
    points: r.points,
    audioFileId: r.audioFileId,
    audioName: r.audioName ?? null,
    promptVi: r.promptVi,
    referenceText: r.referenceText,
    maxSeconds: r.maxSeconds,
    sourceLicense: r.sourceLicense,
    imageFileId: r.imageFileId,
    modelAudioFileId: r.modelAudioFileId,
    level: r.level,
    topic: r.topic,
    options: options
      .filter((o) => o.questionId === r.id)
      .map((o) => ({ id: o.id, position: o.position, label: o.label, isCorrect: o.isCorrect, imageFileId: o.imageFileId, audioFileId: o.audioFileId })),
    pairs: pairs
      .filter((p) => p.questionId === r.id)
      .map((p) => ({ id: p.id, position: p.position, leftLabel: p.leftLabel, leftImageFileId: p.leftImageFileId, rightLabel: p.rightLabel, rightImageFileId: p.rightImageFileId })),
    criteria: criteria
      .filter((c) => c.questionId === r.id)
      .map((c) => ({ id: c.id, position: c.position, name: c.name, maxPoints: c.maxPoints })),
    usageCount: usageBy.get(r.id) ?? 0,
  }));
}

// Số bài đang dùng một câu trong ngân hàng (dùng khi xác nhận xoá)
export async function countBankUsage(questionId: number): Promise<number> {
  const [row] = await db
    .select({ assignmentCount: countDistinct(assignmentItems.assignmentId) })
    .from(assignmentItems)
    .where(eq(assignmentItems.bankQuestionId, questionId));
  return Number(row?.assignmentCount ?? 0);
}
