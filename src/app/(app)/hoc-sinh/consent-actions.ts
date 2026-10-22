'use server';

// Đồng ý của phụ huynh trong hồ sơ học sinh (P35.12): xem trạng thái, ghi nhận đồng ý (có giấy hoặc gọi điện),
// rút lại, gửi yêu cầu qua bot Telegram. Xem cần quyền xem học sinh; ghi cần quyền sửa hồ sơ.
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { parents, studentParents } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { requireStudentAccess } from '@/lib/campus-access';
import { CONSENT_LABELS, CONSENT_PURPOSES, type ConsentPurpose } from '@/lib/consent';
import { hasPermission } from '@/lib/permissions';
import { isParentOf, listConsents, recordConsent, withdrawConsent, type ConsentEntry } from '@/lib/queries/consents';
import { getCurrentAccount } from '@/lib/session';
import { isParentLinked, sendConsentRequest } from '@/lib/telegram/service';

type Fail = { ok: false; message: string };
const purposeSchema = z.enum(CONSENT_PURPOSES as [ConsentPurpose, ...ConsentPurpose[]]);

function fail(error: unknown): Fail {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  if (error instanceof z.ZodError) return { ok: false, message: 'Dữ liệu không hợp lệ.' };
  console.error('Lỗi đồng ý của phụ huynh:', error);
  return { ok: false, message: 'Không xử lý được. Thử lại sau ít phút.' };
}

export type ConsentLoad = {
  ok: true;
  entries: ConsentEntry[];
  parents: { id: number; name: string; linked: boolean }[];
  canEdit: boolean;
};

export async function loadConsentsAction(studentId: number): Promise<ConsentLoad | Fail> {
  try {
    const granted = await requirePermission('students.view');
    await requireStudentAccess(studentId);
    const entries = await listConsents(studentId);
    const rows = await db
      .select({ id: parents.id, name: parents.fullName })
      .from(studentParents)
      .innerJoin(parents, eq(parents.id, studentParents.parentId))
      .where(eq(studentParents.studentId, studentId));
    const withLink = await Promise.all(rows.map(async (p) => ({ ...p, linked: await isParentLinked(p.id) })));
    return { ok: true, entries, parents: withLink, canEdit: hasPermission(granted, 'students.edit') };
  } catch (error) {
    return fail(error);
  }
}

// Nhân viên ghi nhận phụ huynh đồng ý (hoặc không đồng ý) ngoài bot: giấy đồng ý, gọi điện. Ghi chú bắt buộc để làm bằng chứng.
export async function recordConsentAction(input: { studentId: number; purpose: ConsentPurpose; parentId: number; granted: boolean; note: string }): Promise<{ ok: true; message: string } | Fail> {
  try {
    await requirePermission('students.edit');
    const data = z
      .object({
        studentId: z.number().int().positive(),
        purpose: purposeSchema,
        parentId: z.number().int().positive({ message: 'Chọn phụ huynh' }),
        granted: z.boolean(),
        note: z.string().trim().min(3, 'Ghi rõ cách phụ huynh đồng ý, ví dụ "Đã ký giấy đồng ý ngày 22/10"').max(300),
      })
      .safeParse(input);
    if (!data.success) return { ok: false, message: data.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ.' };
    const v = data.data;
    await requireStudentAccess(v.studentId);
    if (!(await isParentOf(v.parentId, v.studentId))) return { ok: false, message: 'Người này không phải phụ huynh của học sinh.' };
    const account = await getCurrentAccount();
    await recordConsent({ studentId: v.studentId, purpose: v.purpose, granted: v.granted, parentId: v.parentId, channel: 'staff', note: v.note, recordedByAccountId: account?.id ?? null });
    await writeAudit({ action: 'consent', entity: 'student', entityId: v.studentId, summary: `${v.granted ? 'Ghi nhận đồng ý' : 'Ghi nhận không đồng ý'}: ${CONSENT_LABELS[v.purpose]}` });
    revalidatePath('/hoc-sinh');
    return { ok: true, message: v.granted ? 'Đã ghi nhận phụ huynh đồng ý' : 'Đã ghi nhận phụ huynh không đồng ý' };
  } catch (error) {
    return fail(error);
  }
}

export async function withdrawConsentAction(studentId: number, purpose: ConsentPurpose): Promise<{ ok: true; message: string } | Fail> {
  try {
    await requirePermission('students.edit');
    const p = purposeSchema.parse(purpose);
    await requireStudentAccess(studentId);
    if (!(await withdrawConsent(studentId, p))) return { ok: false, message: 'Không có đồng ý nào đang hiệu lực để rút lại.' };
    await writeAudit({ action: 'withdraw', entity: 'student', entityId: studentId, summary: `Rút lại đồng ý: ${CONSENT_LABELS[p]}` });
    revalidatePath('/hoc-sinh');
    return { ok: true, message: 'Đã rút lại đồng ý. Học sinh không ghi âm được nữa.' };
  } catch (error) {
    return fail(error);
  }
}

export async function requestConsentAction(studentId: number, purpose: ConsentPurpose): Promise<{ ok: true; message: string } | Fail> {
  try {
    await requirePermission('students.edit');
    const p = purposeSchema.parse(purpose);
    await requireStudentAccess(studentId);
    const account = await getCurrentAccount();
    if (!account) throw new ForbiddenError();
    const r = await sendConsentRequest(studentId, p, account.id, account.fullName);
    if (r.chats === 0) return { ok: false, message: 'Chưa có phụ huynh nào kết nối Telegram. Kết nối ở tab Phụ huynh, hoặc ghi nhận đồng ý bằng giấy.' };
    if (r.delivered === 0) return { ok: false, message: 'Chưa gửi được tin Telegram. Thử lại sau ít phút.' };
    await writeAudit({ action: 'consent_request', entity: 'student', entityId: studentId, summary: `Gửi yêu cầu đồng ý qua Telegram: ${CONSENT_LABELS[p]}` });
    return { ok: true, message: `Đã gửi yêu cầu tới ${r.delivered} phụ huynh qua Telegram` };
  } catch (error) {
    return fail(error);
  }
}
