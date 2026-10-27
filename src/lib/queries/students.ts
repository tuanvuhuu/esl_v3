// Truy vấn đọc danh sách và hồ sơ học sinh. Chỉ chạy trên server.
// Tiền, điểm danh và phụ huynh được tổng hợp ngay trong SQL, tham số hoá an toàn.
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { getAllowedCampusIds } from '@/lib/campus-access';
import { accounts } from '@/db/schema';
import type { CampusScope } from '@/lib/campus';
import { campusCond } from '@/lib/queries/campuses';
import { parseStudentCode, studentCode } from '@/lib/student-code';
import { normalizeSearch } from '@/lib/text';
import { sessionsCovered } from '@/lib/tuition';
import { NET_FEE_SQL } from '@/lib/tuition-fee';

// Học phí và lớp chọn nhiều: danh sách rỗng nghĩa là không lọc
export type TuitionFilter = 'paid' | 'partial' | 'unpaid';
export type StatusFilter = 'all' | 'active' | 'trial' | 'paused' | 'finished';

export type StudentSortField =
  | 'name'
  | 'code'
  | 'gender'
  | 'class'
  | 'progress'
  | 'attendance'
  | 'tuition'
  | 'status';

export type SortOrder = 'asc' | 'desc';

export type StudentSort = {
  field: StudentSortField;
  order: SortOrder;
};

export type StudentListFilters = {
  q: string;
  status: StatusFilter;
  classIds: number[];
  tuitions: TuitionFilter[];
};

