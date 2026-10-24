// Số liệu bảng theo dõi lớp (35.20). Chỉ chạy trên server. Xét các bài có hạn trong 30 ngày qua hoặc chưa tới hạn.
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { hardQuestions, missingByStudent, waitingDays, type HardQuestion, type MissingStudent } from '@/lib/class-tracking';
import { listItemsForAssignments, toScoringItems } from '@/lib/queries/assignment-items';

export type SpeakingWait = { submissionId: number; studentId: number; fullName: string; assignmentId: number; title: string; submittedAt: Date; speakCount: number; days: number };
export type ForgottenWord = { word: string; students: number; wrong: number };
export type ClassTracking = { missing: MissingStudent[]; hard: HardQuestion[]; forgotten: ForgottenWord[]; speaking: SpeakingWait[]; activeStudents: number };

const WINDOW_DAYS = 30;

export async function classTracking(classId: number, now: Date = new Date()): Promise<ClassTracking> {
  const since = new Date(now.getTime() - WINDOW_DAYS * 86_400_000);
  const [assignmentRows, missingRows, speakingRows, wordRows, countRow] = await Promise.all([
    db.execute<{ id: number; title: string }>(sql`SELECT id, title FROM assignments WHERE class_id = ${classId} AND due_at >= ${since}`),
    db.execute<{ student_id: number; full_name: string; assignment_id: number; title: string; due_at: Date | string }>(sql`
      SELECT s.id AS student_id, s.full_name, a.id AS assignment_id, a.title, a.due_at
      FROM students s
      JOIN assignments a ON a.class_id = s.class_id AND a.due_at >= ${since}
      LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = s.id
      WHERE s.class_id = ${classId} AND s.status IN ('active', 'trial') AND COALESCE(sub.status, 'not_submitted') = 'not_submitted'`),
    // Bài nộp đang chờ chấm có ít nhất một câu nói đã ghi âm
    db.execute<{ submission_id: number; student_id: number; full_name: string; assignment_id: number; title: string; submitted_at: Date | string; speak_count: number }>(sql`
      SELECT sub.id AS submission_id, s.id AS student_id, s.full_name, a.id AS assignment_id, a.title, sub.submitted_at, COUNT(*)::int AS speak_count
      FROM assignment_submissions sub
      JOIN assignments a ON a.id = sub.assignment_id
      JOIN students s ON s.id = sub.student_id
      JOIN submission_item_scores sis ON sis.submission_id = sub.id AND sis.file_id IS NOT NULL
      JOIN assignment_items ai ON ai.id = sis.item_id AND ai.item_type::text LIKE 'speak_%'
      WHERE a.class_id = ${classId} AND sub.status = 'submitted' AND sub.submitted_at IS NOT NULL
      GROUP BY sub.id, s.id, s.full_name, a.id, a.title, sub.submitted_at
      ORDER BY sub.submitted_at`),
    // Từ trong hộp từ mà nhiều bạn trong lớp chọn sai khi ôn
    db.execute<{ word: string; students: number; wrong: number }>(sql`
      SELECT MIN(r.word) AS word, COUNT(*)::int AS students, SUM(r.wrong_count)::int AS wrong
      FROM word_reviews r JOIN students s ON s.id = r.student_id
      WHERE s.class_id = ${classId} AND s.status IN ('active', 'trial') AND r.wrong_count > 0
      GROUP BY r.word_key ORDER BY students DESC, wrong DESC, MIN(r.word) LIMIT 8`),
    db.execute<{ n: number }>(sql`SELECT COUNT(*)::int AS n FROM students WHERE class_id = ${classId} AND status IN ('active', 'trial')`),
  ]);

  // Câu hay sai: chấm lại phần tự chấm từ đáp án đã lưu (điểm câu tự chấm không lưu trong DB)
  const ids = assignmentRows.rows.map((a) => Number(a.id));
  const titles = new Map(assignmentRows.rows.map((a) => [Number(a.id), a.title]));
  let hard: HardQuestion[] = [];
  if (ids.length > 0) {
    const itemsByAssignment = await listItemsForAssignments(ids);
    const items = [...itemsByAssignment.entries()].flatMap(([aid, list]) => toScoringItems(list).map((i) => ({ ...i, assignmentId: aid, assignmentTitle: titles.get(aid) ?? '' })));
    const answers = await db.execute<{ submission_id: number; assignment_id: number; item_id: number; selected_option_id: number | null; answer_text: string; file_id: number | null }>(sql`
      SELECT sub.id AS submission_id, sub.assignment_id, sis.item_id, sis.selected_option_id, sis.answer_text, sis.file_id
      FROM assignment_submissions sub
      LEFT JOIN submission_item_scores sis ON sis.submission_id = sub.id
      WHERE sub.assignment_id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)}) AND sub.status <> 'not_submitted'`);
    const subs = new Map<number, { assignmentId: number; answers: { itemId: number; selectedOptionId: number | null; answerText: string; fileId: number | null; points: null }[] }>();
    for (const r of answers.rows) {
      const s = subs.get(Number(r.submission_id)) ?? { assignmentId: Number(r.assignment_id), answers: [] };
      if (r.item_id !== null) s.answers.push({ itemId: Number(r.item_id), selectedOptionId: r.selected_option_id === null ? null : Number(r.selected_option_id), answerText: r.answer_text ?? '', fileId: r.file_id, points: null });
      subs.set(Number(r.submission_id), s);
    }
    hard = hardQuestions(items, [...subs.values()]);
  }

  return {
    missing: missingByStudent(
      missingRows.rows.map((r) => ({ studentId: Number(r.student_id), fullName: r.full_name, assignmentId: Number(r.assignment_id), title: r.title, dueAt: new Date(r.due_at) })),
      now,
    ),
    hard,
    forgotten: wordRows.rows.map((w) => ({ word: w.word, students: Number(w.students), wrong: Number(w.wrong) })),
    speaking: speakingRows.rows.map((r) => {
      const submittedAt = new Date(r.submitted_at);
      return { submissionId: Number(r.submission_id), studentId: Number(r.student_id), fullName: r.full_name, assignmentId: Number(r.assignment_id), title: r.title, submittedAt, speakCount: Number(r.speak_count), days: waitingDays(submittedAt, now) };
    }),
    activeStudents: Number(countRow.rows[0]?.n ?? 0),
  };
}
