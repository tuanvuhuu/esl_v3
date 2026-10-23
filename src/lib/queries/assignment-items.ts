// Câu hỏi và bài làm của bài tập (P22, P23). Chỉ chạy trên server.
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  accounts,
  assignmentItemCriteria,
  assignmentItemOptions,
  assignmentItemPairs,
  assignmentItems,
  assignmentSubmissions,
  students,
  submissionCriterionScores,
  submissionItemScores,
  submissionSecondMarks,
  uploadedFiles,
} from '@/db/schema';
import { summarizeSubmission, type ItemType, type ScoringAnswer, type ScoringItem, type Skill, type SubmissionSummary } from '@/lib/assignment-scoring';

export type ItemOption = {
  id: number;
  position: number;
  label: string;
  isCorrect: boolean;
  imageFileId: number | null;
  audioFileId: number | null;
};
export type ItemCriterion = { id: number; position: number; name: string; maxPoints: number };
export type ItemPair = {
  id: number;
  position: number;
  leftLabel: string;
  leftImageFileId: number | null;
  rightLabel: string;
  rightImageFileId: number | null;
};

export type AssignmentItem = {
  id: number;
  position: number;
  skill: Skill;
  itemType: ItemType;
  prompt: string;
  passage: string;
  points: number;
  audioFileId: number | null;
  audioName: string | null;
  bankQuestionId: number | null;
  imageFileId: number | null;
  modelAudioFileId: number | null;
  promptVi: string | null;
  referenceText: string | null;
  maxSeconds: number | null;
  sourceLicense: string | null;
  options: ItemOption[];
  criteria: ItemCriterion[];
  pairs: ItemPair[];
};

// Câu hỏi của một bài, theo thứ tự, kèm đáp án, tiêu chí và tên tệp âm thanh
export async function listItemsOfAssignment(assignmentId: number): Promise<AssignmentItem[]> {
  return (await listItemsForAssignments([assignmentId])).get(assignmentId) ?? [];
}

// Câu hỏi của nhiều bài cùng lúc (P26 cần cho cả lớp), gom theo mã bài
export async function listItemsForAssignments(assignmentIds: number[]): Promise<Map<number, AssignmentItem[]>> {
  if (assignmentIds.length === 0) return new Map();
  const items = await db
    .select({
      id: assignmentItems.id,
      assignmentId: assignmentItems.assignmentId,
      position: assignmentItems.position,
      skill: assignmentItems.skill,
      itemType: assignmentItems.itemType,
      prompt: assignmentItems.prompt,
      passage: assignmentItems.passage,
      points: assignmentItems.points,
      audioFileId: assignmentItems.audioFileId,
      bankQuestionId: assignmentItems.bankQuestionId,
      imageFileId: assignmentItems.imageFileId,
      modelAudioFileId: assignmentItems.modelAudioFileId,
      promptVi: assignmentItems.promptVi,
      referenceText: assignmentItems.referenceText,
      maxSeconds: assignmentItems.maxSeconds,
      sourceLicense: assignmentItems.sourceLicense,
      audioName: uploadedFiles.originalName,
    })
    .from(assignmentItems)
    .leftJoin(uploadedFiles, eq(uploadedFiles.id, assignmentItems.audioFileId))
    .where(inArray(assignmentItems.assignmentId, assignmentIds))
    .orderBy(asc(assignmentItems.position), asc(assignmentItems.id));
  if (items.length === 0) return new Map();
  const itemIds = items.map((i) => i.id);

  const options = await db
    .select({
      id: assignmentItemOptions.id,
      itemId: assignmentItemOptions.itemId,
      position: assignmentItemOptions.position,
      label: assignmentItemOptions.label,
      isCorrect: assignmentItemOptions.isCorrect,
      imageFileId: assignmentItemOptions.imageFileId,
      audioFileId: assignmentItemOptions.audioFileId,
    })
    .from(assignmentItemOptions)
    .where(inArray(assignmentItemOptions.itemId, itemIds))
    .orderBy(asc(assignmentItemOptions.position), asc(assignmentItemOptions.id));

  const criteria = await db
    .select({
      id: assignmentItemCriteria.id,
      itemId: assignmentItemCriteria.itemId,
      position: assignmentItemCriteria.position,
      name: assignmentItemCriteria.name,
      maxPoints: assignmentItemCriteria.maxPoints,
    })
    .from(assignmentItemCriteria)
    .where(inArray(assignmentItemCriteria.itemId, itemIds))
    .orderBy(asc(assignmentItemCriteria.position), asc(assignmentItemCriteria.id));

  const pairs = await db
    .select({
      id: assignmentItemPairs.id,
      itemId: assignmentItemPairs.itemId,
      position: assignmentItemPairs.position,
      leftLabel: assignmentItemPairs.leftLabel,
      leftImageFileId: assignmentItemPairs.leftImageFileId,
      rightLabel: assignmentItemPairs.rightLabel,
      rightImageFileId: assignmentItemPairs.rightImageFileId,
    })
    .from(assignmentItemPairs)
    .where(inArray(assignmentItemPairs.itemId, itemIds))
    .orderBy(asc(assignmentItemPairs.position), asc(assignmentItemPairs.id));

  const byAssignment = new Map<number, AssignmentItem[]>();
  for (const id of assignmentIds) byAssignment.set(id, []);
  for (const i of items) {
    const list: AssignmentItem = {
      id: i.id,
      position: i.position,
      skill: i.skill,
      itemType: i.itemType,
      prompt: i.prompt,
      passage: i.passage,
      points: i.points,
      audioFileId: i.audioFileId,
      audioName: i.audioName ?? null,
      bankQuestionId: i.bankQuestionId,
      imageFileId: i.imageFileId,
      modelAudioFileId: i.modelAudioFileId,
      promptVi: i.promptVi,
      referenceText: i.referenceText,
      maxSeconds: i.maxSeconds,
      sourceLicense: i.sourceLicense,
      options: options
        .filter((o) => o.itemId === i.id)
        .map((o) => ({
          id: o.id,
          position: o.position,
          label: o.label,
          isCorrect: o.isCorrect,
          imageFileId: o.imageFileId,
          audioFileId: o.audioFileId,
        })),
      criteria: criteria
        .filter((c) => c.itemId === i.id)
        .map((c) => ({ id: c.id, position: c.position, name: c.name, maxPoints: c.maxPoints })),
      pairs: pairs
        .filter((p) => p.itemId === i.id)
        .map((p) => ({
          id: p.id,
          position: p.position,
          leftLabel: p.leftLabel,
          leftImageFileId: p.leftImageFileId,
          rightLabel: p.rightLabel,
          rightImageFileId: p.rightImageFileId,
        })),
    };
    byAssignment.get(i.assignmentId)?.push(list);
  }
  return byAssignment;
}

