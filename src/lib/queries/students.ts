// Truy vấn đọc danh sách và hồ sơ học sinh. Chỉ chạy trên server.
// Tiền, điểm danh và phụ huynh được tổng hợp ngay trong SQL, tham số hoá an toàn.
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { normalizeSearch } from '@/lib/text';

export type TuitionFilter = 'all' | 'paid' | 'partial' | 'unpaid';
export type StatusFilter = 'all' | 'active' | 'trial' | 'paused' | 'finished';

export type StudentListFilters = {
  q: string;
  status: StatusFilter;
  classId: number | null;
  tuition: TuitionFilter;
};

export type StudentRow = {
  id: number;
  code: string; // HS-0001
  fullName: string;
  gender: 'male' | 'female';
  status: 'active' | 'trial' | 'paused' | 'finished';
  classId: number;
  className: string;
  teacherName: string;
  sessionsDone: number;
  sessionsTotal: number;
  fee: number;
  paid: number;
  debt: number;
  tuition: 'paid' | 'partial' | 'unpaid';
  attendanceRate: number; // phần trăm, không tính buổi vắng
  parentName: string | null;
  parentPhone: string | null;
};

export type StudentListResult = {
  rows: StudentRow[];
  total: number;
  statusCounts: Record<StatusFilter, number>;
};

// Mệnh đề WHERE từ bộ lọc. Tìm kiếm không dấu, và cả mã học sinh hoặc số điện thoại phụ huynh.
function whereClause(f: StudentListFilters) {
  const parts = [sql`TRUE`];
  const q = normalizeSearch(f.q);
  if (q) {
    const like = `%${q}%`;
    const digits = f.q.replace(/\D/g, '');
    const codeLike = `%${f.q.trim().toUpperCase()}%`;
    parts.push(
      sql`(b.search_key LIKE ${like} OR UPPER(b.code) LIKE ${codeLike} OR (${digits.length >= 3 ? sql`b.parent_phone LIKE ${`%${digits}%`}` : sql`FALSE`}))`,
    );
  }
  if (f.status !== 'all') parts.push(sql`b.status = ${f.status}`);
  if (f.classId) parts.push(sql`b.class_id = ${f.classId}`);
  if (f.tuition !== 'all') parts.push(sql`b.tuition = ${f.tuition}`);
  return sql.join(parts, sql` AND `);
}

const BASE_CTE = sql`
  WITH paid AS (
    SELECT student_id, COALESCE(SUM(amount), 0)::int AS paid
    FROM tuition_payments GROUP BY student_id
  ),
  att AS (
    SELECT student_id,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE mark = 'absent')::int AS absent
    FROM attendance GROUP BY student_id
  ),
  primary_parent AS (
    SELECT sp.student_id, p.full_name, p.phone
    FROM student_parents sp JOIN parents p ON p.id = sp.parent_id
    WHERE sp.is_primary
  ),
  base AS (
    SELECT
      s.id, s.full_name, s.search_key, s.gender, s.status, s.class_id, s.sessions_done,
      c.name AS class_name, c.sessions_total, c.fee,
      t.name AS teacher_name,
      COALESCE(paid.paid, 0) AS paid,
      COALESCE(att.total, 0) AS att_total,
      COALESCE(att.absent, 0) AS att_absent,
      pp.full_name AS parent_name,
      pp.phone AS parent_phone,
      CASE
        WHEN COALESCE(paid.paid, 0) >= c.fee THEN 'paid'
        WHEN COALESCE(paid.paid, 0) > 0 THEN 'partial'
        ELSE 'unpaid'
      END AS tuition,
      CONCAT('HS-', LPAD(s.id::text, 4, '0')) AS code
    FROM students s
    JOIN classes c ON c.id = s.class_id
    JOIN teachers t ON t.id = c.teacher_id
    LEFT JOIN paid ON paid.student_id = s.id
    LEFT JOIN att ON att.student_id = s.id
    LEFT JOIN primary_parent pp ON pp.student_id = s.id
  )
`;

type RawRow = {
  id: number;
  full_name: string;
  gender: 'male' | 'female';
  status: StudentRow['status'];
  class_id: number;
  class_name: string;
  teacher_name: string;
  sessions_done: number;
  sessions_total: number;
  fee: number;
  paid: number;
  att_total: number;
  att_absent: number;
  parent_name: string | null;
  parent_phone: string | null;
  tuition: StudentRow['tuition'];
  code: string;
  total_count: number;
};

export async function listStudents(filters: StudentListFilters, page: { limit: number; offset: number }): Promise<StudentListResult> {
  const where = whereClause(filters);
  const result = await db.execute<RawRow>(sql`
    ${BASE_CTE}
    SELECT b.*, COUNT(*) OVER()::int AS total_count
    FROM base b
    WHERE ${where}
    ORDER BY b.id
    LIMIT ${page.limit} OFFSET ${page.offset}
  `);

  const countsRaw = await db.execute<{ status: StudentRow['status']; n: number }>(sql`
    ${BASE_CTE}
    SELECT b.status, COUNT(*)::int AS n
    FROM base b
    WHERE ${whereClause({ ...filters, status: 'all' })}
    GROUP BY b.status
  `);

  const statusCounts: Record<StatusFilter, number> = { all: 0, active: 0, trial: 0, paused: 0, finished: 0 };
  for (const row of countsRaw.rows) {
    statusCounts[row.status] = row.n;
    statusCounts.all += row.n;
  }

  const rows: StudentRow[] = result.rows.map((r) => ({
    id: r.id,
    code: r.code,
    fullName: r.full_name,
    gender: r.gender,
    status: r.status,
    classId: r.class_id,
    className: r.class_name,
    teacherName: r.teacher_name,
    sessionsDone: r.sessions_done,
    sessionsTotal: r.sessions_total,
    fee: r.fee,
    paid: r.paid,
    debt: Math.max(0, r.fee - r.paid),
    tuition: r.tuition,
    attendanceRate: r.att_total > 0 ? Math.round(((r.att_total - r.att_absent) / r.att_total) * 100) : 100,
    parentName: r.parent_name,
    parentPhone: r.parent_phone,
  }));

  return {
    rows,
    total: result.rows[0]?.total_count ?? 0,
    statusCounts,
  };
}

