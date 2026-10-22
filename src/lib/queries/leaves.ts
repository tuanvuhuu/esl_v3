// Đơn xin nghỉ cho màn Đơn nghỉ của giáo vụ (37.11). Chỉ chạy trên server.
// Cùng quy tắc với bot: giáo viên thấy đơn của lớp mình dạy; giáo vụ và vai trò khác có quyền điểm danh thấy mọi lớp
// ở cơ sở mình (scope); quản trị thấy mọi đơn. Đơn nháp (phụ huynh chưa gửi) không hiện.
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import type { CampusScope } from '@/lib/campus';
import { campusCond } from '@/lib/queries/campuses';

export const LEAVE_FILTERS = ['pending', 'approved', 'denied', 'cancelled', 'all'] as const;
export type LeaveFilter = (typeof LEAVE_FILTERS)[number];
export type LeaveStatus = Exclude<LeaveFilter, 'all'>;

export type LeaveListRow = {
  id: number;
  status: LeaveStatus;
  reason: string;
  studentId: number;
  studentName: string;
  classId: number;
  className: string;
  startsAt: Date;
  endsAt: Date;
  parentName: string | null;
  parentPhone: string | null;
  decidedBy: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  past: boolean; // buổi đã bắt đầu
};

export async function listLeaves(input: {
  filter: LeaveFilter;
  classId: number | null;
  scope: CampusScope;
  teacherId: number | null; // tài khoản giáo viên: chỉ lớp mình dạy
}): Promise<{ rows: LeaveListRow[]; counts: Record<LeaveFilter, number> }> {
  const campus = campusCond(input.scope, sql`c.campus_id`);
  const teaches = input.teacherId
    ? sql`${input.teacherId} IN (c.teacher_id, c.assistant_id, c.foreign_teacher_id, cs.teacher_id)`
    : sql`true`;
  const cls = input.classId ? sql`c.id = ${input.classId}` : sql`true`;
  const result = await db.execute<{
    id: number; status: LeaveStatus; reason: string; student_id: number; student_name: string; class_id: number; class_name: string;
    starts_at: Date; ends_at: Date; parent_name: string | null; parent_phone: string | null; decided_by: string | null;
    decided_at: Date | null; created_at: Date; past: boolean;
  }>(sql`
    SELECT lr.id, lr.status, lr.reason, s.id AS student_id, s.full_name AS student_name, c.id AS class_id, c.name AS class_name,
      cs.starts_at, cs.ends_at, p.full_name AS parent_name, p.phone AS parent_phone,
      COALESCE(t.name, a.full_name) AS decided_by, lr.decided_at, lr.created_at, cs.starts_at <= now() AS past
    FROM leave_requests lr
    JOIN class_sessions cs ON cs.id = lr.session_id
    JOIN classes c ON c.id = cs.class_id
    JOIN students s ON s.id = lr.student_id
    LEFT JOIN parents p ON p.id = lr.parent_id
    LEFT JOIN accounts a ON a.id = lr.decided_by_account_id
    LEFT JOIN teachers t ON t.id = a.teacher_id
    WHERE lr.status <> 'draft' AND ${campus} AND ${teaches} AND ${cls}
    -- Chờ duyệt: buổi sớm nhất lên đầu; còn lại: buổi mới nhất lên đầu
    ORDER BY (lr.status = 'pending') DESC,
      CASE WHEN lr.status = 'pending' THEN cs.starts_at END ASC,
      cs.starts_at DESC
    LIMIT 500
  `);

  const all: LeaveListRow[] = result.rows.map((r) => ({
    id: Number(r.id),
    status: r.status,
    reason: r.reason,
    studentId: Number(r.student_id),
    studentName: r.student_name,
    classId: Number(r.class_id),
    className: r.class_name,
    startsAt: new Date(r.starts_at),
    endsAt: new Date(r.ends_at),
    parentName: r.parent_name,
    parentPhone: r.parent_phone,
    decidedBy: r.decided_by,
    decidedAt: r.decided_at ? new Date(r.decided_at) : null,
    createdAt: new Date(r.created_at),
    past: Boolean(r.past),
  }));
  const counts: Record<LeaveFilter, number> = { pending: 0, approved: 0, denied: 0, cancelled: 0, all: all.length };
  for (const r of all) counts[r.status] += 1;
  return { rows: input.filter === 'all' ? all : all.filter((r) => r.status === input.filter), counts };
}
