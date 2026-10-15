// Điểm kỹ năng từ các bài đã chấm xong của học sinh và của lớp (P26). Chỉ chạy trên server.
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { assignmentSubmissions, assignments, students, submissionCriterionScores, submissionItemScores } from '@/db/schema';
import { summarizeSubmission, type ScoringAnswer, type Skill } from '@/lib/assignment-scoring';
import { listItemsForAssignments, toScoringItems, type AssignmentItem } from '@/lib/queries/assignment-items';
import { addSkillScores, emptyTotals, gradedSkillScores, percentOf, type SkillPoint, type SkillTotals } from '@/lib/skill-stats';
import { suggestLevel, type LevelCheck, type LevelRow } from '@/lib/level-rule';
import { listLevels } from '@/lib/queries/levels';

// Một bài đã chấm xong của một học sinh: điểm từng kỹ năng trong bài
type GradedAssignment = {
  studentId: number;
  assignmentId: number;
  title: string;
  dueAt: Date;
  skills: { skill: Skill; raw: number; max: number }[];
};

// Các bài có câu hỏi của lớp và bài làm đã chấm xong của những học sinh cho trước (null là cả lớp)
async function gradedAssignmentsOfClass(classId: number, studentIds: number[] | null): Promise<{ assignmentCount: number; graded: GradedAssignment[] }> {
  const rows = await db
    .select({ id: assignments.id, title: assignments.title, dueAt: assignments.dueAt })
    .from(assignments)
    .where(eq(assignments.classId, classId))
    .orderBy(asc(assignments.dueAt), asc(assignments.id));
  if (rows.length === 0) return { assignmentCount: 0, graded: [] };

  const itemsBy = await listItemsForAssignments(rows.map((r) => r.id));
  const withItems = rows.filter((r) => (itemsBy.get(r.id)?.length ?? 0) > 0);
  if (withItems.length === 0) return { assignmentCount: 0, graded: [] };
  if (studentIds !== null && studentIds.length === 0) return { assignmentCount: withItems.length, graded: [] };

  const subs = await db
    .select({ id: assignmentSubmissions.id, assignmentId: assignmentSubmissions.assignmentId, studentId: assignmentSubmissions.studentId })
    .from(assignmentSubmissions)
    .where(
      and(
        inArray(assignmentSubmissions.assignmentId, withItems.map((r) => r.id)),
        studentIds === null ? undefined : inArray(assignmentSubmissions.studentId, studentIds),
      ),
    );
  if (subs.length === 0) return { assignmentCount: withItems.length, graded: [] };
  const subIds = subs.map((s) => s.id);

  const scores = await db
    .select({
      submissionId: submissionItemScores.submissionId,
      itemId: submissionItemScores.itemId,
      selectedOptionId: submissionItemScores.selectedOptionId,
      answerText: submissionItemScores.answerText,
      fileId: submissionItemScores.fileId,
      points: submissionItemScores.points,
    })
    .from(submissionItemScores)
    .where(inArray(submissionItemScores.submissionId, subIds));

  const criterionRows = await db
    .select({ submissionId: submissionCriterionScores.submissionId, criterionId: submissionCriterionScores.criterionId, points: submissionCriterionScores.points })
    .from(submissionCriterionScores)
    .where(inArray(submissionCriterionScores.submissionId, subIds));

  const scoreByKey = new Map(scores.map((s) => [`${s.submissionId}:${s.itemId}`, s]));
  const criterionByKey = new Map(criterionRows.map((c) => [`${c.submissionId}:${c.criterionId}`, c.points]));
  const itemsOf = (assignmentId: number): AssignmentItem[] => itemsBy.get(assignmentId) ?? [];
  const titleOf = new Map(withItems.map((r) => [r.id, r]));

  const graded: GradedAssignment[] = [];
  for (const sub of subs) {
    const items = itemsOf(sub.assignmentId);
    if (items.length === 0) continue;
    const answers: ScoringAnswer[] = items.map((item) => {
      const s = scoreByKey.get(`${sub.id}:${item.id}`);
      return {
        itemId: item.id,
        selectedOptionId: s?.selectedOptionId ?? null,
        answerText: s?.answerText ?? '',
        fileId: s?.fileId ?? null,
        points: s?.points ?? null,
        criterionPoints: Object.fromEntries(item.criteria.map((c) => [c.id, criterionByKey.get(`${sub.id}:${c.id}`) ?? null])),
      };
    });
    const summary = summarizeSubmission(toScoringItems(items), answers);
    const skills = gradedSkillScores(summary);
    const meta = titleOf.get(sub.assignmentId);
    if (skills.length === 0 || !meta) continue;
    graded.push({ studentId: sub.studentId, assignmentId: sub.assignmentId, title: meta.title, dueAt: meta.dueAt, skills });
  }
  return { assignmentCount: withItems.length, graded };
}

