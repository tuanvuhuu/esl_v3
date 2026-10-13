'use server';

import { and, eq, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { attendance, classes, classSessions, students, teachers } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { getClassForm } from '@/lib/queries/classes';
import { describeSchedule, generateSessions, joinWeekdays } from '@/lib/schedule';
import { classCoreSchema, classCreateSchema, WEEKDAY_CODES } from '@/lib/validation/class';
import { fieldErrorsFrom, type ActionResult } from '@/lib/validation/student';

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action lớp học:', error);
  return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
}

// Ô nhiều lựa chọn (ngày học) không đi qua Object.fromEntries được, nên lấy riêng
function readForm(formData: FormData) {
  return { ...Object.fromEntries(formData), weekdays: formData.getAll('weekdays') };
}

// Thứ tự lưu ngày học theo tuần: T2 … T7, CN
function sortWeekdays(codes: readonly string[]): string {
  return joinWeekdays(WEEKDAY_CODES.filter((c) => codes.includes(c)));
}

async function nameTaken(name: string, exceptId: number | null): Promise<boolean> {
  const where = exceptId ? and(eq(classes.name, name), ne(classes.id, exceptId)) : eq(classes.name, name);
  const [row] = await db.select({ id: classes.id }).from(classes).where(where).limit(1);
  return !!row;
}

async function teacherExists(id: number): Promise<boolean> {
  const [row] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.id, id)).limit(1);
  return !!row;
}

export type ClassCoreValues = {
  name: string;
  course: string;
  teacherId: string;
  room: string;
  fee: number;
  capacity: number;
};

// Tạo lớp và sinh toàn bộ buổi học trong một transaction
export async function createClassAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('classes.manage');
    const parsed = classCreateSchema.safeParse(readForm(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    if (await nameTaken(v.name, null)) return { ok: false, message: 'Mã lớp này đã có.', fieldErrors: { name: 'Mã lớp này đã có' } };
    if (!(await teacherExists(v.teacherId))) return { ok: false, message: 'Giáo viên không tồn tại.', fieldErrors: { teacherId: 'Giáo viên không tồn tại' } };

    const weekdays = sortWeekdays(v.weekdays);
    let generated;
    try {
      generated = generateSessions({ weekdays, startTime: v.startTime, endTime: v.endTime, sessionsTotal: v.sessionsTotal, fromDate: v.startDate });
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Lịch học không hợp lệ.' };
    }

    const classId = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(classes)
        .values({
          name: v.name,
          course: v.course,
          teacherId: v.teacherId,
          schedule: describeSchedule(weekdays, v.startTime, v.endTime),
          weekdays,
          startTime: v.startTime,
          endTime: v.endTime,
          sessionsTotal: v.sessionsTotal,
          fee: v.fee,
          room: v.room,
          capacity: v.capacity,
        })
        .returning({ id: classes.id });
      await tx.insert(classSessions).values(
        generated.map((s) => ({
          classId: created.id,
          sessionNo: s.sessionNo,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          teacherId: v.teacherId,
          room: v.room,
        })),
      );
      return created.id;
    });

    await writeAudit({ action: 'create', entity: 'class', entityId: classId, summary: `Tạo lớp ${v.name}, ${v.sessionsTotal} buổi` });
    revalidatePath('/lop-hoc');
    revalidatePath('/lich-hoc');
    return { ok: true, message: `Đã tạo lớp ${v.name} với ${v.sessionsTotal} buổi học` };
  } catch (error) {
    return errorResult(error);
  }
}

// Sửa thông tin chung. Đổi giáo viên hoặc phòng thì cập nhật các buổi chưa học. Lịch tuần không đổi ở đây.
export async function updateClassAction(id: number, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('classes.manage');
    const parsed = classCoreSchema.safeParse(readForm(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    const current = await getClassForm(id);
    if (!current) return { ok: false, message: 'Không tìm thấy lớp này. Có thể đã bị xoá.' };
    if (await nameTaken(v.name, id)) return { ok: false, message: 'Mã lớp này đã có.', fieldErrors: { name: 'Mã lớp này đã có' } };
    if (!(await teacherExists(v.teacherId))) return { ok: false, message: 'Giáo viên không tồn tại.', fieldErrors: { teacherId: 'Giáo viên không tồn tại' } };

    await db.transaction(async (tx) => {
      await tx
        .update(classes)
        .set({ name: v.name, course: v.course, teacherId: v.teacherId, room: v.room, fee: v.fee, capacity: v.capacity, updatedAt: new Date() })
        .where(eq(classes.id, id));
      if (v.teacherId !== current.teacherId || v.room !== current.room) {
        await tx
          .update(classSessions)
          .set({ teacherId: v.teacherId, room: v.room, updatedAt: new Date() })
          .where(and(eq(classSessions.classId, id), eq(classSessions.status, 'planned')));
      }
    });

    await writeAudit({ action: 'update', entity: 'class', entityId: id, summary: `Sửa lớp ${v.name}` });
    revalidatePath('/lop-hoc');
    revalidatePath(`/lop-hoc/${id}`);
    revalidatePath('/lich-hoc');
    revalidatePath('/giao-vien');
    return { ok: true, message: `Đã lưu lớp ${v.name}` };
  } catch (error) {
    return errorResult(error);
  }
}

// Giá trị để điền form sửa lớp
export async function loadClassForm(id: number): Promise<{ ok: true; values: ClassCoreValues } | { ok: false; message: string }> {
  try {
    await requirePermission('classes.manage');
    const row = await getClassForm(id);
    if (!row) return { ok: false, message: 'Không tìm thấy lớp này. Có thể đã bị xoá.' };
    return {
      ok: true,
      values: { name: row.name, course: row.course, teacherId: String(row.teacherId), room: row.room, fee: row.fee, capacity: row.capacity },
    };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi đọc lớp để sửa:', error);
    return { ok: false, message: 'Không đọc được dữ liệu. Thử lại sau ít phút.' };
  }
}

// Xoá lớp. Bị chặn khi còn học sinh hoặc đã có điểm danh. Buổi học và bài tập xoá theo lớp.
export async function deleteClassAction(id: number): Promise<ActionResult> {
  try {
    await requirePermission('classes.manage');
    const current = await getClassForm(id);
    if (!current) return { ok: false, message: 'Không tìm thấy lớp này. Có thể đã bị xoá.' };

    const [s] = await db.select({ n: sql<number>`COUNT(*)::int` }).from(students).where(eq(students.classId, id));
    if (Number(s?.n ?? 0) > 0) {
      return { ok: false, message: `Không xoá được: lớp ${current.name} còn ${s.n} học sinh. Chuyển học sinh sang lớp khác trước.` };
    }
    const [a] = await db.select({ n: sql<number>`COUNT(*)::int` }).from(attendance).where(eq(attendance.classId, id));
    if (Number(a?.n ?? 0) > 0) {
      return { ok: false, message: `Không xoá được: lớp ${current.name} đã có điểm danh. Lớp đã học thì giữ lại để tra cứu.` };
    }

    await db.delete(classes).where(eq(classes.id, id));
    await writeAudit({ action: 'delete', entity: 'class', entityId: id, summary: `Xoá lớp ${current.name}` });
    revalidatePath('/lop-hoc');
    revalidatePath('/lich-hoc');
    return { ok: true, message: `Đã xoá lớp ${current.name}` };
  } catch (error) {
    return errorResult(error);
  }
}
