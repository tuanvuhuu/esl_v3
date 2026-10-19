'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { classes, students, tuitionPayments } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { getCurrentAccount } from '@/lib/session';
import { notifyParentsOfStudent } from '@/lib/telegram/service';
import { requireStudentAccess } from '@/lib/campus-access';
import { formatVND } from '@/lib/money';
import { listPaymentsOfStudent, paidOf, type PaymentRow } from '@/lib/queries/tuition';
import { debtOf } from '@/lib/tuition';
import { z } from 'zod';
import { fieldErrorsFrom, type ActionResult } from '@/lib/validation/student';

const paymentSchema = z.object({
  amount: z.coerce
    .number({ error: 'Vui lòng nhập số tiền' })
    .int('Số tiền phải là số nguyên VND')
    .min(1, 'Số tiền phải lớn hơn 0'),
  note: z.string().trim().max(200, 'Ghi chú tối đa 200 ký tự').default(''),
});

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi server action học phí:', error);
  return { ok: false, message: 'Không ghi nhận được. Thử lại sau ít phút.' };
}

// Số tiền còn nợ của một học sinh: học phí lớp trừ tổng đã thu
async function studentBalance(studentId: number): Promise<{ name: string; fee: number; paid: number; debt: number } | null> {
  const [row] = await db
    .select({ name: students.fullName, fee: classes.fee })
    .from(students)
    .innerJoin(classes, eq(classes.id, students.classId))
    .where(eq(students.id, studentId))
    .limit(1);
  if (!row) return null;
  const paid = await paidOf(studentId);
  return { name: row.name, fee: row.fee, paid, debt: debtOf(row.fee, paid) };
}

// Ghi một khoản thu vào sổ. Không thu quá số còn nợ.
export async function recordPaymentAction(studentId: number, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('tuition.manage');
    await requireStudentAccess(studentId);
    const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    const balance = await studentBalance(studentId);
    if (!balance) return { ok: false, message: 'Không tìm thấy học sinh này. Có thể đã bị xoá.' };
    if (balance.debt <= 0) return { ok: false, message: `${balance.name} đã đóng đủ học phí.` };
    if (v.amount > balance.debt) {
      return { ok: false, message: `Số tiền vượt số còn nợ (${formatVND(balance.debt)}).`, fieldErrors: { amount: `Tối đa ${formatVND(balance.debt)}` } };
    }

    await db.insert(tuitionPayments).values({ studentId, amount: v.amount, note: v.note, paidAt: new Date() });
    const remaining = balance.debt - v.amount;
    await writeAudit({ action: 'payment', entity: 'student', entityId: studentId, summary: `Thu ${formatVND(v.amount)} học phí ${balance.name}, còn nợ ${formatVND(remaining)}` });
    revalidatePath('/hoc-phi');
    revalidatePath('/hoc-sinh');
    revalidatePath(`/hoc-sinh/${studentId}`);
    revalidatePath('/bao-cao');
    revalidatePath('/tong-quan');
    return { ok: true, message: remaining > 0 ? `Đã thu ${formatVND(v.amount)}. ${balance.name} còn nợ ${formatVND(remaining)}.` : `Đã thu đủ học phí của ${balance.name}.` };
  } catch (error) {
    return errorResult(error);
  }
}

// Nhắc đóng học phí. Ghi vào nhật ký. Chưa gửi SMS hay email vì chưa có kênh gửi.
export async function remindTuitionAction(studentId: number): Promise<ActionResult> {
  try {
    await requirePermission('tuition.manage');
    await requireStudentAccess(studentId);
    const balance = await studentBalance(studentId);
    if (!balance) return { ok: false, message: 'Không tìm thấy học sinh này. Có thể đã bị xoá.' };
    if (balance.debt <= 0) return { ok: false, message: `${balance.name} đã đóng đủ học phí, không cần nhắc.` };
    await writeAudit({ action: 'remind', entity: 'student', entityId: studentId, summary: `Nhắc đóng học phí ${balance.name}: còn thiếu ${formatVND(balance.debt)}` });
    revalidatePath('/hoc-phi');
    // Gửi cho phụ huynh đã kết nối Telegram (P34)
    const account = await getCurrentAccount();
    const sent = await notifyParentsOfStudent(
      studentId,
      `ESL Center xin nhắc: học phí của ${balance.name} còn thiếu ${formatVND(balance.debt)} (đã đóng ${formatVND(balance.paid)} / ${formatVND(balance.fee)}). Phụ huynh gõ /hocphi để xem lại bất cứ lúc nào.`,
      'tuition',
      account?.id ?? null,
    );
    if (sent.delivered > 0) return { ok: true, message: `Đã gửi nhắc học phí qua Telegram cho phụ huynh của ${balance.name}.` };
    if (sent.chats > 0) return { ok: true, message: `Đã ghi nhắc đóng cho ${balance.name}, nhưng chưa gửi được qua Telegram (chưa cấu hình bot hoặc lỗi mạng).` };
    return { ok: true, message: `Đã ghi nhắc đóng cho ${balance.name}. Phụ huynh chưa kết nối Telegram nên chưa gửi tin.` };
  } catch (error) {
    return errorResult(error);
  }
}

// Lịch sử thu của một học sinh, để hiện trong hộp thoại ghi thu
export async function loadPaymentsAction(studentId: number): Promise<{ ok: true; payments: PaymentRow[] } | { ok: false; message: string }> {
  try {
    await requirePermission('tuition.manage');
    await requireStudentAccess(studentId);
    return { ok: true, payments: await listPaymentsOfStudent(studentId) };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi đọc lịch sử thu:', error);
    return { ok: false, message: 'Không đọc được lịch sử thu.' };
  }
}
