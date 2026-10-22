'use server';

import { and, eq, gt, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { attendance, campuses, classes, classSessions, students, teachers } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { requireCampusAccess, requireClassAccess } from '@/lib/campus-access';
import { getClassForm } from '@/lib/queries/classes';
import { findScheduleConflicts, summarizeConflicts } from '@/lib/queries/schedule-conflicts';
import { teacherTeachesCampus } from '@/lib/queries/teachers';
import { vnDateKey, vnTimeLabel } from '@/lib/datetime';
import { describeSchedule, encodeDayTimes, generateSessions, joinWeekdays, resolveDayTimes } from '@/lib/schedule';
import { checkDayTimes, classCoreSchema, classCreateSchema, MAX_SLOTS_PER_DAY, slotField, WEEKDAY_CODES, type DayTimesInput, type WeekdayCode } from '@/lib/validation/class';
import { fieldErrorsFrom, type ActionResult } from '@/lib/validation/student';
import type { StaffRole } from '@/lib/validation/teacher';

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action lớp học:', error);
  return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
}

// Các ca của từng ngày: ô start_T7, end_T7 (ca đầu), start_T7_2, end_T7_2 (ca thứ hai)… Ngày không có ô thì không có trong kết quả.
function readDayTimes(formData: FormData): DayTimesInput {
  const out: DayTimesInput = {};
  for (const code of WEEKDAY_CODES) {
    const slots = [];
    for (let i = 0; i < MAX_SLOTS_PER_DAY + 1; i += 1) {
      const start = formData.get(slotField('start', code, i));
      const end = formData.get(slotField('end', code, i));
      if (typeof start !== 'string' && typeof end !== 'string') break;
      slots.push({ start: String(start ?? ''), end: String(end ?? '') });
    }
    if (slots.length > 0) out[code] = slots;
  }
  return out;
}

// Ô nhiều lựa chọn (ngày học) không đi qua Object.fromEntries được, nên lấy riêng
function readForm(formData: FormData) {
  return { ...Object.fromEntries(formData), weekdays: formData.getAll('weekdays'), dayTimes: readDayTimes(formData) };
}

// Thứ tự lưu ngày học theo tuần: T2 … T7, CN
function sortWeekdays(codes: readonly string[]): string {
  return joinWeekdays(WEEKDAY_CODES.filter((c) => codes.includes(c)));
}

// Mã lớp duy nhất trong từng cơ sở: hai cơ sở có thể cùng có lớp "IELTS-K15"
async function nameTaken(campusId: number, name: string, exceptId: number | null): Promise<boolean> {
  const sameCampus = and(eq(classes.campusId, campusId), eq(classes.name, name));
  const where = exceptId ? and(sameCampus, ne(classes.id, exceptId)) : sameCampus;
  const [row] = await db.select({ id: classes.id }).from(classes).where(where).limit(1);
  return !!row;
}

// Người được chọn vào một vị trí của lớp: đúng vai trò và dạy ở cơ sở của lớp
async function fitsSlot(id: number, role: StaffRole, campusId: number): Promise<boolean> {
  const [row] = await db.select({ id: teachers.id }).from(teachers).where(and(eq(teachers.id, id), eq(teachers.staffRole, role))).limit(1);
  return !!row && (await teacherTeachesCampus(id, campusId));
}

// Ba vị trí của lớp: giáo viên chủ nhiệm (bắt buộc), trợ giảng và giáo viên nước ngoài (có thể trống).
// Trả về lỗi đầu tiên, hoặc null nếu đúng.
async function slotErrors(v: { campusId: number; teacherId: number; assistantId: number | null; foreignTeacherId: number | null }): Promise<ActionResult | null> {
  if (!(await fitsSlot(v.teacherId, 'teacher', v.campusId))) {
    return { ok: false, message: 'Giáo viên chủ nhiệm phải là giáo viên dạy ở cơ sở này.', fieldErrors: { teacherId: 'Chọn giáo viên dạy ở cơ sở này' } };
  }
  if (v.assistantId !== null && !(await fitsSlot(v.assistantId, 'assistant', v.campusId))) {
    return { ok: false, message: 'Trợ giảng phải là trợ giảng dạy ở cơ sở này.', fieldErrors: { assistantId: 'Chọn trợ giảng dạy ở cơ sở này' } };
  }
  if (v.foreignTeacherId !== null && !(await fitsSlot(v.foreignTeacherId, 'foreign', v.campusId))) {
    return { ok: false, message: 'Giáo viên nước ngoài phải dạy ở cơ sở này.', fieldErrors: { foreignTeacherId: 'Chọn giáo viên nước ngoài dạy ở cơ sở này' } };
  }
  return null;
}

