// Phân quyền theo cơ sở (P32). Chỉ chạy trên server.
// Quản trị làm việc ở mọi cơ sở. Tài khoản khác chỉ ở các cơ sở được gán (bảng account_campuses).
// Mọi server action đụng tới lớp, học sinh, buổi học, bài tập, phụ huynh... đều gọi hàm require* ở đây,
// vì giao diện ẩn dữ liệu chưa phải là ranh giới bảo mật (yêu cầu có thể gửi thẳng tới server).
import { eq, inArray, sql } from 'drizzle-orm';
import { cache } from 'react';
import { db } from '@/db/client';
import { accountCampuses } from '@/db/schema';
import { ForbiddenError } from './authz';
import { getCurrentAccount } from './session';

export const CAMPUS_FORBIDDEN = 'Bạn không làm việc ở cơ sở này.';

// Cơ sở tài khoản hiện tại được làm việc. null = mọi cơ sở (quản trị). Chưa đăng nhập hoặc học sinh: không có cơ sở nào.
export const getAllowedCampusIds = cache(async (): Promise<number[] | null> => {
  const account = await getCurrentAccount();
  if (!account || account.role === 'student') return [];
  if (account.role === 'admin') return null;
  const rows = await db.select({ campusId: accountCampuses.campusId }).from(accountCampuses).where(eq(accountCampuses.accountId, account.id));
  return rows.map((r) => r.campusId).sort((a, b) => a - b);
});

export async function isUnrestricted(): Promise<boolean> {
  return (await getAllowedCampusIds()) === null;
}

// Việc ảnh hưởng toàn trung tâm (tạo cơ sở, cài đặt chung, dọn tệp): chỉ tài khoản làm việc ở mọi cơ sở
export async function requireUnrestricted(message = 'Chỉ quản trị làm việc ở mọi cơ sở mới làm được thao tác này.'): Promise<void> {
  if (!(await isUnrestricted())) throw new ForbiddenError(message);
}

export async function canAccessCampus(campusId: number): Promise<boolean> {
  const allowed = await getAllowedCampusIds();
  return allowed === null || allowed.includes(campusId);
}

export async function requireCampusAccess(campusId: number): Promise<void> {
  if (!(await canAccessCampus(campusId))) throw new ForbiddenError(CAMPUS_FORBIDDEN);
}

// Mọi cơ sở trong danh sách phải thuộc phạm vi của tài khoản (gán cơ sở cho giáo viên, bài giảng, tài khoản)
export async function requireCampusesSubset(campusIds: readonly number[]): Promise<void> {
  const allowed = await getAllowedCampusIds();
  if (allowed === null) return;
  if (campusIds.some((id) => !allowed.includes(id))) throw new ForbiddenError(CAMPUS_FORBIDDEN);
}

// Ít nhất một cơ sở trong danh sách thuộc phạm vi. Bản ghi chưa gắn cơ sở nào thì chỉ tài khoản không giới hạn được đụng.
async function requireAnyCampus(campusIds: readonly number[]): Promise<void> {
  const allowed = await getAllowedCampusIds();
  if (allowed === null) return;
  if (!campusIds.some((id) => allowed.includes(id))) throw new ForbiddenError(CAMPUS_FORBIDDEN);
}

async function idsOf(query: ReturnType<typeof sql>): Promise<number[]> {
  const result = await db.execute<{ campus_id: number }>(query);
  return result.rows.map((r) => Number(r.campus_id));
}

// Mỗi hàm dưới đây: bản ghi không tồn tại thì bỏ qua để action tự báo "không tìm thấy"; có mà ngoài phạm vi thì ném lỗi.

export async function requireClassAccess(classId: number): Promise<void> {
  const ids = await idsOf(sql`SELECT campus_id FROM classes WHERE id = ${classId}`);
  if (ids.length > 0) await requireAnyCampus(ids);
}

export async function requireStudentAccess(studentId: number): Promise<void> {
  const ids = await idsOf(sql`SELECT c.campus_id FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = ${studentId}`);
  if (ids.length > 0) await requireAnyCampus(ids);
}

export async function requireSessionAccess(sessionId: number): Promise<void> {
  const ids = await idsOf(sql`SELECT c.campus_id FROM class_sessions s JOIN classes c ON c.id = s.class_id WHERE s.id = ${sessionId}`);
  if (ids.length > 0) await requireAnyCampus(ids);
}

