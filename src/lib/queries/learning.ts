// Truy vấn lịch sử học tập gộp từ điểm danh, bài đã chấm, học phí và sự kiện học tập. Chỉ chạy trên server.
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import type { CampusScope } from '@/lib/campus';
import { campusCond } from '@/lib/queries/campuses';
import { mergeHistory, type HistoryItem, type HistoryKind } from '@/lib/learning-history';

type RawHistory = {
  id: string;
  kind: string;
  at: Date;
  title: string;
  detail: string;
  amount: number | null;
  student_id: number;
  full_name: string;
  class_id: number;
  class_name: string;
};

// Mệnh đề gộp các nguồn. Mỗi nguồn trả về cùng các cột: id, kind, at, title, detail, amount, student_id, class_id.
const SOURCES = sql`
  SELECT 'att-' || a.id AS id,
    CASE WHEN a.mark = 'absent' THEN 'absent' ELSE 'late' END AS kind,
    (a.session_date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') AS at,
    CASE WHEN a.mark = 'absent' THEN 'Vắng buổi học' ELSE 'Đi học trễ' END AS title,
    to_char(a.session_date, 'DD/MM/YYYY') AS detail,
    NULL::int AS amount,
    a.student_id, a.class_id
  FROM attendance a
  WHERE a.mark IN ('absent', 'late')
  UNION ALL
  SELECT 'grd-' || sub.id, 'graded', COALESCE(sub.submitted_at, asg.due_at), asg.title,
    CONCAT('Điểm ', sub.score, '/', asg.max_score, CASE WHEN sub.feedback <> '' THEN ' · ' || sub.feedback ELSE '' END),
    NULL::int, sub.student_id, asg.class_id
  FROM assignment_submissions sub
  JOIN assignments asg ON asg.id = sub.assignment_id
  WHERE sub.status = 'graded'
  UNION ALL
  SELECT 'pay-' || tp.id, 'payment', tp.paid_at, 'Thu học phí', tp.note, tp.amount, tp.student_id, s.class_id
  FROM tuition_payments tp
  JOIN students s ON s.id = tp.student_id
  UNION ALL
  SELECT 'evt-' || le.id, le.event_type::text, le.occurred_at, le.title, le.detail, NULL::int, le.student_id, s.class_id
  FROM learning_events le
  JOIN students s ON s.id = le.student_id
`;

function toItem(r: RawHistory): HistoryItem {
  return {
    id: r.id,
    kind: r.kind as HistoryKind,
    at: new Date(r.at).toISOString(),
    title: r.title,
    detail: r.detail,
    amount: r.amount,
    studentId: r.student_id,
    studentName: r.full_name,
    classId: r.class_id,
    className: r.class_name,
  };
}

// Lịch sử của một học sinh, mới nhất trước
export async function listHistoryForStudent(studentId: number): Promise<HistoryItem[]> {
  const result = await db.execute<RawHistory>(sql`
    SELECT h.*, s.full_name, c.name AS class_name
    FROM (${SOURCES}) h
    JOIN students s ON s.id = h.student_id
    JOIN classes c ON c.id = h.class_id
    WHERE h.student_id = ${studentId}
    ORDER BY h.at DESC, h.id DESC
    LIMIT 300
  `);
  return mergeHistory(result.rows.map(toItem));
}

// Lịch sử của học sinh trong cơ sở đang xem (scope null: mọi cơ sở), mới nhất trước. Lọc lớp và loại làm ở lớp giao diện.
export async function listHistoryAll(scope: CampusScope): Promise<HistoryItem[]> {
  const result = await db.execute<RawHistory>(sql`
    SELECT h.*, s.full_name, c.name AS class_name
    FROM (${SOURCES}) h
    JOIN students s ON s.id = h.student_id
    JOIN classes c ON c.id = h.class_id
    WHERE ${campusCond(scope, sql`c.campus_id`)}
    ORDER BY h.at DESC, h.id DESC
    LIMIT 400
  `);
  return mergeHistory(result.rows.map(toItem));
}
