'use server';

import { and, eq, ne, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { classes, classSessions, teachers } from '@/db/schema';
import { teacherTeachesCampus } from '@/lib/queries/teachers';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { requireClassAccess, requireSessionAccess } from '@/lib/campus-access';
import { isPastStart } from '@/lib/schedule-drag';
import { findScheduleConflicts, summarizeConflicts } from '@/lib/queries/schedule-conflicts';
import { safely } from '@/lib/telegram/core';
import { notifySessionCancelled, notifySessionChanged, notifySessionRestored } from '@/lib/telegram/notify';
import { cancelReasonSchema, sessionFormSchema } from '@/lib/validation/class';
import { fieldErrorsFrom, type ActionResult } from '@/lib/validation/student';

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action buổi học:', error);
  return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
}

// Đánh lại số buổi của lớp theo thứ tự ngày, dùng cho cả thêm buổi và dời buổi để số buổi luôn tăng theo ngày
async function renumberSessions(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], classId: number) {
  await tx.execute(sql`
    UPDATE class_sessions cs SET session_no = r.rn
    FROM (SELECT id, row_number() OVER (ORDER BY starts_at, id) AS rn FROM class_sessions WHERE class_id = ${classId}) r
    WHERE cs.id = r.id AND cs.session_no <> r.rn`);
}

async function loadSession(id: number) {
  const [row] = await db
    .select({
      id: classSessions.id,
      classId: classSessions.classId,
      status: classSessions.status,
      sessionNo: classSessions.sessionNo,
      startsAt: classSessions.startsAt,
      room: classSessions.room,
      teacherId: classSessions.teacherId,
    })
    .from(classSessions)
    .where(eq(classSessions.id, id))
    .limit(1);
  return row ?? null;
}

// Trùng giờ với lớp khác của cùng giáo viên hoặc cùng phòng: báo rõ trùng với lớp nào, lúc nào
function conflictResult(conflicts: Awaited<ReturnType<typeof findScheduleConflicts>>): ActionResult {
  const teacher = conflicts.some((c) => c.kind === 'teacher');
  return {
    ok: false,
    message: `Trùng lịch: ${summarizeConflicts(conflicts).join('; ')}. Đổi giờ, ngày, giáo viên hoặc phòng.`,
    fieldErrors: teacher ? { teacherId: 'Giáo viên đang bận giờ này' } : { room: 'Phòng đã có lớp giờ này' },
  };
}

// Kiểm trùng ngay khi đang nhập (thêm hoặc sửa buổi), không ghi gì
export async function checkSessionAction(input: { classId: number; date: string; startTime: string; endTime: string; teacherId: number; room: string; sessionId?: number | null }): Promise<{ ok: true; conflicts: string[] } | { ok: false; message: string }> {
  try {
    await requirePermission('classes.manage');
    await requireClassAccess(input.classId);
    const time = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !time.test(input.startTime) || !time.test(input.endTime) || input.endTime <= input.startTime) return { ok: true, conflicts: [] };
    const [cls] = await db.select({ campusId: classes.campusId }).from(classes).where(eq(classes.id, input.classId)).limit(1);
    if (!cls) return { ok: false, message: 'Không tìm thấy lớp.' };
    const startsAt = new Date(`${input.date}T${input.startTime}:00+07:00`);
    const endsAt = new Date(`${input.date}T${input.endTime}:00+07:00`);
    const conflicts = await findScheduleConflicts({ slots: [{ startsAt, endsAt }], teacherId: input.teacherId || null, room: input.room, campusId: cls.campusId, excludeSessionId: input.sessionId ?? null });
    // Trùng với chính lớp này (hai buổi cùng giờ) cũng báo
    const [same] = await db
      .select({ id: classSessions.id })
      .from(classSessions)
      .where(and(eq(classSessions.classId, input.classId), ne(classSessions.status, 'cancelled'), sql`${classSessions.startsAt} < ${endsAt}`, sql`${classSessions.endsAt} > ${startsAt}`, input.sessionId ? ne(classSessions.id, input.sessionId) : undefined))
      .limit(1);
    return { ok: true, conflicts: [...(same ? ['Lớp này đã có buổi học trong giờ này'] : []), ...summarizeConflicts(conflicts)] };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi kiểm lịch:', error);
    return { ok: false, message: 'Chưa kiểm được lịch.' };
  }
}

