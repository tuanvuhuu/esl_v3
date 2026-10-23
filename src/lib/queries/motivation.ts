// Số liệu động lực của một học sinh (35.17): sao từ bài và trò chơi, các tuần có học, sao cả lớp góp trong tháng.
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { monthKey, monthStartKey, shiftMonth, todayKeyVN, vnDayBounds, weekStartKey } from '@/lib/datetime';
import { assignmentStars, classGoal, weeklyStreak } from '@/lib/motivation';
import { enrolledStudent, studentAssignmentList } from '@/lib/queries/student-portal';

export type PathStep = { id: number; title: string; dueAt: Date; maxScore: number; status: 'not_submitted' | 'submitted' | 'graded'; score: number | null; stars: 0 | 1 | 2 | 3 };
export type StudentMotivation = {
  path: PathStep[];
  assignmentStars: number;
  gameStars: number;
  totalStars: number;
  streak: { weeks: number; activeThisWeek: boolean };
  classGoal: ReturnType<typeof classGoal> & { month: string };
};

// Sao một bài trong SQL, cùng quy tắc assignmentStars (ngưỡng 80% và 50% như starsFor)
const SUB_STARS = sql`CASE
  WHEN s.status = 'graded' AND s.score IS NOT NULL AND a.max_score > 0 AND s.score * 10 >= a.max_score * 8 THEN 3
  WHEN s.status = 'graded' AND s.score IS NOT NULL AND a.max_score > 0 AND s.score * 10 >= a.max_score * 5 THEN 2
  WHEN s.status = 'graded' AND a.max_score <= 0 THEN 3
  ELSE 1 END`;

export async function studentMotivation(studentId: number, now: Date = new Date()): Promise<StudentMotivation | null> {
  const student = await enrolledStudent(studentId);
  if (!student) return null;
  const today = todayKeyVN(now);
  const month = monthKey(today);
  const from = vnDayBounds(monthStartKey(month)).start;
  const to = vnDayBounds(monthStartKey(shiftMonth(month, 1))).start;

  const [list, games, weeks, cls] = await Promise.all([
    studentAssignmentList(studentId),
    db.execute<{ stars: number }>(sql`
      SELECT COALESCE(SUM(best), 0)::int AS stars
      FROM (SELECT MAX(stars) AS best FROM game_plays WHERE student_id = ${studentId} GROUP BY word_list_id, game) g`),
    // Thứ Hai đầu các tuần có học (giờ Việt Nam), 2 năm gần nhất
    db.execute<{ day: string }>(sql`
      SELECT DISTINCT to_char((t AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, 'YYYY-MM-DD') AS day FROM (
        SELECT submitted_at AS t FROM assignment_submissions WHERE student_id = ${studentId} AND submitted_at IS NOT NULL
        UNION ALL SELECT played_at FROM game_plays WHERE student_id = ${studentId}
      ) x WHERE t > now() - interval '2 years'`),
    // Sao cả lớp góp trong tháng: bài nộp trong tháng và lượt chơi tốt nhất mỗi trò trong tháng của từng bạn đang học
    db.execute<{ stars: number; members: number }>(sql`
      WITH members AS (SELECT id FROM students WHERE class_id = ${student.classId} AND status = 'active'),
      subs AS (
        SELECT ${SUB_STARS} AS stars FROM assignment_submissions s JOIN assignments a ON a.id = s.assignment_id
        WHERE s.student_id IN (SELECT id FROM members) AND s.status <> 'not_submitted'
          AND s.submitted_at >= ${from} AND s.submitted_at < ${to}
      ),
      plays AS (
        SELECT MAX(stars) AS stars FROM game_plays
        WHERE student_id IN (SELECT id FROM members) AND played_at >= ${from} AND played_at < ${to}
        GROUP BY student_id, word_list_id, game
      )
      SELECT (COALESCE((SELECT SUM(stars) FROM subs), 0) + COALESCE((SELECT SUM(stars) FROM plays), 0))::int AS stars,
             (SELECT COUNT(*) FROM members)::int AS members`),
  ]);

  const path = list.map((r) => ({ ...r, stars: assignmentStars(r.status, r.score, r.maxScore) }));
  const fromAssignments = path.reduce((sum, p) => sum + p.stars, 0);
  const fromGames = Number(games.rows[0]?.stars ?? 0);
  const activeWeeks = [...new Set(weeks.rows.map((w) => weekStartKey(w.day)))];
  return {
    path,
    assignmentStars: fromAssignments,
    gameStars: fromGames,
    totalStars: fromAssignments + fromGames,
    streak: weeklyStreak(activeWeeks, weekStartKey(today)),
    classGoal: { ...classGoal(Number(cls.rows[0]?.stars ?? 0), Number(cls.rows[0]?.members ?? 0)), month },
  };
}
