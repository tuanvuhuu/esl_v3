// Khu học sinh (P28): bài của lớp mình, bài làm của chính học sinh, và quyền đọc tệp. Chỉ chạy trên server.
// Mọi truy vấn đều lọc theo mã học sinh đang đăng nhập, không nhận mã từ giao diện để tra cứu.
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { arrangeForStudent } from '@/lib/student-shuffle';
import { db } from '@/db/client';
import {
  assignmentItemOptions,
  assignmentItems,
  assignmentSubmissions,
  assignments,
  speakingAssessments,
  speakingFeedback,
  students,
  submissionCriterionScores,
  submissionItemScores,
  uploadedFiles,
} from '@/db/schema';
import type { ItemType, Skill } from '@/lib/assignment-scoring';
import { listItemsOfAssignment } from '@/lib/queries/assignment-items';
import { getAssignmentBase } from '@/lib/queries/assignments';
import { studentVoiceAccess } from '@/lib/queries/consents';
import { sameClass } from '@/lib/student-access';
import { SCALE_CRITERIA, type SpeakingCriterion, type SpeakingErrorType, type SpeakingMark, type SpeakingScale } from '@/lib/speaking';

// Học sinh đang học và lớp của họ, hoặc null nếu không còn đang học
export async function enrolledStudent(studentId: number): Promise<{ id: number; classId: number; fullName: string } | null> {
  const [row] = await db
    .select({ id: students.id, classId: students.classId, fullName: students.fullName })
    .from(students)
    .where(and(eq(students.id, studentId), inArray(students.status, ['active', 'trial'])))
    .limit(1);
  return row ?? null;
}

// Câu hỏi nhìn từ học sinh: không có đáp án đúng. Thứ tự câu và đáp án đã xáo theo học sinh (src/lib/student-shuffle.ts):
// câu sắp xếp chỉ có các từ đã xáo (orderWords), ghép đôi có hai cột xáo riêng (matchLeft, matchRight),
// referenceText chỉ còn ở câu nói (câu mẫu để đọc theo).
export type StudentItem = {
  id: number;
  position: number;
  skill: Skill;
  itemType: ItemType;
  prompt: string;
  passage: string;
  points: number;
  audioFileId: number | null;
  audioName: string | null;
  imageFileId: number | null;
  modelAudioFileId: number | null;
  promptVi: string | null;
  referenceText: string | null;
  wordTimings: string; // mốc karaoke câu đọc to (35.7), trống thì chia đều
  maxSeconds: number | null;
  options: { id: number; label: string; imageFileId: number | null; audioFileId: number | null }[];
  orderWords: string[];
  matchLeft: { label: string; imageFileId: number | null }[];
  matchRight: { label: string; imageFileId: number | null }[];
  criteriaCount: number;
};

export type StudentAnswer = {
  itemId: number;
  selectedOptionId: number | null;
  answerText: string;
  fileId: number | null;
  fileName: string | null;
  points: number | null; // điểm giáo viên cho câu viết và nộp tệp, khi đã chấm
  comment: string;
  redone: boolean; // câu nói đã được nói lại sau khi giáo viên đánh dấu (35.10)
};

export type StudentAssignmentView = {
  id: number;
  title: string;
  description: string;
  dueAt: Date;
  maxScore: number;
  status: 'not_submitted' | 'submitted' | 'graded';
  score: number | null;
  mode: 'test' | 'practice'; // luyện tập thì kiểm từng câu (35.5)
  items: StudentItem[];
  answers: StudentAnswer[];
  // Ghi âm (P35.12): allowed khi phụ huynh đã đồng ý (và trẻ từ 7 tuổi đã đồng ý); needsChild khi chỉ còn chờ trẻ bấm đồng ý
  voice: { allowed: boolean; needsChild: boolean };
  speakingMarks: SpeakingMark[]; // lỗi giáo viên đánh dấu trong bài nói, theo mốc giây (35.10)
  // Kết quả chấm theo tiêu chí từng câu nói (35.9): thang, điểm tiêu chí, điều con làm tốt
  speakingRubrics: Record<number, { scale: SpeakingScale; scores: Partial<Record<SpeakingCriterion, number>>; praise: string }>;
};