// Thêm một buổi riêng cho lớp: học bù sau buổi huỷ, học thêm, ôn thi. Số thứ tự buổi của lớp được đánh lại theo ngày.
export async function createSessionAction(classId: number, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('classes.manage');
    await requireClassAccess(classId);
    const parsed = sessionFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    const [cls] = await db.select({ campusId: classes.campusId, name: classes.name }).from(classes).where(eq(classes.id, classId)).limit(1);
    if (!cls) return { ok: false, message: 'Không tìm thấy lớp.' };
    const [teacher] = await db.select({ staffRole: teachers.staffRole }).from(teachers).where(eq(teachers.id, v.teacherId)).limit(1);
    if (!teacher) return { ok: false, message: 'Giáo viên không tồn tại.', fieldErrors: { teacherId: 'Giáo viên không tồn tại' } };
    if (teacher.staffRole === 'assistant') return { ok: false, message: 'Trợ giảng không dạy buổi học. Chọn giáo viên.', fieldErrors: { teacherId: 'Chọn giáo viên, không chọn trợ giảng' } };
    if (!(await teacherTeachesCampus(v.teacherId, cls.campusId))) return { ok: false, message: 'Giáo viên này chưa dạy ở cơ sở của lớp.', fieldErrors: { teacherId: 'Giáo viên chưa dạy ở cơ sở này' } };

    const startsAt = new Date(`${v.date}T${v.startTime}:00+07:00`);
    const endsAt = new Date(`${v.date}T${v.endTime}:00+07:00`);
    const [same] = await db
      .select({ id: classSessions.id })
      .from(classSessions)
      .where(and(eq(classSessions.classId, classId), ne(classSessions.status, 'cancelled'), sql`${classSessions.startsAt} < ${endsAt}`, sql`${classSessions.endsAt} > ${startsAt}`))
      .limit(1);
    if (same) return { ok: false, message: 'Lớp đã có buổi học trong giờ này.', fieldErrors: { startTime: 'Lớp đã có buổi học trong giờ này' } };
    const conflicts = await findScheduleConflicts({ slots: [{ startsAt, endsAt }], teacherId: v.teacherId, room: v.room, campusId: cls.campusId });
    if (conflicts.length > 0) return conflictResult(conflicts);

    const id = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(classSessions)
        .values({ classId, sessionNo: 0, startsAt, endsAt, teacherId: v.teacherId, room: v.room, topic: v.topic })
        .returning({ id: classSessions.id });
      // Buổi thêm nằm đúng chỗ theo ngày
      await renumberSessions(tx, classId);
      return row.id;
    });

    await writeAudit({ action: 'create', entity: 'session', entityId: id, summary: `Thêm buổi cho lớp ${cls.name} lúc ${v.date} ${v.startTime}` });
    revalidatePath('/lich-hoc');
    revalidatePath(`/lop-hoc/${classId}`);
    return { ok: true, message: `Đã thêm buổi cho lớp ${cls.name} ngày ${v.date.split('-').reverse().join('/')} ${v.startTime}` };
  } catch (error) {
    return errorResult(error);
  }
}

