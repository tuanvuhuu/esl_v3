'use server';

import { and, eq, inArray, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { parents, studentParents, students } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { requireParentAccess, requireStudentAccess } from '@/lib/campus-access';
import { getParent } from '@/lib/queries/parents';
import { PARENT_RELATION_LABELS } from '@/lib/parent-labels';
import {
  PARENT_EDITABLE_FIELDS,
  parentAssignSchema,
  parentFieldValue,
  parentFormSchema,
  parentLinkSchema,
  parentRelationSchema,
  type ParentEditableField,
} from '@/lib/validation/parent';
import { fieldErrorsFrom, type ActionResult } from '@/lib/validation/student';

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action phụ huynh:', error);
  return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
}

function revalidateParentPages(studentId?: number) {
  revalidatePath('/phu-huynh');
  revalidatePath('/hoc-sinh');
  if (studentId) revalidatePath(`/hoc-sinh/${studentId}`);
}

// Số điện thoại phụ huynh là duy nhất, để tìm đúng người khi liên kết
async function phoneTakenBy(phone: string, exceptId: number | null): Promise<boolean> {
  const where = exceptId ? and(eq(parents.phone, phone), ne(parents.id, exceptId)) : eq(parents.phone, phone);
  const [row] = await db.select({ id: parents.id }).from(parents).where(where).limit(1);
  return !!row;
}

export type ParentFormValues = { fullName: string; phone: string; email: string; note: string };

export async function createParentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('parents.manage');
    const parsed = parentFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    if (await phoneTakenBy(v.phone, null)) {
      return { ok: false, message: 'Số điện thoại này đã có phụ huynh.', fieldErrors: { phone: 'Số điện thoại này đã có phụ huynh' } };
    }
    const [created] = await db
      .insert(parents)
      .values({ fullName: v.fullName, phone: v.phone, email: v.email, note: v.note })
      .returning({ id: parents.id });
    await writeAudit({ action: 'create', entity: 'parent', entityId: created.id, summary: `Thêm phụ huynh ${v.fullName}` });
    revalidateParentPages();
    return { ok: true, message: `Đã thêm ${v.fullName}` };
  } catch (error) {
    return errorResult(error);
  }
}

export async function updateParentAction(id: number, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('parents.manage');
    await requireParentAccess(id);
    const parsed = parentFormSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    if (!(await getParent(id))) return { ok: false, message: 'Không tìm thấy phụ huynh này. Có thể đã bị xoá.' };
    if (await phoneTakenBy(v.phone, id)) {
      return { ok: false, message: 'Số điện thoại này đã có phụ huynh khác.', fieldErrors: { phone: 'Số điện thoại này đã có phụ huynh khác' } };
    }
    await db
      .update(parents)
      .set({ fullName: v.fullName, phone: v.phone, email: v.email, note: v.note, updatedAt: new Date() })
      .where(eq(parents.id, id));
    await writeAudit({ action: 'update', entity: 'parent', entityId: id, summary: `Sửa phụ huynh ${v.fullName}` });
    revalidateParentPages();
    return { ok: true, message: `Đã lưu ${v.fullName}` };
  } catch (error) {
    return errorResult(error);
  }
}

export async function loadParentForm(id: number): Promise<{ ok: true; values: ParentFormValues } | { ok: false; message: string }> {
  try {
    await requirePermission('parents.manage');
    await requireParentAccess(id);
    const row = await getParent(id);
    if (!row) return { ok: false, message: 'Không tìm thấy phụ huynh này. Có thể đã bị xoá.' };
    return { ok: true, values: { fullName: row.fullName, phone: row.phone, email: row.email, note: row.note } };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi đọc phụ huynh để sửa:', error);
    return { ok: false, message: 'Không đọc được dữ liệu. Thử lại sau ít phút.' };
  }
}

