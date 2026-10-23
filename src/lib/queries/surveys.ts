// Kết quả khảo sát hài lòng cuối khoá của một lớp (37.14). Chỉ chạy trên server.
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';

export type SurveySummary = {
  sent: number; // số phụ huynh đã được gửi
  answered: number; // số phụ huynh đã chấm sao
  average: number | null; // điểm trung bình, 1 chữ số thập phân
  byScore: number[]; // số lượt 1..5 sao (chỉ số 0 là 1 sao)
  continueYes: number;
  continueMaybe: number;
  continueNo: number;
  lowScores: { studentId: number; studentName: string; parentName: string; score: number }[]; // 1–3 sao, để liên hệ
  lastSentAt: Date | null;
};

export async function getSurveySummary(classId: number): Promise<SurveySummary> {
  const rows = (
    await db.execute<{ student_id: number; student_name: string; parent_name: string; score: number | null; continue_choice: string | null; created_at: Date }>(sql`
      SELECT sv.student_id, s.full_name AS student_name, p.full_name AS parent_name, sv.score, sv.continue_choice, sv.created_at
      FROM course_surveys sv JOIN students s ON s.id = sv.student_id JOIN parents p ON p.id = sv.parent_id
      WHERE sv.class_id = ${classId}
      ORDER BY sv.score NULLS LAST, s.full_name`)
  ).rows;
  const scored = rows.filter((r) => r.score !== null);
  const byScore = [1, 2, 3, 4, 5].map((n) => scored.filter((r) => r.score === n).length);
  const average = scored.length ? Math.round((scored.reduce((sum, r) => sum + Number(r.score), 0) / scored.length) * 10) / 10 : null;
  return {
    sent: rows.length,
    answered: scored.length,
    average,
    byScore,
    continueYes: rows.filter((r) => r.continue_choice === 'yes').length,
    continueMaybe: rows.filter((r) => r.continue_choice === 'maybe').length,
    continueNo: rows.filter((r) => r.continue_choice === 'no').length,
    lowScores: scored
      .filter((r) => Number(r.score) <= 3)
      .map((r) => ({ studentId: Number(r.student_id), studentName: r.student_name, parentName: r.parent_name, score: Number(r.score) })),
    lastSentAt: rows.length ? new Date(Math.max(...rows.map((r) => new Date(r.created_at).getTime()))) : null,
  };
}