export async function requireAssignmentAccess(assignmentId: number): Promise<void> {
  const ids = await idsOf(sql`SELECT c.campus_id FROM assignments a JOIN classes c ON c.id = a.class_id WHERE a.id = ${assignmentId}`);
  if (ids.length > 0) await requireAnyCampus(ids);
}

// Giáo viên dạy một hoặc nhiều cơ sở: được đụng khi dạy ít nhất một cơ sở trong phạm vi
export async function requireTeacherAccess(teacherId: number): Promise<void> {
  const exists = await idsOf(sql`SELECT ${teacherId}::int AS campus_id FROM teachers WHERE id = ${teacherId}`);
  if (exists.length === 0) return;
  await requireAnyCampus(await idsOf(sql`SELECT campus_id FROM teacher_campuses WHERE teacher_id = ${teacherId}`));
}

// Phụ huynh dùng chung giữa các cơ sở: được đụng khi có ít nhất một con học ở cơ sở trong phạm vi.
// Phụ huynh chưa gắn học sinh nào thì ai cũng thấy (chưa thuộc cơ sở nào).
export async function requireParentAccess(parentId: number): Promise<void> {
  const ids = await idsOf(sql`
    SELECT DISTINCT c.campus_id FROM student_parents sp JOIN students s ON s.id = sp.student_id JOIN classes c ON c.id = s.class_id
    WHERE sp.parent_id = ${parentId}`);
  if (ids.length > 0) await requireAnyCampus(ids);
}

export async function requireLessonAccess(lessonId: number): Promise<void> {
  const exists = await idsOf(sql`SELECT ${lessonId}::int AS campus_id FROM lessons WHERE id = ${lessonId}`);
  if (exists.length === 0) return;
  await requireAnyCampus(await idsOf(sql`SELECT campus_id FROM lesson_campuses WHERE lesson_id = ${lessonId}`));
}

// Tệp tải lên: đọc được khi tệp thuộc một câu, bài nộp hoặc tài liệu của cơ sở trong phạm vi.
// Tệp chưa gắn vào đâu (vừa tải lên, chưa lưu) thì cho người tải lên xem tiếp trong lúc soạn.
export async function canReadFile(fileId: number): Promise<boolean> {
  const allowed = await getAllowedCampusIds();
  if (allowed === null) return true;
  const ids = await idsOf(sql`
    SELECT c.campus_id FROM assignment_items i JOIN assignments a ON a.id = i.assignment_id JOIN classes c ON c.id = a.class_id WHERE i.audio_file_id = ${fileId}
    UNION SELECT c.campus_id FROM submission_item_scores x JOIN assignment_submissions sub ON sub.id = x.submission_id
      JOIN assignments a ON a.id = sub.assignment_id JOIN classes c ON c.id = a.class_id WHERE x.file_id = ${fileId}
    UNION SELECT lc.campus_id FROM lesson_materials m JOIN lesson_campuses lc ON lc.lesson_id = m.lesson_id WHERE m.file_id = ${fileId}
    UNION SELECT -1 FROM questions q WHERE q.audio_file_id = ${fileId}`);
  if (ids.length === 0 || ids.includes(-1)) return true; // chưa gắn, hoặc thuộc ngân hàng câu hỏi dùng chung
  return ids.some((id) => allowed.includes(id));
}

// Dùng ở trang: true nếu được xem. Ngoài phạm vi thì trang trả về "không tìm thấy", không lộ là bản ghi có tồn tại.
export async function passes(check: () => Promise<void>): Promise<boolean> {
  try {
    await check();
    return true;
  } catch (error) {
    if (error instanceof ForbiddenError) return false;
    throw error;
  }
}

// Lọc danh sách theo cơ sở trong phạm vi (ví dụ danh sách lớp cho form)
export async function withinScope<T extends { campusId: number }>(rows: T[]): Promise<T[]> {
  const allowed = await getAllowedCampusIds();
  return allowed === null ? rows : rows.filter((r) => allowed.includes(r.campusId));
}

// Cơ sở được gán cho một tài khoản (màn Tài khoản)
export async function campusIdsOfAccounts(accountIds: number[]): Promise<Map<number, number[]>> {
  const out = new Map<number, number[]>();
  if (accountIds.length === 0) return out;
  const rows = await db
    .select({ accountId: accountCampuses.accountId, campusId: accountCampuses.campusId })
    .from(accountCampuses)
    .where(inArray(accountCampuses.accountId, accountIds));
  for (const r of rows) out.set(r.accountId, [...(out.get(r.accountId) ?? []), r.campusId]);
  return out;
}