// Xoá phụ huynh: chỉ xoá người và các liên kết của họ. Học sinh vẫn được giữ lại.
export async function deleteParentAction(id: number): Promise<ActionResult> {
  try {
    await requirePermission('parents.manage');
    await requireParentAccess(id);
    const row = await getParent(id);
    if (!row) return { ok: false, message: 'Không tìm thấy phụ huynh này. Có thể đã bị xoá.' };
    await db.delete(parents).where(eq(parents.id, id));
    await writeAudit({ action: 'delete', entity: 'parent', entityId: id, summary: `Xoá phụ huynh ${row.fullName} (học sinh vẫn được giữ)` });
    revalidateParentPages();
    return { ok: true, message: `Đã xoá ${row.fullName}. Học sinh vẫn được giữ lại.` };
  } catch (error) {
    return errorResult(error);
  }
}

// Sau khi gỡ hoặc đổi liên hệ chính, nếu học sinh không còn liên hệ chính thì chọn người đầu tiên
async function ensurePrimary(studentId: number) {
  const links = await db
    .select({ id: studentParents.id, isPrimary: studentParents.isPrimary })
    .from(studentParents)
    .where(eq(studentParents.studentId, studentId))
    .orderBy(studentParents.id);
  if (links.length === 0 || links.some((l) => l.isPrimary)) return;
  await db.update(studentParents).set({ isPrimary: true, updatedAt: new Date() }).where(eq(studentParents.id, links[0].id));
}

// Thêm một phụ huynh vào hồ sơ học sinh: người có sẵn, hoặc người mới nhập ngay trong hộp thoại
export async function addParentLinkAction(studentId: number, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('parents.manage');
    await requireStudentAccess(studentId);
    const parsed = parentLinkSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    const [student] = await db.select({ id: students.id, fullName: students.fullName }).from(students).where(eq(students.id, studentId)).limit(1);
    if (!student) return { ok: false, message: 'Không tìm thấy học sinh này. Có thể đã bị xoá.' };

    let parentId = v.parentId;
    if (parentId === null) {
      if (await phoneTakenBy(v.phone, null)) {
        // Số đã có phụ huynh: dùng lại người đó thay vì tạo trùng
        const [existing] = await db.select({ id: parents.id }).from(parents).where(eq(parents.phone, v.phone)).limit(1);
        parentId = existing.id;
      } else {
        const [created] = await db.insert(parents).values({ fullName: v.fullName, phone: v.phone }).returning({ id: parents.id });
        parentId = created.id;
      }
    }
    const parent = await getParent(parentId);
    if (!parent) return { ok: false, message: 'Phụ huynh không tồn tại.', fieldErrors: { parentId: 'Phụ huynh không tồn tại' } };

    const [existingLink] = await db
      .select({ id: studentParents.id })
      .from(studentParents)
      .where(and(eq(studentParents.studentId, studentId), eq(studentParents.parentId, parentId)))
      .limit(1);
    if (existingLink) {
      return { ok: false, message: `${parent.fullName} đã là phụ huynh của học sinh này.`, fieldErrors: { parentId: 'Đã liên kết rồi' } };
    }

    if (v.isPrimary) await db.update(studentParents).set({ isPrimary: false, updatedAt: new Date() }).where(eq(studentParents.studentId, studentId));
    await db.insert(studentParents).values({ studentId, parentId, relation: v.relation, isPrimary: v.isPrimary });
    await ensurePrimary(studentId);
    await writeAudit({ action: 'link', entity: 'student', entityId: studentId, summary: `Liên kết ${parent.fullName} (${PARENT_RELATION_LABELS[v.relation]}) với ${student.fullName}` });
    revalidateParentPages(studentId);
    return { ok: true, message: `Đã thêm ${parent.fullName} vào hồ sơ` };
  } catch (error) {
    return errorResult(error);
  }
}

