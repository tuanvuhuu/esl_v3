'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { classes, learningEvents, parents, studentParents, students } from '@/db/schema';

import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { requireClassAccess, requireStudentAccess } from '@/lib/campus-access';
import { sessionCountsFrom } from '@/lib/queries/classes';
import { normalizeSearch } from '@/lib/text';
import { proratedFee } from '@/lib/tuition';
import { fieldErrorsFrom, isRealIsoDate, PARENT_RELATIONS, studentFormSchema, type ActionResult } from '@/lib/validation/student';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Phụ huynh có sẵn theo id, hoặc tìm theo số điện thoại (đã có thì dùng lại), hoặc tạo mới
async function resolveParent(tx: Tx, v: { parentId: number | null; parentName: string; parentPhone: string }): Promise<number> {
  if (v.parentId !== null) return v.parentId;
  const [existing] = await tx.select({ id: parents.id }).from(parents).where(eq(parents.phone, v.parentPhone)).limit(1);
  if (existing) return existing.id;
  const [created] = await tx.insert(parents).values({ fullName: v.parentName, phone: v.parentPhone }).returning({ id: parents.id });
  return created.id;
}

// Gắn phụ huynh làm liên hệ (chính hoặc phụ). Nếu là chính thì bỏ cờ chính của những người khác.
async function attachParent(tx: Tx, studentId: number, parentId: number, relation: (typeof PARENT_RELATIONS)[number], primary: boolean) {
  const [link] = await tx
    .select({ id: studentParents.id })
    .from(studentParents)
    .where(and(eq(studentParents.studentId, studentId), eq(studentParents.parentId, parentId)))
    .limit(1);
  if (primary) await tx.update(studentParents).set({ isPrimary: false, updatedAt: new Date() }).where(eq(studentParents.studentId, studentId));
  if (link) {
    await tx.update(studentParents).set({ relation, isPrimary: primary, updatedAt: new Date() }).where(eq(studentParents.id, link.id));
  } else {
    await tx.insert(studentParents).values({ studentId, parentId, relation, isPrimary: primary });
  }
}

// Học phí riêng chỉ lưu khi khác học phí lớp; bằng học phí lớp thì để trống để đi theo lớp khi lớp đổi học phí
async function ownFee(classId: number, tuitionFee: number | null): Promise<number | null> {
  if (tuitionFee === null) return null;
  const [cls] = await db.select({ fee: classes.fee }).from(classes).where(eq(classes.id, classId)).limit(1);
  return cls && cls.fee === tuitionFee ? null : tuitionFee;
}

export type TuitionPreview = { fee: number; total: number; remaining: number; suggested: number; firstKey: string | null };

// Gợi ý học phí khi học sinh vào lớp từ ngày startDate: số buổi còn lại (không tính buổi huỷ) và học phí tương ứng
export async function tuitionPreviewAction(classId: number, startDate: string): Promise<{ ok: true; preview: TuitionPreview } | { ok: false; message: string }> {
  try {
    await requirePermission('students.edit');
    if (!Number.isInteger(classId) || classId < 1 || !isRealIsoDate(startDate)) return { ok: false, message: 'Chưa đủ lớp và ngày bắt đầu học.' };
    await requireClassAccess(classId);
    const counts = await sessionCountsFrom(classId, startDate);
    if (!counts) return { ok: false, message: 'Lớp học không tồn tại.' };
    return { ok: true, preview: { ...counts, suggested: proratedFee(counts.fee, counts.total, counts.remaining) } };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi tính học phí theo buổi:', error);
    return { ok: false, message: 'Không tính được học phí. Thử lại sau ít phút.' };
  }
}

function forbiddenOr(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action học sinh:', error);
  return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
}

export async function createStudentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('students.edit');
    const parsed = studentFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    await requireClassAccess(v.classId);
    const tuitionFee = await ownFee(v.classId, v.tuitionFee);
    const id = await db.transaction(async (tx) => {
      const [student] = await tx
        .insert(students)
        .values({
          fullName: v.fullName,
          searchKey: normalizeSearch(v.fullName),
          gender: v.gender,
          dob: v.dob,
          classId: v.classId,
          status: v.status,
          startDate: v.startDate,
          tuitionFee,
          note: v.note,
        })
        .returning({ id: students.id });
      const parentId = await resolveParent(tx, v);
      // Người đầu tiên luôn là liên hệ chính
      await attachParent(tx, student.id, parentId, v.parentRelation, true);
      return student.id;
    });
    await writeAudit({ action: 'create', entity: 'student', entityId: id, summary: `Thêm học sinh ${v.fullName}` });
    revalidatePath('/hoc-sinh');
    revalidatePath('/phu-huynh');
    revalidatePath('/lop-hoc');
    return { ok: true, message: `Đã thêm ${v.fullName}` };
  } catch (error) {
    return forbiddenOr(error);
  }
}

