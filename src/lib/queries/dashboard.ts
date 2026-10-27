// Số liệu và danh sách cần chú ý cho màn Tổng quan. Chỉ chạy trên server.
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import type { CampusScope } from '@/lib/campus';
import { addDaysKey, vnDayBounds } from '@/lib/datetime';
import { campusCond } from '@/lib/queries/campuses';

export type DashboardStats = {
  active: number; // đang học
  trial: number; // học thử
  paused: number; // bảo lưu
  attendanceRate: number; // phần trăm có mặt hoặc trễ, 30 ngày gần nhất; 100 nếu chưa có dữ liệu
  nearlyDone: number; // đang học, còn từ 3 buổi trở xuống
};

// Số liệu tổng hợp trong một truy vấn, cho cơ sở đang xem (scope null: mọi cơ sở)
export async function getDashboardStats(todayKey: string, scope: CampusScope): Promise<DashboardStats> {
  const since = addDaysKey(todayKey, -30);
  const campus = campusCond(scope, sql`c.campus_id`);
  const result = await db.execute<{ active: number; trial: number; paused: number; total: number; absent: number; nearly_done: number }>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM students s JOIN classes c ON c.id = s.class_id WHERE s.status = 'active' AND ${campus}) AS active,
      (SELECT COUNT(*)::int FROM students s JOIN classes c ON c.id = s.class_id WHERE s.status = 'trial' AND ${campus}) AS trial,
      (SELECT COUNT(*)::int FROM students s JOIN classes c ON c.id = s.class_id WHERE s.status = 'paused' AND ${campus}) AS paused,
      (SELECT COUNT(*)::int FROM attendance a JOIN classes c ON c.id = a.class_id WHERE a.session_date >= ${since} AND a.mark <> 'excused' AND ${campus}) AS total,
      (SELECT COUNT(*)::int FROM attendance a JOIN classes c ON c.id = a.class_id
        WHERE a.session_date >= ${since} AND a.mark = 'absent' AND ${campus}) AS absent,
      (SELECT COUNT(*)::int FROM students s JOIN classes c ON c.id = s.class_id
        WHERE s.status = 'active' AND c.sessions_total - s.sessions_done <= 3 AND ${campus}) AS nearly_done
  `);
  const r = result.rows[0];
  const total = Number(r?.total ?? 0);
  const absent = Number(r?.absent ?? 0);
  return {
    active: Number(r?.active ?? 0),
    trial: Number(r?.trial ?? 0),
    paused: Number(r?.paused ?? 0),
    attendanceRate: total > 0 ? Math.round(((total - absent) / total) * 100) : 100,
    nearlyDone: Number(r?.nearly_done ?? 0),
  };
}

// Huy hiệu đếm cho lưới Tính năng, theo đường dẫn của mục menu. Mục không có số thì không có khoá.
// Số đếm của các mục menu, trong cơ sở đang xem. Phụ huynh, giáo viên, tài khoản dùng chung nên không lọc.
export async function getFeatureBadges(todayKey: string, scope: CampusScope): Promise<Record<string, number>> {
  const { start, end } = vnDayBounds(todayKey);
  const campus = campusCond(scope, sql`c.campus_id`);
  const result = await db.execute<{
    students: number; parents: number; classes: number; teachers: number; accounts: number; pending_attendance: number; today_sessions: number; pending_leaves: number;
  }>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM students s JOIN classes c ON c.id = s.class_id WHERE ${campus}) AS students,
      (SELECT COUNT(*)::int FROM parents) AS parents,
      (SELECT COUNT(*)::int FROM classes c WHERE ${campus}) AS classes,
      (SELECT COUNT(*)::int FROM teachers) AS teachers,
      (SELECT COUNT(*)::int FROM accounts) AS accounts,
      (SELECT COUNT(*)::int FROM class_sessions cs JOIN classes c ON c.id = cs.class_id
        WHERE cs.status = 'planned' AND cs.starts_at < NOW() AND ${campus}) AS pending_attendance,
      (SELECT COUNT(*)::int FROM class_sessions cs JOIN classes c ON c.id = cs.class_id
        WHERE cs.status <> 'cancelled' AND cs.starts_at >= ${start} AND cs.starts_at < ${end} AND ${campus}) AS today_sessions,
      (SELECT COUNT(*)::int FROM leave_requests lr JOIN class_sessions cs ON cs.id = lr.session_id JOIN classes c ON c.id = cs.class_id
        WHERE lr.status = 'pending' AND cs.starts_at > NOW() AND ${campus}) AS pending_leaves
  `);
  const r = result.rows[0];
  return {
    '/hoc-sinh': Number(r?.students ?? 0),
    '/phu-huynh': Number(r?.parents ?? 0),
    '/lop-hoc': Number(r?.classes ?? 0),
    '/lich-hoc': Number(r?.today_sessions ?? 0),
    '/giao-vien': Number(r?.teachers ?? 0),
    '/diem-danh': Number(r?.pending_attendance ?? 0),
    '/don-nghi': Number(r?.pending_leaves ?? 0),
    '/tai-khoan': Number(r?.accounts ?? 0),
  };
}

// Học sinh vắng từ hai buổi trở lên trong bảy ngày gần nhất (đang học hoặc học thử)
// Trả về đủ mọi học sinh, không giới hạn số dòng, để số đếm đúng. Nơi hiển thị tự cắt bớt.
export async function listFrequentAbsentees(todayKey: string, scope: CampusScope): Promise<{ studentId: number; fullName: string; className: string; absences: number }[]> {
  const since = addDaysKey(todayKey, -7);
  const result = await db.execute<{ student_id: number; full_name: string; class_name: string; absences: number }>(sql`
    SELECT s.id AS student_id, s.full_name, c.name AS class_name, COUNT(*)::int AS absences
    FROM attendance a
    JOIN students s ON s.id = a.student_id
    JOIN classes c ON c.id = s.class_id
    WHERE a.mark = 'absent' AND a.session_date >= ${since} AND s.status IN ('active', 'trial')
      AND ${campusCond(scope, sql`c.campus_id`)}
    GROUP BY s.id, s.full_name, c.name
    HAVING COUNT(*) >= 2
    ORDER BY absences DESC, s.full_name
  `);
  return result.rows.map((r) => ({ studentId: r.student_id, fullName: r.full_name, className: r.class_name, absences: r.absences }));
}