// Gỡ liên kết một phụ huynh khỏi học sinh. Không xoá phụ huynh và không xoá học sinh.
export async function unlinkParentAction(studentId: number, parentId: number): Promise<ActionResult> {
  try {
    await requirePermission('parents.manage');
    await requireStudentAccess(studentId);
    const [link] = await db
      .select({ id: studentParents.id })
      .from(studentParents)
      .where(and(eq(studentParents.studentId, studentId), eq(studentParents.parentId, parentId)))
      .limit(1);
    if (!link) return { ok: false, message: 'Liên kết này không còn tồn tại.' };
    const parent = await getParent(parentId);
    await db.delete(studentParents).where(eq(studentParents.id, link.id));
    await ensurePrimary(studentId);
    await writeAudit({ action: 'unlink', entity: 'student', entityId: studentId, summary: `Gỡ liên kết ${parent?.fullName ?? parentId} khỏi học sinh` });
    revalidateParentPages(studentId);
    return { ok: true, message: 'Đã gỡ liên kết. Học sinh và phụ huynh vẫn được giữ lại.' };
  } catch (error) {
    return errorResult(error);
  }
}

// Gán một phụ huynh cho nhiều học sinh, từ màn Phụ huynh. Học sinh đã liên kết hoặc không còn tồn tại thì bỏ qua và báo lại.
// Chọn liên hệ chính thì người này thay liên hệ chính cũ của từng học sinh.
export async function assignStudentsAction(parentId: number, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('parents.manage');
    await requireParentAccess(parentId);
    const parsed = parentAssignSchema.safeParse({
      studentIds: formData.getAll('studentIds'),
      relation: formData.get('relation'),
      isPrimary: formData.get('isPrimary') === 'on',
    });
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    for (const studentId of v.studentIds) await requireStudentAccess(studentId);
    const parent = await getParent(parentId);
    if (!parent) return { ok: false, message: 'Không tìm thấy phụ huynh này. Có thể đã bị xoá.' };

    const requested = [...new Set(v.studentIds)];
    const alreadyLinked = new Set(
      (await db.select({ studentId: studentParents.studentId }).from(studentParents).where(eq(studentParents.parentId, parentId))).map((r) => r.studentId),
    );
    const toLink = requested.filter((id) => !alreadyLinked.has(id));
    const found = toLink.length
      ? await db.select({ id: students.id, fullName: students.fullName }).from(students).where(inArray(students.id, toLink))
      : [];
    if (found.length === 0) {
      return {
        ok: false,
        message: 'Không có học sinh nào để gán: các học sinh đã chọn đã liên kết hoặc không còn tồn tại.',
        fieldErrors: { studentIds: 'Đã liên kết hoặc không còn tồn tại' },
      };
    }

    await db.transaction(async (tx) => {
      for (const s of found) {
        if (v.isPrimary) await tx.update(studentParents).set({ isPrimary: false, updatedAt: new Date() }).where(eq(studentParents.studentId, s.id));
        await tx.insert(studentParents).values({ studentId: s.id, parentId, relation: v.relation, isPrimary: v.isPrimary });
      }
    });
    for (const s of found) await ensurePrimary(s.id);
    await writeAudit({
      action: 'link',
      entity: 'parent',
      entityId: parentId,
      summary: `Gán ${parent.fullName} (${PARENT_RELATION_LABELS[v.relation]}) cho ${found.length} học sinh`,
    });
    revalidateParentPages();
    const skipped = requested.length - found.length;
    return {
      ok: true,
      message:
        skipped > 0
          ? `Đã gán ${found.length} học sinh cho ${parent.fullName}. Bỏ qua ${skipped} học sinh đã liên kết hoặc không còn tồn tại.`
          : `Đã gán ${found.length} học sinh cho ${parent.fullName}`,
    };
  } catch (error) {
    return errorResult(error);
  }
}

const FIELD_LABEL: Record<ParentEditableField, string> = {
  fullName: 'tên',
  phone: 'số điện thoại',
  email: 'email',
  note: 'ghi chú',
};