export async function listClassOptions(): Promise<{ id: number; name: string; course: string; teacherName: string; fee: number }[]> {
  const result = await db.execute<{ id: number; name: string; course: string; teacher_name: string; fee: number }>(sql`
    SELECT c.id, c.name, c.course, t.name AS teacher_name, c.fee
    FROM classes c JOIN teachers t ON t.id = c.teacher_id
    ORDER BY c.name
  `);
  return result.rows.map((r) => ({ id: r.id, name: r.name, course: r.course, teacherName: r.teacher_name, fee: r.fee }));
}

export type StudentDetail = {
  id: number;
  code: string;
  fullName: string;
  gender: 'male' | 'female';
  dob: string;
  startDate: string;
  note: string;
  status: StudentRow['status'];
  classId: number;
  className: string;
  course: string;
  schedule: string;
  room: string;
  teacherName: string;
  sessionsDone: number;
  sessionsTotal: number;
  fee: number;
  paid: number;
  debt: number;
  tuition: StudentRow['tuition'];
  attendanceRate: number;
  recentMarks: ('present' | 'late' | 'absent')[]; // 10 buổi gần nhất, cũ nhất trước
  payments: { id: number; amount: number; paidAt: string; note: string }[];
  parents: { id: number; fullName: string; phone: string; relation: ParentRelation; isPrimary: boolean }[];
};

type ParentRelation = 'father' | 'mother' | 'guardian' | 'other';

// Hồ sơ đầy đủ một học sinh. Trả về null nếu không tồn tại.
export async function getStudentDetail(id: number): Promise<StudentDetail | null> {
  const base = await db.execute<{
    id: number; full_name: string; gender: 'male' | 'female'; dob: string; start_date: string; note: string;
    status: StudentRow['status']; class_id: number; class_name: string; course: string; schedule: string;
    room: string; teacher_name: string; sessions_done: number; sessions_total: number; fee: number; paid: number;
    att_total: number; att_absent: number; tuition: StudentRow['tuition'];
  }>(sql`
    ${BASE_CTE}
    SELECT b.id, b.full_name, b.gender, s.dob::text AS dob, s.start_date::text AS start_date, s.note,
      b.status, b.class_id, b.class_name, c.course, c.schedule, c.room, b.teacher_name,
      b.sessions_done, b.sessions_total, b.fee, b.paid, b.att_total, b.att_absent, b.tuition
    FROM base b
    JOIN students s ON s.id = b.id
    JOIN classes c ON c.id = b.class_id
    WHERE b.id = ${id}
  `);
  const row = base.rows[0];
  if (!row) return null;

  const marks = await db.execute<{ mark: 'present' | 'late' | 'absent' }>(sql`
    SELECT mark FROM attendance WHERE student_id = ${id} ORDER BY session_date DESC LIMIT 10
  `);
  const payments = await db.execute<{ id: number; amount: number; paid_at: string; note: string }>(sql`
    SELECT id, amount, to_char(paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS paid_at, note
    FROM tuition_payments WHERE student_id = ${id} ORDER BY paid_at DESC, id DESC
  `);
  const parents = await db.execute<{ id: number; full_name: string; phone: string; relation: ParentRelation; is_primary: boolean }>(sql`
    SELECT p.id, p.full_name, p.phone, sp.relation, sp.is_primary
    FROM student_parents sp JOIN parents p ON p.id = sp.parent_id
    WHERE sp.student_id = ${id}
    ORDER BY sp.is_primary DESC, p.id
  `);

  return {
    id: row.id,
    code: `HS-${String(row.id).padStart(4, '0')}`,
    fullName: row.full_name,
    gender: row.gender,
    dob: row.dob,
    startDate: row.start_date,
    note: row.note,
    status: row.status,
    classId: row.class_id,
    className: row.class_name,
    course: row.course,
    schedule: row.schedule,
    room: row.room,
    teacherName: row.teacher_name,
    sessionsDone: row.sessions_done,
    sessionsTotal: row.sessions_total,
    fee: row.fee,
    paid: row.paid,
    debt: Math.max(0, row.fee - row.paid),
    tuition: row.tuition,
    attendanceRate: row.att_total > 0 ? Math.round(((row.att_total - row.att_absent) / row.att_total) * 100) : 100,
    recentMarks: marks.rows.map((m) => m.mark).reverse(),
    payments: payments.rows.map((p) => ({ id: p.id, amount: p.amount, paidAt: p.paid_at, note: p.note })),
    parents: parents.rows.map((p) => ({ id: p.id, fullName: p.full_name, phone: p.phone, relation: p.relation, isPrimary: p.is_primary })),
  };
}