// Câu hỏi dạng gọn cho bộ chấm điểm (không kèm nội dung hiển thị)
export function toScoringItems(items: AssignmentItem[]): ScoringItem[] {
  return items.map((i) => ({
    id: i.id,
    skill: i.skill,
    itemType: i.itemType,
    points: i.points,
    prompt: i.prompt,
    promptVi: i.promptVi ?? undefined,
    referenceText: i.referenceText ?? undefined,
    options: i.options.map((o) => ({ id: o.id, label: o.label, isCorrect: o.isCorrect })),
    pairs: i.pairs.map((p) => ({ id: p.id, leftLabel: p.leftLabel, rightLabel: p.rightLabel })),
    criteria: i.criteria.map((c) => ({ id: c.id, maxPoints: c.maxPoints })),
  }));
}

export type ItemAnswer = {
  itemId: number;
  selectedOptionId: number | null;
  answerText: string;
  fileId: number | null;
  fileName: string | null;
  points: number | null;
  comment: string;
  criterionPoints: Record<number, number | null>; // điểm từng tiêu chí theo id tiêu chí
  previousFileId: number | null; // bản nói cũ khi học sinh đã nói lại (35.10)
  redoneAt: Date | null;
};

// Điểm chấm lại của một câu (chấm chéo). Không đổi điểm chính thức.
export type ItemSecondMark = { points: number; comment: string; graderName: string | null };

export type ItemGradingRow = {
  studentId: number;
  fullName: string;
  submissionId: number | null;
  gradedByAccountId: number | null;
  status: SubmissionSummary['status'];
  answers: ItemAnswer[]; // mọi câu của bài; câu chưa làm có giá trị trống
  secondMarks: Record<number, ItemSecondMark>; // theo id câu
  summary: SubmissionSummary;
};