// Lịch sử kỹ năng của một học sinh: tổng theo kỹ năng, điểm từng bài đã chấm theo thời gian, và trình độ (P27)
export async function studentSkillHistory(studentId: number): Promise<{
  totals: SkillTotals;
  points: SkillPoint[];
  gradedCount: number;
  level: { current: LevelRow | null; levels: LevelRow[]; next: LevelRow | null; check: LevelCheck | null };
}> {
  const [student] = await db.select({ classId: students.classId, levelId: students.levelId }).from(students).where(eq(students.id, studentId)).limit(1);
  const levels = await listLevels();
  if (!student) return { totals: emptyTotals(), points: [], gradedCount: 0, level: { current: null, levels, next: null, check: null } };

  const { graded } = await gradedAssignmentsOfClass(student.classId, [studentId]);
  const totals = graded.reduce((t, g) => addSkillScores(t, g.skills), emptyTotals());

  const byAssignment = new Map<number, SkillPoint>();
  for (const g of graded) {
    const point = byAssignment.get(g.assignmentId) ?? {
      assignmentId: g.assignmentId,
      title: g.title,
      dueAt: g.dueAt.toISOString(),
      percent: { listening: null, speaking: null, reading: null, writing: null },
    };
    for (const s of g.skills) point.percent[s.skill] = percentOf(s.raw, s.max);
    byAssignment.set(g.assignmentId, point);
  }
  const points = [...byAssignment.values()].sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  const current = levels.find((l) => l.id === student.levelId) ?? null;
  const link = suggestLevel(current, levels, points.map((p) => p.percent));
  return {
    totals,
    points,
    gradedCount: byAssignment.size,
    level: { current, levels, next: link?.next ?? null, check: link?.check ?? null },
  };
}

// Báo cáo kỹ năng của lớp: mỗi học sinh một dòng, tổng theo từng kỹ năng
export async function classSkillReport(classId: number): Promise<{
  assignmentCount: number;
  rows: { studentId: number; fullName: string; totals: SkillTotals; gradedCount: number }[];
}> {
  const roster = await db
    .select({ id: students.id, fullName: students.fullName })
    .from(students)
    .where(and(eq(students.classId, classId), inArray(students.status, ['active', 'trial'])))
    .orderBy(asc(students.fullName));
  const { assignmentCount, graded } = await gradedAssignmentsOfClass(classId, roster.map((r) => r.id));

  const rows = roster.map((r) => {
    const mine = graded.filter((g) => g.studentId === r.id);
    return {
      studentId: r.id,
      fullName: r.fullName,
      totals: mine.reduce((t, g) => addSkillScores(t, g.skills), emptyTotals()),
      gradedCount: new Set(mine.map((g) => g.assignmentId)).size,
    };
  });
  return { assignmentCount, rows };
}

// Kết quả của lịch sử kỹ năng một học sinh, dùng ở hồ sơ
export type SkillHistory = Awaited<ReturnType<typeof studentSkillHistory>>;