// Bài của học sinh, chỉ khi bài thuộc lớp đang học của họ
export async function studentAssignment(assignmentId: number, studentId: number): Promise<StudentAssignmentView | null> {
  const student = await enrolledStudent(studentId);
  if (!student) return null;
  const base = await getAssignmentBase(assignmentId);
  if (!base || !sameClass(student.classId, base.classId)) return null;

  const items = await listItemsOfAssignment(assignmentId);
  const [sub] = await db
    .select({ id: assignmentSubmissions.id, status: assignmentSubmissions.status, score: assignmentSubmissions.score })
    .from(assignmentSubmissions)
    .where(and(eq(assignmentSubmissions.assignmentId, assignmentId), eq(assignmentSubmissions.studentId, studentId)))
    .limit(1);

  const scores = sub
    ? await db
        .select({
          itemId: submissionItemScores.itemId,
          selectedOptionId: submissionItemScores.selectedOptionId,
          answerText: submissionItemScores.answerText,
          fileId: submissionItemScores.fileId,
          fileName: uploadedFiles.originalName,
          points: submissionItemScores.points,
          comment: submissionItemScores.comment,
          redoneAt: submissionItemScores.redoneAt,
        })
        .from(submissionItemScores)
        .leftJoin(uploadedFiles, eq(uploadedFiles.id, submissionItemScores.fileId))
        .where(eq(submissionItemScores.submissionId, sub.id))
    : [];
  const marks = sub
    ? await db
        .select()
        .from(speakingFeedback)
        .where(eq(speakingFeedback.submissionId, sub.id))
        .orderBy(asc(speakingFeedback.itemId), asc(speakingFeedback.atMs))
    : [];

  const assessed = sub ? await db.select().from(speakingAssessments).where(eq(speakingAssessments.submissionId, sub.id)) : [];

  return {
    id: base.id,
    speakingRubrics: Object.fromEntries(
      assessed.map((a) => {
        const scale = a.scale as SpeakingScale;
        return [a.itemId, { scale, praise: a.praise, scores: Object.fromEntries(SCALE_CRITERIA[scale].map((k) => [k, a[k] ?? undefined])) }];
      }),
    ),
    speakingMarks: marks.map((m) => ({ id: m.id, itemId: m.itemId, atMs: m.atMs, errorType: m.errorType as SpeakingErrorType, correctText: m.correctText, note: m.note, redo: m.redo, modelFileId: m.modelFileId })),
    title: base.title,
    description: base.description,
    dueAt: base.dueAt,
    maxScore: base.maxScore,
    status: sub?.status ?? 'not_submitted',
    score: sub?.score ?? null,
    mode: base.mode === 'practice' ? 'practice' : 'test',
    voice: await studentVoiceAccess(studentId),
    items: arrangeForStudent(
      items.map((i) => ({
        id: i.id,
        position: i.position,
        skill: i.skill,
        itemType: i.itemType,
        prompt: i.prompt,
        passage: i.passage,
        points: i.points,
        audioFileId: i.audioFileId,
        audioName: i.audioName,
        imageFileId: i.imageFileId,
        modelAudioFileId: i.modelAudioFileId,
        promptVi: i.promptVi,
        referenceText: i.referenceText,
        wordTimings: i.wordTimings,
        maxSeconds: i.maxSeconds,
        options: i.options.map((o) => ({ id: o.id, label: o.label, imageFileId: o.imageFileId, audioFileId: o.audioFileId })),
        pairs: i.pairs,
        criteriaCount: i.criteria.length,
      })),
      studentId,
      assignmentId,
    ),
    answers: items.map((i) => {
      const s = scores.find((x) => x.itemId === i.id);
      return {
        itemId: i.id,
        selectedOptionId: s?.selectedOptionId ?? null,
        answerText: s?.answerText ?? '',
        fileId: s?.fileId ?? null,
        fileName: s?.fileName ?? null,
        points: s?.points ?? null,
        comment: s?.comment ?? '',
        redone: !!s?.redoneAt,
      };
    }),
  };
}