// Mọi học sinh đang học của lớp, kèm bài làm từng câu, điểm tiêu chí, chấm chéo và điểm đã tổng hợp
export async function listItemGradingRows(assignmentId: number, classId: number, items: AssignmentItem[]): Promise<ItemGradingRow[]> {
  const roster = await db
    .select({
      studentId: students.id,
      fullName: students.fullName,
      submissionId: assignmentSubmissions.id,
      gradedByAccountId: assignmentSubmissions.gradedByAccountId,
    })
    .from(students)
    .leftJoin(assignmentSubmissions, and(eq(assignmentSubmissions.studentId, students.id), eq(assignmentSubmissions.assignmentId, assignmentId)))
    .where(and(eq(students.classId, classId), inArray(students.status, ['active', 'trial'])))
    .orderBy(asc(students.fullName));

  const scores = await db
    .select({
      submissionId: submissionItemScores.submissionId,
      itemId: submissionItemScores.itemId,
      selectedOptionId: submissionItemScores.selectedOptionId,
      answerText: submissionItemScores.answerText,
      fileId: submissionItemScores.fileId,
      fileName: uploadedFiles.originalName,
      points: submissionItemScores.points,
      comment: submissionItemScores.comment,
      previousFileId: submissionItemScores.previousFileId,
      redoneAt: submissionItemScores.redoneAt,
    })
    .from(submissionItemScores)
    .innerJoin(assignmentSubmissions, eq(assignmentSubmissions.id, submissionItemScores.submissionId))
    .leftJoin(uploadedFiles, eq(uploadedFiles.id, submissionItemScores.fileId))
    .where(eq(assignmentSubmissions.assignmentId, assignmentId));

  const criterionScores = await db
    .select({
      submissionId: submissionCriterionScores.submissionId,
      criterionId: submissionCriterionScores.criterionId,
      points: submissionCriterionScores.points,
    })
    .from(submissionCriterionScores)
    .innerJoin(assignmentSubmissions, eq(assignmentSubmissions.id, submissionCriterionScores.submissionId))
    .where(eq(assignmentSubmissions.assignmentId, assignmentId));

  const secondMarks = await db
    .select({
      submissionId: submissionSecondMarks.submissionId,
      itemId: submissionSecondMarks.itemId,
      points: submissionSecondMarks.points,
      comment: submissionSecondMarks.comment,
      graderName: accounts.fullName,
    })
    .from(submissionSecondMarks)
    .innerJoin(assignmentSubmissions, eq(assignmentSubmissions.id, submissionSecondMarks.submissionId))
    .leftJoin(accounts, eq(accounts.id, submissionSecondMarks.graderAccountId))
    .where(eq(assignmentSubmissions.assignmentId, assignmentId));

  const scoreByKey = new Map(scores.map((s) => [`${s.submissionId}:${s.itemId}`, s]));
  const criterionByKey = new Map(criterionScores.map((c) => [`${c.submissionId}:${c.criterionId}`, c.points]));
  const secondByKey = new Map(secondMarks.map((m) => [`${m.submissionId}:${m.itemId}`, m]));
  const scoringItems = toScoringItems(items);

  return roster.map((r) => {
    const sid = r.submissionId;
    const answers: ItemAnswer[] = items.map((item) => {
      const s = sid === null ? undefined : scoreByKey.get(`${sid}:${item.id}`);
      return {
        itemId: item.id,
        selectedOptionId: s?.selectedOptionId ?? null,
        answerText: s?.answerText ?? '',
        fileId: s?.fileId ?? null,
        fileName: s?.fileName ?? null,
        points: s?.points ?? null,
        comment: s?.comment ?? '',
        criterionPoints: Object.fromEntries(item.criteria.map((c) => [c.id, sid === null ? null : (criterionByKey.get(`${sid}:${c.id}`) ?? null)])),
        previousFileId: s?.previousFileId ?? null,
        redoneAt: s?.redoneAt ?? null,
      };
    });
    const scoringAnswers: ScoringAnswer[] = answers.map((a) => ({
      itemId: a.itemId,
      selectedOptionId: a.selectedOptionId,
      answerText: a.answerText,
      fileId: a.fileId,
      points: a.points,
      criterionPoints: a.criterionPoints,
    }));
    const summary = summarizeSubmission(scoringItems, scoringAnswers);

    const marks: Record<number, ItemSecondMark> = {};
    for (const item of items) {
      const m = sid === null ? undefined : secondByKey.get(`${sid}:${item.id}`);
      if (m) marks[item.id] = { points: m.points, comment: m.comment, graderName: m.graderName ?? null };
    }
    return {
      studentId: r.studentId,
      fullName: r.fullName,
      submissionId: sid,
      gradedByAccountId: r.gradedByAccountId,
      status: summary.status,
      answers,
      secondMarks: marks,
      summary,
    };
  });
}
