// Số liệu và danh sách cần chú ý cho màn Tổng quan. Chỉ chạy trên server.
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { addDaysKey, vnDayBounds } from '@/lib/datetime';

export type DashboardStats = {
  active: number; // đang học
  trial: number; // học thử
  paused: number; // bảo lưu
  attendanceRate: number; // phần trăm có mặt hoặc trễ, 30 ngày gần nhất; 100 nếu chưa có dữ liệu
  nearlyDone: number; // đang học, còn từ 3 buổi trở xuống
};

// Số liệu tổng hợp trong một truy vấn
export async function getDashboardStats(todayKey: string): Promise<DashboardStats> {
  const since = addDaysKey(todayKey, -30);
  const result = await db.execute<{ active: number; trial: number; paused: number; total: number; absent: number; nearly_done: number }>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM students WHERE status = 'active') AS active,
      (SELECT COUNT(*)::int FROM students WHERE status = 'trial') AS trial,
      (SELECT COUNT(*)::int FROM students WHERE status = 'paused') AS paused,
      (SELECT COUNT(*)::int FROM attendance WHERE session_date >= ${since}) AS total,
      (SELECT COUNT(*)::int FROM attendance WHERE session_date >= ${since} AND mark = 'absent') AS absent,
      (SELECT COUNT(*)::int FROM students s JOIN classes c ON c.id = s.class_id
        WHERE s.status = 'active' AND c.sessions_total - s.sessions_done <= 3) AS nearly_done
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
export async function getFeatureBadges(todayKey: string): Promise<Record<string, number>> {
  const { start, end } = vnDayBounds(todayKey);
  const result = await db.execute<{
    students: number; parents: number; classes: number; teachers: number; accounts: number; pending_attendance: number; today_sessions: number;
  }>(sql`
    SELECT
      (SELECT COUNT(*)::int FROM students) AS students,
      (SELECT COUNT(*)::int FROM parents) AS parents,
      (SELECT COUNT(*)::int FROM classes) AS classes,
      (SELECT COUNT(*)::int FROM teachers) AS teachers,
      (SELECT COUNT(*)::int FROM accounts) AS accounts,
      (SELECT COUNT(*)::int FROM class_sessions WHERE status = 'planned' AND starts_at < NOW()) AS pending_attendance,
      (SELECT COUNT(*)::int FROM class_sessions WHERE status <> 'cancelled' AND starts_at >= ${start} AND starts_at < ${end}) AS today_sessions
  `);
  const r = result.rows[0];
  return {
    '/hoc-sinh': Number(r?.students ?? 0),
    '/phu-huynh': Number(r?.parents ?? 0),
    '/lop-hoc': Number(r?.classes ?? 0),
    '/lich-hoc': Number(r?.today_sessions ?? 0),
    '/giao-vien': Number(r?.teachers ?? 0),
    '/diem-danh': Number(r?.pending_attendance ?? 0),
    '/tai-khoan': Number(r?.accounts ?? 0),
  };
}

// Học sinh vắng từ hai buổi trở lên trong bảy ngày gần nhất (đang học hoặc học thử)
export async function listFrequentAbsentees(todayKey: string): Promise<{ studentId: number; fullName: string; className: string; absences: number }[]> {
  const since = addDaysKey(todayKey, -7);
  const result = await db.execute<{ student_id: number; full_name: string; class_name: string; absences: number }>(sql`
    SELECT s.id AS student_id, s.full_name, c.name AS class_name, COUNT(*)::int AS absences
    FROM attendance a
    JOIN students s ON s.id = a.student_id
    JOIN classes c ON c.id = s.class_id
    WHERE a.mark = 'absent' AND a.session_date >= ${since} AND s.status IN ('active', 'trial')
    GROUP BY s.id, s.full_name, c.name
    HAVING COUNT(*) >= 2
    ORDER BY absences DESC, s.full_name
    LIMIT 8
  `);
  return result.rows.map((r) => ({ studentId: r.student_id, fullName: r.full_name, className: r.class_name, absences: r.absences }));
}