export type StudentRow = {
  id: number;
  code: string; // HS-00001
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
  discount: number; // miễn giảm cố định (VND), 0 nếu không có
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

// Mệnh đề WHERE từ bộ lọc và cơ sở đang xem. Tìm kiếm không dấu, và cả mã học sinh hoặc số điện thoại phụ huynh.
function whereClause(f: StudentListFilters, scope: CampusScope) {
  const parts = [sql`TRUE`, campusCond(scope, sql`b.campus_id`)];
  const q = normalizeSearch(f.q);
  if (q) {
    const like = `%${q}%`;
    const digits = f.q.replace(/\D/g, '');
    const codeLike = `%${f.q.trim().toUpperCase()}%`;
    // Gõ đủ mã (HS-00012, hoặc mã cũ HS-0012) thì tìm đúng học sinh đó
    const codeId = parseStudentCode(f.q);
    parts.push(
      sql`(b.search_key LIKE ${like} OR UPPER(b.code) LIKE ${codeLike} OR ${codeId === null ? sql`FALSE` : sql`b.id = ${codeId}`} OR (${digits.length >= 3 ? sql`b.parent_phone LIKE ${`%${digits}%`}` : sql`FALSE`}))`,
    );
  }
  if (f.status !== 'all') parts.push(sql`b.status = ${f.status}`);
  if (f.classIds.length) parts.push(sql`b.class_id IN (${sql.join(f.classIds.map((id) => sql`${id}`), sql`, `)})`);
  if (f.tuitions.length) parts.push(sql`b.tuition IN (${sql.join(f.tuitions.map((t) => sql`${t}`), sql`, `)})`);
  return sql.join(parts, sql` AND `);
}

function orderClause(sort?: StudentSort) {
  if (!sort) return sql`b.id ASC`;

  const isDesc = sort.order === 'desc';

  switch (sort.field) {
    case 'name':
      return isDesc ? sql`b.full_name DESC, b.id DESC` : sql`b.full_name ASC, b.id ASC`;

    case 'code':
      return isDesc ? sql`b.id DESC` : sql`b.id ASC`;

    case 'gender':
      return isDesc
        ? sql`b.gender DESC, b.full_name ASC, b.id ASC`
        : sql`b.gender ASC, b.full_name ASC, b.id ASC`;

    case 'class':
      return isDesc
        ? sql`b.class_name DESC, b.teacher_name DESC, b.id DESC`
        : sql`b.class_name ASC, b.teacher_name ASC, b.id ASC`;

    case 'progress':
      return isDesc
        ? sql`(COALESCE(b.sessions_done::float / NULLIF(b.sessions_total, 0), 0)) DESC, b.sessions_done DESC, b.id DESC`
        : sql`(COALESCE(b.sessions_done::float / NULLIF(b.sessions_total, 0), 0)) ASC, b.sessions_done ASC, b.id ASC`;

    case 'attendance':
      return isDesc
        ? sql`(CASE WHEN b.att_total > 0 THEN ((b.att_total - b.att_absent)::float / b.att_total) ELSE 1.0 END) DESC, b.id DESC`
        : sql`(CASE WHEN b.att_total > 0 THEN ((b.att_total - b.att_absent)::float / b.att_total) ELSE 1.0 END) ASC, b.id ASC`;

    case 'tuition':
      return isDesc
        ? sql`CASE b.tuition WHEN 'unpaid' THEN 1 WHEN 'partial' THEN 2 WHEN 'paid' THEN 3 END ASC, GREATEST(0, b.fee - b.paid) DESC, b.id DESC`
        : sql`CASE b.tuition WHEN 'paid' THEN 1 WHEN 'partial' THEN 2 WHEN 'unpaid' THEN 3 END ASC, GREATEST(0, b.fee - b.paid) ASC, b.id ASC`;

    case 'status':
      return isDesc
        ? sql`CASE b.status WHEN 'finished' THEN 1 WHEN 'paused' THEN 2 WHEN 'trial' THEN 3 WHEN 'active' THEN 4 END ASC, b.id DESC`
        : sql`CASE b.status WHEN 'active' THEN 1 WHEN 'trial' THEN 2 WHEN 'paused' THEN 3 WHEN 'finished' THEN 4 END ASC, b.id ASC`;

    default:
      return sql`b.id ASC`;
  }
}

const BASE_CTE = sql`
  WITH paid AS (
    SELECT student_id, COALESCE(SUM(amount), 0)::int AS paid
    FROM tuition_payments GROUP BY student_id
  ),
  att AS (
    SELECT student_id,
      COUNT(*) FILTER (WHERE mark <> 'excused')::int AS total,
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
      c.name AS class_name, c.campus_id, c.sessions_total, ${NET_FEE_SQL} AS fee, COALESCE(s.tuition_discount, 0) AS discount,
      t.name AS teacher_name,
      COALESCE(paid.paid, 0) AS paid,
      COALESCE(att.total, 0) AS att_total,
      COALESCE(att.absent, 0) AS att_absent,
      pp.full_name AS parent_name,
      pp.phone AS parent_phone,
      CASE
        WHEN COALESCE(paid.paid, 0) >= ${NET_FEE_SQL} THEN 'paid'
        WHEN COALESCE(paid.paid, 0) > 0 THEN 'partial'
        ELSE 'unpaid'
      END AS tuition,
      CONCAT('HS-', LPAD(s.id::text, 5, '0')) AS code
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
  discount: number;
  paid: number;
  att_total: number;
  att_absent: number;
  parent_name: string | null;
  parent_phone: string | null;
  tuition: StudentRow['tuition'];
  code: string;
  total_count: number;
};

// Học sinh trong cơ sở đang xem (scope null: mọi cơ sở)
export async function listStudents(
  filters: StudentListFilters,
  page: { limit: number; offset: number },
  scope: CampusScope,
  sort?: StudentSort,
): Promise<StudentListResult> {
  const where = whereClause(filters, scope);
  const order = orderClause(sort);
  const result = await db.execute<RawRow>(sql`
    ${BASE_CTE}
    SELECT b.*, COUNT(*) OVER()::int AS total_count
    FROM base b
    WHERE ${where}
    ORDER BY ${order}
    LIMIT ${page.limit} OFFSET ${page.offset}
  `);

  const countsRaw = await db.execute<{ status: StudentRow['status']; n: number }>(sql`
    ${BASE_CTE}
    SELECT b.status, COUNT(*)::int AS n
    FROM base b
    WHERE ${whereClause({ ...filters, status: 'all' }, scope)}
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
    discount: r.discount,
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

// Lớp cho bộ lọc và form học sinh, trong cơ sở đang xem. Kèm tên cơ sở để phân biệt khi xem tất cả.
// Chỉ trả về lớp của các cơ sở tài khoản được làm việc (P32), kể cả khi scope là tất cả
export async function listClassOptions(scope: CampusScope): Promise<{ id: number; name: string; course: string; teacherName: string; fee: number; campusId: number; campusName: string }[]> {
  const result = await db.execute<{ id: number; name: string; course: string; teacher_name: string; fee: number; campus_id: number; campus_name: string }>(sql`
    SELECT c.id, c.name, c.course, t.name AS teacher_name, c.fee, c.campus_id, cp.name AS campus_name
    FROM classes c
    JOIN teachers t ON t.id = c.teacher_id
    JOIN campuses cp ON cp.id = c.campus_id
    WHERE ${campusCond(scope, sql`c.campus_id`)}
    ORDER BY c.name, c.id
  `);
  const allowed = await getAllowedCampusIds();
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    course: r.course,
    teacherName: r.teacher_name,
    fee: r.fee,
    campusId: r.campus_id,
    campusName: r.campus_name,
  })).filter((r) => allowed === null || allowed.includes(r.campusId));
}