// Sửa buổi chưa học: ngày, giờ, giáo viên, phòng, chủ đề. Buổi đã học xong không sửa được.
export async function updateSessionAction(id: number, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('classes.manage');
    await requireSessionAccess(id);
    const parsed = sessionFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const session = await loadSession(id);
    if (!session) return { ok: false, message: 'Không tìm thấy buổi học này.' };
    if (session.status === 'done') return { ok: false, message: 'Buổi này đã học xong nên không sửa được.' };
    if (session.status === 'cancelled') return { ok: false, message: 'Buổi này đã huỷ. Khôi phục trước khi sửa.' };

    const v = parsed.data;
    const [teacher] = await db.select({ id: teachers.id, staffRole: teachers.staffRole }).from(teachers).where(eq(teachers.id, v.teacherId)).limit(1);
    if (!teacher) return { ok: false, message: 'Giáo viên không tồn tại.', fieldErrors: { teacherId: 'Giáo viên không tồn tại' } };
    // Trợ giảng không dạy buổi học: buổi chỉ do giáo viên chủ nhiệm hoặc giáo viên nước ngoài dạy
    if (teacher.staffRole === 'assistant') {
      return { ok: false, message: 'Trợ giảng không dạy buổi học. Chọn giáo viên.', fieldErrors: { teacherId: 'Chọn giáo viên, không chọn trợ giảng' } };
    }
    // Giáo viên của buổi học phải dạy ở cơ sở của lớp
    const [cls] = await db.select({ campusId: classes.campusId }).from(classes).where(eq(classes.id, session.classId)).limit(1);
    if (cls && !(await teacherTeachesCampus(v.teacherId, cls.campusId))) {
      return { ok: false, message: 'Giáo viên này chưa dạy ở cơ sở của lớp.', fieldErrors: { teacherId: 'Giáo viên chưa dạy ở cơ sở này' } };
    }

    const startsAt = new Date(`${v.date}T${v.startTime}:00+07:00`);
    const endsAt = new Date(`${v.date}T${v.endTime}:00+07:00`);
    const [clash] = await db
      .select({ id: classSessions.id })
      .from(classSessions)
      .where(and(eq(classSessions.classId, session.classId), eq(classSessions.startsAt, startsAt), ne(classSessions.id, id)))
      .limit(1);
    if (clash) return { ok: false, message: 'Lớp đã có buổi học vào thời điểm này.', fieldErrors: { startTime: 'Lớp đã có buổi học lúc này' } };

    const conflicts = await findScheduleConflicts({ slots: [{ startsAt, endsAt }], teacherId: v.teacherId, room: v.room, campusId: cls?.campusId ?? 0, excludeSessionId: id });
    if (conflicts.length > 0) return conflictResult(conflicts);

    await db
      .update(classSessions)
      .set({ startsAt, endsAt, teacherId: v.teacherId, room: v.room, topic: v.topic, updatedAt: new Date() })
      .where(eq(classSessions.id, id));

    await writeAudit({ action: 'update', entity: 'session', entityId: id, summary: `Sửa buổi ${session.sessionNo} lúc ${v.date} ${v.startTime}` });
    revalidatePath('/lich-hoc');
    revalidatePath(`/lop-hoc/${session.classId}`);
    await safely('đổi lịch buổi', () => notifySessionChanged(id, { startsAt: session.startsAt, room: session.room, teacherId: session.teacherId }));
    return { ok: true, message: `Đã lưu buổi ${session.sessionNo}` };
  } catch (error) {
    return errorResult(error);
  }
}

// Huỷ buổi chưa học, bắt buộc có lý do. Buổi bị huỷ hiện gạch ngang trên lịch.
export async function cancelSessionAction(id: number, reason: string): Promise<ActionResult> {
  try {
    await requirePermission('classes.manage');
    await requireSessionAccess(id);
    const parsed = cancelReasonSchema.safeParse(reason);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Lý do không hợp lệ.', fieldErrors: { cancelReason: parsed.error.issues[0]?.message ?? 'Lý do không hợp lệ' } };
    const session = await loadSession(id);
    if (!session) return { ok: false, message: 'Không tìm thấy buổi học này.' };
    if (session.status !== 'planned') return { ok: false, message: 'Chỉ huỷ được buổi chưa học.' };

    await db
      .update(classSessions)
      .set({ status: 'cancelled', cancelReason: parsed.data, updatedAt: new Date() })
      .where(eq(classSessions.id, id));
    await writeAudit({ action: 'cancel', entity: 'session', entityId: id, summary: `Huỷ buổi ${session.sessionNo}: ${parsed.data}` });
    revalidatePath('/lich-hoc');
    revalidatePath(`/lop-hoc/${session.classId}`);
    await safely('huỷ buổi', () => notifySessionCancelled(id));
    return { ok: true, message: `Đã huỷ buổi ${session.sessionNo}` };
  } catch (error) {
    return errorResult(error);
  }
}

