// Truy vấn cơ sở và điều kiện lọc theo cơ sở. Chỉ chạy trên server.
import { asc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db/client';
import { campuses, classes, teacherCampuses } from '@/db/schema';
import type { CampusOption, CampusScope } from '@/lib/campus';
import { getAllowedCampusIds } from '@/lib/campus-access';

// Điều kiện lọc theo cơ sở cho câu SQL. Scope null thì không lọc.
// column là biểu thức cột đã có trong câu, ví dụ c.campus_id (bảng lớp đã được nối).
export function campusCond(scope: CampusScope, column: SQL) {
  return sql`(${scope}::int IS NULL OR ${column} = ${scope}::int)`;
}

// Mọi cơ sở, theo thứ tự tạo. Cơ sở đầu tiên là cơ sở mặc định.
export function listCampuses(): Promise<CampusOption[]> {
  return db
    .select({ id: campuses.id, name: campuses.name, address: campuses.address })
    .from(campuses)
    .orderBy(asc(campuses.id));
}

// Mọi cơ sở kèm số lớp, cho màn Cơ sở
export async function listCampusRows(): Promise<(CampusOption & { classCount: number })[]> {
  const result = await db.execute<{ id: number; name: string; address: string; class_count: number }>(sql`
    SELECT cp.id, cp.name, cp.address, COUNT(c.id)::int AS class_count
    FROM campuses cp
    LEFT JOIN classes c ON c.campus_id = cp.id
    GROUP BY cp.id, cp.name, cp.address
    ORDER BY cp.id
  `);
  const allowed = await getAllowedCampusIds();
  return result.rows
    .filter((r) => allowed === null || allowed.includes(r.id))
    .map((r) => ({ id: r.id, name: r.name, address: r.address, classCount: r.class_count }));
}

// Các cơ sở có đủ trong danh sách id không. Dùng để kiểm tra form giáo viên và lớp.
export async function campusesExist(ids: number[]): Promise<boolean> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return false;
  const rows = await db.select({ id: campuses.id }).from(campuses).where(inArray(campuses.id, unique));
  return rows.length === unique.length;
}

// Số giáo viên đang dạy ở một cơ sở, dùng để chặn xoá cơ sở còn giáo viên
export async function countTeachersOfCampus(campusId: number): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(teacherCampuses)
    .where(eq(teacherCampuses.campusId, campusId));
  return Number(row?.n ?? 0);
}

// Số lớp đang thuộc một cơ sở, dùng để chặn xoá cơ sở còn lớp
export async function countClassesOfCampus(campusId: number): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(classes)
    .where(eq(classes.campusId, campusId));
  return Number(row?.n ?? 0);
}