export type StudentDetail = {
  id: number;
  code: string;
  fullName: string;
  hasAccount: boolean; // đã có tài khoản học sinh để đăng nhập làm bài (P28)
  gender: 'male' | 'female';
  dob: string | null;
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
  fee: number; // học phí thực thu (đã trừ giảm trừ)
  discount: number; // giảm trừ cố định (VND), 0 nếu không có
  paid: number;
  debt: number;
  sessionsOwed: number; // số buổi từ ngày bắt đầu học đến hết khoá (không tính buổi huỷ)
  sessionsPaid: number; // số buổi đã đóng, theo số tiền đã thu
  tuition: StudentRow['tuition'];
  attendanceRate: number;
  recentMarks: ('present' | 'late' | 'absent' | 'excused')[]; // 10 buổi gần nhất, cũ nhất trước
  payments: { id: number; amount: number; paidAt: string; note: string }[];
  parents: { id: number; fullName: string; phone: string; relation: ParentRelation; isPrimary: boolean }[];
};

type ParentRelation = 'father' | 'mother' | 'guardian' | 'other';

// Hồ sơ đầy đủ một học sinh. Trả về null nếu không tồn tại.
export async function getStudentDetail(id: number): Promise<StudentDetail | null> {
  const base = await db.execute<{
    id: number; full_name: string; gender: 'male' | 'female'; dob: string | null; start_date: string; note: string;
    status: StudentRow['status']; class_id: number; class_name: string; course: string; schedule: string;
    room: string; teacher_name: string; sessions_done: number; sessions_total: number; fee: number; discount: number; paid: number;
    att_total: number; att_absent: number; tuition: StudentRow['tuition'];
  }>(sql`
    ${BASE_CTE}
    SELECT b.id, b.full_name, b.gender, s.dob::text AS dob, s.start_date::text AS start_date, s.note,
      b.status, b.class_id, b.class_name, c.course, c.schedule, c.room, b.teacher_name,
      b.sessions_done, b.sessions_total, b.fee, b.discount, b.paid, b.att_total, b.att_absent, b.tuition
    FROM base b
    JOIN students s ON s.id = b.id
    JOIN classes c ON c.id = b.class_id
    WHERE b.id = ${id}
  `);
  const row = base.rows[0];
  if (!row) return null;

  const owed = await db.execute<{ n: number }>(sql`
    SELECT COUNT(*)::int AS n FROM class_sessions cs
    WHERE cs.class_id = ${row.class_id} AND cs.status <> 'cancelled'
      AND cs.starts_at >= (${row.start_date}::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
  `);
  const sessionsOwed = owed.rows[0]?.n ?? 0;
  const marks = await db.execute<{ mark: 'present' | 'late' | 'absent' | 'excused' }>(sql`
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

  const [account] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.studentId, id)).limit(1);
  return {
    id: row.id,
    code: studentCode(row.id),
    fullName: row.full_name,
    hasAccount: !!account,
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
    discount: row.discount,
    paid: row.paid,
    debt: Math.max(0, row.fee - row.paid),
    sessionsOwed,
    sessionsPaid: sessionsCovered(row.fee, row.paid, sessionsOwed),
    tuition: row.tuition,
    attendanceRate: row.att_total > 0 ? Math.round(((row.att_total - row.att_absent) / row.att_total) * 100) : 100,
    recentMarks: marks.rows.map((m) => m.mark).reverse(),
    payments: payments.rows.map((p) => ({ id: p.id, amount: p.amount, paidAt: p.paid_at, note: p.note })),
    parents: parents.rows.map((p) => ({ id: p.id, fullName: p.full_name, phone: p.phone, relation: p.relation, isPrimary: p.is_primary })),
  };
}