export async function updateStudentAction(id: number, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('students.edit');
    await requireStudentAccess(id);
    const parsed = studentFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    await requireClassAccess(v.classId);
    const [before] = await db
      .select({ classId: students.classId, className: classes.name })
      .from(students)
      .innerJoin(classes, eq(classes.id, students.classId))
      .where(eq(students.id, id))
      .limit(1);
    if (!before) return { ok: false, message: 'Không tìm thấy học sinh này. Có thể đã bị xoá.' };
    const [newClass] = await db.select({ name: classes.name }).from(classes).where(eq(classes.id, v.classId)).limit(1);
    if (!newClass) return { ok: false, message: 'Lớp học không tồn tại.', fieldErrors: { classId: 'Lớp học không tồn tại' } };

    const classChanged = before.classId !== v.classId;
    const tuitionFee = await ownFee(v.classId, v.tuitionFee);
    await db.transaction(async (tx) => {
      await tx
        .update(students)
        .set({
          fullName: v.fullName,
          searchKey: normalizeSearch(v.fullName),
          gender: v.gender,
          dob: v.dob,
          classId: v.classId,
          status: v.status,
          startDate: v.startDate,
          tuitionFee,
          note: v.note,
          updatedAt: new Date(),
        })
        .where(eq(students.id, id));

      const parentId = await resolveParent(tx, v);
      await attachParent(tx, id, parentId, v.parentRelation, v.parentPrimary || !(await hasPrimary(tx, id)));

      // Chuyển lớp thì ghi sự kiện vào lịch sử học tập (task 3.8)
      if (classChanged) {
        await tx.insert(learningEvents).values({
          studentId: id,
          eventType: 'class_change',
          title: `Chuyển từ ${before.className} sang ${newClass.name}`,
          detail: '',
        });
      }
    });

    await writeAudit({
      action: 'update',
      entity: 'student',
      entityId: id,
      summary: classChanged ? `Sửa hồ sơ học sinh ${v.fullName}, chuyển ${before.className} → ${newClass.name}` : `Sửa hồ sơ học sinh ${v.fullName}`,
    });
    revalidatePath('/hoc-sinh');
    revalidatePath(`/hoc-sinh/${id}`);
    revalidatePath('/phu-huynh');
    revalidatePath('/lop-hoc');
    return { ok: true, message: classChanged ? `Đã chuyển ${v.fullName} sang ${newClass.name}` : `Đã lưu thay đổi cho ${v.fullName}` };
  } catch (error) {
    return forbiddenOr(error);
  }
}

async function hasPrimary(tx: Tx, studentId: number): Promise<boolean> {
  const [row] = await tx
    .select({ id: studentParents.id })
    .from(studentParents)
    .where(and(eq(studentParents.studentId, studentId), eq(studentParents.isPrimary, true)))
    .limit(1);
  return !!row;
}

export type StudentFormValues = {
  fullName: string;
  gender: 'male' | 'female';
  dob: string;
  classId: number;
  status: 'active' | 'trial' | 'paused' | 'finished';
  startDate: string;
  tuitionFee: number | null; // học phí riêng, null: theo học phí lớp
  note: string;
  parentId: string; // id phụ huynh liên hệ chính, rỗng nếu chưa có
  parentName: string;
  parentPhone: string;
  parentRelation: 'father' | 'mother' | 'guardian' | 'other';
};

// Đọc dữ liệu để điền sẵn form sửa. Cần quyền sửa học sinh.
export async function loadStudentForm(id: number): Promise<{ ok: true; values: StudentFormValues } | { ok: false; message: string }> {
  try {
    await requirePermission('students.edit');
    await requireStudentAccess(id);
    const [row] = await db
      .select({
        fullName: students.fullName,
        gender: students.gender,
        dob: students.dob,
        classId: students.classId,
        status: students.status,
        startDate: students.startDate,
        tuitionFee: students.tuitionFee,
        classFee: classes.fee,
        note: students.note,
        parentId: parents.id,
        parentName: parents.fullName,
        parentPhone: parents.phone,
        parentRelation: studentParents.relation,
      })
      .from(students)
      .innerJoin(classes, eq(classes.id, students.classId))
      .leftJoin(studentParents, and(eq(studentParents.studentId, students.id), eq(studentParents.isPrimary, true)))
      .leftJoin(parents, eq(parents.id, studentParents.parentId))
      .where(eq(students.id, id))
      .limit(1);
    if (!row) return { ok: false, message: 'Không tìm thấy học sinh này. Có thể đã bị xoá.' };
    return {
      ok: true,
      values: {
        fullName: row.fullName,
        gender: row.gender,
        dob: row.dob,
        classId: row.classId,
        status: row.status,
        startDate: row.startDate,
        tuitionFee: row.tuitionFee ?? row.classFee,
        note: row.note,
        parentId: row.parentId ? String(row.parentId) : '',
        parentName: row.parentName ?? '',
        parentPhone: row.parentPhone ?? '',
        parentRelation: row.parentRelation ?? 'other',
      },
    };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi đọc học sinh để sửa:', error);
    return { ok: false, message: 'Không đọc được dữ liệu. Thử lại sau ít phút.' };
  }
}

// Xoá học sinh. Điểm danh, học phí, bài nộp và sự kiện học tập xoá theo (cascade).
export async function deleteStudentAction(id: number): Promise<ActionResult> {
  try {
    await requirePermission('students.delete');
    await requireStudentAccess(id);
    const [row] = await db.select({ fullName: students.fullName }).from(students).where(eq(students.id, id)).limit(1);
    if (!row) return { ok: false, message: 'Không tìm thấy học sinh này. Có thể đã bị xoá.' };
    await db.delete(students).where(eq(students.id, id));
    await writeAudit({ action: 'delete', entity: 'student', entityId: id, summary: `Xoá học sinh ${row.fullName}` });
    revalidatePath('/hoc-sinh');
    revalidatePath('/phu-huynh');
    revalidatePath('/lop-hoc');
    return { ok: true, message: `Đã xoá ${row.fullName}` };
  } catch (error) {
    return forbiddenOr(error);
  }
}