async function campusExists(id: number): Promise<boolean> {
  const [row] = await db.select({ id: campuses.id }).from(campuses).where(eq(campuses.id, id)).limit(1);
  return !!row;
}

export type ClassCoreValues = {
  name: string;
  course: string;
  campusId: string;
  teacherId: string; // giáo viên chủ nhiệm
  assistantId: string;
  foreignTeacherId: string;
  levelId: string; // id của course_levels hoặc '' (Không áp dụng)
  room: string;
  fee: number;
  capacity: number;
  // Giờ từng ngày học hiện có, chỉ dùng cho form sửa
  dayTimes?: { code: string; start: string; end: string }[];
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
    await requireCampusAccess(v.campusId);
    if (!(await campusExists(v.campusId))) return { ok: false, message: 'Cơ sở không tồn tại.', fieldErrors: { campusId: 'Cơ sở không tồn tại' } };
    if (await nameTaken(v.campusId, v.name, null)) {
      return { ok: false, message: 'Mã lớp này đã có ở cơ sở này.', fieldErrors: { name: 'Mã lớp này đã có ở cơ sở này' } };
    }
    const slotError = await slotErrors(v);
    if (slotError) return slotError;

    const weekdays = sortWeekdays(v.weekdays);
    const dayTimes = encodeDayTimes(v.dayTimes);
    let generated;
    try {
      generated = generateSessions({ weekdays, startTime: v.startTime, endTime: v.endTime, dayTimes, sessionsTotal: v.sessionsTotal, fromDate: v.startDate });
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Lịch học không hợp lệ.' };
    }

    // Không xếp trùng giờ với lớp khác của cùng giáo viên, hoặc cùng phòng trong cơ sở
    const conflicts = await findScheduleConflicts({ slots: generated, teacherId: v.teacherId, room: v.room, campusId: v.campusId });
    if (conflicts.length > 0) {
      return {
        ok: false,
        message: `Lịch bị trùng ${conflicts.length} buổi: ${summarizeConflicts(conflicts).join('; ')}. Đổi giờ, ngày, giáo viên hoặc phòng rồi tạo lại.`,
        fieldErrors: conflicts.some((c) => c.kind === 'teacher') ? { teacherId: 'Giáo viên bận ở một số buổi' } : { room: 'Phòng đã có lớp ở một số buổi' },
      };
    }

    const classId = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(classes)
        .values({
          campusId: v.campusId,
          name: v.name,
          course: v.course,
          teacherId: v.teacherId,
          assistantId: v.assistantId,
          foreignTeacherId: v.foreignTeacherId,
          levelId: v.levelId ?? null,
          schedule: describeSchedule(weekdays, v.startTime, v.endTime, dayTimes),
          weekdays,
          startTime: v.startTime,
          endTime: v.endTime,
          dayTimes,
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

export type SchedulePreview =
  | { ok: true; total: number; firstStartsAt: Date; lastStartsAt: Date; sample: { startsAt: Date; endsAt: Date }[]; conflicts: string[]; conflictCount: number }
  | { ok: false; message: string };

// Xem trước lịch khi đang nhập form tạo lớp: số buổi, ngày đầu, ngày cuối, vài buổi đầu và các buổi trùng giáo viên, phòng.
// Nhận nguyên FormData của form (cùng tên ô như khi tạo), không ghi gì vào cơ sở dữ liệu.
export async function previewScheduleAction(formData: FormData): Promise<SchedulePreview> {
  try {
    await requirePermission('classes.manage');
    const days = WEEKDAY_CODES.filter((c) => formData.getAll('weekdays').includes(c));
    if (days.length === 0) return { ok: false, message: 'Chọn ngày học trong tuần để xem trước lịch.' };
    const perDay = readDayTimes(formData);
    const list = days.flatMap((code) => (perDay[code] ?? []).map((s) => ({ code, start: s.start, end: s.end })));
    const time = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (list.length === 0 || list.some((t) => !time.test(t.start) || !time.test(t.end) || t.end <= t.start)) return { ok: false, message: 'Nhập đủ giờ học hợp lệ để xem trước lịch.' };
    const startDate = String(formData.get('startDate') ?? '');
    const sessionsTotal = Number(formData.get('sessionsTotal'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { ok: false, message: 'Chọn ngày khai giảng để xem trước lịch.' };
    if (!Number.isInteger(sessionsTotal) || sessionsTotal < 1 || sessionsTotal > 400) return { ok: false, message: 'Nhập số buổi để xem trước lịch.' };
    const generated = generateSessions({ weekdays: joinWeekdays(days), startTime: list[0].start, endTime: list[0].end, dayTimes: encodeDayTimes(list), sessionsTotal, fromDate: startDate });

    const campusId = Number(formData.get('campusId'));
    const teacherId = Number(formData.get('teacherId')) || null;
    const room = String(formData.get('room') ?? '');
    const conflicts = Number.isInteger(campusId) && campusId > 0 ? await findScheduleConflicts({ slots: generated, teacherId, room, campusId }) : [];
    return {
      ok: true,
      total: generated.length,
      firstStartsAt: generated[0].startsAt,
      lastStartsAt: generated[generated.length - 1].startsAt,
      sample: generated.slice(0, 4).map((g) => ({ startsAt: g.startsAt, endsAt: g.endsAt })),
      conflicts: summarizeConflicts(conflicts),
      conflictCount: conflicts.length,
    };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    return { ok: false, message: error instanceof Error ? error.message : 'Chưa xem trước được lịch.' };
  }
}

// Sửa thông tin chung. Đổi giáo viên hoặc phòng thì cập nhật các buổi chưa học. Lịch tuần không đổi ở đây.
export async function updateClassAction(id: number, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('classes.manage');
    await requireClassAccess(id);
    const parsed = classCoreSchema.safeParse(readForm(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    await requireCampusAccess(v.campusId);
    const current = await getClassForm(id);
    if (!current) return { ok: false, message: 'Không tìm thấy lớp này. Có thể đã bị xoá.' };
    if (!(await campusExists(v.campusId))) return { ok: false, message: 'Cơ sở không tồn tại.', fieldErrors: { campusId: 'Cơ sở không tồn tại' } };
    if (await nameTaken(v.campusId, v.name, id)) {
      return { ok: false, message: 'Mã lớp này đã có ở cơ sở này.', fieldErrors: { name: 'Mã lớp này đã có ở cơ sở này' } };
    }
    const slotError = await slotErrors(v);
    if (slotError) return slotError;

    // Các ca: form sửa có một dòng cho mỗi ca hiện có (không thêm, bớt ca ở đây). Không gửi ô giờ thì giữ lịch cũ.
    const currentTimes = current.weekdays ? resolveDayTimes(current.weekdays, current.startTime, current.endTime, current.dayTimes) : [];
    const rawTimes = readDayTimes(formData);
    let nextTimes = currentTimes;
    if (currentTimes.length > 0 && Object.keys(rawTimes).length > 0) {
      const checked = checkDayTimes(currentTimes.map((t) => t.code as WeekdayCode), rawTimes);
      if (Object.keys(checked.errors).length > 0) {
        return { ok: false, message: 'Vui lòng kiểm tra lại giờ học.', fieldErrors: checked.errors };
      }
      const sameSlots = checked.list.length === currentTimes.length && checked.list.every((t, i) => t.code === currentTimes[i].code);
      if (!sameSlots) return { ok: false, message: 'Số ca học không khớp lịch hiện tại. Tải lại trang rồi thử lại.' };
      nextTimes = checked.list;
    }
    // Ca đổi giờ: ghép ca cũ với ca mới theo vị trí (form giữ đúng thứ tự ca cũ)
    const changedSlots = nextTimes
      .map((t, i) => ({ code: t.code, oldStart: currentTimes[i].start, start: t.start, end: t.end, changed: t.start !== currentTimes[i].start || t.end !== currentTimes[i].end }))
      .filter((t) => t.changed);
    const encoded = encodeDayTimes(nextTimes);
    const scheduleFields =
      changedSlots.length > 0
        ? {
            dayTimes: encoded,
            startTime: nextTimes[0].start,
            endTime: nextTimes[0].end,
            schedule: describeSchedule(current.weekdays, nextTimes[0].start, nextTimes[0].end, encoded),
          }
        : {};

    let movedSessions = 0;
    await db.transaction(async (tx) => {
      await tx
        .update(classes)
        .set({
          ...scheduleFields,
          campusId: v.campusId,
          name: v.name,
          course: v.course,
          teacherId: v.teacherId,
          assistantId: v.assistantId,
          foreignTeacherId: v.foreignTeacherId,
          levelId: v.levelId ?? null,
          room: v.room,
          fee: v.fee,
          capacity: v.capacity,
          updatedAt: new Date(),
        })
        .where(eq(classes.id, id));
      if (v.teacherId !== current.teacherId || v.room !== current.room) {
        await tx
          .update(classSessions)
          .set({ teacherId: v.teacherId, room: v.room, updatedAt: new Date() })
          .where(and(eq(classSessions.classId, id), eq(classSessions.status, 'planned')));
      }
      // Đổi giờ một ca thì dời các buổi chưa học và chưa bắt đầu của ca đó (cùng ngày trong tuần, cùng giờ bắt đầu cũ)
      // sang giờ mới, giữ nguyên ngày. Buổi đã được sửa giờ riêng ở màn Lịch học không khớp ca nào nên giữ nguyên.
      if (changedSlots.length > 0) {
        const bySlot = new Map(changedSlots.map((t) => [`${t.code} ${t.oldStart}`, t]));
        const upcoming = await tx
          .select({ id: classSessions.id, startsAt: classSessions.startsAt })
          .from(classSessions)
          .where(and(eq(classSessions.classId, id), eq(classSessions.status, 'planned'), gt(classSessions.startsAt, new Date())));
        for (const s of upcoming) {
          const date = vnDateKey(s.startsAt);
          // getUTCDay: 0 = CN; WEEKDAY_CODES bắt đầu từ T2
          const code = WEEKDAY_CODES[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7];
          const time = bySlot.get(`${code} ${vnTimeLabel(s.startsAt)}`);
          if (!time) continue;
          await tx
            .update(classSessions)
            .set({ startsAt: new Date(`${date}T${time.start}:00+07:00`), endsAt: new Date(`${date}T${time.end}:00+07:00`), updatedAt: new Date() })
            .where(eq(classSessions.id, s.id));
          movedSessions += 1;
        }
      }
    });

    const timeNote = changedSlots.length > 0 ? `, đổi giờ ${changedSlots.map((t) => `${t.code} ${t.start}–${t.end}`).join(', ')} (${movedSessions} buổi sắp tới)` : '';
    await writeAudit({ action: 'update', entity: 'class', entityId: id, summary: `Sửa lớp ${v.name}${timeNote}` });
    revalidatePath('/lop-hoc');
    revalidatePath(`/lop-hoc/${id}`);
    revalidatePath('/lich-hoc');
    revalidatePath('/giao-vien');
    return { ok: true, message: movedSessions > 0 ? `Đã lưu lớp ${v.name}, dời giờ ${movedSessions} buổi sắp tới` : `Đã lưu lớp ${v.name}` };
  } catch (error) {
    return errorResult(error);
  }
}

// Giá trị để điền form sửa lớp
export async function loadClassForm(id: number): Promise<{ ok: true; values: ClassCoreValues } | { ok: false; message: string }> {
  try {
    await requirePermission('classes.manage');
    await requireClassAccess(id);
    const row = await getClassForm(id);
    if (!row) return { ok: false, message: 'Không tìm thấy lớp này. Có thể đã bị xoá.' };
    return {
      ok: true,
      values: {
        name: row.name,
        course: row.course,
        campusId: String(row.campusId),
        teacherId: String(row.teacherId),
        assistantId: row.assistantId ? String(row.assistantId) : '',
        foreignTeacherId: row.foreignTeacherId ? String(row.foreignTeacherId) : '',
        levelId: row.levelId ? String(row.levelId) : '',
        room: row.room,
        fee: row.fee,
        capacity: row.capacity,
        dayTimes: row.weekdays ? resolveDayTimes(row.weekdays, row.startTime, row.endTime, row.dayTimes) : [],
      },
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
    await requireClassAccess(id);
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
