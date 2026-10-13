// Truy vấn bài tập và bài nộp. Chỉ chạy trên server. Học sinh tính là đang học khi active hoặc trial.
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { assignmentSubmissions, assignments, classes, students } from '@/db/schema';

export type AssignmentRow = {
  id: number;
  classId: number;
  className: string;
  title: string;
  description: string;
  dueAt: string; // ISO
  maxScore: number;
  enrolled: number; // học sinh đang học của lớp
  done: number; // đã nộp hoặc đã chấm
  graded: number;
  overdue: boolean; // đã qua hạn và còn học sinh chưa nộp
};

const ENROLLED = sql`('active', 'trial')`;

// Bài tập của một lớp, mới nhất trước
export async function listAssignmentsOfClass(classId: number): Promise<AssignmentRow[]> {
  const nowMs = Date.now();
  const result = await db.execute<{
    id: number; class_id: number; class_name: string; title: string; description: string; due_at: Date; max_score: number;
    enrolled: number; done: number; graded: number;
  }>(sql`
    SELECT a.id, a.class_id, c.name AS class_name, a.title, a.description, a.due_at, a.max_score,
      (SELECT COUNT(*)::int FROM students s WHERE s.class_id = a.class_id AND s.status IN ${ENROLLED}) AS enrolled,
      (SELECT COUNT(*)::int FROM assignment_submissions sub JOIN students s ON s.id = sub.student_id
        WHERE sub.assignment_id = a.id AND s.status IN ${ENROLLED} AND sub.status IN ('submitted', 'graded')) AS done,
      (SELECT COUNT(*)::int FROM assignment_submissions sub JOIN students s ON s.id = sub.student_id
        WHERE sub.assignment_id = a.id AND s.status IN ${ENROLLED} AND sub.status = 'graded') AS graded
    FROM assignments a JOIN classes c ON c.id = a.class_id
    WHERE a.class_id = ${classId}
    ORDER BY a.due_at DESC, a.id DESC
  `);
  return result.rows.map((r) => toAssignmentRow(r, nowMs));
}

function toAssignmentRow(
  r: { id: number; class_id: number; class_name: string; title: string; description: string; due_at: Date; max_score: number; enrolled: number; done: number; graded: number },
  nowMs: number,
): AssignmentRow {
  const due = new Date(r.due_at);
  return {
    id: r.id,
    classId: r.class_id,
    className: r.class_name,
    title: r.title,
    description: r.description,
    dueAt: due.toISOString(),
    maxScore: r.max_score,
    enrolled: r.enrolled,
    done: r.done,
    graded: r.graded,
    overdue: due.getTime() < nowMs && r.enrolled - r.done > 0,
  };
}

// Một bài tập để hiện tiêu đề, lớp và hạn
export async function getAssignmentBase(id: number) {
  const [row] = await db
    .select({
      id: assignments.id,
      classId: assignments.classId,
      className: classes.name,
      title: assignments.title,
      description: assignments.description,
      dueAt: assignments.dueAt,
      maxScore: assignments.maxScore,
    })
    .from(assignments)
    .innerJoin(classes, eq(classes.id, assignments.classId))
    .where(eq(assignments.id, id))
    .limit(1);
  return row ?? null;
}

export type GradingRow = {
  studentId: number;
  fullName: string;
  status: 'not_submitted' | 'submitted' | 'graded';
  score: number | null;
  feedback: string;
  submittedAt: string | null;
};

// Danh sách chấm điểm: mọi học sinh đang học của lớp, kể cả người chưa có dòng nộp (mặc định chưa nộp)
export async function listGradingRows(assignmentId: number, classId: number): Promise<GradingRow[]> {
  const rows = await db
    .select({
      studentId: students.id,
      fullName: students.fullName,
      status: assignmentSubmissions.status,
      score: assignmentSubmissions.score,
      feedback: assignmentSubmissions.feedback,
      submittedAt: assignmentSubmissions.submittedAt,
    })
    .from(students)
    .leftJoin(assignmentSubmissions, and(eq(assignmentSubmissions.studentId, students.id), eq(assignmentSubmissions.assignmentId, assignmentId)))
    .where(and(eq(students.classId, classId), inArray(students.status, ['active', 'trial'])))
    .orderBy(asc(students.fullName));
  return rows.map((r) => ({
    studentId: r.studentId,
    fullName: r.fullName,
    status: r.status ?? 'not_submitted',
    score: r.score,
    feedback: r.feedback ?? '',
    submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
  }));
}

// Bài quá hạn còn học sinh chưa nộp, trên tất cả các lớp. Dùng cho Tổng quan.
export async function listOverdueAssignments(): Promise<AssignmentRow[]> {
  const nowMs = Date.now();
  const result = await db.execute<{
    id: number; class_id: number; class_name: string; title: string; description: string; due_at: Date; max_score: number;
    enrolled: number; done: number; graded: number;
  }>(sql`
    SELECT a.id, a.class_id, c.name AS class_name, a.title, a.description, a.due_at, a.max_score,
      (SELECT COUNT(*)::int FROM students s WHERE s.class_id = a.class_id AND s.status IN ${ENROLLED}) AS enrolled,
      (SELECT COUNT(*)::int FROM assignment_submissions sub JOIN students s ON s.id = sub.student_id
        WHERE sub.assignment_id = a.id AND s.status IN ${ENROLLED} AND sub.status IN ('submitted', 'graded')) AS done,
      (SELECT COUNT(*)::int FROM assignment_submissions sub JOIN students s ON s.id = sub.student_id
        WHERE sub.assignment_id = a.id AND s.status IN ${ENROLLED} AND sub.status = 'graded') AS graded
    FROM assignments a JOIN classes c ON c.id = a.class_id
    WHERE a.due_at < NOW()
    ORDER BY a.due_at DESC
  `);
  return result.rows.map((r) => toAssignmentRow(r, nowMs)).filter((r) => r.overdue);
}

export type StudentAssignmentRow = {
  assignmentId: number;
  title: string;
  dueAt: string;
  maxScore: number;
  status: 'not_submitted' | 'submitted' | 'graded';
  score: number | null;
  overdue: boolean;
};

// Bài tập của một học sinh trong lớp đang học, mới nhất trước
export async function listStudentAssignments(studentId: number): Promise<StudentAssignmentRow[]> {
  const nowMs = Date.now();
  const result = await db.execute<{
    assignment_id: number; title: string; due_at: Date; max_score: number; status: StudentAssignmentRow['status'] | null; score: number | null;
  }>(sql`
    SELECT a.id AS assignment_id, a.title, a.due_at, a.max_score, sub.status, sub.score
    FROM students s
    JOIN assignments a ON a.class_id = s.class_id
    LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = s.id
    WHERE s.id = ${studentId}
    ORDER BY a.due_at DESC
  `);
  return result.rows.map((r) => {
    const status = r.status ?? 'not_submitted';
    const due = new Date(r.due_at);
    return {
      assignmentId: r.assignment_id,
      title: r.title,
      dueAt: due.toISOString(),
      maxScore: r.max_score,
      status,
      score: r.score,
      overdue: due.getTime() < nowMs && status === 'not_submitted',
    };
  });
}