// Sửa một ô của phụ huynh ngay trên bảng (tên, số điện thoại, email, ghi chú). Kiểm tra giống form đầy đủ.
export async function updateParentFieldAction(id: number, field: ParentEditableField, value: string): Promise<ActionResult> {
  try {
    await requirePermission('parents.manage');
    await requireParentAccess(id);
    if (!PARENT_EDITABLE_FIELDS.includes(field)) return { ok: false, message: 'Ô này không sửa được.' };
    const checked = parentFieldValue(field, value);
    if (!checked.ok) return { ok: false, message: checked.message, fieldErrors: { [field]: checked.message } };
    const row = await getParent(id);
    if (!row) return { ok: false, message: 'Không tìm thấy phụ huynh này. Có thể đã bị xoá.' };
    if (field === 'phone' && (await phoneTakenBy(checked.value, id))) {
      return { ok: false, message: 'Số điện thoại này đã có phụ huynh khác.', fieldErrors: { phone: 'Số điện thoại này đã có phụ huynh khác' } };
    }
    const patch =
      field === 'fullName'
        ? { fullName: checked.value }
        : field === 'phone'
          ? { phone: checked.value }
          : field === 'email'
            ? { email: checked.value }
            : { note: checked.value };
    await db.update(parents).set({ ...patch, updatedAt: new Date() }).where(eq(parents.id, id));
    await writeAudit({ action: 'update', entity: 'parent', entityId: id, summary: `Sửa ${FIELD_LABEL[field]} của ${row.fullName}` });
    revalidateParentPages();
    return { ok: true, message: 'Đã lưu' };
  } catch (error) {
    return errorResult(error);
  }
}

// Đổi quan hệ của một học sinh với phụ huynh, ngay trên bảng
export async function setLinkRelationAction(studentId: number, parentId: number, relation: string): Promise<ActionResult> {
  try {
    await requirePermission('parents.manage');
    await requireStudentAccess(studentId);
    const parsed = parentRelationSchema.safeParse(relation);
    if (!parsed.success) return { ok: false, message: 'Quan hệ không hợp lệ.' };
    const [link] = await db
      .select({ id: studentParents.id })
      .from(studentParents)
      .where(and(eq(studentParents.studentId, studentId), eq(studentParents.parentId, parentId)))
      .limit(1);
    if (!link) return { ok: false, message: 'Liên kết này không còn tồn tại.' };
    await db.update(studentParents).set({ relation: parsed.data, updatedAt: new Date() }).where(eq(studentParents.id, link.id));
    const parent = await getParent(parentId);
    await writeAudit({
      action: 'update',
      entity: 'student',
      entityId: studentId,
      summary: `Đổi quan hệ của ${parent?.fullName ?? parentId} thành ${PARENT_RELATION_LABELS[parsed.data]}`,
    });
    revalidateParentPages(studentId);
    return { ok: true, message: 'Đã đổi quan hệ' };
  } catch (error) {
    return errorResult(error);
  }
}

// Đặt một phụ huynh làm liên hệ chính của học sinh
export async function setPrimaryParentAction(studentId: number, parentId: number): Promise<ActionResult> {
  try {
    await requirePermission('parents.manage');
    await requireStudentAccess(studentId);
    const [link] = await db
      .select({ id: studentParents.id })
      .from(studentParents)
      .where(and(eq(studentParents.studentId, studentId), eq(studentParents.parentId, parentId)))
      .limit(1);
    if (!link) return { ok: false, message: 'Liên kết này không còn tồn tại.' };
    await db.update(studentParents).set({ isPrimary: false, updatedAt: new Date() }).where(eq(studentParents.studentId, studentId));
    await db.update(studentParents).set({ isPrimary: true, updatedAt: new Date() }).where(eq(studentParents.id, link.id));
    revalidateParentPages(studentId);
    return { ok: true, message: 'Đã đặt liên hệ chính' };
  } catch (error) {
    return errorResult(error);
  }
}