// Khôi phục buổi đã huỷ về trạng thái chưa học
export async function restoreSessionAction(id: number): Promise<ActionResult> {
  try {
    await requirePermission('classes.manage');
    await requireSessionAccess(id);
    const session = await loadSession(id);
    if (!session) return { ok: false, message: 'Không tìm thấy buổi học này.' };
    if (session.status !== 'cancelled') return { ok: false, message: 'Buổi này không ở trạng thái đã huỷ.' };

    await db
      .update(classSessions)
      .set({ status: 'planned', cancelReason: '', updatedAt: new Date() })
      .where(eq(classSessions.id, id));
    await writeAudit({ action: 'restore', entity: 'session', entityId: id, summary: `Khôi phục buổi ${session.sessionNo}` });
    revalidatePath('/lich-hoc');
    revalidatePath(`/lop-hoc/${session.classId}`);
    await safely('khôi phục buổi', () => notifySessionRestored(id));
    return { ok: true, message: `Đã khôi phục buổi ${session.sessionNo}` };
  } catch (error) {
    return errorResult(error);
  }
}

// Kéo buổi sang ngày hoặc giờ khác trên lưới tuần. Giữ nguyên độ dài, giáo viên, phòng, chủ đề;
// kiểm trùng giờ của lớp, giáo viên và phòng như khi sửa buổi. Buổi đã học hoặc đã huỷ thì không dời.
export async function moveSessionAction(id: number, date: string, startTime: string): Promise<ActionResult> {
  try {
    await requirePermission('classes.manage');
    await requireSessionAccess(id);
    const time = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !time.test(startTime)) return { ok: false, message: 'Ngày hoặc giờ không hợp lệ.' };
    const session = await loadSession(id);
    if (!session) return { ok: false, message: 'Không tìm thấy buổi học này.' };
    if (session.status === 'done') return { ok: false, message: 'Buổi này đã học xong nên không dời được.' };
    if (session.status === 'cancelled') return { ok: false, message: 'Buổi này đã huỷ. Khôi phục trước khi dời.' };

    const [row] = await db.select({ endsAt: classSessions.endsAt, campusId: classes.campusId }).from(classSessions).innerJoin(classes, eq(classes.id, classSessions.classId)).where(eq(classSessions.id, id)).limit(1);
    if (!row) return { ok: false, message: 'Không tìm thấy buổi học này.' };
    const durationMs = row.endsAt.getTime() - session.startsAt.getTime();
    const startsAt = new Date(`${date}T${startTime}:00+07:00`);
    const endsAt = new Date(startsAt.getTime() + durationMs);
    if (startsAt.getTime() === session.startsAt.getTime()) return { ok: true, message: 'Buổi học vẫn ở giờ cũ.' };
    if (isPastStart(startsAt, new Date())) return { ok: false, message: 'Không dời buổi về thời điểm đã qua.' };

    const [clash] = await db
      .select({ id: classSessions.id })
      .from(classSessions)
      .where(and(eq(classSessions.classId, session.classId), eq(classSessions.startsAt, startsAt), ne(classSessions.id, id)))
      .limit(1);
    if (clash) return { ok: false, message: 'Lớp đã có buổi học vào thời điểm này.' };

    const conflicts = await findScheduleConflicts({ slots: [{ startsAt, endsAt }], teacherId: session.teacherId, room: session.room, campusId: row.campusId, excludeSessionId: id });
    if (conflicts.length > 0) return conflictResult(conflicts);

    await db.transaction(async (tx) => {
      await tx.update(classSessions).set({ startsAt, endsAt, updatedAt: new Date() }).where(eq(classSessions.id, id));
      await renumberSessions(tx, session.classId);
    });
    await writeAudit({ action: 'update', entity: 'session', entityId: id, summary: `Dời buổi ${session.sessionNo} từ ${session.startsAt.toISOString()} sang ${startsAt.toISOString()}` });
    revalidatePath('/lich-hoc');
    revalidatePath(`/lop-hoc/${session.classId}`);
    await safely('dời buổi học', () => notifySessionChanged(id, { startsAt: session.startsAt, room: session.room, teacherId: session.teacherId }));
    return { ok: true, message: `Đã dời buổi ${session.sessionNo}` };
  } catch (error) {
    return errorResult(error);
  }
}
