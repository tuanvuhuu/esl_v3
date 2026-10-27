'use server';

import { makeupStudentsOfSession } from '@/lib/makeup';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { attendance, classSessions, students } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { requireSessionAccess } from '@/lib/campus-access';
import { vnDateKey } from '@/lib/datetime';
import { safely } from '@/lib/telegram/core';
import { notifyAttendance } from '@/lib/telegram/notify';
import { z } from 'zod';
import { type ActionResult } from '@/lib/validation/student';

const MARKS = ['present', 'late', 'absent', 'excused'] as const;
const MARK_LABEL = { present: 'có mặt', late: 'trễ', absent: 'vắng', excused: 'có phép' } as const;

const entriesSchema = z
  .array(z.object({ studentId: z.number().int().positive(), mark: z.enum(MARKS) }))
  .min(1, 'Chưa đánh dấu học sinh nào');

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action điểm danh:', error);
  return { ok: false, message: 'Không lưu được điểm danh. Thử lại sau ít phút.' };
}

// Lưu điểm danh một buổi. Chỉ ghi học sinh được gửi lên; học sinh khác giữ nguyên.
// Buổi chưa học thì không điểm danh được. Lần đầu lưu thì buổi chuyển sang đã học và cộng số buổi cho học sinh.
export async function saveAttendanceAction(sessionId: number, entries: { studentId: number; mark: (typeof MARKS)[number] }[]): Promise<ActionResult> {
  try {
    await requirePermission('attendance.record');
    await requireSessionAccess(sessionId);
    const parsed = entriesSchema.safeParse(entries);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dữ liệu điểm danh không hợp lệ' };

    const [session] = await db
      .select({
        id: classSessions.id,
        classId: classSessions.classId,
        sessionNo: classSessions.sessionNo,
        startsAt: classSessions.startsAt,
        status: classSessions.status,
      })
      .from(classSessions)
      .where(eq(classSessions.id, sessionId))
      .limit(1);
    if (!session) return { ok: false, message: 'Không tìm thấy buổi học này.' };
    if (session.status === 'cancelled') return { ok: false, message: 'Buổi này đã huỷ nên không điểm danh.' };
    if (session.startsAt.getTime() > Date.now()) return { ok: false, message: 'Buổi này chưa diễn ra. Điểm danh sau khi bắt đầu giờ học.' };

    const dateKey = vnDateKey(session.startsAt);
    const enrolled = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.classId, session.classId), inArray(students.status, ['active', 'trial'])));
    // Học sinh lớp khác học bù buổi này cũng được điểm danh (37.12)
    const enrolledIds = new Set([...enrolled.map((s) => s.id), ...(await makeupStudentsOfSession(session.id)).map((s) => s.id)]);
    const outside = parsed.data.filter((e) => !enrolledIds.has(e.studentId));
    if (outside.length > 0) return { ok: false, message: 'Có học sinh không thuộc lớp này hoặc đã nghỉ học.' };

    const rows = parsed.data.map((e) => ({ studentId: e.studentId, classId: session.classId, sessionDate: dateKey, mark: e.mark }));
    await db.transaction(async (tx) => {
      await tx
        .insert(attendance)
        .values(rows)
        .onConflictDoUpdate({
          target: [attendance.studentId, attendance.sessionDate],
          set: { mark: sql`excluded.mark`, classId: sql`excluded.class_id`, updatedAt: new Date() },
        });
      if (session.status === 'planned') {
        await tx.update(classSessions).set({ status: 'done', updatedAt: new Date() }).where(eq(classSessions.id, session.id));
        await tx
          .update(students)
          .set({ sessionsDone: sql`${students.sessionsDone} + 1`, updatedAt: new Date() })
          .where(and(eq(students.classId, session.classId), inArray(students.status, ['active', 'trial'])));
      }
    });

    const count = (m: (typeof MARKS)[number]) => parsed.data.filter((e) => e.mark === m).length;
    await writeAudit({
      action: 'attendance',
      entity: 'session',
      entityId: session.id,
      summary: `Điểm danh buổi ${session.sessionNo}: ${count('present')} ${MARK_LABEL.present}, ${count('late')} ${MARK_LABEL.late}, ${count('absent')} ${MARK_LABEL.absent}, ${count('excused')} ${MARK_LABEL.excused}`,
    });
    revalidatePath('/diem-danh');
    revalidatePath('/lich-hoc');
    revalidatePath('/hoc-sinh');
    revalidatePath(`/lop-hoc/${session.classId}`);
    revalidatePath('/tong-quan');
    // Báo phụ huynh con vắng hoặc trễ, cảnh báo vắng liên tiếp (docs/KICH-BAN-TELEGRAM.md mục 1.7, 2)
    await safely('điểm danh', () => notifyAttendance(session.id, parsed.data));
    return { ok: true, message: `Đã lưu điểm danh buổi ${session.sessionNo}` };
  } catch (error) {
    return errorResult(error);
  }
}