// Các bài của lớp học sinh, mới nhất trước, kèm trạng thái và điểm của chính họ
export async function studentAssignmentList(studentId: number): Promise<{ id: number; title: string; dueAt: Date; maxScore: number; status: 'not_submitted' | 'submitted' | 'graded'; score: number | null }[]> {
  const student = await enrolledStudent(studentId);
  if (!student) return [];
  const rows = await db
    .select({ id: assignments.id, title: assignments.title, dueAt: assignments.dueAt, maxScore: assignments.maxScore })
    .from(assignments)
    .where(eq(assignments.classId, student.classId))
    .orderBy(asc(assignments.dueAt), asc(assignments.id));
  if (rows.length === 0) return [];
  const subs = await db
    .select({ assignmentId: assignmentSubmissions.assignmentId, status: assignmentSubmissions.status, score: assignmentSubmissions.score })
    .from(assignmentSubmissions)
    .where(and(eq(assignmentSubmissions.studentId, studentId), inArray(assignmentSubmissions.assignmentId, rows.map((r) => r.id))));
  return rows.map((r) => {
    const s = subs.find((x) => x.assignmentId === r.id);
    return { ...r, status: s?.status ?? 'not_submitted', score: s?.score ?? null };
  });
}

// Học sinh được xem tệp khi đó là tệp bài nộp của chính họ, hoặc âm thanh của một câu trong bài của lớp họ
export async function studentMayReadFile(studentId: number, fileId: number): Promise<boolean> {
  const [own] = await db
    .select({ id: submissionItemScores.id })
    .from(submissionItemScores)
    .innerJoin(assignmentSubmissions, eq(assignmentSubmissions.id, submissionItemScores.submissionId))
    .where(and(eq(submissionItemScores.fileId, fileId), eq(assignmentSubmissions.studentId, studentId)))
    .limit(1);
  if (own) return true;

  const student = await enrolledStudent(studentId);
  if (!student) return false;
  const [audio] = await db
    .select({ id: assignmentItems.id })
    .from(assignmentItems)
    .innerJoin(assignments, eq(assignments.id, assignmentItems.assignmentId))
    .where(and(eq(assignmentItems.audioFileId, fileId), eq(assignments.classId, student.classId)))
    .limit(1);
  if (audio) return true;

  // Tranh, âm thanh của danh sách từ (35.15) lớp mình hoặc dùng chung, và bản chép trong hộp từ của chính học sinh (35.18)
  const words = await db.execute<{ ok: number }>(sql`
    SELECT 1 AS ok FROM word_list_items i JOIN word_lists l ON l.id = i.list_id
    WHERE (i.image_file_id = ${fileId} OR i.audio_file_id = ${fileId}) AND (l.class_id = ${student.classId} OR l.class_id IS NULL)
    UNION ALL
    SELECT 1 FROM word_reviews r WHERE r.student_id = ${studentId} AND (r.image_file_id = ${fileId} OR r.audio_file_id = ${fileId})
    LIMIT 1`);
  return words.rows.length > 0;
}

// Đáp án đúng của một câu. Dùng ở máy chủ để chấm trắc nghiệm, không gửi xuống trình duyệt của học sinh.
export async function correctOptionIds(itemIds: number[]): Promise<Map<number, number>> {
  if (itemIds.length === 0) return new Map();
  const rows = await db
    .select({ itemId: assignmentItemOptions.itemId, id: assignmentItemOptions.id })
    .from(assignmentItemOptions)
    .where(and(inArray(assignmentItemOptions.itemId, itemIds), eq(assignmentItemOptions.isCorrect, true)));
  return new Map(rows.map((r) => [r.itemId, r.id]));
}

// Điểm tiêu chí và điểm câu đã có của một bài nộp, để giữ điểm giáo viên khi học sinh nộp lại
export async function existingSubmissionScores(submissionId: number): Promise<{ itemId: number; points: number | null; comment: string }[]> {
  return db
    .select({ itemId: submissionItemScores.itemId, points: submissionItemScores.points, comment: submissionItemScores.comment })
    .from(submissionItemScores)
    .where(eq(submissionItemScores.submissionId, submissionId));
}

export async function criterionScoresOf(submissionId: number): Promise<{ criterionId: number; points: number | null }[]> {
  return db
    .select({ criterionId: submissionCriterionScores.criterionId, points: submissionCriterionScores.points })
    .from(submissionCriterionScores)
    .where(eq(submissionCriterionScores.submissionId, submissionId));
}

